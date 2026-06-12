import { listUserIntegrations } from "@/src/lib/integrations/userIntegrationsDb";
import { upsertInboxItems } from "./inboxDb";
import { syncGmailInbox } from "./syncGmail";
import { syncGoogleCalendarInbox } from "./syncGoogleCalendar";
import { syncSlackInbox } from "./syncSlack";
import type { InboxSyncProviderResult, InboxSource } from "./types";

async function trySync(
  source: InboxSource,
  fn: () => Promise<{ items: Parameters<typeof upsertInboxItems>[1]; liveSync: boolean }>,
): Promise<InboxSyncProviderResult> {
  try {
    const { items, liveSync } = await fn();
    return { source, count: items.length, liveSync };
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";
    return { source, count: 0, liveSync: false, error: message };
  }
}

export async function syncAllInboxProviders(input: {
  integrationUserId: string;
  sessionUserId: string;
  sources?: InboxSource[];
}): Promise<{
  results: InboxSyncProviderResult[];
  upserted: number;
  syncedAt: string;
}> {
  const connected = await listUserIntegrations(input.integrationUserId);
  const connectedSet = new Set(
    connected.filter((c) => c.connected).map((c) => c.provider),
  );

  const want: InboxSource[] =
    input.sources ?? ["gmail", "slack", "google_calendar"];

  const providerMap: Record<
    InboxSource,
    { integrationKey: string; run: () => Promise<Parameters<typeof upsertInboxItems>[1]> }
  > = {
    gmail: {
      integrationKey: "gmail",
      run: () => syncGmailInbox(input.integrationUserId, input.sessionUserId),
    },
    slack: {
      integrationKey: "slack",
      run: () => syncSlackInbox(input.integrationUserId, input.sessionUserId),
    },
    google_calendar: {
      integrationKey: "google_calendar",
      run: () =>
        syncGoogleCalendarInbox(input.integrationUserId, input.sessionUserId),
    },
  };

  const settled = await Promise.all(
    want.map(async (source) => {
      const cfg = providerMap[source];
      if (!connectedSet.has(cfg.integrationKey as never)) {
        return {
          result: {
            source,
            count: 0,
            liveSync: false,
            error: "not_connected",
          } satisfies InboxSyncProviderResult,
          items: [] as Parameters<typeof upsertInboxItems>[1],
        };
      }

      let items: Parameters<typeof upsertInboxItems>[1] = [];
      const result = await trySync(source, async () => {
        items = await cfg.run();
        return { items, liveSync: true };
      });
      return { result, items };
    }),
  );

  const results = settled.map((row) => row.result);
  const allItems = settled.flatMap((row) => row.items);

  const upserted = await upsertInboxItems(input.sessionUserId, allItems);

  return {
    results,
    upserted,
    syncedAt: new Date().toISOString(),
  };
}
