"use client";

import { RefreshCw } from "lucide-react";
import DailyScheduleCard from "@/src/components/home/DailyScheduleCard";

export default function HomeCommandDeckPreview({
  scheduleItems = [],
  automationItems = [],
  useLiveSchedule = true,
  automationPreview = false,
}) {
  const fallbackSchedule =
    scheduleItems.length > 0
      ? scheduleItems.map((item, i) => ({
          id: `local-${i}`,
          time: item.time,
          title: item.label,
        }))
      : [];

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
        {useLiveSchedule ? (
          <DailyScheduleCard />
        ) : (
          <DailyScheduleCard items={fallbackSchedule} />
        )}
        <div className="rounded-xl border border-slate-800/80 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-400/90">
              Household automations
            </p>
            {automationPreview ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Preview
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Live
              </span>
            )}
          </div>
          {automationPreview ? (
            <p className="mb-3 text-xs leading-relaxed text-slate-400">
              These automations activate from your connected apps and HomeNode data — not from scanning the dashboard image.
            </p>
          ) : null}
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

function formatScheduleTime(isoOrLocal) {
  if (!isoOrLocal) return "";
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) return isoOrLocal;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
