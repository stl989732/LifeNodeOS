import type { IntegrationProviderId } from "./types";

/** OAuth redirect path segment (console-safe); may differ from internal provider id. */
const OAUTH_REDIRECT_PATH: Partial<Record<IntegrationProviderId, string>> = {
  gohighlevel: "hl",
};

/**
 * Client-safe: no OAuth secrets. Use this from UI code instead of oauthProviders.ts.
 */
export function integrationRedirectPathSegment(
  provider: IntegrationProviderId,
): string {
  return OAUTH_REDIRECT_PATH[provider] ?? provider;
}
