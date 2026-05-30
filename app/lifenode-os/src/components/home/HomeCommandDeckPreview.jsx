"use client";

import { Clock, RefreshCw } from "lucide-react";

function formatScheduleTime(isoOrLocal) {
  if (!isoOrLocal) return "";
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return isoOrLocal;
  return d.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default function HomeCommandDeckPreview({ scheduleItems = [], automationItems = [] }) {
  const schedule =
    scheduleItems.length > 0
      ? scheduleItems
      : [
          { time: "7:30 AM", label: "School run" },
          { time: "2:15 PM", label: "Pediatrician appt" },
          { time: "5:00 PM", label: "Soccer pickup" },
        ];

  const automations =
    automationItems.length > 0
      ? automationItems
      : [
          "Syncing Instacart → weekly meal plan",
          "Low pantry alert → Smart Cart draft",
          "Calendar conflict → Lino heads-up",
        ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90A1B9]">
          HomeNode · Command deck
        </span>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
        <div className="rounded-xl border border-slate-800/80 bg-white/[0.03] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-400/90">
            Today&apos;s family schedule
          </p>
          <ul className="space-y-3">
            {schedule.map((item) => (
              <li
                key={`${item.label}-${item.time}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2.5"
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#90A1B9]" />
                <span className="text-[10px] font-mono text-[#90A1B9]">{item.time}</span>
                <span className="text-sm font-medium text-slate-200">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-white/[0.03] p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400/90">
            Household automations
          </p>
          <ul className="space-y-3">
            {automations.map((label) => (
              <li
                key={label}
                className="flex items-start gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2.5"
              >
                <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
                <span className="text-sm leading-snug text-slate-300">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export { formatScheduleTime };
