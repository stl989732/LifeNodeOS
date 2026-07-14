import type { PlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { isNearPlanLimit } from "@/src/lib/billing/meterPlanResource";
import { isUnlimitedPlanCap, PLAN_LIMIT_LABELS } from "@/src/lib/billing/planLimits";

export type PlanUsageWarning = {
  id: string;
  label: string;
  used: number;
  limit: number;
  period: "day" | "month";
  message: string;
};

export type PlanUsageAlertDraft = {
  bridgeId: string;
  triggerSource: string;
  condition: string;
  message: string;
  primaryRoute: string;
  primaryActionLabel: string;
  actionKind: "navigate_route";
};

export function buildPlanUsageWarnings(input: {
  entitlements: PlanEntitlements;
  aiCreditsUsed: number;
  linosAssistantUsed: number;
  invoicesUsed: number;
  eodRecordsUsed: number;
  transcriptionsUsed: number;
  kanbanBoardsUsed: number;
}): PlanUsageWarning[] {
  const e = input.entitlements;
  const rows: Array<{
    id: string;
    label: string;
    used: number;
    limit: number;
    period: "day" | "month";
  }> = [
    {
      id: "usage-ai-credits",
      label: "AI credits",
      used: input.aiCreditsUsed,
      limit: e.aiCreditsDaily,
      period: "day",
    },
    {
      id: "usage-linos-assistant",
      label: "Linos chats",
      used: input.linosAssistantUsed,
      limit: e.features.linos_assistant,
      period: "day",
    },
    {
      id: "usage-invoices",
      label: PLAN_LIMIT_LABELS.invoices,
      used: input.invoicesUsed,
      limit: e.maxInvoices,
      period: "month",
    },
    {
      id: "usage-eod-records",
      label: PLAN_LIMIT_LABELS.eod_records,
      used: input.eodRecordsUsed,
      limit: e.maxEodRecords,
      period: "month",
    },
    {
      id: "usage-transcriptions",
      label: PLAN_LIMIT_LABELS.transcriptions,
      used: input.transcriptionsUsed,
      limit: e.maxTranscriptions,
      period: "month",
    },
    {
      id: "usage-kanban-boards",
      label: PLAN_LIMIT_LABELS.kanban_boards,
      used: input.kanbanBoardsUsed,
      limit: e.maxKanbanBoards,
      period: "month",
    },
  ];

  const warnings: PlanUsageWarning[] = [];
  for (const row of rows) {
    if (isUnlimitedPlanCap(row.limit)) continue;
    if (row.used >= row.limit) {
      warnings.push({
        ...row,
        message: `You've used all ${row.limit} ${row.label} for this ${row.period} on ${e.displayName}. Upgrade for more capacity.`,
      });
      continue;
    }
    if (!isNearPlanLimit(row.used, row.limit)) continue;
    const remaining = row.limit - row.used;
    warnings.push({
      ...row,
      message: `Heads up — you've used ${row.used} of ${row.limit} ${row.label} this ${row.period}. Only ${remaining} left on ${e.displayName}.`,
    });
  }
  return warnings;
}

export function planUsageWarningsToAlerts(
  warnings: PlanUsageWarning[],
): PlanUsageAlertDraft[] {
  return warnings.map((w) => ({
    bridgeId: w.id,
    triggerSource: "Plan usage",
    condition: `${w.used}/${w.limit} ${w.label}`,
    message: w.message,
    primaryRoute: "/pricing",
    primaryActionLabel: "View plans",
    actionKind: "navigate_route" as const,
  }));
}

export const USAGE_ALERT_BRIDGE_IDS = [
  "usage-ai-credits",
  "usage-linos-assistant",
  "usage-invoices",
  "usage-eod-records",
  "usage-transcriptions",
  "usage-kanban-boards",
] as const;
