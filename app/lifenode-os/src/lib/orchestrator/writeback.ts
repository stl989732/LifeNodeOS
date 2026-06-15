import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import { getInboxItem } from "./inboxDb";
import { fetchGmailMessageContent } from "./syncGmail";
import { postSlackReply } from "./syncSlack";

export async function sendGmailReply(
  integrationUserId: string,
  itemUserId: string,
  inboxItemId: string,
  replyBody: string,
): Promise<void> {
  const item = await getInboxItem(itemUserId, inboxItemId);
  if (!item || item.source !== "gmail") {
    throw new Error("not_a_gmail_item");
  }

  const threadId =
    typeof item.provider_payload?.threadId === "string"
      ? item.provider_payload.threadId
      : null;
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");

  const original = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.external_id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Message-ID`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!original.ok) throw new Error("gmail_fetch_failed");

  const origData = (await original.json()) as {
    payload?: { headers?: { name?: string; value?: string }[] };
  };
  const headers = origData.payload?.headers ?? [];
  const getH = (n: string) =>
    headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ?? "";

  const to = getH("To") || getH("From");
  const subject = getH("Subject").startsWith("Re:")
    ? getH("Subject")
    : `Re: ${getH("Subject")}`;
  const messageId = getH("Message-ID");

  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    messageId ? `In-Reply-To: ${messageId}` : "",
    messageId ? `References: ${messageId}` : "",
    "Content-Type: text/plain; charset=utf-8",
    "",
    replyBody,
  ]
    .filter(Boolean)
    .join("\r\n");

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        threadId: threadId ?? undefined,
        raw: encoded,
      }),
    },
  );

  if (!sendRes.ok) {
    const detail = await sendRes.text().catch(() => sendRes.statusText);
    throw new Error(`gmail_send_failed: ${detail.slice(0, 200)}`);
  }
}

export async function archiveGmailMessage(
  integrationUserId: string,
  externalId: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(integrationUserId, "gmail");
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${externalId}/modify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removeLabelIds: ["INBOX", "UNREAD"] }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`gmail_archive_failed: ${detail.slice(0, 200)}`);
  }
}

export async function sendSlackInboxReply(
  integrationUserId: string,
  itemUserId: string,
  inboxItemId: string,
  text: string,
): Promise<void> {
  const item = await getInboxItem(itemUserId, inboxItemId);
  if (!item || item.source !== "slack") throw new Error("not_a_slack_item");

  const channelId = item.provider_payload?.channelId;
  const threadTs = item.provider_payload?.messageTs;
  if (typeof channelId !== "string") throw new Error("missing_slack_channel");

  await postSlackReply(
    integrationUserId,
    channelId,
    text,
    typeof threadTs === "string" ? threadTs : undefined,
  );
}

export async function insertGoogleCalendarBlock(
  integrationUserId: string,
  input: { title: string; date: string; notes?: string },
): Promise<string> {
  const accessToken = await getValidAccessToken(integrationUserId, "google_calendar");
  const start = `${input.date}T09:00:00`;
  const end = `${input.date}T10:00:00`;

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.notes,
        start: { dateTime: start, timeZone: "UTC" },
        end: { dateTime: end, timeZone: "UTC" },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`calendar_insert_failed: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id?: string };
  return data.id ?? "";
}

/** Lazy-load full Gmail body (and HTML) for detail view. */
export async function hydrateInboxBody(
  integrationUserId: string,
  source: string,
  externalId: string,
  existingBody: string | null,
  existingPayload: Record<string, unknown>,
): Promise<{ body: string | null; providerPayload: Record<string, unknown> }> {
  const hasHtml =
    typeof existingPayload.bodyHtml === "string" &&
    existingPayload.bodyHtml.trim().length > 0;

  if (existingBody?.trim() && hasHtml) {
    return { body: existingBody, providerPayload: existingPayload };
  }

  if (source !== "gmail") {
    return { body: existingBody, providerPayload: existingPayload };
  }

  const { plain, html } = await fetchGmailMessageContent(
    integrationUserId,
    externalId,
  );

  return {
    body: plain ?? existingBody,
    providerPayload: {
      ...existingPayload,
      ...(html ? { bodyHtml: html } : {}),
    },
  };
}
