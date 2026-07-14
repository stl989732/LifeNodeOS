import * as Sentry from "@sentry/nextjs";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import {
  isUnlimitedPlanCap,
  type PlanLimitKey,
} from "@/src/lib/billing/planLimits";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type PlanResourceFeature =
  | "invoices"
  | "eod_records"
  | "transcriptions"
  | "kanban_boards";

export type PlanResourceMeterResult =
  | {
      allowed: true;
      used: number;
      limit: number;
      feature: PlanResourceFeature;
    }
  | {
      allowed: false;
      reason: "monthly_limit" | "invalid_user" | "invalid_feature";
      used: number;
      limit: number;
      feature: PlanResourceFeature;
    };

const FEATURE_LIMIT_KEY: Record<PlanResourceFeature, PlanLimitKey> = {
  invoices: "invoices",
  eod_records: "eod_records",
  transcriptions: "transcriptions",
  kanban_boards: "kanban_boards",
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

export function utcMonthStartIsoDate(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function isUtcMonthIso(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const prefix = utcMonthStartIsoDate().slice(0, 7);
  return d.toISOString().startsWith(prefix);
}

export function countCreatedThisUtcMonth(
  items: Array<{ createdAt?: string | null; startedAt?: string | null }>,
): number {
  return items.filter((item) =>
    isUtcMonthIso(item.createdAt ?? item.startedAt),
  ).length;
}

export function resourceLimitForPlan(
  feature: PlanResourceFeature,
  entitlements: ReturnType<typeof getPlanEntitlements>,
): number {
  switch (feature) {
    case "invoices":
      return entitlements.maxInvoices;
    case "eod_records":
      return entitlements.maxEodRecords;
    case "transcriptions":
      return entitlements.maxTranscriptions;
    case "kanban_boards":
      return entitlements.maxKanbanBoards;
  }
}

export function planLimitKeyForResource(
  feature: PlanResourceFeature,
): PlanLimitKey {
  return FEATURE_LIMIT_KEY[feature];
}

export async function readPlanResourceUsedThisMonth(
  userId: string,
  feature: PlanResourceFeature,
): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("plan_resource_monthly_usage")
      .select(feature)
      .eq("user_id", userId)
      .eq("usage_month", utcMonthStartIsoDate())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return 0;
      console.error("[plan-resource-meter] read failed:", error.message);
      return 0;
    }
    if (!data || typeof data !== "object") return 0;
    return Number((data as Record<string, unknown>)[feature] ?? 0);
  } catch (err) {
    console.error("[plan-resource-meter] read unexpected:", err);
    return 0;
  }
}

export async function readAllPlanResourcesUsedThisMonth(userId: string): Promise<
  Record<PlanResourceFeature, number>
> {
  const empty = {
    invoices: 0,
    eod_records: 0,
    transcriptions: 0,
    kanban_boards: 0,
  };
  if (!supabaseConfigured()) return empty;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("plan_resource_monthly_usage")
      .select("invoices, eod_records, transcriptions, kanban_boards")
      .eq("user_id", userId)
      .eq("usage_month", utcMonthStartIsoDate())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return empty;
      console.error("[plan-resource-meter] bulk read failed:", error.message);
      return empty;
    }
    if (!data) return empty;
    return {
      invoices: Number(data.invoices ?? 0),
      eod_records: Number(data.eod_records ?? 0),
      transcriptions: Number(data.transcriptions ?? 0),
      kanban_boards: Number(data.kanban_boards ?? 0),
    };
  } catch (err) {
    console.error("[plan-resource-meter] bulk read unexpected:", err);
    return empty;
  }
}

export async function meterPlanResource(
  userId: string,
  feature: PlanResourceFeature,
): Promise<PlanResourceMeterResult> {
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const limit = resourceLimitForPlan(feature, entitlements);

  const allowedFallback: PlanResourceMeterResult = {
    allowed: true,
    used: 0,
    limit,
    feature,
  };

  if (meteringSkipped() || !supabaseConfigured()) {
    return allowedFallback;
  }

  if (isUnlimitedPlanCap(limit)) {
    return allowedFallback;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_and_meter_plan_resource", {
      p_user_id: userId,
      p_feature: feature,
      p_max_monthly: limit,
    });

    if (error) {
      console.error("[plan-resource-meter] RPC failed:", error.message);
      Sentry.captureException(error, { tags: { feature: "plan-resource-meter" } });
      return allowedFallback;
    }

    if (!data || typeof data !== "object") {
      return allowedFallback;
    }

    const row = data as Record<string, unknown>;
    const used = Number(row.used ?? 0);
    const rowLimit = Number(row.limit ?? limit);

    if (row.allowed === true) {
      return { allowed: true, used, limit: rowLimit, feature };
    }

    return {
      allowed: false,
      reason:
        row.reason === "invalid_user"
          ? "invalid_user"
          : row.reason === "invalid_feature"
            ? "invalid_feature"
            : "monthly_limit",
      used,
      limit: rowLimit,
      feature,
    };
  } catch (err) {
    console.error("[plan-resource-meter] unexpected:", err);
    Sentry.captureException(err, { tags: { feature: "plan-resource-meter" } });
    return allowedFallback;
  }
}

/** True when usage is at/above soft warn threshold (≥80%, or 1 remaining for small caps). */
export function isNearPlanLimit(used: number, limit: number): boolean {
  if (isUnlimitedPlanCap(limit) || limit <= 0) return false;
  if (used >= limit) return false;
  if (limit <= 5) return used >= Math.max(1, limit - 1);
  return used / limit >= 0.8;
}
