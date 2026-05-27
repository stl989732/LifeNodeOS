import {
  resolveAppConnectProvider,
  toConnectedAppId,
} from "@/src/lib/integrations/appProviderMap";
import { integrationRedirectPathSegment } from "@/src/lib/integrations/oauthProviders";

async function markAppSyncing(
  nodeName: string,
  appId: string,
): Promise<boolean> {
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
      const data = await res.json().catch(() => ({}));
      console.error(
        "Error syncing app card state:",
        typeof data?.error === "string" ? data.error : res.statusText,
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error syncing app card state:", e);
    return false;
  }
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

  const synced = await markAppSyncing(nodeName, appId);
  if (!synced) return false;

  if (provider) {
    const segment = integrationRedirectPathSegment(provider);
    const node = encodeURIComponent(nodeName.toUpperCase());
    window.location.href = `/api/integrations/${segment}?node=${node}`;
    return true;
  }

  const width = 600;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  window.open(
    `/api/integrations/mock-callback?app=${encodeURIComponent(appKey)}&node=${encodeURIComponent(nodeName)}&userId=${encodeURIComponent(userId)}`,
    `${appKey}-auth`,
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`,
  );

  return true;
}
