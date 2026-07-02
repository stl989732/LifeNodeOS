import { CONNECTED_APPS_CHANGED_EVENT } from "@/src/lib/useConnectedApps";
import {
  CALENDAR_CONNECT_APPS,
  CALENDAR_TARGET_NODE,
} from "@/src/lib/calendar/integrationConnect";
import type { ScheduleProvider } from "@/src/lib/calendar/types";
import {
  appLabelToProvider,
  toConnectedAppId,
} from "@/src/lib/integrations/appProviderMap";

export async function disconnectCalendarProvider(
  provider: ScheduleProvider,
): Promise<{ ok: boolean; error?: string }> {
  if (provider === "local") {
    return { ok: false, error: "Cannot disconnect local calendar." };
  }

  const appLabel = CALENDAR_CONNECT_APPS[provider];
  const oauthProvider = appLabelToProvider(appLabel);
  const appId = toConnectedAppId(appLabel);

  if (oauthProvider) {
    const res = await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        provider: oauthProvider,
        node: CALENDAR_TARGET_NODE,
        appId,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Disconnect failed" };
    }
  } else {
    const res = await fetch("/api/integrations/connected-apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        node: CALENDAR_TARGET_NODE,
        app: appLabel,
        status: "disconnected",
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Disconnect failed" };
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONNECTED_APPS_CHANGED_EVENT));
  }

  return { ok: true };
}
