import { formatDateKey } from "@/src/lib/calendar/storage";
import type { ScheduleItem } from "@/src/lib/calendar/types";
import { isTrackerCompleted } from "@/src/lib/lifePulse/trackerSchema";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";

function parseTimeMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function computeCalendarCommitmentSignals(
  items: ScheduleItem[],
  now = new Date(),
) {
  const todayKey = formatDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let nextMinutes = 999;
  let overdueCount = 0;
  let todayCount = 0;

  for (const item of items) {
    if (item.date === todayKey) todayCount += 1;

    if (item.date < todayKey) {
      overdueCount += 1;
      continue;
    }

    if (item.date > todayKey) continue;

    if (item.allDay || !item.startTime) continue;

    const startMin = parseTimeMinutes(item.startTime);
    if (startMin === null) continue;

    const diff = startMin - nowMinutes;
    if (diff >= 0 && diff < nextMinutes) {
      nextMinutes = diff;
    }

    const endMin = parseTimeMinutes(item.endTime);
    if (diff < 0 && endMin !== null && endMin < nowMinutes) {
      overdueCount += 1;
    }
  }

  return {
    calendarNextCommitmentMinutes: nextMinutes,
    calendarOverdueCount: overdueCount,
    calendarTodayCount: todayCount,
    calendarHasCommitments: items.length > 0,
  };
}

export function computeLifePulseCommitmentSignals(
  trackers: LifePulseTracker[],
  now = new Date(),
) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  let overdueCount = 0;
  let dueTodayCount = 0;

  for (const tracker of trackers) {
    if (isTrackerCompleted(tracker.status)) continue;
    if (!tracker.due_date) continue;

    const due = new Date(tracker.due_date);
    if (Number.isNaN(due.getTime())) continue;

    if (due < todayStart) {
      overdueCount += 1;
    } else if (due >= todayStart && due <= todayEnd) {
      dueTodayCount += 1;
    }
  }

  return {
    lifePulseOverdueCount: overdueCount,
    lifePulseDueTodayCount: dueTodayCount,
    lifePulseHasCommitments: trackers.some((t) => !isTrackerCompleted(t.status)),
  };
}
