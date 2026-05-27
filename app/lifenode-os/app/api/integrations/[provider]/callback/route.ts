import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationRouteProvider } from "@/src/lib/integrations/appProviderMap";
import {
  exchangeAuthorizationCode,
  getOAuthProviderConfig,
} from "@/src/lib/integrations/oauthProviders";
import {
  OAUTH_STATE_COOKIE,
  oauthStateMatchesCookie,
  verifyOAuthState,
} from "@/src/lib/integrations/oauthState";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { integrationReturnRedirect } from "@/src/lib/integrations/integrationRedirects";
import { upsertUserConnectedApp } from "@/src/lib/integrations/userConnectedAppsDb";
import { upsertUserIntegration } from "@/src/lib/integrations/userIntegrationsDb";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

/** GET — OAuth callback: exchange code, persist tokens, return to node workspace. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: providerParam } = await context.params;

  const provider = resolveIntegrationRouteProvider(providerParam);
  if (!provider) {
    return NextResponse.json({ error: "UNKNOWN_PROVIDER" }, { status: 404 });
  }

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const queryState = url.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const statePayload =
    queryState && oauthStateMatchesCookie(queryState, cookieState)
      ? verifyOAuthState(queryState)
      : null;
  const targetNode = statePayload?.targetNode ?? "BIZ";

  if (oauthError) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: errorDescription ?? oauthError,
      },
      targetNode,
      true,
    );
  }

  if (!code || !queryState) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "missing_code",
      },
      targetNode,
      true,
    );
  }

  if (!oauthStateMatchesCookie(queryState, cookieState)) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "invalid_state",
      },
      targetNode,
      true,
    );
  }

  if (!statePayload || statePayload.provider !== provider) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "invalid_state",
      },
      targetNode,
      true,
    );
  }

  const session = await auth();
  if (!session || !session.user?.id) {
    return new Response("Unauthorized Session context missing", { status: 401 });
  }

  const targetUserId = await resolveIntegrationUserId(session);
  if (!targetUserId) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "account_link_failed",
      },
      statePayload.targetNode,
      true,
    );
  }

  if (statePayload.userId !== targetUserId) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "session_mismatch",
      },
      statePayload.targetNode,
      true,
    );
  }

  const config = getOAuthProviderConfig(provider);
  if (!config) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "missing_credentials",
      },
      statePayload.targetNode,
      true,
    );
  }

  try {
    const tokens = await exchangeAuthorizationCode(config, code);
    await upsertUserIntegration({
      user_id: targetUserId,
      provider,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      scopes: tokens.scopes,
    });

    try {
      await upsertUserConnectedApp({
        user_id: targetUserId,
        target_node: statePayload.targetNode,
        app_id: provider,
        connection_status: "connected",
      });
    } catch (connectedAppErr) {
      console.error(
        `OAuth callback [${provider}] user_connected_apps (non-fatal):`,
        connectedAppErr,
      );
    }

    return integrationReturnRedirect(
      {
        integration: provider,
        status: "connected",
      },
      statePayload.targetNode,
      true,
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : "token_exchange_failed";
    console.error(`OAuth callback [${provider}]:`, e);
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason,
      },
      statePayload.targetNode,
      true,
    );
  }
}
