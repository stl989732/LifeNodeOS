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
): Promise<{ ok: boolean; pushed?: number; message?: string; error?: string }> {
  const res = await fetch("/api/calendar/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ month: monthKey, items }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    pushed?: number;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    return { ok: false, error: data.error ?? "Export failed" };
  }

  return {
    ok: true,
    pushed: data.pushed,
    message: data.message,
  };
}
