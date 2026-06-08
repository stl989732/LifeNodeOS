import { useEffect, useState } from "react";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

export interface ConnectedAppRecord {
  app_id: string;
  target_node: string;
  connection_status: "connected" | "syncing" | "disconnected";
}

export function useConnectedApps(userId: string) {
  const [connectedApps, setConnectedApps] = useState<
    Record<string, "connected" | "syncing" | "disconnected">
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setLoading(false);
      return;
    }

    async function fetchInitialStates() {
      const { data, error } = await supabase
        .from("user_connected_apps")
        .select("app_id, target_node, connection_status")
        .eq("user_id", userId);

      if (!error && data) {
        const stateMap: Record<string, "connected" | "syncing" | "disconnected"> =
          {};
        data.forEach((row: ConnectedAppRecord) => {
          const key = `${row.target_node.toLowerCase()}_${row.app_id.toLowerCase()}`;
          stateMap[key] = row.connection_status;
        });
        setConnectedApps(stateMap);
      }
      setLoading(false);
    }

    void fetchInitialStates();

    const channel = supabase
      .channel(`realtime-user-apps-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_connected_apps",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<ConnectedAppRecord>) => {
          const updatedRow =
            (payload.new as ConnectedAppRecord | undefined) ??
            (payload.old as ConnectedAppRecord | undefined);
          if (!updatedRow) return;

          const key = `${updatedRow.target_node.toLowerCase()}_${updatedRow.app_id.toLowerCase()}`;
          setConnectedApps((prev) => ({
            ...prev,
            [key]:
              payload.eventType === "DELETE"
                ? "disconnected"
                : updatedRow.connection_status,
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { connectedApps, loading };
}
