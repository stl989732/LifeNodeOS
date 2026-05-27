import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { dbNameToProviderId, providerIdToDbName } from "./providerDbName";
import type {
  IntegrationProviderId,
  IntegrationStatus,
  UserIntegrationRow,
} from "./types";

/** Google and others return scopes as a space-separated string; Supabase expects TEXT[]. */
export function normalizeScopesForDb(
  incoming: string | string[] | null | undefined,
): string[] | null {
  if (incoming == null) return null;
  if (Array.isArray(incoming)) {
    const cleaned = incoming.map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }
  if (typeof incoming === "string") {
    const cleaned = incoming.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }
  return null;
}

export async function upsertUserIntegration(
  row: Omit<UserIntegrationRow, "id" | "created_at" | "updated_at">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const provider_name = providerIdToDbName(row.provider);

  const { error } = await supabase.from("user_integrations").upsert(
    {
      user_id: row.user_id,
      provider_name,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expires_at: row.expires_at,
      scopes: normalizeScopesForDb(row.scopes),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider_name" },
  );

  if (error) {
    throw new Error(`Failed to save integration: ${error.message}`);
  }
}

export async function listUserIntegrations(
  userId: string,
): Promise<IntegrationStatus[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_integrations")
    .select("provider_name, expires_at, access_token")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load integrations: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => {
      const provider = dbNameToProviderId(String(row.provider_name ?? ""));
      if (!provider) return null;

      const expiresAt = row.expires_at ? String(row.expires_at) : null;
      const hasToken = Boolean(row.access_token);
      const notExpired =
        !expiresAt || new Date(expiresAt).getTime() > Date.now();

      return {
        provider,
        connected: hasToken && notExpired,
        expiresAt,
      };
    })
    .filter((row): row is IntegrationStatus => row !== null);
}

export async function getIntegrationForProvider(
  userId: string,
  provider: IntegrationProviderId,
): Promise<IntegrationStatus | null> {
  const list = await listUserIntegrations(userId);
  return list.find((i) => i.provider === provider) ?? null;
}
