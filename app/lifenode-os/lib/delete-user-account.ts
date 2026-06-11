import fs from "fs/promises";
import path from "path";
import { deleteCredentialUserById } from "@/lib/auth-users-store";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const SCREEN_CAPTURE_BUCKET = "user-screen-captures";

const USER_STATE_DIR = path.join(process.cwd(), "data", "user-state");
const WIDGET_DATA_DIR = path.join(process.cwd(), "data", "node-widgets");

function useSupabasePersistence(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function uniqueUserIds(...ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id) continue;
    seen.add(id);
    seen.add(sanitizeUserId(id));
  }
  return Array.from(seen);
}

async function deleteRowsForUserId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<void> {
  const safeId = sanitizeUserId(userId);

  const { data: chats } = await supabase
    .from("linos_chats")
    .select("id")
    .eq("user_id", safeId);
  const chatIds = (chats ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");

  if (chatIds.length > 0) {
    const { error: messagesError } = await supabase
      .from("linos_messages")
      .delete()
      .in("chat_id", chatIds);
    if (messagesError) throw messagesError;
  }

  const tables = [
    "linos_chats",
    "user_node_widget_data",
    "user_shell_state",
    "user_integrations",
    "user_connected_apps",
    "lifenode_trackers",
    "vital_health_metrics",
    "biz_deal_triage",
    "family_events",
    "user_subscriptions",
    "ai_daily_usage",
    "daily_image_generation_caps",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", safeId);
    if (error && error.code !== "42P01") throw error;
  }
}

async function deleteScreenCapturesForUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<void> {
  const prefix = sanitizeUserId(userId);
  const paths: string[] = [];

  async function collect(prefixPath: string): Promise<void> {
    const { data, error } = await supabase.storage
      .from(SCREEN_CAPTURE_BUCKET)
      .list(prefixPath, { limit: 200 });
    if (error) {
      if (error.message?.toLowerCase().includes("not found")) return;
      throw error;
    }
    for (const item of data ?? []) {
      const itemPath = prefixPath ? `${prefixPath}/${item.name}` : item.name;
      if (item.id === null) {
        await collect(itemPath);
      } else {
        paths.push(itemPath);
      }
    }
  }

  await collect(prefix);
  if (paths.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(SCREEN_CAPTURE_BUCKET).remove(chunk);
    if (error) throw error;
  }
}

async function deleteLocalDevFiles(userId: string): Promise<void> {
  const safeId = sanitizeUserId(userId);
  const statePath = path.join(USER_STATE_DIR, `${safeId}.json`);
  const widgetDir = path.join(WIDGET_DATA_DIR, safeId);

  try {
    await fs.unlink(statePath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  try {
    await fs.rm(widgetDir, { recursive: true, force: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export type DeleteUserAccountResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

/**
 * Permanently delete all persisted data for the signed-in user (and linked legacy OAuth id).
 * `pronode_vault` / `event_table` are not user-scoped in the current schema and are skipped.
 */
export async function deleteUserAccount(options: {
  userId: string;
  legacyUserIds?: Array<string | null | undefined>;
  removeCredentialUser?: boolean;
}): Promise<DeleteUserAccountResult> {
  const userIds = uniqueUserIds(options.userId, ...(options.legacyUserIds ?? []));

  try {
    if (useSupabasePersistence()) {
      const supabase = createSupabaseAdminClient();
      for (const id of userIds) {
        await deleteRowsForUserId(supabase, id);
        await deleteScreenCapturesForUser(supabase, id);
      }
    }

    for (const id of userIds) {
      await deleteLocalDevFiles(id);
    }

    if (options.removeCredentialUser) {
      await deleteCredentialUserById(options.userId);
    }

    return { ok: true };
  } catch (e) {
    console.error("[delete-user-account] failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Account deletion failed",
      status: 500,
    };
  }
}
