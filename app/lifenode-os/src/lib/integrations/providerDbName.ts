import type { IntegrationProviderId } from "./types";

/** Values stored in `user_integrations.provider_name` (Supabase). */
export type IntegrationProviderDbName =
  | "hubspot"
  | "google"
  | "google_drive"
  | "gmail"
  | "salesforce"
  | "pipedrive"
  | "slack"
  | "zoom"
  | "gohighlevel";

const ROUTE_TO_DB: Record<IntegrationProviderId, IntegrationProviderDbName> = {
  hubspot: "hubspot",
  google_calendar: "google",
  google_drive: "google_drive",
  gmail: "gmail",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  slack: "slack",
  zoom: "zoom",
  gohighlevel: "gohighlevel",
};

const DB_TO_ROUTE: Record<IntegrationProviderDbName, IntegrationProviderId> = {
  hubspot: "hubspot",
  google: "google_calendar",
  google_drive: "google_drive",
  gmail: "gmail",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  slack: "slack",
  zoom: "zoom",
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
