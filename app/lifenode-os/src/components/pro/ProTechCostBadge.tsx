"use client";

import { DollarSign } from "lucide-react";

type ProTechCostBadgeProps = {
  /** Rough estimate when API gateway deploy context is active */
  estimatedMonthlyUsd?: number;
};

export default function ProTechCostBadge({
  estimatedMonthlyUsd = 12,
}: ProTechCostBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900"
      title="Cost Watcher — based on mock usage profile (wire to cloud billing API)"
    >
      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
      Est. cloud cost: ${estimatedMonthlyUsd}/mo
    </div>
  );
}
