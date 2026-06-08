import type { Session } from "next-auth";
import {
  resolveIntegrationRouteProvider,
  toConnectedAppId,
} from "@/src/lib/integrations/appProviderMap";
import { integrationReturnRedirect } from "@/src/lib/integrations/integrationRedirects";
import {
  buildAuthorizationUrl,
  getOAuthProviderConfig,
} from "@/src/lib/integrations/oauthProviders";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import {
  createOAuthState,
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
} from "@/src/lib/integrations/oauthState";
import { upsertUserConnectedApp } from "@/src/lib/integrations/userConnectedAppsDb";
import type { IntegrationProviderId } from "@/src/lib/integrations/types";
import { NextResponse } from "next/server";

export type BeginOAuthFlowInput = {
  providerParam: string;
  targetNode: string;
  appHint?: string | null;
  session: Session;
  /** When true, return JSON `{ url }` instead of a 302 redirect. */
  jsonResponse?: boolean;
};

export type BeginOAuthFlowResult =
  | { ok: true; response: NextResponse }
  | { ok: false; response: NextResponse };

function signInRedirect(providerParam: string, targetNode: string): NextResponse {
  const signIn = new URL("/auth/signin", process.env.AUTH_URL ?? "http://localhost:3000");
  const returnPath = `/api/integrations/${providerParam}?node=${encodeURIComponent(targetNode)}`;
  signIn.searchParams.set("callbackUrl", returnPath);
  return NextResponse.redirect(signIn);
}

function withOAuthCookie(
  response: NextResponse,
  state: string,
): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  return response;
}

export async function beginOAuthFlow(
  input: BeginOAuthFlowInput,
): Promise<BeginOAuthFlowResult> {
  const provider = resolveIntegrationRouteProvider(input.providerParam);
  if (!provider) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNKNOWN_PROVIDER" }, { status: 404 }),
    };
  }

  const sessionUserId = input.session.user?.id?.trim();
  if (!sessionUserId) {
    return { ok: false, response: signInRedirect(input.providerParam, input.targetNode) };
  }

  const integrationUserId = await resolveIntegrationUserId(input.session);
  if (!integrationUserId) {
    return {
      ok: false,
      response: integrationReturnRedirect(
        {
          integration: provider,
          status: "error",
          reason: "account_link_failed",
        },
        input.targetNode,
      ),
    };
  }

  const config = getOAuthProviderConfig(provider);
  if (!config) {
    return {
      ok: false,
      response: integrationReturnRedirect(
        {
          integration: provider,
          status: "error",
          reason: "missing_credentials",
        },
        input.targetNode,
      ),
    };
  }

  const appId = toConnectedAppId(input.appHint?.trim() || provider);

  try {
    await upsertUserConnectedApp({
      user_id: sessionUserId,
      target_node: input.targetNode,
      app_id: appId,
      connection_status: "syncing",
    });
  } catch (e) {
    console.error(`OAuth init [${provider}] connected-apps sync:`, e);
  }

  const state = createOAuthState({
    integrationUserId,
    sessionUserId,
    appId,
    provider,
    targetNode: input.targetNode,
  });
  const authorizeUrl = buildAuthorizationUrl(config, state);

  if (input.jsonResponse) {
    return {
      ok: true,
      response: withOAuthCookie(
        NextResponse.json({ url: authorizeUrl, provider, appId }),
        state,
      ),
    };
  }

  return {
    ok: true,
    response: withOAuthCookie(NextResponse.redirect(authorizeUrl), state),
  };
}

export function oauthProviderFromParam(
  providerParam: string,
): IntegrationProviderId | null {
  return resolveIntegrationRouteProvider(providerParam);
}
