import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  effectivePlanFromRow,
  type UserSubscriptionRow,
} from "@/src/lib/billing/subscriptionStore";
import type { PlanKey } from "@/src/lib/billing/plans";
import { isLemonSqueezyConfigured } from "@/src/lib/billing/lemonsqueezy/config";
import {
  getWebAppViewStats,
  type WebAppViewStats,
} from "@/src/lib/admin/webAppViews";

export type AdminTrendPoint = {
  /** YYYY-MM */
  month: string;
  /** Short axis label, e.g. Jan 26 */
  label: string;
  /** Cumulative registered accounts by end of month */
  users: number;
  /** New signups that month */
  newUsers: number;
  /** Estimated MRR ($) from paid Sync/Nexus subs active by month-end */
  earnings: number;
  /** Paid subscription rows counted toward earnings */
  paidSubs: number;
};

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
  /** Anonymous web app page views / unique visitors (UTC rollups). */
  views: WebAppViewStats;
  trends: AdminTrendPoint[];
  health: HealthCheck[];
  generatedAt: string;
};

/** List prices used for estimated earnings (monthly billing). */
const ESTIMATED_MRR_USD: Record<"sync" | "nexus", number> = {
  sync: 24,
  nexus: 59,
};

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function lastNMonthKeys(n: number, ending = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(ending.getUTCFullYear(), ending.getUTCMonth(), 1),
  );
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emptyPlanCounts(): Record<PlanKey, number> {
  return { core: 0, sync: 0, nexus: 0 };
}

async function listAuthUserCreatedAts(): Promise<{ total: number; createdAts: string[] }> {
  const supabase = createSupabaseAdminClient();
  const createdAts: string[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users ?? [];
    for (const u of batch) {
      if (u.created_at) createdAts.push(u.created_at);
    }
    if (batch.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return { total: createdAts.length, createdAts };
}

function buildTrendSeries(
  userCreatedAts: string[],
  subscriptionRows: UserSubscriptionRow[],
): AdminTrendPoint[] {
  const months = lastNMonthKeys(12);
  const monthEndMs = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return Date.UTC(y, m, 0, 23, 59, 59, 999);
  };

  const userTimes = userCreatedAts
    .map((iso) => parseIsoDate(iso)?.getTime())
    .filter((t): t is number => typeof t === "number")
    .sort((a, b) => a - b);

  return months.map((month) => {
    const end = monthEndMs(month);
    const [y, m] = month.split("-").map(Number);
    const start = Date.UTC(y, m - 1, 1, 0, 0, 0, 0);

    const users = userTimes.filter((t) => t <= end).length;
    const newUsers = userTimes.filter((t) => t >= start && t <= end).length;

    let earnings = 0;
    let paidSubs = 0;
    for (const row of subscriptionRows) {
      const created = parseIsoDate(row.created_at)?.getTime();
      if (created == null || created > end) continue;
      const plan = effectivePlanFromRow(row);
      if (plan === "core") continue;
      if (row.status === "cancelled" || row.status === "expired") {
        const ended = parseIsoDate(row.current_period_end)?.getTime();
        if (ended != null && ended < start) continue;
      }
      paidSubs += 1;
      earnings += ESTIMATED_MRR_USD[plan];
    }

    return {
      month,
      label: monthLabel(month),
      users,
      newUsers,
      earnings,
      paidSubs,
    };
  });
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
  let userCreatedAts: string[] = [];

  try {
    const listed = await listAuthUserCreatedAts();
    totalRegistered = listed.total;
    userCreatedAts = listed.createdAts;
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
  const trends = buildTrendSeries(userCreatedAts, subscriptionRows);
  const views = await getWebAppViewStats();

  pushHealth({
    name: "Web app views",
    status: "ok",
    detail: `${views.totalPageViews} page view(s) · ${views.totalUniqueVisitors} unique visitor-day(s)`,
  });

  return {
    users: {
      totalRegistered,
      activeAccounts,
      deletedAccounts,
      byPlan,
      subscriptionRows: subscriptionRows.length,
      byStatus,
    },
    views,
    trends,
    health,
    generatedAt: new Date().toISOString(),
  };
}
