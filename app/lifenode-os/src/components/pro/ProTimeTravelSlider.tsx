"use client";

import { Calendar } from "lucide-react";
import { TIMELINE_SNAPSHOT_DATES } from "@/src/lib/proNode/timeline";

type ProTimeTravelSliderProps = {
  value: string;
  onChange: (dateValue: string) => void;
};

export default function ProTimeTravelSlider({ value, onChange }: ProTimeTravelSliderProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
        Time-Travel Slider
        <span className="font-normal normal-case text-slate-400">— What did I know then?</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {TIMELINE_SNAPSHOT_DATES.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onChange(d.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              value === d.value
                ? "bg-[#1E293B] text-white shadow-sm"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
