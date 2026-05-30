"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import type { FamilyEventRow } from "@/app/api/home/family-events/route";

export type DailyScheduleItem = {
  id: string;
  time: string;
  title: string;
  category?: string;
};

type Props = {
  /** Optional ISO date (YYYY-MM-DD). Defaults to today. */
  date?: string;
  /** Inject items instead of fetching (testing or parent-managed). */
  items?: DailyScheduleItem[];
  className?: string;
};

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapRow(row: FamilyEventRow): DailyScheduleItem {
  return {
    id: row.id,
    time: formatEventTime(row.event_time),
    title: row.title,
    category: row.category,
  };
}

export default function DailyScheduleCard({
  date,
  items: itemsProp,
  className = "",
}: Props) {
  const [items, setItems] = useState<DailyScheduleItem[]>(itemsProp ?? []);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState<string | null>(null);

  const targetDate = date ?? todayDateKey();

  const load = useCallback(async () => {
    if (itemsProp) {
      setItems(itemsProp);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/home/family-events?date=${encodeURIComponent(targetDate)}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!res.ok) {
        setItems([]);
        setError("Could not load schedule.");
        return;
      }
      const data = (await res.json()) as { events?: FamilyEventRow[] };
      setItems((data.events ?? []).map(mapRow));
    } catch {
      setItems([]);
      setError("Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }, [itemsProp, targetDate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-white/[0.03] p-4 ${className}`}
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-400/90">
        Today&apos;s family schedule
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#90A1B9]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing schedule…
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-6 text-center text-sm leading-relaxed text-[#90A1B9]">
          Your schedule is clear today. Lino is watching the horizon.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2.5"
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#90A1B9]" />
              <span className="text-[10px] font-mono text-[#90A1B9]">{item.time}</span>
              <span className="text-sm font-medium text-slate-200">{item.title}</span>
            </li>
          ))}
        </ul>
      )}

      {error && items.length === 0 && !loading ? (
        <p className="mt-2 text-center text-[10px] text-slate-500">{error}</p>
      ) : null}
    </div>
  );
}
