export type PlanKey = "core" | "sync" | "nexus";

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

export type BillingInterval = "monthly" | "annual";

export type PaidPlanKey = Exclude<PlanKey, "core">;

export const PLAN_KEYS: PlanKey[] = ["core", "sync", "nexus"];

export function isPlanKey(value: string): value is PlanKey {
  return PLAN_KEYS.includes(value as PlanKey);
}

export function isPaidPlanKey(value: string): value is PaidPlanKey {
  return value === "sync" || value === "nexus";
}
