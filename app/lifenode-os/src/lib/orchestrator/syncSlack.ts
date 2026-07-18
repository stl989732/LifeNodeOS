import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import type { InboxItemUpsert } from "./types";

type SlackConversation = {
  id?: string;
  name?: string;
  is_im?: boolean;
  is_mpim?: boolean;
  user?: string;
};

type SlackConversationsList = {
  ok?: boolean;
  channels?: SlackConversation[];
  error?: string;
};

type SlackMessage = {
  ts?: string;
  user?: string;
  text?: string;
  bot_id?: string;
};

type SlackHistory = {
  ok?: boolean;
  messages?: SlackMessage[];
  error?: string;
};

type SlackUser = {
  ok?: boolean;
  user?: { real_name?: string; name?: string; profile?: { display_name?: string } };
};

async function slackGet<T>(
  accessToken: string,
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`https://slack.com/api/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return (await res.json()) as T;
}

async function resolveSlackUserName(
  accessToken: string,
  userId: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(userId)) return cache.get(userId)!;
  const data = await slackGet<SlackUser>(accessToken, "users.info", { user: userId });
  const name =
    data.user?.profile?.display_name ||
    data.user?.real_name ||
    data.user?.name ||
    userId;
  cache.set(userId, name);
  return name;
}

function channelLabel(ch: SlackConversation): string {
  if (ch.is_im) return "Direct message";
  if (ch.is_mpim) return "Group DM";
  return ch.name ? `#${ch.name}` : "Slack";
}

type SlackAuthTest = {
  ok?: boolean;
  user_id?: string;
  error?: string;
};

export async function syncSlackInbox(
  integrationUserId: string,
  sessionUserId: string,
): Promise<InboxItemUpsert[]> {
  const accessToken = await getValidAccessToken(integrationUserId, "slack");
  const userCache = new Map<string, string>();

  const auth = await slackGet<SlackAuthTest>(accessToken, "auth.test");
  const selfUserId = auth.ok ? auth.user_id ?? null : null;

  const listData = await slackGet<SlackConversationsList>(
    accessToken,
    "conversations.list",
    {
      types: "public_channel,private_channel,im,mpim",
      exclude_archived: "true",
      limit: "20",
    },
  );

  if (!listData.ok) {
    throw new Error(listData.error ?? "Slack conversations.list failed");
  }

  const channels = (listData.channels ?? []).slice(0, 20);
  const items: InboxItemUpsert[] = [];

  await Promise.all(
    channels.map(async (ch) => {
      if (!ch.id) return;
      const history = await slackGet<SlackHistory>(
        accessToken,
        "conversations.history",
        { channel: ch.id, limit: "15" },
      );
      if (!history.ok || !history.messages) return;

      for (const msg of history.messages) {
        if (!msg.ts || !msg.text?.trim() || msg.bot_id) continue;

        const externalId = `${ch.id}_${msg.ts}`;
        const userName = msg.user
          ? await resolveSlackUserName(accessToken, msg.user, userCache)
          : "Slack user";
        const receivedAt = new Date(Number(msg.ts) * 1000).toISOString();
        const label = channelLabel(ch);
        const isOwn = Boolean(selfUserId && msg.user && msg.user === selfUserId);

        items.push({
          user_id: sessionUserId,
          source: "slack",
          external_id: externalId,
          kind: "slack_message",
          title: `${label}: ${msg.text.trim().slice(0, 80)}`,
          snippet: msg.text.trim().slice(0, 280),
          body: msg.text.trim(),
          from_label: userName,
          from_id: msg.user ?? null,
          received_at: receivedAt,
          status: "inbox",
          transfer_meta: {},
          provider_payload: {
            channelId: ch.id,
            channelName: ch.name ?? null,
            messageTs: msg.ts,
            threadTs: msg.ts,
            mailbox: isOwn ? "sent" : "inbox",
            isOwn,
          },
          local_notes: null,
        });
      }
    }),
  );

  return items;
}

export async function postSlackReply(
  integrationUserId: string,
  channelId: string,
  text: string,
  threadTs?: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(integrationUserId, "slack");
  const body: Record<string, string> = { channel: channelId, text };
  if (threadTs) body.thread_ts = threadTs;

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    throw new Error(data.error ?? "Slack post failed");
  }
}
