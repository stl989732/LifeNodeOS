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
const GMAIL_SENT_MAX_MESSAGES = 60;
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

function isSentLabels(labelIds: string[]): boolean {
  return labelIds.includes("SENT");
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
  mailbox: "inbox" | "sent",
): InboxItemUpsert | null {
  if (!msg.id) return null;

  const headers = msg.payload?.headers;
  const subject = headerValue(headers, "Subject") || "(No subject)";
  const from = headerValue(headers, "From");
  const to = headerValue(headers, "To");
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
  const resolvedMailbox =
    mailbox === "sent" || isSentLabels(labelIds) ? "sent" : "inbox";
  const displayFrom =
    resolvedMailbox === "sent"
      ? to || fromLabel
      : fromLabel;

  return {
    user_id: userId,
    source: "gmail",
    external_id: msg.id,
    kind: "email",
    title: subject,
    snippet: msg.snippet?.trim() ?? "",
    body: plain,
    from_label: displayFrom,
    from_id: fromId,
    received_at: receivedAt,
    status: "inbox",
    transfer_meta: {},
    provider_payload: {
      threadId: msg.threadId ?? null,
      labelIds,
      labelNames,
      bodyHtml: html,
      mailbox: resolvedMailbox,
      to: to || null,
      externalUrl:
        resolvedMailbox === "sent"
          ? `https://mail.google.com/mail/u/0/#sent/${msg.id}`
          : `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
    },
    local_notes: null,
  };
}

async function listGmailMessageIds(
  accessToken: string,
  query: string,
  maxMessages: number,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < maxMessages) {
    const params = new URLSearchParams({
      maxResults: String(Math.min(GMAIL_PAGE_SIZE, maxMessages - ids.length)),
      q: query,
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

async function fetchMappedGmailMessages(
  accessToken: string,
  sessionUserId: string,
  ids: string[],
  labelMap: Map<string, string>,
  mailbox: "inbox" | "sent",
): Promise<InboxItemUpsert[]> {
  const items: InboxItemUpsert[] = [];
  await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return;
      const msg = (await res.json()) as GmailMessage;
      const row = mapGmailMessage(sessionUserId, msg, labelMap, mailbox);
      if (row) items.push(row);
    }),
  );
  return items;
}

export async function syncGmailInbox(
  integrationUserId: string,
  sessionUserId: string,
): Promise<InboxItemUpsert[]> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");
  const labelMap = await fetchGmailLabelMap(accessToken);

  const [inboxIds, sentIds] = await Promise.all([
    listGmailMessageIds(accessToken, "in:inbox", GMAIL_SYNC_MAX_MESSAGES),
    listGmailMessageIds(accessToken, "in:sent", GMAIL_SENT_MAX_MESSAGES),
  ]);

  // Prefer sent tagging when the same message id appears in both queries.
  const sentIdSet = new Set(sentIds);
  const inboxOnlyIds = inboxIds.filter((id) => !sentIdSet.has(id));

  const [inboxItems, sentItems] = await Promise.all([
    fetchMappedGmailMessages(
      accessToken,
      sessionUserId,
      inboxOnlyIds,
      labelMap,
      "inbox",
    ),
    fetchMappedGmailMessages(
      accessToken,
      sessionUserId,
      sentIds,
      labelMap,
      "sent",
    ),
  ]);

  return [...inboxItems, ...sentItems];
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
