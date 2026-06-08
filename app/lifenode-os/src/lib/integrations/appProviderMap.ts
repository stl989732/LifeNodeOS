import type { IntegrationProviderId } from "./types";

/** Lowercase tool ids (VANode grid) → OAuth provider slug. */
const TOOL_ID_TO_PROVIDER: Record<string, IntegrationProviderId> = {
  slack: "slack",
  zoom: "zoom",
  hubspot: "hubspot",
  gmail: "gmail",
  gdrive: "google_drive",
  googledrive: "google_drive",
  "google-drive": "google_drive",
  salesforce: "salesforce",
  gohighlevel: "gohighlevel",
  ghl: "gohighlevel",
};

/** Display labels in WorkNode / BizNode → OAuth provider slug. */
const APP_TO_PROVIDER: Record<string, IntegrationProviderId> = {
  HubSpot: "hubspot",
  "Google Calendar": "google_calendar",
  "Google Drive": "google_drive",
  Gmail: "gmail",
  Salesforce: "salesforce",
  Pipedrive: "pipedrive",
  Slack: "slack",
  Zoom: "zoom",
  GoHighLevel: "gohighlevel",
};

const PROVIDER_TO_APP: Record<IntegrationProviderId, string> = {
  hubspot: "HubSpot",
  google_calendar: "Google Calendar",
  google_drive: "Google Drive",
  gmail: "Gmail",
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",
  slack: "Slack",
  zoom: "Zoom",
  gohighlevel: "GoHighLevel",
};

export function appLabelToProvider(appLabel: string): IntegrationProviderId | null {
  return APP_TO_PROVIDER[appLabel] ?? null;
}

/** Resolve a display label, tool id, or provider slug to an OAuth provider id. */
export function resolveAppConnectProvider(
  appIdOrLabel: string,
): IntegrationProviderId | null {
  const trimmed = appIdOrLabel.trim();
  if (isIntegrationProviderId(trimmed)) return trimmed;
  const byLabel = appLabelToProvider(trimmed);
  if (byLabel) return byLabel;
  return TOOL_ID_TO_PROVIDER[trimmed.toLowerCase()] ?? null;
}

/** Stable app_id for user_connected_apps (lowercase slug). */
export function toConnectedAppId(appIdOrLabel: string): string {
  const lower = appIdOrLabel.trim().toLowerCase();
  // Keep VANode grid ids (e.g. `gdrive`) even when they map to a provider slug.
  if (Object.prototype.hasOwnProperty.call(TOOL_ID_TO_PROVIDER, lower)) {
    return lower;
  }
  const provider = resolveAppConnectProvider(appIdOrLabel);
  if (provider) return provider;
  return lower.replace(/[^a-z0-9]+/g, "");
}

export function providerToAppLabel(provider: string): string {
  if (isIntegrationProviderId(provider)) {
    return PROVIDER_TO_APP[provider];
  }
  return provider;
}

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return Object.prototype.hasOwnProperty.call(PROVIDER_TO_APP, value);
}

/** Short OAuth route aliases (GoHighLevel console → `/api/integrations/hl/callback`). */
const ROUTE_PARAM_ALIASES: Record<string, IntegrationProviderId> = {
  hl: "gohighlevel",
  ghl: "gohighlevel",
};

/** Resolve `[provider]` route param or canonical id to internal provider id. */
export function resolveIntegrationRouteProvider(
  value: string,
): IntegrationProviderId | null {
  if (isIntegrationProviderId(value)) return value;
  return ROUTE_PARAM_ALIASES[value.trim().toLowerCase()] ?? null;
}
