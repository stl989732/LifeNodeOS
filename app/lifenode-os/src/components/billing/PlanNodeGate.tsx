"use client";

import Link from "next/link";
import type { ActiveNodeName } from "@/lib/node-mappings";
import { NODE_LABEL } from "@/lib/node-mappings";
import { activeNodeAllowed } from "@/src/lib/billing/planLimits";
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";

type Props = {
  node: ActiveNodeName;
  children: React.ReactNode;
};

export default function PlanNodeGate({ node, children }: Props) {
  const { entitlements, displayName, loading } = usePlanEntitlements();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading your plan…
      </div>
    );
  }

  if (activeNodeAllowed(entitlements, node)) {
    return <>{children}</>;
  }

  const label = NODE_LABEL[node];
  const needsNexus = node === "TraderNode" || node === "ProNode";
  const upgradePlan = needsNexus ? "Nexus" : "Sync";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-teal-700">
        {displayName} plan
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">
        {label} is on {upgradePlan}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Core includes BizNode, VANode, and HomeNode. Upgrade to unlock {label}{" "}
        and more daily AI capacity.
      </p>
      <Link
        href="/pricing"
        className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        View plans
      </Link>
    </div>
  );
}
