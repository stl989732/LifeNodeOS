"use client";

import { useEffect, useState } from "react";
import { Activity, Moon, Sparkles } from "lucide-react";
import type { VitalHealthMetricRow } from "@/src/lib/vitalPulse/types";

function formatDate(iso: string) {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | null;
  unit?: string;
  icon: typeof Moon;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/50 bg-white/55 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl ${accent}`}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
        {value != null ? value : "—"}
        {value != null && unit ? (
          <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

/** Glassmorphism placeholders with calm VitalNode pulse while loading or awaiting data. */
function MetricsPulseSkeleton({ empty }: { empty?: boolean }) {
  const breathe = "vital-pulse-breathe vital-pulse-breathe--mid";
  const cards = [
    { label: "Sleep", glow: "vital-pulse-breathe--high" },
    { label: "Activity", glow: "vital-pulse-breathe--mid" },
    { label: "Recovery", glow: "vital-pulse-breathe--low" },
  ];

  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-teal-400/70 ${breathe}`}
          aria-hidden
        />
        <p className="text-sm text-slate-500">
          {empty
            ? "Awaiting your first vital sync — scores will appear here."
            : "Listening to your recovery stream…"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-white/50 bg-white/45 p-4 backdrop-blur-xl ${card.glow} ${breathe}`}
          >
            <div className="h-3 w-16 rounded-full bg-slate-200/80" />
            <div className="mt-4 h-8 w-20 rounded-lg bg-slate-200/70" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {card.label}
            </p>
          </div>
        ))}
      </div>
      <div className={`h-3 w-40 max-w-full rounded-full bg-slate-200/60 ${breathe}`} />
    </div>
  );
}

export default function VitalPulseMetricsPanel() {
  const [metrics, setMetrics] = useState<VitalHealthMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/vital-pulse/metrics?limit=30", {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(
            typeof data?.error === "string"
              ? data.error
              : "Could not load metrics.",
          );
          setMetrics([]);
          return;
        }

        const rows: unknown[] = Array.isArray(data?.metrics) ? data.metrics : [];
        const normalized = rows.filter(
          (row: unknown): row is VitalHealthMetricRow =>
            typeof row === "object" &&
            row !== null &&
            "metric_date" in row &&
            typeof (row as { metric_date?: unknown }).metric_date === "string",
        );
        setMetrics(normalized);
      } catch {
        if (!cancelled) {
          setError("Network error loading vital metrics.");
          setMetrics([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = metrics[0] ?? null;
  /** Show cards only when we have a row; skeleton covers loading, empty, and error-without-data. */
  const showMetrics = !loading && latest != null;

  return (
    <section className="rounded-3xl border border-white/55 bg-white/40 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800/80">
            VitalNode stream
          </p>
          <h2 className="text-lg font-semibold text-slate-900">Recovery analytics</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live scores from your{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">vital_health_metrics</code>{" "}
            table.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/80 bg-teal-50/90 px-2.5 py-1 text-[10px] font-semibold text-teal-900">
          <Sparkles className="h-3 w-3" />
          Unified DB stream
        </span>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {error} Run the Supabase migration{" "}
          <code className="text-xs">20260520140000_vital_health_metrics.sql</code> if this
          table is missing.
        </p>
      ) : null}

      {showMetrics ? (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Latest entry · {formatDate(latest.metric_date)}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              label="Sleep"
              value={latest.sleep_score}
              unit="/ 100"
              icon={Moon}
              accent="ring-1 ring-indigo-100/80"
            />
            <MetricCard
              label="Activity"
              value={latest.active_calories}
              unit="kcal"
              icon={Activity}
              accent="ring-1 ring-emerald-100/80"
            />
            <MetricCard
              label="Recovery"
              value={latest.readiness_score}
              unit="/ 100"
              icon={Sparkles}
              accent="ring-1 ring-teal-100/80"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            HRV baseline ·{" "}
            <span className="font-semibold text-slate-700">
              {latest.hrv != null ? `${latest.hrv} ms` : "—"}
            </span>
          </p>
        </>
      ) : (
        <MetricsPulseSkeleton empty={!loading && latest == null} />
      )}
    </section>
  );
}
