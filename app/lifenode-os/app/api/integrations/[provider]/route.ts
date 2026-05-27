import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveIntegrationRouteProvider } from "@/src/lib/integrations/appProviderMap";
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
import { integrationReturnRedirect } from "@/src/lib/integrations/integrationRedirects";
import { upsertUserConnectedApp } from "@/src/lib/integrations/userConnectedAppsDb";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

/** GET — start OAuth: redirect to the provider authorization screen. */
export async function GET(request: Request, context: RouteContext) {
  const { provider: providerParam } = await context.params;
  const url = new URL(request.url);
  const targetNode = url.searchParams.get("node")?.trim() || "BIZ";

  const provider = resolveIntegrationRouteProvider(providerParam);
  if (!provider) {
    return NextResponse.json({ error: "UNKNOWN_PROVIDER" }, { status: 404 });
  }
  const session = await auth();
  if (!session || !session.user?.id) {
    const signIn = new URL("/auth/signin", process.env.AUTH_URL ?? "http://localhost:3000");
    signIn.searchParams.set(
      "callbackUrl",
      `/api/integrations/${providerParam}?node=${encodeURIComponent(targetNode)}`,
    );
    return NextResponse.redirect(signIn);
  }

  const targetUserId = await resolveIntegrationUserId(session);
  if (!targetUserId) {
    return integrationReturnRedirect(
      {
        integration: provider,
        status: "error",
        reason: "account_link_failed",
      },
      targetNode,
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
      targetNode,
    );
  }

  try {
    await upsertUserConnectedApp({
      user_id: targetUserId,
      target_node: targetNode,
      app_id: provider,
      connection_status: "syncing",
    });
  } catch (e) {
    console.error(`OAuth init [${provider}] connected-apps sync:`, e);
  }

  const state = createOAuthState(targetUserId, provider, targetNode);
  const authorizeUrl = buildAuthorizationUrl(config, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
  return response;
}
