import { CONNECTED_APPS_CHANGED_EVENT } from "@/src/lib/useConnectedApps";

export type InboxDisconnectProvider = "gmail" | "slack";

/**
 * Revoke Gmail/Slack tokens and mark Inbox (+ VA) connected-app cards disconnected.
 */
export async function disconnectInboxProvider(
  provider: InboxDisconnectProvider,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/integrations/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      provider,
      node: "INBOX",
      appId: provider,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Disconnect failed" };
  }

  // Clear VA discovery cards that share the same provider id, if present.
  await fetch("/api/integrations/connected-apps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      node: "VA",
      app: provider,
      status: "disconnected",
    }),
  }).catch(() => {
    /* non-fatal — tokens already revoked */
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONNECTED_APPS_CHANGED_EVENT));
  }

  return { ok: true };
}
