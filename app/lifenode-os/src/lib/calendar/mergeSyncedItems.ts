import type { ScheduleItem, ScheduleProvider } from "./types";
import { newScheduleItemId } from "./storage";

/** Replace prior synced rows for `source` while keeping local/manual items. */
export function mergeSyncedItems(
  existing: ScheduleItem[],
  incoming: ScheduleItem[],
  source: ScheduleProvider,
): ScheduleItem[] {
  const kept = existing.filter((row) => row.source !== source);
  return [...kept, ...incoming];
}

export function buildSyncedItem(input: {
  title: string;
  kind: ScheduleItem["kind"];
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  notes?: string;
  source: ScheduleProvider;
  externalId: string;
}): ScheduleItem {
  const now = new Date().toISOString();
  return {
    id: `ext_${input.source}_${input.externalId}`,
    title: input.title,
    kind: input.kind,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    allDay: input.allDay,
    notes: input.notes,
    source: input.source,
    externalId: input.externalId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Fallback id when provider omits stable ids. */
export function fallbackExternalId(parts: string[]): string {
  return parts.filter(Boolean).join("_").slice(0, 120);
}

export function dedupeByExternalId(items: ScheduleItem[]): ScheduleItem[] {
  const seen = new Set<string>();
  return items.filter((row) => {
    if (!row.externalId) return true;
    const key = `${row.source}:${row.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
