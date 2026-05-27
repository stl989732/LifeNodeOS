"use client";

import Link from "next/link";
import type { ClientProfile, EodLog, ValueMetrics } from "@/lib/vanode/types";

type Props = {
  client: ClientProfile | null;
  metrics: ValueMetrics;
  recentEod: EodLog[];
};

export function ClientProofView({ client, metrics, recentEod }: Props) {
  const name = client?.name ?? "Your client";
  const streak =
    metrics.inboxTriaged > 0
      ? `${metrics.inboxReplied} replies · ${metrics.inboxTriaged} triaged`
      : "Inbox metrics will appear as your VA logs triage work.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50/40 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-teal-700">
          Proof of value · read-only
        </p>
        <h1 className="mt-3 text-center text-2xl font-bold tracking-tight">
          {name}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Executive summary prepared by LifeNode VANode — achievements, not
          hours.
        </p>

        <div className="mt-8 rounded-2xl border border-teal-200/60 bg-teal-50/50 p-5">
          <div className="text-xs font-bold uppercase text-teal-900/80">
            Value score
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-teal-950">
            {metrics.hoursSavedThisMonth}
            <span className="ml-1 text-base font-semibold text-teal-800">
              hrs reclaimed
            </span>
          </div>
          <p className="mt-2 text-sm text-teal-900/85">
            This month, your VA saved you an estimated{" "}
            <strong>{metrics.hoursSavedThisMonth} hours</strong> of administrative
            work you did not have to touch.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Inbox rhythm
          </div>
          <p className="mt-2 text-sm text-slate-800">{streak}</p>
        </div>

        <div className="mt-6">
          <div className="text-xs font-bold uppercase text-slate-500">
            Recent wins
          </div>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {recentEod.slice(0, 4).map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                {l.accomplishments.slice(0, 140)}
                {l.accomplishments.length > 140 ? "…" : ""}
              </li>
            ))}
            {recentEod.length === 0 && (
              <li className="text-slate-500">No published EOD lines yet.</li>
            )}
          </ul>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-500">
          Linos can attach weekly EOD digests from recordings + accomplishments
          when your operator enables cloud share.
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/vanode"
            className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
          >
            Operator dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
