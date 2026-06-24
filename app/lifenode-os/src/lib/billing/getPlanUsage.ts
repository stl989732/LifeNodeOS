import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import { parseVanodePersisted } from "@/lib/vanode/parseVanodePersisted";
import { getNodeWidget } from "@/lib/node-widget-data-store";
import { listUserConnectedApps } from "@/src/lib/integrations/userConnectedAppsDb";
import { getUserPlanSnapshot } from "@/src/lib/billing/getUserPlan";
import { readChefRecipesUsedThisMonth } from "@/src/lib/billing/meterChefRecipe";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type PlanUsageCounts = {
  aiCreditsUsed: number;
  trackersUsed: number;
  integrationsUsed: number;
  vaClientsUsed: number;
  chefRecipesUsed: number;
};

export type PlanUsageSnapshot = PlanUsageCounts & {
  plan: string;
  displayName: string;
  isPaid: boolean;
  limits: {
    aiCreditsDaily: number;
    maxTrackers: number;
    maxIntegrations: number;
    maxVaClients: number;
    maxChefRecipesMonthly: number;
  };
};

function utcTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

async function fetchAiCreditsUsed(userId: string): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ai_daily_usage")
      .select("credits_used")
      .eq("user_id", userId)
      .eq("usage_date", utcTodayIsoDate())
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return 0;
      console.error("[getPlanUsage] ai_daily_usage read failed:", error.message);
      return 0;
    }
    return Number(data?.credits_used ?? 0);
  } catch (err) {
    console.error("[getPlanUsage] ai credits unexpected:", err);
    return 0;
  }
}

async function fetchTrackerCount(userId: string): Promise<number> {
  if (!supabaseConfigured()) return 0;
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from("lifenode_trackers")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("[getPlanUsage] trackers count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[getPlanUsage] trackers unexpected:", err);
    return 0;
  }
}

async function fetchIntegrationCount(userId: string): Promise<number> {
  try {
    const rows = await listUserConnectedApps(userId);
    return rows.filter(
      (row) =>
        row.connection_status === "connected" ||
        row.connection_status === "syncing",
    ).length;
  } catch (err) {
    console.error("[getPlanUsage] integrations unexpected:", err);
    return 0;
  }
}

async function fetchVaClientCount(userId: string): Promise<number> {
  try {
    const record = await getNodeWidget(userId, NODE_WIDGET_KEYS.vanode.dashboard);
    if (!record?.payload) return 0;
    const parsed = parseVanodePersisted(record.payload as Record<string, unknown>);
    return parsed.clients.length;
  } catch (err) {
    console.error("[getPlanUsage] vanode clients unexpected:", err);
    return 0;
  }
}

export async function getPlanUsage(userId: string): Promise<PlanUsageSnapshot> {
  const [planSnapshot, aiCreditsUsed, trackersUsed, integrationsUsed, vaClientsUsed, chefRecipesUsed] =
    await Promise.all([
      getUserPlanSnapshot(userId),
      fetchAiCreditsUsed(userId),
      fetchTrackerCount(userId),
      fetchIntegrationCount(userId),
      fetchVaClientCount(userId),
      readChefRecipesUsedThisMonth(userId),
    ]);

  const { entitlements, plan, isPaid } = planSnapshot;

  return {
    plan,
    displayName: entitlements.displayName,
    isPaid,
    aiCreditsUsed,
    trackersUsed,
    integrationsUsed,
    vaClientsUsed,
    chefRecipesUsed,
    limits: {
      aiCreditsDaily: entitlements.aiCreditsDaily,
      maxTrackers: entitlements.maxTrackers,
      maxIntegrations: entitlements.maxIntegrations,
      maxVaClients: entitlements.maxVaClients,
      maxChefRecipesMonthly: entitlements.maxChefRecipesMonthly,
    },
  };
}
