import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  effectivePlanFromRow,
  type UserSubscriptionRow,
} from "@/src/lib/billing/subscriptionStore";
import type { PlanKey } from "@/src/lib/billing/plans";
import { dbNameToProviderId } from "@/src/lib/integrations/providerDbName";
import { providerToAppLabel } from "@/src/lib/integrations/appProviderMap";

export type AdminUserSegment =
  | "registered"
  | "active"
  | "deleted"
  | "subscriptions";

export type AdminUserRecord = {
  userId: string;
  email: string | null;
  displayName: string | null;
  signedUpAt: string | null;
  deletedAt: string | null;
  rawPlan: PlanKey | null;
  effectivePlan: PlanKey | null;
  subscriptionStatus: string | null;
  authProviders: string[];
  connectedIntegrations: string[];
  connectedApps: string[];
};

export type AdminUserDirectory = {
  segment: AdminUserSegment;
  users: AdminUserRecord[];
  generatedAt: string;
};

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

function integrationLabel(dbName: string): string {
  const id = dbNameToProviderId(dbName);
  if (id) return providerToAppLabel(id);
  return dbName.replace(/_/g, " ");
}

async function listAllAuthUsers(): Promise<User[]> {
  const supabase = createSupabaseAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return users;
}

function authProviderNames(user: User): string[] {
  const names = new Set<string>();
  for (const identity of user.identities ?? []) {
    const provider = identity.provider?.trim();
    if (provider) {
      names.add(provider === "email" ? "Email/password" : provider);
    }
  }
  if (user.email && names.size === 0) {
    names.add("Email/password");
  }
  return [...names].sort();
}

function displayNameForUser(
  user: User,
  credentialNames: Map<string, string>,
): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.name === "string"
      ? meta.name.trim()
      : typeof meta?.full_name === "string"
        ? meta.full_name.trim()
        : "";
  if (fromMeta) return fromMeta;
  const fromCredential = credentialNames.get(user.id);
  return fromCredential?.trim() || null;
}

export async function getAdminUserDirectory(
  segment: AdminUserSegment,
): Promise<AdminUserDirectory> {
  const supabase = createSupabaseAdminClient();

  const [authUsers, deletedRes, subsRes, integrationsRes, connectedAppsRes, credentialsRes] =
    await Promise.all([
      listAllAuthUsers(),
      supabase.from("deleted_account_ids").select("user_id, deleted_at"),
      supabase.from("user_subscriptions").select("*"),
      supabase.from("user_integrations").select("user_id, provider_name"),
      supabase
        .from("user_connected_apps")
        .select("user_id, app_id, connection_status")
        .eq("connection_status", "connected"),
      supabase.from("credential_users").select("id, name, email"),
    ]);

  const deletedAtByUserId = new Map<string, string>();
  for (const row of deletedRes.data ?? []) {
    if (row?.user_id) {
      deletedAtByUserId.set(
        String(row.user_id),
        String(row.deleted_at ?? ""),
      );
    }
  }

  const subscriptionByUserId = new Map<string, UserSubscriptionRow>();
  for (const raw of subsRes.data ?? []) {
    const row = normalizeSubscriptionRow(raw as Record<string, unknown>);
    if (row.user_id) subscriptionByUserId.set(row.user_id, row);
  }

  const integrationsByUserId = new Map<string, Set<string>>();
  for (const row of integrationsRes.data ?? []) {
    const userId = String(row.user_id ?? "");
    const provider = String(row.provider_name ?? "");
    if (!userId || !provider) continue;
    if (!integrationsByUserId.has(userId)) {
      integrationsByUserId.set(userId, new Set());
    }
    integrationsByUserId.get(userId)!.add(integrationLabel(provider));
  }

  const connectedAppsByUserId = new Map<string, Set<string>>();
  for (const row of connectedAppsRes.data ?? []) {
    const userId = String(row.user_id ?? "");
    const appId = String(row.app_id ?? "");
    if (!userId || !appId) continue;
    if (!connectedAppsByUserId.has(userId)) {
      connectedAppsByUserId.set(userId, new Set());
    }
    connectedAppsByUserId.get(userId)!.add(appId);
  }

  const credentialNames = new Map<string, string>();
  const credentialEmails = new Map<string, string>();
  for (const row of credentialsRes.data ?? []) {
    const id = String(row.id ?? "");
    if (!id) continue;
    if (typeof row.name === "string" && row.name.trim()) {
      credentialNames.set(id, row.name.trim());
    }
    if (typeof row.email === "string" && row.email.trim()) {
      credentialEmails.set(id, row.email.trim().toLowerCase());
    }
  }

  const buildRecord = (user: User): AdminUserRecord => {
    const sub = subscriptionByUserId.get(user.id);
    const integrations = integrationsByUserId.get(user.id);
    const apps = connectedAppsByUserId.get(user.id);
    const deletedAt = deletedAtByUserId.get(user.id) ?? null;

    return {
      userId: user.id,
      email:
        user.email?.trim().toLowerCase() ??
        credentialEmails.get(user.id) ??
        null,
      displayName: displayNameForUser(user, credentialNames),
      signedUpAt: user.created_at ?? null,
      deletedAt,
      rawPlan: sub?.plan ?? null,
      effectivePlan: sub ? effectivePlanFromRow(sub) : "core",
      subscriptionStatus: sub?.status ?? null,
      authProviders: authProviderNames(user),
      connectedIntegrations: integrations ? [...integrations].sort() : [],
      connectedApps: apps ? [...apps].sort() : [],
    };
  };

  const orphanSubscriptionRecords = (): AdminUserRecord[] => {
    const authIds = new Set(authUsers.map((u) => u.id));
    const orphans: AdminUserRecord[] = [];

    for (const [userId, sub] of subscriptionByUserId) {
      if (authIds.has(userId)) continue;
      const integrations = integrationsByUserId.get(userId);
      const apps = connectedAppsByUserId.get(userId);
      orphans.push({
        userId,
        email: credentialEmails.get(userId) ?? null,
        displayName: credentialNames.get(userId) ?? null,
        signedUpAt: sub.created_at || null,
        deletedAt: deletedAtByUserId.get(userId) ?? null,
        rawPlan: sub.plan,
        effectivePlan: effectivePlanFromRow(sub),
        subscriptionStatus: sub.status,
        authProviders: [],
        connectedIntegrations: integrations ? [...integrations].sort() : [],
        connectedApps: apps ? [...apps].sort() : [],
      });
    }

    return orphans.sort((a, b) =>
      (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""),
    );
  };

  let users: AdminUserRecord[] = [];

  switch (segment) {
    case "registered":
      users = authUsers
        .map(buildRecord)
        .sort((a, b) => (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""));
      break;
    case "active":
      users = authUsers
        .filter((u) => !deletedAtByUserId.has(u.id))
        .map(buildRecord)
        .sort((a, b) => (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""));
      break;
    case "deleted":
      users = authUsers
        .filter((u) => deletedAtByUserId.has(u.id))
        .map(buildRecord)
        .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
      break;
    case "subscriptions": {
      const withSub = authUsers
        .filter((u) => subscriptionByUserId.has(u.id))
        .map(buildRecord);
      users = [...withSub, ...orphanSubscriptionRecords()].sort((a, b) =>
        (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""),
      );
      break;
    }
  }

  return {
    segment,
    users,
    generatedAt: new Date().toISOString(),
  };
}
