import {
  resolveAppConnectProvider,
  toConnectedAppId,
} from "@/src/lib/integrations/appProviderMap";
import { integrationRedirectPathSegment } from "@/src/lib/integrations/oauthRedirectPaths";
import { CONNECTED_APPS_CHANGED_EVENT } from "@/src/lib/useConnectedApps";

function notifyConnectedAppsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONNECTED_APPS_CHANGED_EVENT));
}

async function markAppSyncing(
  nodeName: string,
  appId: string,
): Promise<{ ok: boolean; planLimit?: boolean; message?: string }> {
  try {
    const res = await fetch("/api/integrations/connected-apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        node: nodeName.toUpperCase(),
        app: appId,
        status: "syncing",
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      console.error(
        "Error syncing app card state:",
        typeof data?.error === "string" ? data.error : res.statusText,
      );
      return {
        ok: false,
        planLimit: data.error === "PLAN_LIMIT_REACHED",
        message: data.message,
      };
    }
    notifyConnectedAppsChanged();
    return { ok: true };
  } catch (e) {
    console.error("Error syncing app card state:", e);
    return { ok: false };
  }
}

async function fetchOAuthAuthorizeUrl(
  providerSegment: string,
  nodeName: string,
  appId: string,
): Promise<string | null> {
  const node = encodeURIComponent(nodeName.toUpperCase());
  const app = encodeURIComponent(appId);
  const res = await fetch(
    `/api/integrations/${providerSegment}?node=${node}&app=${app}&format=json`,
    { credentials: "include" },
  );

  if (res.status === 401) return null;

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const reason =
      typeof data?.error === "string" ? data.error : res.statusText;
    throw new Error(reason || "Could not start OAuth flow.");
  }

  const data = (await res.json()) as { url?: string };
  return typeof data.url === "string" ? data.url : null;
}

/**
 * Start OAuth for a provider-backed app card.
 * Fetches a signed authorize URL from the server, then redirects the browser.
 */
export async function startOAuthConnect(
  nodeName: string,
  appId: string,
): Promise<"redirected" | "unauthorized" | "unsupported" | "plan_limit"> {
  const provider = resolveAppConnectProvider(appId);
  if (!provider) return "unsupported";

  const appKey = toConnectedAppId(appId);
  const segment = integrationRedirectPathSegment(provider);
  const node = encodeURIComponent(nodeName.toUpperCase());
  const app = encodeURIComponent(appKey);

  const syncResult = await markAppSyncing(nodeName, appId);
  if (!syncResult.ok) {
    return syncResult.planLimit ? "plan_limit" : "unauthorized";
  }

  let authorizeUrl: string | null = null;
  try {
    authorizeUrl = await fetchOAuthAuthorizeUrl(segment, nodeName, appKey);
  } catch (err) {
    console.warn("[OAuth] JSON authorize failed, using server redirect:", err);
  }

  if (!authorizeUrl) return "unauthorized";

  if (authorizeUrl.startsWith("http")) {
    window.location.href = authorizeUrl;
    return "redirected";
  }

  window.location.href = `/api/integrations/${segment}?node=${node}&app=${app}`;
  return "redirected";
}

/**
 * Handles updating the database when a user connects an integration app card.
 * Uses real OAuth when a provider is configured; otherwise opens the dev mock popup.
 */
export async function connectAppToNode(
  userId: string,
  nodeName: string,
  appId: string,
): Promise<boolean> {
  const appKey = toConnectedAppId(appId);
  const provider = resolveAppConnectProvider(appId);

  if (provider) {
    const outcome = await startOAuthConnect(nodeName, appId);
    return outcome === "redirected";
  }

  const synced = await markAppSyncing(nodeName, appId);
  if (!synced.ok) return false;

  const width = 600;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    `/api/integrations/mock-callback?app=${encodeURIComponent(appKey)}&node=${encodeURIComponent(nodeName)}`,
    `${appKey}-auth`,
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`,
  );

  return true;
}
