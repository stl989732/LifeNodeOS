import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type ConnectedAppStatus = "connected" | "syncing" | "disconnected";

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
