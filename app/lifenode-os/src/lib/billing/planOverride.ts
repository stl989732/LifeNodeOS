/**
 * Server-only plan overrides. Never use NEXT_PUBLIC_* for these — they must not
 * be inlined into the client bundle.
 *
 * Local dev (`npm run dev`):
 *   LIFENODE_DEV_PLAN_OVERRIDE=nexus   # core | sync | nexus — all signed-in users
 *
 * Beta testers (Vercel Preview / staging — not production unless opted in):
 *   LIFENODE_BETA_PLAN=nexus
 *   LIFENODE_BETA_USER_IDS=<uuid>,<uuid>
 *   LIFENODE_BETA_ALLOW_PRODUCTION=1    # optional; leave unset on lifenodeos.com
 */
import { isPlanKey, type PlanKey } from "./plans";

export type PlanOverrideSource = "dev" | "beta";

export type PlanOverride = {
  plan: PlanKey;
  source: PlanOverrideSource;
};

function parseUserIdAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function isProductionDeploy(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  return process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV;
}

/**
 * Returns a plan override for this user, or null to use `user_subscriptions`.
 */
export function resolvePlanOverride(userId: string): PlanOverride | null {
  const devPlan = process.env.LIFENODE_DEV_PLAN_OVERRIDE?.trim().toLowerCase();
  if (
    process.env.NODE_ENV === "development" &&
    devPlan &&
    isPlanKey(devPlan)
  ) {
    return { plan: devPlan, source: "dev" };
  }

  const betaPlan = process.env.LIFENODE_BETA_PLAN?.trim().toLowerCase();
  const betaIds = parseUserIdAllowlist(process.env.LIFENODE_BETA_USER_IDS);
  if (!betaPlan || !isPlanKey(betaPlan) || betaIds.size === 0) {
    return null;
  }

  if (isProductionDeploy() && process.env.LIFENODE_BETA_ALLOW_PRODUCTION !== "1") {
    return null;
  }

  if (!betaIds.has(userId)) {
    return null;
  }

  return { plan: betaPlan, source: "beta" };
}
