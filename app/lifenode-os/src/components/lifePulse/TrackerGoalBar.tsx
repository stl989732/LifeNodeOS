"use client";

import type { ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import { trackerCompletionPercent } from "@/src/lib/lifePulse/trackers";
import CalmWheel from "./CalmWheel";
import { AURA_GLASS_CLASS, AURA_GLASS_STYLE, AURA_TEXT } from "./lifePulseAura";

const PRIORITY_DOT: Record<string, string> = {
  High: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]",
  Medium: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
  Low: "bg-slate-400",
};

function daysRemaining(due: string | null | undefined) {
  if (!due) return { label: "Open timeline", urgent: false };
  const diff = Math.ceil(
    (new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, urgent: true };
  if (diff === 0) return { label: "Due today", urgent: true };
  return { label: `${diff} days left`, urgent: diff <= 7 };
}

type Props = {
  tracker: LifePulseTracker;
  onDelete: (id: string) => void;
  busy?: boolean;
  children?: ReactNode;
};

export default function TrackerGoalBar({ tracker, onDelete, busy, children }: Props) {
  const pct = trackerCompletionPercent(tracker);
  const days = daysRemaining(tracker.due_date ?? tracker.target_date);
  const priority = tracker.priority ?? "Medium";
  const dotClass = PRIORITY_DOT[priority] ?? PRIORITY_DOT.Medium;

  return (
    <article id={`tracker-${tracker.id}`} className="space-y-3 scroll-mt-24">
      <div
        className={`flex flex-col gap-3 p-4 lg:flex-row lg:items-center ${AURA_GLASS_CLASS}`}
        style={AURA_GLASS_STYLE}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
            title={`${priority} priority`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h3 className={`truncate text-base font-bold ${AURA_TEXT.title}`}>{tracker.title}</h3>
            <p className={`text-[11px] capitalize ${AURA_TEXT.label}`}>
              {tracker.status}
              {tracker.category ? ` · ${tracker.category.replace(/_/g, " ")}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
              days.urgent ? "text-rose-700" : AURA_TEXT.muted
            }`}
          >
            {days.label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-600" /> : null}
          <CalmWheel percent={pct} size="sm" showLabel={false} />
          <button
            type="button"
            onClick={() => onDelete(tracker.id)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/40 hover:text-rose-700"
            aria-label="Delete tracker"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {children ? <div className="pl-1">{children}</div> : null}
    </article>
  );
}
