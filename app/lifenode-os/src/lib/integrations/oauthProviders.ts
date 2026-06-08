import type { IntegrationProviderId } from "./types";

export type OAuthProviderConfig = {
  id: IntegrationProviderId;
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  /** Extra query params for the authorize redirect (e.g. access_type=offline). */
  authorizeExtras?: Record<string, string>;
};

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * OAuth redirect path segment (console-safe); may differ from internal provider id.
 * GoHighLevel Marketplace rejects "ghl" / "highlevel" in redirect URLs — use `hl`.
 */
const OAUTH_REDIRECT_PATH: Partial<Record<IntegrationProviderId, string>> = {
  gohighlevel: "hl",
};

export function integrationRedirectPathSegment(
  provider: IntegrationProviderId,
): string {
  return OAUTH_REDIRECT_PATH[provider] ?? provider;
}

export function integrationRedirectUri(provider: IntegrationProviderId): string {
  return `${appBaseUrl()}/api/integrations/${integrationRedirectPathSegment(provider)}/callback`;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function googlePair(): { clientId: string; clientSecret: string } {
  return {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
  };
}

const PROVIDER_BUILDERS: Record<
  IntegrationProviderId,
  () => OAuthProviderConfig | null
> = {
  hubspot: () => {
    const clientId = env("HUBSPOT_CLIENT_ID");
    const clientSecret = env("HUBSPOT_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return {
      id: "hubspot",
      authorizationUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      clientId,
      clientSecret,
      scopes: [
        "crm.objects.contacts.read",
        "crm.objects.deals.read",
        "crm.schemas.contacts.read",
      ],
    };
  },
  google_calendar: () => {
    const { clientId, clientSecret } = googlePair();
    if (!clientId || !clientSecret) return null;
    return {
      id: "google_calendar",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId,
      clientSecret,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      authorizeExtras: {
        access_type: "offline",
        prompt: "consent",
      },
    };
  },
  gmail: () => {
    const { clientId, clientSecret } = googlePair();
    if (!clientId || !clientSecret) return null;
    return {
      id: "gmail",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId,
      clientSecret,
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      authorizeExtras: {
        access_type: "offline",
        prompt: "consent",
      },
    };
  },
  google_drive: () => {
    const { clientId, clientSecret } = googlePair();
    if (!clientId || !clientSecret) return null;
    return {
      id: "google_drive",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId,
      clientSecret,
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      authorizeExtras: {
        access_type: "offline",
        prompt: "consent",
      },
    };
  },
  salesforce: () => {
    const clientId = env("SALESFORCE_CLIENT_ID");
    const clientSecret = env("SALESFORCE_CLIENT_SECRET");
    const loginHost = env("SALESFORCE_LOGIN_URL") || "https://login.salesforce.com";
    if (!clientId || !clientSecret) return null;
    return {
      id: "salesforce",
      authorizationUrl: `${loginHost.replace(/\/$/, "")}/services/oauth2/authorize`,
      tokenUrl: `${loginHost.replace(/\/$/, "")}/services/oauth2/token`,
      clientId,
      clientSecret,
      scopes: ["api", "refresh_token", "offline_access"],
    };
  },
  pipedrive: () => {
    const clientId = env("PIPEDRIVE_CLIENT_ID");
    const clientSecret = env("PIPEDRIVE_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return {
      id: "pipedrive",
      authorizationUrl: "https://oauth.pipedrive.com/oauth/authorize",
      tokenUrl: "https://oauth.pipedrive.com/oauth/token",
      clientId,
      clientSecret,
      scopes: ["deals:read", "contacts:read"],
    };
  },
  slack: () => {
    const clientId = env("SLACK_CLIENT_ID");
    const clientSecret = env("SLACK_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return {
      id: "slack",
      authorizationUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      clientId,
      clientSecret,
      scopes: ["channels:read", "chat:write", "users:read"],
    };
  },
  zoom: () => {
    const clientId = env("ZOOM_CLIENT_ID");
    const clientSecret = env("ZOOM_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;
    return {
      id: "zoom",
      authorizationUrl: "https://zoom.us/oauth/authorize",
      tokenUrl: "https://zoom.us/oauth/token",
      clientId,
      clientSecret,
      scopes: ["user:read", "meeting:read"],
    };
  },
  gohighlevel: () => {
    const clientId = env("GOHIGHLEVEL_CLIENT_ID");
    const clientSecret = env("GOHIGHLEVEL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;

    const authorizeExtras: Record<string, string> = {};
    const versionId =
      env("GOHIGHLEVEL_APP_VERSION_ID") ||
      env("GOHIGHLEVEL_VERSION_ID") ||
      env("GOHIGHLEVEL_APP_ID");
    if (versionId) {
      authorizeExtras.version_id = versionId;
    }

    const authHost =
      env("GOHIGHLEVEL_AUTH_URL") ||
      "https://marketplace.gohighlevel.com/oauth/chooselocation";

    return {
      id: "gohighlevel",
      authorizationUrl: authHost,
      tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
      clientId,
      clientSecret,
      scopes: ["contacts.readonly", "opportunities.readonly"],
      ...(Object.keys(authorizeExtras).length > 0
        ? { authorizeExtras }
        : {}),
    };
  },
};

export function getOAuthProviderConfig(
  provider: IntegrationProviderId,
): OAuthProviderConfig | null {
  return PROVIDER_BUILDERS[provider]?.() ?? null;
}

export function buildAuthorizationUrl(
  config: OAuthProviderConfig,
  state: string,
): string {
  const redirectUri = integrationRedirectUri(config.id);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: config.scopes.join(" "),
  });

  if (config.authorizeExtras) {
    for (const [key, value] of Object.entries(config.authorizeExtras)) {
      params.set(key, value);
    }
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string | null;
};

export async function exchangeAuthorizationCode(
  config: OAuthProviderConfig,
  code: string,
): Promise<TokenExchangeResult> {
  const redirectUri = integrationRedirectUri(config.id);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
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
    throw new Error(`Token exchange failed: ${detail}`);
  }

  const accessToken =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.accessToken === "string" && data.accessToken) ||
    "";
  if (!accessToken) {
    throw new Error("Token exchange returned no access_token.");
  }

  const refreshToken =
    (typeof data.refresh_token === "string" && data.refresh_token) ||
    (typeof data.refreshToken === "string" && data.refreshToken) ||
    null;

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
    refreshToken,
    expiresAt,
    scopes,
  };
}
