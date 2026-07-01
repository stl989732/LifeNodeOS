"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { AdminDashboardStats, HealthStatus } from "@/src/lib/admin/getAdminDashboardStats";
import { ADMIN_SIGNIN_QUERY } from "@/src/lib/admin/adminAuth";

function statusStyles(status: HealthStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-900";
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { status } = useSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (res.status === 401) {
        setError("Sign in to view the admin dashboard.");
        setStats(null);
        return;
      }
      if (res.status === 403) {
        setError(
          "Your account is not on the admin allowlist. Add your email to LIFENODE_ADMIN_EMAILS in .env.local (local) or Vercel env (production), then use Sign in as Admin on the sign-in page.",
        );
        setStats(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load admin stats");
      setStats((await res.json()) as AdminDashboardStats);
    } catch {
      setError("Could not load dashboard data. Check the server logs.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void load();
    } else if (status === "unauthenticated") {
      setLoading(false);
      setError("Sign in to view the admin dashboard.");
    }
  }, [status, load]);

  return (
    <div
      className="min-h-screen px-4 py-10 sm:px-6 lg:px-8"
      style={{
        background: "linear-gradient(135deg, #FFFAFA 0%, #E0FFFF 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              LifeNode OS
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Admin dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Account totals by plan, active vs deleted users, and production health
              signals. Local-only access via admin allowlist env vars.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || status !== "authenticated"}
              className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/shell"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Back to app
            </Link>
          </div>
        </header>

        {error ? (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-950">
            {error}{" "}
            {status === "unauthenticated" ? (
              <Link
                href={`/auth/signin?${ADMIN_SIGNIN_QUERY}=1`}
                className="font-semibold underline"
              >
                Sign in as Admin
              </Link>
            ) : null}
          </div>
        ) : null}

        {stats ? (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total registered"
                value={stats.users.totalRegistered}
                hint="Supabase Auth accounts"
              />
              <StatCard
                label="Active accounts"
                value={stats.users.activeAccounts}
                hint="Registered minus deleted tombstones"
              />
              <StatCard
                label="Deleted accounts"
                value={stats.users.deletedAccounts}
                hint="Rows in deleted_account_ids"
              />
              <StatCard
                label="Subscription rows"
                value={stats.users.subscriptionRows}
                hint="user_subscriptions table"
              />
            </section>

            <section className="mb-8 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-slate-900">Users by plan</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Effective plan after billing status rules. Accounts without a
                  subscription row count as Core.
                </p>
                <dl className="mt-5 space-y-3">
                  {(["core", "sync", "nexus"] as const).map((plan) => (
                    <div
                      key={plan}
                      className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-3"
                    >
                      <dt className="text-sm font-medium capitalize text-slate-700">
                        {plan}
                      </dt>
                      <dd className="text-xl font-bold tabular-nums text-slate-900">
                        {stats.users.byPlan[plan]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Subscription status
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Raw status values from user_subscriptions.
                </p>
                <dl className="mt-5 space-y-3">
                  {Object.keys(stats.users.byStatus).length ? (
                    Object.entries(stats.users.byStatus).map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-3"
                      >
                        <dt className="text-sm font-medium capitalize text-slate-700">
                          {status.replace(/_/g, " ")}
                        </dt>
                        <dd className="text-xl font-bold tabular-nums text-slate-900">
                          {count}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No subscription rows yet.</p>
                  )}
                </dl>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    App health monitoring
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Environment and datastore checks for this deployment.
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Updated {new Date(stats.generatedAt).toLocaleString()}
                </p>
              </div>
              <ul className="mt-5 space-y-3">
                {stats.health.map((check) => (
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
            </section>
          </>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-6 py-16 text-center text-sm text-slate-600 shadow-sm">
            Loading dashboard…
          </div>
        ) : null}
      </div>
    </div>
  );
}
