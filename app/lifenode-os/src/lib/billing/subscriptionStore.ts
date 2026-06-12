import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { BillingInterval, PlanKey, SubscriptionStatus } from "./plans";

export type UserSubscriptionRow = {
  user_id: string;
  plan: PlanKey;
  status: SubscriptionStatus;
  lemon_customer_id: string | null;
  lemon_subscription_id: string | null;
  variant_slug: string | null;
  current_period_end: string | null;
  past_due_since: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertSubscriptionInput = {
  userId: string;
  plan?: PlanKey;
  status?: SubscriptionStatus;
  lemonCustomerId?: string | null;
  lemonSubscriptionId?: string | null;
  variantSlug?: string | null;
  currentPeriodEnd?: string | null;
  pastDueSince?: string | null;
};

const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeRow(raw: Record<string, unknown>): UserSubscriptionRow {
  return {
    user_id: String(raw.user_id ?? ""),
    plan: (raw.plan as PlanKey) ?? "core",
    status: (raw.status as SubscriptionStatus) ?? "active",
    lemon_customer_id:
      typeof raw.lemon_customer_id === "string" ? raw.lemon_customer_id : null,
    lemon_subscription_id:
      typeof raw.lemon_subscription_id === "string"
        ? raw.lemon_subscription_id
        : null,
    variant_slug: typeof raw.variant_slug === "string" ? raw.variant_slug : null,
    current_period_end:
      typeof raw.current_period_end === "string" ? raw.current_period_end : null,
    past_due_since:
      typeof raw.past_due_since === "string" ? raw.past_due_since : null,
    created_at: String(raw.created_at ?? nowIso()),
    updated_at: String(raw.updated_at ?? nowIso()),
  };
}

export function effectivePlanFromRow(row: UserSubscriptionRow): PlanKey {
  if (row.status === "expired") return "core";
  if (row.status === "past_due" && row.past_due_since) {
    const elapsed = Date.now() - new Date(row.past_due_since).getTime();
    if (elapsed > PAST_DUE_GRACE_MS) return "core";
  }
  if (row.status === "cancelled" && row.current_period_end) {
    if (new Date(row.current_period_end).getTime() <= Date.now()) {
      return "core";
    }
  }
  return row.plan;
}

export async function getSubscriptionRow(
  userId: string,
): Promise<UserSubscriptionRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[billing] getSubscriptionRow:", error.message);
    throw new Error("SUBSCRIPTION_READ_FAILED");
  }

  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export async function ensureCoreSubscription(userId: string): Promise<UserSubscriptionRow> {
  const existing = await getSubscriptionRow(userId);
  if (existing) return existing;

  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const row = {
    user_id: userId,
    plan: "core" as const,
    status: "active" as const,
    updated_at: timestamp,
  };

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await getSubscriptionRow(userId);
      if (retry) return retry;
    }
    console.error("[billing] ensureCoreSubscription:", error.message);
    throw new Error("SUBSCRIPTION_CREATE_FAILED");
  }

  return normalizeRow(data as Record<string, unknown>);
}

export async function upsertSubscription(
  input: UpsertSubscriptionInput,
): Promise<UserSubscriptionRow> {
  const supabase = createSupabaseAdminClient();
  const timestamp = nowIso();
  const existing = await getSubscriptionRow(input.userId);

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    updated_at: timestamp,
  };

  if (input.plan !== undefined) payload.plan = input.plan;
  if (input.status !== undefined) payload.status = input.status;
  if (input.lemonCustomerId !== undefined) {
    payload.lemon_customer_id = input.lemonCustomerId;
  }
  if (input.lemonSubscriptionId !== undefined) {
    payload.lemon_subscription_id = input.lemonSubscriptionId;
  }
  if (input.variantSlug !== undefined) payload.variant_slug = input.variantSlug;
  if (input.currentPeriodEnd !== undefined) {
    payload.current_period_end = input.currentPeriodEnd;
  }
  if (input.pastDueSince !== undefined) payload.past_due_since = input.pastDueSince;

  if (!existing) {
    payload.plan ??= "core";
    payload.status ??= "active";
    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[billing] upsertSubscription insert:", error.message);
      throw new Error("SUBSCRIPTION_UPSERT_FAILED");
    }
    return normalizeRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update(payload)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    console.error("[billing] upsertSubscription update:", error.message);
    throw new Error("SUBSCRIPTION_UPSERT_FAILED");
  }

  return normalizeRow(data as Record<string, unknown>);
}

export async function findSubscriptionByLemonId(
  lemonSubscriptionId: string,
): Promise<UserSubscriptionRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("lemon_subscription_id", lemonSubscriptionId)
    .maybeSingle();

  if (error) {
    console.error("[billing] findSubscriptionByLemonId:", error.message);
    throw new Error("SUBSCRIPTION_READ_FAILED");
  }

  return data ? normalizeRow(data as Record<string, unknown>) : null;
}

export type VariantCheckoutTarget = {
  variantId: string;
  variantSlug: string;
  plan: Exclude<PlanKey, "core">;
  interval: BillingInterval;
};
