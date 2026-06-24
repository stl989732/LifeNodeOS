"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CreditCard, RefreshCw } from "lucide-react";
import { VANODE_STORAGE_KEY } from "@/lib/vanode/constants";
import { loadVanode } from "@/lib/vanode/storage";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";

type UsageApiResponse = {
  aiCreditsUsed?: number;
  trackersUsed?: number;
  integrationsUsed?: number;
  vaClientsUsed?: number;
  displayName?: string;
  isPaid?: boolean;
  limits?: {
    aiCreditsDaily?: number;
    maxTrackers?: number;
    maxIntegrations?: number;
    maxVaClients?: number;
    maxChefRecipesMonthly?: number;
  };
  chefRecipesUsed?: number;
};

type MeterRow = {
  id: string;
  label: string;
  used: number;
  limit: number;
  hint?: string;
};

function formatLimit(limit: number): string {
  return limit >= 999 ? "Unlimited" : String(limit);
}

function usagePercent(used: number, limit: number): number {
  if (limit >= 999) return used > 0 ? 8 : 0;
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function barTone(used: number, limit: number): string {
  if (limit >= 999) return "bg-teal-500";
  const ratio = limit > 0 ? used / limit : 0;
  if (ratio >= 1) return "bg-rose-500";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-teal-500";
}

function UsageMeter({ label, used, limit, hint }: Omit<MeterRow, "id">) {
  const pct = usagePercent(used, limit);
  const atCap = limit < 999 && used >= limit;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p
          className={`text-xs font-semibold tabular-nums ${
            atCap ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {used} / {formatLimit(limit)}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit >= 999 ? used || 1 : limit}
        aria-label={`${label}: ${used} of ${formatLimit(limit)} used`}
      >
        <div
          className={`h-full rounded-full transition-all ${barTone(used, limit)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function PlanUsageSection() {
  const { data: session } = useSession();
  const { plan, displayName, entitlements, loading: planLoading, refresh: refreshPlan } =
    usePlanEntitlements();
  const [usage, setUsage] = useState<UsageApiResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const [usageRes, subRes] = await Promise.all([
        fetch("/api/billing/usage", { credentials: "include", cache: "no-store" }),
        fetch("/api/billing/subscription", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (usageRes.ok) {
        setUsage((await usageRes.json()) as UsageApiResponse);
      }

      if (subRes.ok) {
        const sub = (await subRes.json()) as { customerPortalUrl?: string | null };
        setPortalUrl(sub.customerPortalUrl ?? null);
      }
    } catch {
      setUsage(null);
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage, session?.user?.id]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshPlan(), loadUsage()]);
    } finally {
      setRefreshing(false);
    }
  };

  const userId = session?.user?.id;
  const localVanode = userId
    ? loadVanode(userScopedStorageKey(VANODE_STORAGE_KEY, userId))
    : loadVanode();
  const localClients = localVanode.clients.length;

  const limits = usage?.limits ?? {
    aiCreditsDaily: entitlements.aiCreditsDaily,
    maxTrackers: entitlements.maxTrackers,
    maxIntegrations: entitlements.maxIntegrations,
    maxVaClients: entitlements.maxVaClients,
    maxChefRecipesMonthly: entitlements.maxChefRecipesMonthly,
  };

  const meters: MeterRow[] = [
    {
      id: "ai",
      label: "AI credits (today, UTC)",
      used: usage?.aiCreditsUsed ?? 0,
      limit: limits.aiCreditsDaily ?? entitlements.aiCreditsDaily,
      hint: "Resets at midnight UTC. Lino, VANode AI, BizNode, LifePulse, and Chef share this pool.",
    },
    {
      id: "chef",
      label: "ChefNode recipes (this month, UTC)",
      used: usage?.chefRecipesUsed ?? 0,
      limit: limits.maxChefRecipesMonthly ?? entitlements.maxChefRecipesMonthly,
      hint: "Full recipe generations in HomeNode kitchen. Resets on the 1st UTC.",
    },
    {
      id: "trackers",
      label: "LifePulse trackers",
      used: usage?.trackersUsed ?? 0,
      limit: limits.maxTrackers ?? entitlements.maxTrackers,
    },
    {
      id: "clients",
      label: "VANode clients",
      used: Math.max(usage?.vaClientsUsed ?? 0, localClients),
      limit: limits.maxVaClients ?? entitlements.maxVaClients,
    },
    {
      id: "integrations",
      label: "Active integrations",
      used: usage?.integrationsUsed ?? 0,
      limit: limits.maxIntegrations ?? entitlements.maxIntegrations,
      hint: "Connected or syncing app cards across nodes.",
    },
  ];

  const planLabel = usage?.displayName ?? displayName;
  const loading = planLoading || loadingUsage;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Current plan
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
            {loading ? "Loading…" : planLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {plan === "core"
              ? "Core — free tier with ChefNode (2 recipes/month), daily AI credits, and capacity limits."
              : plan === "sync"
                ? "Sync — more nodes, AI, and workspace capacity."
                : "Nexus — full node suite with high daily AI limits."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={refreshing}
          className="shrink-0 rounded-lg border border-slate-200/80 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
          aria-label="Refresh plan usage"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Usage today & totals
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-slate-200/60 dark:bg-white/5"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {meters.map((m) => (
              <UsageMeter
                key={m.id}
                label={m.label}
                used={m.used}
                limit={m.limit}
                hint={m.hint}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          View plans
        </Link>
        {plan !== "core" && portalUrl ? (
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            <CreditCard className="h-4 w-4" />
            Manage billing
          </a>
        ) : plan === "core" ? (
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Upgrade to Sync
          </Link>
        ) : null}
      </div>
    </div>
  );
}
