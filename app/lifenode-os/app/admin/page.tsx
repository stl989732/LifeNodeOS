"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useSession } from "next-auth/react";
import { signOutWithClientCleanup } from "@/src/lib/sessionClientIsolation";
import type { AdminDashboardStats } from "@/src/lib/admin/getAdminDashboardStats";
import type { AdminUserSegment } from "@/src/lib/admin/getAdminUserDirectory";
import { ADMIN_SIGNIN_QUERY } from "@/src/lib/admin/adminAuth";
import AdminUserDirectoryPanel from "@/components/admin/AdminUserDirectoryPanel";
import AdminHealthPanel from "@/components/admin/AdminHealthPanel";
import AdminSupportSection from "@/components/admin/AdminSupportSection";

type StatKey = AdminUserSegment;

const STAT_SEGMENTS: { key: StatKey; label: string; hint: string }[] = [
  {
    key: "registered",
    label: "Total registered",
    hint: "Supabase Auth accounts",
  },
  {
    key: "active",
    label: "Active accounts",
    hint: "Registered minus deleted tombstones",
  },
  {
    key: "deleted",
    label: "Deleted accounts",
    hint: "Rows in deleted_account_ids",
  },
  {
    key: "subscriptions",
    label: "Subscription rows",
    hint: "user_subscriptions table",
  },
];

function StatCard({
  label,
  value,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  value: number | string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
        selected
          ? "border-teal-400 ring-2 ring-teal-300/60"
          : "border-slate-200/80 hover:border-teal-200 hover:shadow-md"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
      <p className="mt-2 text-xs font-medium text-teal-700">
        {selected ? "Showing details below" : "Click to view emails & tools"}
      </p>
    </button>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<StatKey | null>(null);

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

  const statValue = (key: StatKey): number => {
    if (!stats) return 0;
    switch (key) {
      case "registered":
        return stats.users.totalRegistered;
      case "active":
        return stats.users.activeAccounts;
      case "deleted":
        return stats.users.deletedAccounts;
      case "subscriptions":
        return stats.users.subscriptionRows;
    }
  };

  const toggleSegment = (key: StatKey) => {
    setSelectedSegment((prev) => (prev === key ? null : key));
  };

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
              Account totals by plan, active vs deleted users, marketing contact
              lists, support intake, and production health signals.
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
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={() =>
                  void signOutWithClientCleanup(session?.user?.id, {
                    callbackUrl: "/",
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Log out
              </button>
            ) : null}
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
            <section className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {STAT_SEGMENTS.map(({ key, label, hint }) => (
                <StatCard
                  key={key}
                  label={label}
                  value={statValue(key)}
                  hint={hint}
                  selected={selectedSegment === key}
                  onSelect={() => toggleSegment(key)}
                />
              ))}
            </section>

            {selectedSegment ? (
              <AdminUserDirectoryPanel
                segment={selectedSegment}
                onClose={() => setSelectedSegment(null)}
              />
            ) : null}

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
                    Object.entries(stats.users.byStatus).map(([st, count]) => (
                      <div
                        key={st}
                        className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-3"
                      >
                        <dt className="text-sm font-medium capitalize text-slate-700">
                          {st.replace(/_/g, " ")}
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

            <div className="mb-8">
              <AdminSupportSection />
            </div>

            <AdminHealthPanel
              checks={stats.health}
              generatedAt={stats.generatedAt}
            />
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
