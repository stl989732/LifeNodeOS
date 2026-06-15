import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import { extractMimeBodies } from "./gmailMime";
import type { InboxItemUpsert } from "./types";

type GmailHeader = { name?: string; value?: string };
type GmailMessageList = {
  messages?: { id?: string }[];
  nextPageToken?: string;
};
type GmailLabel = { id?: string; name?: string; type?: string };
type GmailLabelsList = { labels?: GmailLabel[] };

type GmailMimePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMimePart[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailMimePart & { headers?: GmailHeader[] };
};

const GMAIL_SYNC_MAX_MESSAGES = 120;
const GMAIL_PAGE_SIZE = 50;

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  const row = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return row?.value?.trim() ?? "";
}

function mapLabelNames(
  labelIds: string[] | undefined,
  labelMap: Map<string, string>,
): string[] {
  if (!labelIds?.length) return [];
  return labelIds
    .map((id) => labelMap.get(id) ?? id)
    .filter((name) => name.length > 0);
}

async function fetchGmailLabelMap(accessToken: string): Promise<Map<string, string>> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/labels",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return new Map();

  const data = (await res.json()) as GmailLabelsList;
  const map = new Map<string, string>();
  for (const label of data.labels ?? []) {
    if (label.id && label.name) {
      map.set(label.id, label.name);
    }
  }
  return map;
}

function mapGmailMessage(
  userId: string,
  msg: GmailMessage,
  labelMap: Map<string, string>,
): InboxItemUpsert | null {
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

  const { plain, html } = extractMimeBodies(msg.payload);
  const labelIds = msg.labelIds ?? [];
  const labelNames = mapLabelNames(labelIds, labelMap);

  return {
    user_id: userId,
    source: "gmail",
    external_id: msg.id,
    kind: "email",
    title: subject,
    snippet: msg.snippet?.trim() ?? "",
    body: plain,
    from_label: fromLabel,
    from_id: fromId,
    received_at: receivedAt,
    status: "inbox",
    transfer_meta: {},
    provider_payload: {
      threadId: msg.threadId ?? null,
      labelIds,
      labelNames,
      bodyHtml: html,
      externalUrl: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    },
    local_notes: null,
  };
}

async function listGmailMessageIds(accessToken: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < GMAIL_SYNC_MAX_MESSAGES) {
    const params = new URLSearchParams({
      maxResults: String(Math.min(GMAIL_PAGE_SIZE, GMAIL_SYNC_MAX_MESSAGES - ids.length)),
      q: "in:inbox",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!listRes.ok) {
      const detail = await listRes.text().catch(() => listRes.statusText);
      throw new Error(`Gmail list failed: ${detail.slice(0, 200)}`);
    }

    const listData = (await listRes.json()) as GmailMessageList;
    const pageIds = (listData.messages ?? [])
      .map((m) => m.id)
      .filter(Boolean) as string[];
    ids.push(...pageIds);

    pageToken = listData.nextPageToken;
    if (!pageToken || pageIds.length === 0) break;
  }

  return ids;
}

export async function syncGmailInbox(
  integrationUserId: string,
  sessionUserId: string,
): Promise<InboxItemUpsert[]> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");
  const labelMap = await fetchGmailLabelMap(accessToken);
  const ids = await listGmailMessageIds(accessToken);
  const items: InboxItemUpsert[] = [];

  await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return;
      const msg = (await res.json()) as GmailMessage;
      const row = mapGmailMessage(sessionUserId, msg, labelMap);
      if (row) items.push(row);
    }),
  );

  return items;
}

export type GmailHydratedBody = {
  plain: string | null;
  html: string | null;
};

export async function fetchGmailMessageContent(
  integrationUserId: string,
  messageId: string,
): Promise<GmailHydratedBody> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return { plain: null, html: null };
  const msg = (await res.json()) as GmailMessage;
  return extractMimeBodies(msg.payload);
}

/** @deprecated Use fetchGmailMessageContent */
export async function fetchGmailMessageBody(
  integrationUserId: string,
  messageId: string,
): Promise<string | null> {
  const { plain } = await fetchGmailMessageContent(integrationUserId, messageId);
  return plain;
}
