import type { ScheduleItem, ScheduleProvider } from "./types";

export type CalendarSyncResult = {
  ok: boolean;
  provider: ScheduleProvider;
  items: ScheduleItem[];
  liveSync?: boolean;
  message?: string;
  syncedAt?: string;
  error?: string;
};

export async function syncCalendarProvider(
  provider: ScheduleProvider,
  monthKey: string,
): Promise<CalendarSyncResult> {
  const res = await fetch("/api/calendar/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ provider, month: monthKey }),
  });

  const data = (await res.json().catch(() => ({}))) as CalendarSyncResult & {
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      provider,
      items: [],
      error: data.error ?? "Sync failed",
    };
  }

  return data;
}

export async function pushLocalItemsToGoogle(
  monthKey: string,
  items: ScheduleItem[],
  timeZone?: string,
): Promise<{
  ok: boolean;
  pushed?: number;
  updated?: number;
  message?: string;
  error?: string;
  externalIds?: Record<string, string>;
}> {
  const tz =
    timeZone ??
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  const res = await fetch("/api/calendar/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ month: monthKey, items, timeZone: tz }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    pushed?: number;
    updated?: number;
    message?: string;
    error?: string;
    externalIds?: Record<string, string>;
  };

  if (!res.ok) {
    return { ok: false, error: data.error ?? "Export failed" };
  }

  return {
    ok: true,
    pushed: data.pushed,
    updated: data.updated,
    message: data.message,
    externalIds: data.externalIds ?? {},
  };
}
