import {
  loadCalendarStore,
  saveCalendarStore,
} from "@/src/lib/calendar/storage";
import type { ScheduleItem } from "@/src/lib/calendar/types";
import { NODE_WIDGET_KEYS, scheduleNodeWidgetSave } from "@/src/lib/nodeWidgetSync";

export type ActivityPrepCalendarRow = {
  id: string;
  title?: string;
  scheduledAt?: string;
  participantName?: string;
  itemsToBring?: string;
  saved?: boolean;
};

const EXTERNAL_PREFIX = "activity-prep:";

function externalIdForRow(rowId: string): string {
  return `${EXTERNAL_PREFIX}${rowId}`;
}

function startTimeFromScheduledAt(scheduledAt: string): string | undefined {
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return undefined;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function rowToScheduleItem(row: ActivityPrepCalendarRow): ScheduleItem | null {
  const title = row.title?.trim();
  const scheduledAt = row.scheduledAt?.trim();
  if (!title || !scheduledAt) return null;

  const date = scheduledAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const noteParts: string[] = [];
  if (row.participantName?.trim()) {
    noteParts.push(`For: ${row.participantName.trim()}`);
  }
  if (row.itemsToBring?.trim()) {
    noteParts.push(`Bring: ${row.itemsToBring.trim()}`);
  }

  const extId = externalIdForRow(row.id);
  const now = new Date().toISOString();

  return {
    id: extId,
    title,
    kind: "event",
    date,
    startTime: startTimeFromScheduledAt(scheduledAt),
    notes: noteParts.length ? noteParts.join("\n") : undefined,
    source: "local",
    externalId: extId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Upsert or remove one Activity Prep row on the shell calendar store. */
export function syncActivityPrepRowToCalendar(
  userId: string | null | undefined,
  row: ActivityPrepCalendarRow,
  remove = false,
): void {
  if (typeof window === "undefined") return;

  const store = loadCalendarStore(userId);
  const extId = externalIdForRow(row.id);
  const without = store.items.filter((item) => item.externalId !== extId);

  let nextItems = without;
  if (!remove && row.saved) {
    const mapped = rowToScheduleItem(row);
    if (mapped) {
      const existing = store.items.find((item) => item.externalId === extId);
      nextItems = [
        ...without,
        {
          ...mapped,
          createdAt: existing?.createdAt ?? mapped.createdAt,
          updatedAt: new Date().toISOString(),
        },
      ];
    }
  }

  const nextStore = { ...store, items: nextItems };
  saveCalendarStore(userId, nextStore);
  scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.calendar, nextStore);
}

/** Sync all saved Activity Prep rows after load or bulk edit. */
export function syncAllActivityPrepToCalendar(
  userId: string | null | undefined,
  rows: ActivityPrepCalendarRow[],
): void {
  if (typeof window === "undefined") return;

  const store = loadCalendarStore(userId);
  const savedRows = rows.filter((row) => row.saved && row.title?.trim());
  const savedExtIds = new Set(savedRows.map((row) => externalIdForRow(row.id)));

  const kept = store.items.filter(
    (item) =>
      !item.externalId?.startsWith(EXTERNAL_PREFIX) ||
      savedExtIds.has(item.externalId),
  );

  const byExt = new Map(kept.map((item) => [item.externalId ?? item.id, item]));

  for (const row of savedRows) {
    const mapped = rowToScheduleItem(row);
    if (!mapped) continue;
    const extId = mapped.externalId!;
    const existing = byExt.get(extId);
    byExt.set(extId, {
      ...mapped,
      createdAt: existing?.createdAt ?? mapped.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  const nextStore = { ...store, items: Array.from(byExt.values()) };
  saveCalendarStore(userId, nextStore);
  scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.calendar, nextStore);
}
