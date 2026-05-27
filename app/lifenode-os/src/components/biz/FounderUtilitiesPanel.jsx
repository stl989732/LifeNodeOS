"use client";

import { Activity, Calculator, NotebookPen, TrendingDown, TrendingUp } from "lucide-react";

const AUTOMATION_FLOWS = [
  { id: "meta-leads", label: "Meta Lead Ads Stream", status: "ACTIVE", healthy: true },
  { id: "sms-seq", label: "Conditional SMS Sequence", status: "INITIALIZED", healthy: true },
  { id: "ghl-sync", label: "GoHighLevel CRM Sync", status: "MONITORING", healthy: true },
  { id: "airtable", label: "Airtable Pipeline Webhook", status: "BOTTLENECK", healthy: false },
];

export default function FounderUtilitiesPanel({
  showNotesPanel,
  setShowNotesPanel,
  showCalculatorPanel,
  setShowCalculatorPanel,
  founderNotes,
  setFounderNotes,
  calcInput,
  setCalcInput,
  runCalculation,
}) {
  const activeOpps = 68;
  const atRisk = 24;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Founder Utilities</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNotesPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/75"
          >
            <NotebookPen size={13} />
            {showNotesPanel ? "Close Notes" : "Open Notes"}
          </button>
          <button
            type="button"
            onClick={() => setShowCalculatorPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white/75"
          >
            <Calculator size={13} />
            {showCalculatorPanel ? "Close Calculator" : "Open Calculator"}
          </button>
        </div>
      </div>

      {showNotesPanel ? (
        <div className="rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Notes</p>
          <textarea
            value={founderNotes}
            onChange={(e) => setFounderNotes(e.target.value)}
            placeholder="Capture ideas, reminders, or strategic notes here..."
            className="w-full min-h-[110px] rounded-xl border border-white/60 bg-white/50 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
          />
        </div>
      ) : null}

      {showCalculatorPanel ? (
        <div className="rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Calculator</p>
          <input
            value={calcInput}
            onChange={(e) => setCalcInput(e.target.value.replace(/[^0-9+\-*/().% ]/g, ""))}
            placeholder="0"
            className="mb-3 w-full rounded-xl border border-white/60 bg-white/50 p-3 text-right text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
          />
          <div className="grid grid-cols-4 gap-2">
            {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCalcInput((prev) => prev + key)}
                className="rounded-lg bg-white/70 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCalcInput("")}
              className="col-span-2 rounded-lg bg-slate-200/80 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300/80"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={runCalculation}
              className="col-span-2 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              =
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={16} className="text-indigo-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Automation Posture Switchboard
          </p>
        </div>
        <ul className="space-y-2">
          {AUTOMATION_FLOWS.map((flow) => (
            <li
              key={flow.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/50 bg-white/45 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-800">{flow.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  flow.healthy
                    ? "bg-emerald-500/15 text-emerald-800"
                    : "bg-amber-500/15 text-amber-900"
                }`}
              >
                {flow.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/55 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Pipeline Velocity
          </p>
          <span className="text-[10px] font-semibold text-slate-500">Live estimate</span>
        </div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <TrendingUp size={14} />
            {activeOpps}% Active
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <TrendingDown size={14} />
            {atRisk}% At risk
          </div>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/60 ring-1 ring-white/70">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${activeOpps}%` }}
            title="Active opportunities"
          />
          <div
            className="h-full bg-gradient-to-r from-amber-300 to-rose-400 transition-all"
            style={{ width: `${atRisk}%` }}
            title="Deals at risk"
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          Closed-won volume trending up; stalled proposals need a Discovery Hub resync or manual
          follow-up this week.
        </p>
      </div>
    </div>
  );
}
