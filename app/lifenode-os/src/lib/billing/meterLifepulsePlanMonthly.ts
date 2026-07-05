import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

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

function utcMonthStartIsoDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function readLifepulsePlansUsedThisMonth(userId: string): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lifepulse_plan_monthly_usage")
      .select("plans_generated")
      .eq("user_id", userId)
      .eq("usage_month", utcMonthStartIsoDate())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return 0;
      console.error("[lifepulse-plan-monthly] read failed:", error.message);
      return 0;
    }
    return Number(data?.plans_generated ?? 0);
  } catch (err) {
    console.error("[lifepulse-plan-monthly] read unexpected:", err);
    return 0;
  }
}

export async function meterLifepulsePlanMonthly(userId: string): Promise<{
  allowed: boolean;
  plansUsed: number;
  plansLimit: number;
}> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const plansLimit = entitlements.features.lifepulse_plan;

  const allowedFallback = { allowed: true, plansUsed: 0, plansLimit };

  if (meteringSkipped() || !supabaseConfigured()) {
    return allowedFallback;
  }

  if (plansLimit >= 999) {
    return allowedFallback;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_and_meter_lifepulse_plan_monthly", {
      p_user_id: userId,
      p_max_monthly: plansLimit,
    });

    if (error) {
      console.error("[lifepulse-plan-monthly] RPC failed:", error.message);
      return allowedFallback;
    }

    if (!data || typeof data !== "object") {
      return allowedFallback;
    }

    const row = data as Record<string, unknown>;
    const plansUsed = Number(row.plans_used ?? 0);
    const limit = Number(row.plans_limit ?? plansLimit);

    if (row.allowed === true) {
      return { allowed: true, plansUsed, plansLimit: limit };
    }

    return { allowed: false, plansUsed, plansLimit: limit };
  } catch (err) {
    console.error("[lifepulse-plan-monthly] unexpected:", err);
    return allowedFallback;
  }
}
