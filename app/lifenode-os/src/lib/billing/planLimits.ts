import type { ShellHatKey } from "@/lib/node-mappings";
import { ACTIVE_TO_HAT_KEY, type ActiveNodeName } from "@/lib/node-mappings";
import type { PlanEntitlements } from "./planEntitlements";

export const UNLIMITED_PLAN_CAP = 999;

export function isUnlimitedPlanCap(value: number): boolean {
  return value >= UNLIMITED_PLAN_CAP;
}

export function canAddWithinPlanLimit(current: number, max: number): boolean {
  if (isUnlimitedPlanCap(max)) return true;
  return current < max;
}

export function shellHatAllowed(
  entitlements: PlanEntitlements,
  hat: ShellHatKey,
): boolean {
  return entitlements.nodes.includes(hat);
}

export function activeNodeAllowed(
  entitlements: PlanEntitlements,
  node: ActiveNodeName,
): boolean {
  return shellHatAllowed(entitlements, ACTIVE_TO_HAT_KEY[node]);
}

export type PlanLimitKey =
  | "trackers"
  | "integrations"
  | "va_clients"
  | "invoices"
  | "eod_records"
  | "transcriptions"
  | "kanban_boards"
  | "chef_recipes"
  | "screen_captures";

export const PLAN_LIMIT_LABELS: Record<PlanLimitKey, string> = {
  trackers: "LifePulse trackers",
  integrations: "app integrations",
  va_clients: "VANode client workspaces",
  invoices: "invoices",
  eod_records: "EOD reports",
  transcriptions: "meeting transcriptions",
  kanban_boards: "kanban boards",
  chef_recipes: "ChefNode recipe generations",
  screen_captures: "EOD screen recordings",
};

export function planLimitMessage(
  limit: PlanLimitKey,
  planDisplayName: string,
): string {
  const label = PLAN_LIMIT_LABELS[limit];
  if (planDisplayName === "Core") {
    return `You've reached the ${label} limit on Core. Upgrade to Sync or Nexus for more.`;
  }
  if (planDisplayName === "Sync") {
    return `You've reached the ${label} limit on Sync. Upgrade to Nexus for unlimited use.`;
  }
  return `You've reached the ${label} limit on ${planDisplayName}.`;
}
