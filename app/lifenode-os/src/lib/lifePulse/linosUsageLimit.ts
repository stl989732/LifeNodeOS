import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { meterAiUsage } from "@/src/lib/ai-metering/meterAiUsage";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { MeterFeatureKey } from "@/src/lib/ai-metering/events";

const INTAKE_WARN_AT = 6;

export type LinosFeatureUsage = {
  count: number;
  limit: number;
  locked: boolean;
  warning: string | null;
};

export type LinosUsageStatus = {
  intake: LinosFeatureUsage;
  plan: LinosFeatureUsage;
};

function meteringSkipped(): boolean {
  return process.env.SKIP_AI_METERING === "1";
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readFeatureCount(
  userId: string,
  featureKey: MeterFeatureKey,
): Promise<number> {
  if (meteringSkipped() || !supabaseConfigured()) return 0;

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("ai_daily_usage")
      .select(featureKey)
      .eq("user_id", userId)
      .eq("usage_date", utcToday())
      .maybeSingle();

    if (!data || typeof data !== "object") return 0;
    const row = data as Record<string, unknown>;
    return Number(row[featureKey] ?? 0);
  } catch {
    return 0;
  }
}

function buildFeatureUsage(
  count: number,
  limit: number,
  warnAt: number | null,
  warnTemplate?: (remaining: number) => string,
): LinosFeatureUsage {
  const locked = count >= limit;
  let warning: string | null = null;
  if (warnAt !== null && count >= warnAt && count < limit) {
    const remaining = limit - count;
    warning =
      warnTemplate?.(remaining) ??
      `You've used ${count} of ${limit} free Linos answers today. ${remaining} left.`;
  }
  return { count, limit, locked, warning };
}

export async function getLinosUsageStatus(userId: string): Promise<LinosUsageStatus> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const intakeLimit = entitlements.features.lifepulse_intake;
  const planLimit = entitlements.features.lifepulse_plan;

  const [intakeCount, planCount] = await Promise.all([
    readFeatureCount(userId, "lifepulse_intake"),
    readFeatureCount(userId, "lifepulse_plan"),
  ]);

  return {
    intake: buildFeatureUsage(
      intakeCount,
      intakeLimit,
      INTAKE_WARN_AT,
      (remaining) =>
        `You have ${intakeLimit} free Linos answers per day. You've used ${intakeCount} — ${remaining} left.`,
    ),
    plan: buildFeatureUsage(planCount, planLimit, null),
  };
}

export async function meterLinosIntake(userId: string): Promise<LinosFeatureUsage> {
  const result = await meterAiUsage(userId, "lifepulse_intake");
  const usage = await getLinosUsageStatus(userId);
  if (!result.allowed) {
    return { ...usage.intake, locked: true };
  }
  return usage.intake;
}

export async function meterLinosPlan(userId: string): Promise<LinosFeatureUsage> {
  const result = await meterAiUsage(userId, "lifepulse_plan");
  const usage = await getLinosUsageStatus(userId);
  if (!result.allowed) {
    return { ...usage.plan, locked: true };
  }
  return usage.plan;
}

export const LINOS_INTAKE_LOCK_MESSAGE =
  "You've used all your free Linos answers for today. Come back tomorrow, or upgrade to Sync or Nexus for more.";

export const LINOS_PLAN_LOCK_MESSAGE =
  "You've hit the maximum limit of plan generations for today. Upgrade to Sync or Nexus to keep building plans in LifePulse.";

/** @deprecated Use LINOS_INTAKE_LOCK_MESSAGE or LINOS_PLAN_LOCK_MESSAGE */
export const LINOS_LOCK_MESSAGE = LINOS_INTAKE_LOCK_MESSAGE;
