import type { IntegrationProviderId } from "./types";

/** Values stored in `user_integrations.provider_name` (Supabase). */
export type IntegrationProviderDbName =
  | "hubspot"
  | "google"
  | "gmail"
  | "salesforce"
  | "pipedrive"
  | "slack"
  | "gohighlevel";

const ROUTE_TO_DB: Record<IntegrationProviderId, IntegrationProviderDbName> = {
  hubspot: "hubspot",
  google_calendar: "google",
  gmail: "gmail",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  slack: "slack",
  gohighlevel: "gohighlevel",
};

const DB_TO_ROUTE: Record<IntegrationProviderDbName, IntegrationProviderId> = {
  hubspot: "hubspot",
  google: "google_calendar",
  gmail: "gmail",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  slack: "slack",
  gohighlevel: "gohighlevel",
};

export function providerIdToDbName(
  provider: IntegrationProviderId,
): IntegrationProviderDbName {
  return ROUTE_TO_DB[provider];
}

export function dbNameToProviderId(
  name: string,
): IntegrationProviderId | null {
  const key = name.trim().toLowerCase() as IntegrationProviderDbName;
  return DB_TO_ROUTE[key] ?? null;
}
