"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { HealthCheck } from "@/src/lib/admin/getAdminDashboardStats";

function statusStyles(status: HealthCheck["status"]) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-900";
  }
}

type Props = {
  checks: HealthCheck[];
  generatedAt: string;
};

export default function AdminHealthPanel({ checks, generatedAt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-6 py-5 text-left transition hover:bg-white/50"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            App Health Monitoring
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Environment and datastore checks for this deployment.
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="space-y-3 border-t border-slate-200/80 px-6 pb-5 pt-4">
          {checks.map((check) => (
            <li
              key={check.name}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 ${statusStyles(check.status)}`}
            >
              <div>
                <p className="text-sm font-semibold">{check.name}</p>
                <p className="mt-0.5 text-sm opacity-90">{check.detail}</p>
              </div>
              <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {check.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="border-t border-slate-200/60 px-6 py-3 text-xs text-slate-500">
        Updated {new Date(generatedAt).toLocaleString()}
      </p>
    </section>
  );
}
