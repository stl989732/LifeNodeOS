import { getOAuthProviderConfig } from "./oauthProviders";
import { dbNameToProviderId, providerIdToDbName } from "./providerDbName";
import { upsertUserIntegration, normalizeScopesForDb } from "./userIntegrationsDb";
import type { IntegrationProviderId } from "./types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type IntegrationTokenRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string[] | null;
  provider_name: string;
};

async function fetchIntegrationRow(
  userId: string,
  provider: IntegrationProviderId,
): Promise<IntegrationTokenRow | null> {
  const supabase = createSupabaseAdminClient();
  const provider_name = providerIdToDbName(provider);
  const { data, error } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at, scopes, provider_name")
    .eq("user_id", userId)
    .eq("provider_name", provider_name)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load integration tokens: ${error.message}`);
  }
  if (!data?.access_token) return null;
  return data as IntegrationTokenRow;
}

function tokenStillValid(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return true;
  return expiresMs - Date.now() > REFRESH_BUFFER_MS;
}

async function refreshAccessToken(
  provider: IntegrationProviderId,
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string | null;
}> {
  const config = getOAuthProviderConfig(provider);
  if (!config) {
    throw new Error(`OAuth is not configured for ${provider}.`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : res.statusText;
    throw new Error(`Token refresh failed: ${detail}`);
  }

  const accessToken =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.accessToken === "string" && data.accessToken) ||
    "";
  if (!accessToken) {
    throw new Error("Token refresh returned no access_token.");
  }

  const nextRefresh =
    (typeof data.refresh_token === "string" && data.refresh_token) ||
    (typeof data.refreshToken === "string" && data.refreshToken) ||
    refreshToken;

  const expiresIn =
    typeof data.expires_in === "number"
      ? data.expires_in
      : typeof data.expires_in === "string"
        ? Number(data.expires_in)
        : null;

  const expiresAt =
    expiresIn && Number.isFinite(expiresIn)
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const scopeField = data.scope ?? data.scopes;
  const scopes =
    typeof scopeField === "string"
      ? scopeField
      : Array.isArray(scopeField)
        ? scopeField.join(" ")
        : null;

  return {
    accessToken,
    refreshToken: nextRefresh,
    expiresAt,
    scopes,
  };
}

/**
 * Returns a valid OAuth access token for the user/provider pair, refreshing when
 * expired or within five minutes of expiry.
 */
export async function getValidAccessToken(
  userId: string,
  provider: string,
): Promise<string> {
  const providerId = dbNameToProviderId(provider) ?? (provider as IntegrationProviderId);
  const known: IntegrationProviderId[] = [
    "hubspot",
    "google_calendar",
    "gmail",
    "salesforce",
    "pipedrive",
    "slack",
    "gohighlevel",
  ];
  if (!known.includes(providerId)) {
    throw new Error(`Unknown integration provider: ${provider}`);
  }

  const row = await fetchIntegrationRow(userId, providerId);
  if (!row?.access_token) {
    throw new Error(`No connected ${provider} integration for this user.`);
  }

  if (tokenStillValid(row.expires_at)) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new Error(`${provider} token expired and no refresh token is stored. Reconnect OAuth.`);
  }

  const refreshed = await refreshAccessToken(providerId, row.refresh_token);
  await upsertUserIntegration({
    user_id: userId,
    provider: providerId,
    access_token: refreshed.accessToken,
    refresh_token: refreshed.refreshToken,
    expires_at: refreshed.expiresAt,
    scopes: refreshed.scopes ?? normalizeScopesForDb(row.scopes),
  });

  return refreshed.accessToken;
}
