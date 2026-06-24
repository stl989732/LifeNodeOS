import * as Sentry from "@sentry/nextjs";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type ChefRecipeMeterResult =
  | {
      allowed: true;
      recipesUsed: number;
      recipesLimit: number;
    }
  | {
      allowed: false;
      reason: "monthly_limit" | "invalid_user";
      recipesUsed: number;
      recipesLimit: number;
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

function utcMonthStartIsoDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export async function readChefRecipesUsedThisMonth(
  userId: string,
): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("chef_recipe_monthly_usage")
      .select("recipes_generated")
      .eq("user_id", userId)
      .eq("usage_month", utcMonthStartIsoDate())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return 0;
      console.error("[chef-recipe-meter] read failed:", error.message);
      return 0;
    }
    return Number(data?.recipes_generated ?? 0);
  } catch (err) {
    console.error("[chef-recipe-meter] read unexpected:", err);
    return 0;
  }
}

export async function meterChefRecipeGeneration(
  userId: string,
): Promise<ChefRecipeMeterResult> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const recipesLimit = entitlements.maxChefRecipesMonthly;

  const allowedFallback: ChefRecipeMeterResult = {
    allowed: true,
    recipesUsed: 0,
    recipesLimit,
  };

  if (meteringSkipped() || !supabaseConfigured()) {
    return allowedFallback;
  }

  if (recipesLimit >= 999) {
    return allowedFallback;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_and_meter_chef_recipe", {
      p_user_id: userId,
      p_max_monthly: recipesLimit,
    });

    if (error) {
      console.error("[chef-recipe-meter] RPC failed:", error.message);
      Sentry.captureException(error, { tags: { feature: "chef-recipe-meter" } });
      return allowedFallback;
    }

    if (!data || typeof data !== "object") {
      return allowedFallback;
    }

    const row = data as Record<string, unknown>;
    const recipesUsed = Number(row.recipes_used ?? 0);
    const limit = Number(row.recipes_limit ?? recipesLimit);

    if (row.allowed === true) {
      return { allowed: true, recipesUsed, recipesLimit: limit };
    }

    return {
      allowed: false,
      reason:
        row.reason === "invalid_user" ? "invalid_user" : "monthly_limit",
      recipesUsed,
      recipesLimit: limit,
    };
  } catch (err) {
    console.error("[chef-recipe-meter] unexpected:", err);
    Sentry.captureException(err, { tags: { feature: "chef-recipe-meter" } });
    return allowedFallback;
  }
}
