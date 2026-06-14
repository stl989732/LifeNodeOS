import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type ConnectedAppStatus = "connected" | "syncing" | "disconnected";

export type UserConnectedAppRow = {
  app_id: string;
  target_node: string;
  connection_status: ConnectedAppStatus;
};

export function connectedAppsToStateMap(
  rows: UserConnectedAppRow[],
): Record<string, ConnectedAppStatus> {
  const stateMap: Record<string, ConnectedAppStatus> = {};
  for (const row of rows) {
    const key = `${row.target_node.toLowerCase()}_${row.app_id.toLowerCase()}`;
    stateMap[key] = row.connection_status;
  }
  return stateMap;
}

export async function listUserConnectedApps(
  userId: string,
): Promise<UserConnectedAppRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_connected_apps")
    .select("app_id, target_node, connection_status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to list connected apps: ${error.message}`);
  }

  return (data ?? []) as UserConnectedAppRow[];
}

export async function upsertUserConnectedApp(row: {
  user_id: string;
  target_node: string;
  app_id: string;
  connection_status: ConnectedAppStatus;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("user_connected_apps").upsert(
    {
      user_id: row.user_id,
      target_node: row.target_node.toUpperCase(),
      app_id: row.app_id.toLowerCase(),
      connection_status: row.connection_status,
      last_sync: new Date().toISOString(),
    },
    { onConflict: "user_id,target_node,app_id" },
  );

  if (error) {
    throw new Error(`Failed to save connected app: ${error.message}`);
  }
}
