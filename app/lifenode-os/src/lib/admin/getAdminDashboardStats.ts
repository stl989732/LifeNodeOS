import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  effectivePlanFromRow,
  type UserSubscriptionRow,
} from "@/src/lib/billing/subscriptionStore";
import type { PlanKey } from "@/src/lib/billing/plans";
import { isLemonSqueezyConfigured } from "@/src/lib/billing/lemonsqueezy/config";

export type HealthStatus = "ok" | "warn" | "error";

export type HealthCheck = {
  name: string;
  status: HealthStatus;
  detail: string;
};

export type AdminDashboardStats = {
  users: {
    totalRegistered: number;
    activeAccounts: number;
    deletedAccounts: number;
    byPlan: Record<PlanKey, number>;
    subscriptionRows: number;
    byStatus: Record<string, number>;
  };
  health: HealthCheck[];
  generatedAt: string;
};

function emptyPlanCounts(): Record<PlanKey, number> {
  return { core: 0, sync: 0, nexus: 0 };
}

async function countAuthUsers(): Promise<number> {
  const supabase = createSupabaseAdminClient();
  let total = 0;
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users?.length ?? 0;
    total += batch;
    if (batch < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return total;
}

function normalizeSubscriptionRow(raw: Record<string, unknown>): UserSubscriptionRow {
  return {
    user_id: String(raw.user_id ?? ""),
    plan: (raw.plan as PlanKey) ?? "core",
    status: (raw.status as UserSubscriptionRow["status"]) ?? "active",
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
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = createSupabaseAdminClient();
  const health: HealthCheck[] = [];

  const pushHealth = (check: HealthCheck) => {
    health.push(check);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim();

  pushHealth({
    name: "Supabase URL",
    status: supabaseUrl ? "ok" : "error",
    detail: supabaseUrl ? "Configured" : "NEXT_PUBLIC_SUPABASE_URL missing",
  });

  pushHealth({
    name: "Supabase service role",
    status: serviceKey ? "ok" : "error",
    detail: serviceKey ? "Configured" : "SUPABASE_SERVICE_ROLE_KEY missing",
  });

  pushHealth({
    name: "Auth secret",
    status: process.env.AUTH_SECRET?.trim() ? "ok" : "error",
    detail: process.env.AUTH_SECRET?.trim()
      ? "Configured"
      : "AUTH_SECRET missing — sign-in will fail",
  });

  pushHealth({
    name: "Google OAuth",
    status:
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
        ? "ok"
        : "warn",
    detail:
      process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
        ? "Configured"
        : "Not configured locally",
  });

  pushHealth({
    name: "Lemon Squeezy billing",
    status: isLemonSqueezyConfigured() ? "ok" : "warn",
    detail: isLemonSqueezyConfigured()
      ? "Store + API key configured"
      : "Not fully configured (Core-only checkout paths)",
  });

  pushHealth({
    name: "Email (Resend)",
    status: process.env.RESEND_API_KEY?.trim() ? "ok" : "warn",
    detail: process.env.RESEND_API_KEY?.trim()
      ? "Configured"
      : "RESEND_API_KEY unset — activation emails may fail",
  });

  let totalRegistered = 0;
  let deletedAccounts = 0;
  let subscriptionRows: UserSubscriptionRow[] = [];

  try {
    totalRegistered = await countAuthUsers();
    pushHealth({
      name: "Auth user registry",
      status: "ok",
      detail: `${totalRegistered} account(s) in Supabase Auth`,
    });
  } catch (err) {
    pushHealth({
      name: "Auth user registry",
      status: "error",
      detail:
        err instanceof Error ? err.message : "Could not list auth users",
    });
  }

  try {
    const { count, error } = await supabase
      .from("deleted_account_ids")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    deletedAccounts = count ?? 0;
    pushHealth({
      name: "Account tombstones",
      status: "ok",
      detail: `${deletedAccounts} deleted account record(s)`,
    });
  } catch (err) {
    pushHealth({
      name: "Account tombstones",
      status: "error",
      detail:
        err instanceof Error ? err.message : "deleted_account_ids read failed",
    });
  }

  try {
    const { data, error } = await supabase.from("user_subscriptions").select("*");
    if (error) throw error;
    subscriptionRows = (data ?? []).map((row) =>
      normalizeSubscriptionRow(row as Record<string, unknown>),
    );
    pushHealth({
      name: "Billing subscriptions",
      status: "ok",
      detail: `${subscriptionRows.length} subscription row(s)`,
    });
  } catch (err) {
    pushHealth({
      name: "Billing subscriptions",
      status: "error",
      detail:
        err instanceof Error ? err.message : "user_subscriptions read failed",
    });
  }

  const byPlan = emptyPlanCounts();
  const byStatus: Record<string, number> = {};
  const deletedIds = new Set<string>();

  try {
    const { data } = await supabase.from("deleted_account_ids").select("user_id");
    for (const row of data ?? []) {
      if (row && typeof row.user_id === "string") {
        deletedIds.add(row.user_id);
      }
    }
  } catch {
    /* already logged */
  }

  for (const row of subscriptionRows) {
    const effective = effectivePlanFromRow(row);
    byPlan[effective] += 1;
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  const usersWithoutRow = Math.max(0, totalRegistered - subscriptionRows.length);
  byPlan.core += usersWithoutRow;

  const activeAccounts = Math.max(0, totalRegistered - deletedAccounts);

  return {
    users: {
      totalRegistered,
      activeAccounts,
      deletedAccounts,
      byPlan,
      subscriptionRows: subscriptionRows.length,
      byStatus,
    },
    health,
    generatedAt: new Date().toISOString(),
  };
}
