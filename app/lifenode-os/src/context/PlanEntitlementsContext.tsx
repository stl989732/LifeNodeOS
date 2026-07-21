"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { PlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import {
  canAddWithinPlanLimit,
  type PlanLimitKey,
  planLimitMessage,
} from "@/src/lib/billing/planLimits";
import type { PlanKey } from "@/src/lib/billing/plans";
import UpgradePlanModal from "@/src/components/billing/UpgradePlanModal";

type PlanOverrideInfo = {
  plan: PlanKey;
  source: "dev" | "beta";
};

type SubscriptionPayload = {
  plan: PlanKey;
  isPaid: boolean;
  displayName: string;
  entitlements: PlanEntitlements;
  planOverride: PlanOverrideInfo | null;
};

type UpgradePrompt = {
  title: string;
  message: string;
};

type PlanEntitlementsContextValue = {
  plan: PlanKey;
  isPaid: boolean;
  displayName: string;
  entitlements: PlanEntitlements;
  loading: boolean;
  planOverride: PlanOverrideInfo | null;
  refresh: () => Promise<void>;
  canAdd: (limit: PlanLimitKey, currentCount: number) => boolean;
  promptUpgrade: (limit: PlanLimitKey) => void;
  promptUpgradeMessage: (input: UpgradePrompt) => void;
};

const PlanEntitlementsContext = createContext<PlanEntitlementsContextValue | null>(
  null,
);

const DEFAULT_ENTITLEMENTS = getPlanEntitlements("core");

function limitMax(
  entitlements: PlanEntitlements,
  limit: PlanLimitKey,
): number {
  switch (limit) {
    case "trackers":
      return entitlements.maxTrackers;
    case "integrations":
      return entitlements.maxIntegrations;
    case "va_clients":
      return entitlements.maxVaClients;
    case "invoices":
      return entitlements.maxInvoices;
    case "eod_records":
      return entitlements.maxEodRecords;
    case "transcriptions":
      return entitlements.maxTranscriptions;
    case "kanban_boards":
      return entitlements.maxKanbanBoards;
    case "chef_recipes":
      return entitlements.maxChefRecipesMonthly;
    case "screen_captures":
      return entitlements.maxScreenCapturesMonthly;
    default:
      return 0;
  }
}

export function PlanEntitlementsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SubscriptionPayload>({
    plan: "core",
    isPaid: false,
    displayName: DEFAULT_ENTITLEMENTS.displayName,
    entitlements: DEFAULT_ENTITLEMENTS,
    planOverride: null,
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeCopy, setUpgradeCopy] = useState<UpgradePrompt>({
    title: "Upgrade your plan",
    message: "Unlock more capacity with Sync or Nexus.",
  });

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setSnapshot({
        plan: "core",
        isPaid: false,
        displayName: DEFAULT_ENTITLEMENTS.displayName,
        entitlements: DEFAULT_ENTITLEMENTS,
        planOverride: null,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("subscription fetch failed");
      const data = (await res.json()) as {
        plan?: PlanKey;
        isPaid?: boolean;
        displayName?: string;
        entitlements?: PlanEntitlements;
        planOverride?: PlanOverrideInfo | null;
      };
      const plan = data.plan ?? "core";
      setSnapshot({
        plan,
        isPaid: Boolean(data.isPaid),
        displayName: data.displayName ?? getPlanEntitlements(plan).displayName,
        entitlements: data.entitlements ?? getPlanEntitlements(plan),
        planOverride: data.planOverride ?? null,
      });
    } catch {
      // Keep the last known plan on transient fetch failures so paid users
      // don't get silently downgraded to Core UI (e.g. hidden download buttons).
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const promptUpgradeMessage = useCallback((input: UpgradePrompt) => {
    setUpgradeCopy(input);
    setUpgradeOpen(true);
  }, []);

  const promptUpgrade = useCallback(
    (limit: PlanLimitKey) => {
      promptUpgradeMessage({
        title: "Upgrade your plan",
        message: planLimitMessage(limit, snapshot.displayName),
      });
    },
    [promptUpgradeMessage, snapshot.displayName],
  );

  const canAdd = useCallback(
    (limit: PlanLimitKey, currentCount: number) => {
      return canAddWithinPlanLimit(currentCount, limitMax(snapshot.entitlements, limit));
    },
    [snapshot.entitlements],
  );

  const value = useMemo<PlanEntitlementsContextValue>(
    () => ({
      plan: snapshot.plan,
      isPaid: snapshot.isPaid,
      displayName: snapshot.displayName,
      entitlements: snapshot.entitlements,
      loading,
      planOverride: snapshot.planOverride,
      refresh,
      canAdd,
      promptUpgrade,
      promptUpgradeMessage,
    }),
    [
      snapshot,
      loading,
      refresh,
      canAdd,
      promptUpgrade,
      promptUpgradeMessage,
    ],
  );

  const overrideLabel = snapshot.planOverride
    ? snapshot.planOverride.source === "dev"
      ? "Dev plan override"
      : "Beta access"
    : null;

  return (
    <PlanEntitlementsContext.Provider value={value}>
      {children}
      {overrideLabel ? (
        <div
          className="pointer-events-none fixed bottom-3 left-3 z-[500] rounded-lg border border-amber-400/40 bg-amber-500/95 px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-lg"
          role="status"
        >
          {overrideLabel}: {snapshot.planOverride?.plan}
        </div>
      ) : null}
      <UpgradePlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title={upgradeCopy.title}
        message={upgradeCopy.message}
        plan={snapshot.plan}
      />
    </PlanEntitlementsContext.Provider>
  );
}

export function usePlanEntitlements(): PlanEntitlementsContextValue {
  const ctx = useContext(PlanEntitlementsContext);
  if (!ctx) {
    throw new Error(
      "usePlanEntitlements must be used within PlanEntitlementsProvider",
    );
  }
  return ctx;
}

export function usePlanEntitlementsOptional(): PlanEntitlementsContextValue | null {
  return useContext(PlanEntitlementsContext);
}
