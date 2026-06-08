export type IntegrationProviderId =
  | "hubspot"
  | "google_calendar"
  | "google_drive"
  | "gmail"
  | "salesforce"
  | "pipedrive"
  | "slack"
  | "zoom"
  | "gohighlevel";

export type UserIntegrationRow = {
  id?: string;
  user_id: string;
  provider: IntegrationProviderId;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  /** Space-separated string from OAuth providers, or a pre-split array. */
  scopes: string | string[] | null;
  updated_at?: string;
  created_at?: string;
};

export type IntegrationStatus = {
  provider: IntegrationProviderId;
  connected: boolean;
  expiresAt: string | null;
};
