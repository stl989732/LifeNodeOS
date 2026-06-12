import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import type { InboxItemUpsert } from "./types";

type GmailHeader = { name?: string; value?: string };
type GmailMessageList = { messages?: { id?: string }[] };
type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: { data?: string };
    parts?: { mimeType?: string; body?: { data?: string } }[];
  };
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  const row = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return row?.value?.trim() ?? "";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractBody(msg: GmailMessage): string | null {
  const payload = msg.payload;
  if (!payload) return null;

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data).slice(0, 8000) || null;
  }

  const textPart = payload.parts?.find((p) => p.mimeType === "text/plain");
  if (textPart?.body?.data) {
    return decodeBase64Url(textPart.body.data).slice(0, 8000) || null;
  }

  const htmlPart = payload.parts?.find((p) => p.mimeType === "text/html");
  if (htmlPart?.body?.data) {
    const html = decodeBase64Url(htmlPart.body.data);
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000) || null;
  }

  return null;
}

function mapGmailMessage(userId: string, msg: GmailMessage): InboxItemUpsert | null {
  if (!msg.id) return null;

  const headers = msg.payload?.headers;
  const subject = headerValue(headers, "Subject") || "(No subject)";
  const from = headerValue(headers, "From");
  const dateHeader = headerValue(headers, "Date");
  const receivedAt = msg.internalDate
    ? new Date(Number(msg.internalDate)).toISOString()
    : dateHeader
      ? new Date(dateHeader).toISOString()
      : new Date().toISOString();

  const fromMatch = from.match(/^(.+?)\s*<([^>]+)>$/) ?? from.match(/<([^>]+)>/);
  const fromLabel = fromMatch
    ? fromMatch[1]?.trim().replace(/^"|"$/g, "") || fromMatch[2]
    : from || "Unknown";
  const fromId = fromMatch?.[2] ?? from;

  return {
    user_id: userId,
    source: "gmail",
    external_id: msg.id,
    kind: "email",
    title: subject,
    snippet: msg.snippet?.trim() ?? "",
    body: extractBody(msg),
    from_label: fromLabel,
    from_id: fromId,
    received_at: receivedAt,
    status: "inbox",
    transfer_meta: {},
    provider_payload: {
      threadId: msg.threadId ?? null,
    },
    local_notes: null,
  };
}

export async function syncGmailInbox(
  integrationUserId: string,
  sessionUserId: string,
): Promise<InboxItemUpsert[]> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");

  const listParams = new URLSearchParams({
    maxResults: "40",
    q: "in:inbox",
  });

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!listRes.ok) {
    const detail = await listRes.text().catch(() => listRes.statusText);
    throw new Error(`Gmail list failed: ${detail.slice(0, 200)}`);
  }

  const listData = (await listRes.json()) as GmailMessageList;
  const ids = (listData.messages ?? []).map((m) => m.id).filter(Boolean) as string[];

  const items: InboxItemUpsert[] = [];

  await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return;
      const msg = (await res.json()) as GmailMessage;
      const row = mapGmailMessage(sessionUserId, msg);
      if (row) items.push(row);
    }),
  );

  return items;
}

export async function fetchGmailMessageBody(
  integrationUserId: string,
  messageId: string,
): Promise<string | null> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const msg = (await res.json()) as GmailMessage;
  return extractBody(msg);
}
