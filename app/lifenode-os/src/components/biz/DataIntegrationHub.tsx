"use client";

import { Database } from "lucide-react";
import {
  DATA_HUB_TOOLS,
  type DataHubTool,
} from "@/src/lib/bizNode/dataIntegrationHub";

type Props = {
  primary: DataHubTool | null;
  onSelect: (tool: DataHubTool) => void;
  compact?: boolean;
};

export default function DataIntegrationHub({ primary, onSelect, compact }: Props) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white/80 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-indigo-600" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Data Integration Hub
          </p>
          {!compact ? (
            <p className="text-[11px] text-slate-500">
              Pick one primary project stack — we hide the rest to keep BizNode calm.
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {DATA_HUB_TOOLS.map((tool) => {
          const active = primary === tool;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => onSelect(tool)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              }`}
            >
              {tool}
              {active ? (
                <span className="mt-1 block text-[10px] font-medium opacity-80">Active stack</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
