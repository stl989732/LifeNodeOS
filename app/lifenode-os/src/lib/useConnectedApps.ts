import { useEffect, useState } from "react";
import {
  connectedAppsToStateMap,
  type ConnectedAppStatus,
  type UserConnectedAppRow,
} from "@/src/lib/integrations/userConnectedAppsDb";

export type ConnectedAppRecord = UserConnectedAppRow;

/** Dispatch after connect/disconnect writes so hooks refetch without Supabase Realtime. */
export const CONNECTED_APPS_CHANGED_EVENT = "lifenode:connected-apps-changed";

const POLL_MS = 30_000;

async function fetchConnectedAppsFromApi(): Promise<
  Record<string, ConnectedAppStatus>
> {
  const res = await fetch("/api/integrations/connected-apps", {
    credentials: "include",
  });

  if (res.status === 401) return {};
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to load connected apps",
    );
  }

  const data = (await res.json()) as { apps?: UserConnectedAppRow[] };
  return connectedAppsToStateMap(Array.isArray(data.apps) ? data.apps : []);
}

export function useConnectedApps(userId: string) {
  const [connectedApps, setConnectedApps] = useState<
    Record<string, ConnectedAppStatus>
  >({});
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!userId) {
        setConnectedApps({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const stateMap = await fetchConnectedAppsFromApi();
        if (!cancelled) setConnectedApps(stateMap);
      } catch (err) {
        console.error("[useConnectedApps] fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const onChanged = () => {
      void load();
    };
    const onFocus = () => {
      void load();
    };

    window.addEventListener(CONNECTED_APPS_CHANGED_EVENT, onChanged);
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener(CONNECTED_APPS_CHANGED_EVENT, onChanged);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [userId]);

  return { connectedApps, loading };
}
