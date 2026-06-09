import {
  readScopedLocalStorage,
  userScopedStorageKey,
} from "@/src/lib/userScopedStorage";
import { touchLocalWidgetUpdatedAt } from "@/src/lib/nodeWidgetSync";
import {
  DEFAULT_INTEGRATIONS,
  type CalendarIntegration,
  type CalendarStore,
  type ScheduleItem,
} from "./types";

const STORAGE_BASE = "lifenode.calendar.v1";

function emptyStore(): CalendarStore {
  return {
    items: [],
    integrations: DEFAULT_INTEGRATIONS.map((i) => ({ ...i })),
  };
}

export function calendarStorageKey(userId: string | null | undefined): string {
  return userScopedStorageKey(STORAGE_BASE, userId);
}

export function loadCalendarStore(userId: string | null | undefined): CalendarStore {
  if (typeof window === "undefined") return emptyStore();
  const key = calendarStorageKey(userId);
  const raw = readScopedLocalStorage(key, [STORAGE_BASE]);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<CalendarStore>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      integrations:
        Array.isArray(parsed.integrations) && parsed.integrations.length > 0
          ? parsed.integrations
          : DEFAULT_INTEGRATIONS.map((i) => ({ ...i })),
    };
  } catch {
    return emptyStore();
  }
}

export function saveCalendarStore(
  userId: string | null | undefined,
  store: CalendarStore,
): void {
  if (typeof window === "undefined") return;
  const key = calendarStorageKey(userId);
  window.localStorage.setItem(key, JSON.stringify(store));
  touchLocalWidgetUpdatedAt(key);
}

export function newScheduleItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sched_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Monday-start week grid cells for a month view (42 cells). */
export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function itemsForDate(items: ScheduleItem[], dateKey: string): ScheduleItem[] {
  return items
    .filter((i) => i.date === dateKey)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

export function toggleIntegration(
  integrations: CalendarIntegration[],
  id: CalendarIntegration["id"],
): CalendarIntegration[] {
  return integrations.map((row) =>
    row.id === id ? { ...row, connected: !row.connected } : row,
  );
}
