"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, X } from "lucide-react";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import { LIFE_PULSE_CATEGORIES } from "@/src/lib/lifePulse/types";
import { getTableRows } from "@/src/lib/lifePulse/tableRows";
import { AURA_GLASS_CLASS, AURA_GLASS_STYLE, AURA_TEXT } from "./lifePulseAura";

function daysLeft(tracker: LifePulseTracker): number | null {
  const due = tracker.due_date ?? tracker.target_date;
  if (!due) return null;
  return Math.ceil(
    (new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

function categoryLabel(category: LifePulseTracker["category"]): string {
  return LIFE_PULSE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

function reminderMessage(tracker: LifePulseTracker, days: number): string {
  const m = tracker.context_data ?? {};
  const rowCount = getTableRows(m).filter((r) =>
    Object.values(r.cells).some((v) => v.trim()),
  ).length;

  if (rowCount > 0 && days >= 0) {
    const cat = categoryLabel(tracker.category);
    return `You have ${rowCount} item(s) in your ${cat} plan table for “${tracker.title}”. ${days === 0 ? "Due today — open the table and complete today's row." : `${days} day(s) left.`}`;
  }

  if (typeof m.linos_intro === "string" && m.linos_intro.trim()) {
    const intro = m.linos_intro.trim().slice(0, 120);
    if (days < 0) {
      return `${intro} — This goal is ${Math.abs(days)} day(s) overdue. Want to reschedule?`;
    }
    if (days === 0) {
      return `${intro} — Due today. Open your plan table for today's step.`;
    }
    return `${intro} — ${days} day(s) left on “${tracker.title}”.`;
  }
  if (days < 0) {
    return `“${tracker.title}” is ${Math.abs(days)} day(s) overdue. Want to reschedule?`;
  }
  if (days === 0) {
    return `“${tracker.title}” is due today — open your plan table and finish one row.`;
  }
  return `“${tracker.title}” — ${days} day(s) remaining. Check your plan table with Linos.`;
}

function messageHasQuestion(msg: string): boolean {
  return /\?\s*$/.test(msg.trim()) || /want to reschedule/i.test(msg);
}

type Props = {
  trackers: LifePulseTracker[];
  onOpenTracker?: (trackerId: string) => void;
  onReschedule?: (trackerId: string) => void;
};

/** Surfaces one LifePulse reminder at a time (days left + plan table nudge). */
export default function LinosReminderStrip({
  trackers,
  onOpenTracker,
  onReschedule,
}: Props) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const queue = useMemo(() => {
    return trackers
      .filter((t) => t.status !== "Completed")
      .map((t) => ({ tracker: t, days: daysLeft(t) }))
      .filter((x) => x.days !== null || getTableRows(x.tracker.context_data ?? {}).length > 0)
      .sort((a, b) => (a.days ?? 99) - (b.days ?? 99));
  }, [trackers]);

  useEffect(() => {
    if (index >= queue.length) setIndex(0);
  }, [index, queue.length]);

  useEffect(() => {
    if (queue.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % queue.length);
    }, 45_000);
    return () => window.clearInterval(id);
  }, [queue.length]);

  const current = queue.find((q) => q.tracker.id !== dismissedId) ?? queue[index];
  if (!current || current.tracker.id === dismissedId) return null;

  const days = current.days ?? 0;
  const msg = reminderMessage(current.tracker, days);
  const showActions = messageHasQuestion(msg) || days <= 0;
  const catLabel = categoryLabel(current.tracker.category);

  return (
    <div
      className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${AURA_GLASS_CLASS}`}
      style={AURA_GLASS_STYLE}
      role="status"
    >
      <Bell
        className={`mt-0.5 h-5 w-5 shrink-0 ${days <= 3 ? "text-amber-600" : "text-teal-700"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${AURA_TEXT.label}`}>
          Linos reminder · {days < 0 ? "Overdue" : days === 0 ? "Due today" : `${days} days left`}
        </p>
        <p className={`mt-1 text-sm leading-relaxed ${AURA_TEXT.body}`}>{msg}</p>
        {showActions ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {days < 0 && onReschedule ? (
              <button
                type="button"
                onClick={() => onReschedule(current.tracker.id)}
                className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-500/25"
              >
                Yes, reschedule
              </button>
            ) : null}
            {onOpenTracker ? (
              <button
                type="button"
                onClick={() => onOpenTracker(current.tracker.id)}
                className="rounded-lg border border-white/30 bg-white/30 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white/45"
              >
                Go to {catLabel} plan table
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setDismissedId(current.tracker.id)}
        className="shrink-0 self-end rounded-lg p-1 text-slate-500 hover:bg-white/30 sm:self-start"
        aria-label="Dismiss reminder"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
