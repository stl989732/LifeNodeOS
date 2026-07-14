import { formatDateKey } from "@/src/lib/calendar/storage";
import type { ScheduleItem } from "@/src/lib/calendar/types";
import type { Project } from "@/lib/user-state-store";
import { isTrackerCompleted } from "@/src/lib/lifePulse/trackerSchema";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import type { KanbanCard, KanbanStore } from "@/src/lib/kanban/types";
import { PROACTIVE_CHECK_IN_BRIDGE_ID } from "@/src/lib/linos/commitmentBridgeIds";

export type CommitmentSignalSnapshot = {
  calendarOverdueCount: number;
  calendarConflictCount: number;
  calendarNextCommitmentMinutes: number;
  calendarTodayCount: number;
  lifePulseOverdueCount: number;
  lifePulseDueTodayCount: number;
  kanbanOverdueCount: number;
  kanbanDueTodayCount: number;
  projectAttentionCount: number;
};

export type ProactiveCheckInAlert = {
  bridgeId: string;
  triggerSource: string;
  condition: string;
  message: string;
  primaryRoute?: string;
  primaryActionLabel: string;
  actionKind: "navigate_route";
};

function parseTimeMinutes(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function timedRangeMinutes(item: ScheduleItem): [number, number] | null {
  if (item.allDay || !item.startTime) return null;
  const start = parseTimeMinutes(item.startTime);
  if (start === null) return null;
  const end = parseTimeMinutes(item.endTime) ?? start + 30;
  return [start, end];
}

/** Overlapping timed items on the same calendar day. */
export function countScheduleConflicts(items: ScheduleItem[]): number {
  const byDate = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    if (!timedRangeMinutes(item)) continue;
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  let conflicts = 0;
  for (const dayItems of byDate.values()) {
    for (let i = 0; i < dayItems.length; i++) {
      for (let j = i + 1; j < dayItems.length; j++) {
        const a = timedRangeMinutes(dayItems[i])!;
        const b = timedRangeMinutes(dayItems[j])!;
        if (a[0] < b[1] && b[0] < a[1]) conflicts += 1;
      }
    }
  }
  return conflicts;
}

export function computeCalendarCommitmentSignals(
  items: ScheduleItem[],
  now = new Date(),
) {
  const todayKey = formatDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const calendarConflictCount = countScheduleConflicts(items);

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
    calendarConflictCount,
    homeCalendarHasConflict: calendarConflictCount > 0,
  };
}

const KANBAN_DONE_LABEL = /^(done|close|archived|cancelled)/i;

function isKanbanCardDone(store: KanbanStore, card: KanbanCard): boolean {
  const board = store.boards.find((b) => b.id === card.boardId);
  if (!board) return false;
  const column = board.columns.find((c) => c.id === card.columnId);
  if (!column) return false;
  return KANBAN_DONE_LABEL.test(column.label.trim());
}

export function computeKanbanCommitmentSignals(
  store: KanbanStore,
  now = new Date(),
) {
  const todayKey = formatDateKey(now);
  let overdueCount = 0;
  let dueTodayCount = 0;
  let openCards = 0;

  for (const card of store.cards) {
    if (isKanbanCardDone(store, card)) continue;
    openCards += 1;
    if (!card.targetDate) continue;
    if (card.targetDate < todayKey) overdueCount += 1;
    else if (card.targetDate === todayKey) dueTodayCount += 1;
  }

  return {
    kanbanOverdueCount: overdueCount,
    kanbanDueTodayCount: dueTodayCount,
    kanbanHasCommitments: openCards > 0,
  };
}

export function computeProjectCommitmentSignals(projects: Project[]) {
  let attentionCount = 0;
  for (const project of projects) {
    if (project.status === "complete") continue;
    if (project.status === "blocked" || project.pendingApprovals > 0) {
      attentionCount += 1;
    }
  }
  return { projectAttentionCount: attentionCount };
}

export function hasProactiveCommitmentAttention(
  signals: CommitmentSignalSnapshot,
): boolean {
  return (
    signals.calendarOverdueCount > 0 ||
    signals.calendarConflictCount > 0 ||
    (signals.calendarNextCommitmentMinutes <= 60 &&
      signals.calendarNextCommitmentMinutes < 999 &&
      signals.calendarTodayCount > 0) ||
    signals.lifePulseOverdueCount > 0 ||
    signals.lifePulseDueTodayCount > 0 ||
    signals.kanbanOverdueCount > 0 ||
    signals.kanbanDueTodayCount > 0 ||
    signals.projectAttentionCount > 0
  );
}

export function buildProactiveCheckInAlert(
  signals: CommitmentSignalSnapshot,
): ProactiveCheckInAlert | null {
  if (!hasProactiveCommitmentAttention(signals)) return null;

  const parts: string[] = [];
  if (signals.calendarOverdueCount > 0) {
    parts.push(
      `${signals.calendarOverdueCount} overdue calendar item${signals.calendarOverdueCount === 1 ? "" : "s"}`,
    );
  }
  if (signals.calendarConflictCount > 0) {
    parts.push(
      `${signals.calendarConflictCount} schedule conflict${signals.calendarConflictCount === 1 ? "" : "s"}`,
    );
  }
  if (
    signals.calendarNextCommitmentMinutes <= 60 &&
    signals.calendarNextCommitmentMinutes < 999 &&
    signals.calendarTodayCount > 0
  ) {
    const mins = signals.calendarNextCommitmentMinutes;
    parts.push(
      mins === 0
        ? "something on your calendar starting now"
        : `something starting in ${mins} minute${mins === 1 ? "" : "s"}`,
    );
  }
  if (signals.kanbanOverdueCount > 0) {
    parts.push(
      `${signals.kanbanOverdueCount} past-due kanban task${signals.kanbanOverdueCount === 1 ? "" : "s"}`,
    );
  }
  if (signals.kanbanDueTodayCount > 0) {
    parts.push(
      `${signals.kanbanDueTodayCount} kanban task${signals.kanbanDueTodayCount === 1 ? "" : "s"} due today`,
    );
  }
  if (signals.lifePulseOverdueCount > 0) {
    parts.push(
      `${signals.lifePulseOverdueCount} overdue LifePulse goal${signals.lifePulseOverdueCount === 1 ? "" : "s"}`,
    );
  }
  if (signals.lifePulseDueTodayCount > 0) {
    parts.push(
      `${signals.lifePulseDueTodayCount} LifePulse goal${signals.lifePulseDueTodayCount === 1 ? "" : "s"} due today`,
    );
  }
  if (signals.projectAttentionCount > 0) {
    parts.push(
      `${signals.projectAttentionCount} project${signals.projectAttentionCount === 1 ? "" : "s"} needing attention`,
    );
  }

  const summary =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

  return {
    bridgeId: PROACTIVE_CHECK_IN_BRIDGE_ID,
    triggerSource: "Linos Schedule Watch",
    condition: "Commitment check-in",
    message: `You have ${summary}. Want to review and reprioritize?`,
    primaryRoute: "/calendar",
    primaryActionLabel: "Review schedule",
    actionKind: "navigate_route",
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
