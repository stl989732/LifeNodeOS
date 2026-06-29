import { getPlanEntitlements } from "./planEntitlements";
import type { PlanEntitlements } from "./planEntitlements";
import type { PlanKey } from "./plans";
import { resolvePlanOverride, type PlanOverride } from "./planOverride";
import {
  effectivePlanFromRow,
  ensureCoreSubscription,
  getSubscriptionRow,
  type UserSubscriptionRow,
} from "./subscriptionStore";

export type UserPlanSnapshot = {
  plan: PlanKey;
  status: UserSubscriptionRow["status"];
  entitlements: PlanEntitlements;
  subscription: UserSubscriptionRow;
  isPaid: boolean;
  currentPeriodEnd: string | null;
  variantSlug: string | null;
  lemonCustomerPortalUrl: string | null;
  /** Set when dev or beta env override is active (not a real subscription). */
  planOverride: PlanOverride | null;
};

export async function getUserPlan(userId: string): Promise<PlanKey> {
  const snapshot = await getUserPlanSnapshot(userId);
  return snapshot.plan;
}

export async function getUserPlanSnapshot(
  userId: string,
): Promise<UserPlanSnapshot> {
  let row = await getSubscriptionRow(userId);
  if (!row) {
    row = await ensureCoreSubscription(userId);
  }

  const override = resolvePlanOverride(userId);
  const plan = override?.plan ?? effectivePlanFromRow(row);
  const entitlements = getPlanEntitlements(plan);

  return {
    plan,
    status: row.status,
    entitlements,
    subscription: row,
    isPaid: plan !== "core",
    currentPeriodEnd: row.current_period_end,
    variantSlug: row.variant_slug,
    lemonCustomerPortalUrl: null,
    planOverride: override,
  };
}
