import fs from "fs/promises";
import path from "path";
import { markAccountsDeleted } from "@/lib/account-deleted";
import { deleteCredentialUserById } from "@/lib/auth-users-store";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const SCREEN_CAPTURE_BUCKET = "user-screen-captures";

const USER_STATE_DIR = path.join(process.cwd(), "data", "user-state");
const WIDGET_DATA_DIR = path.join(process.cwd(), "data", "node-widgets");

const USER_SCOPED_TABLES = [
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
  "inbox_items",
  "pronode_vault",
  "event_table",
] as const;

function isServerlessRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function shouldUseSupabasePersistence(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function shouldUseSupabaseCredentialStore(): boolean {
  return shouldUseSupabasePersistence();
}

/** Local JSON files are dev-only; Vercel/serverless must use Supabase. */
function shouldUseFilesystemDevPersistence(): boolean {
  if (isServerlessRuntime()) return false;
  return !shouldUseSupabasePersistence();
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

function userIdVariants(userId: string): string[] {
  const trimmed = userId.trim();
  if (!trimmed) return [];
  const safeId = sanitizeUserId(trimmed);
  return trimmed === safeId ? [safeId] : [trimmed, safeId];
}

function collectUserIdVariants(userIds: string[]): string[] {
  const variants = new Set<string>();
  for (const id of userIds) {
    for (const variant of userIdVariants(id)) {
      variants.add(variant);
    }
  }
  return Array.from(variants);
}

async function deleteRowsForUserIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<void> {
  const variants = collectUserIdVariants(userIds);
  if (variants.length === 0) return;

  const chatIds = new Set<string>();
  for (const uid of variants) {
    const { data: chats, error: chatsError } = await supabase
      .from("linos_chats")
      .select("id")
      .eq("user_id", uid);
    if (chatsError && chatsError.code !== "42P01") throw chatsError;
    for (const row of chats ?? []) {
      if (typeof row.id === "string") chatIds.add(row.id);
    }
  }

  const chatIdList = Array.from(chatIds);
  if (chatIdList.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < chatIdList.length; i += chunkSize) {
      const chunk = chatIdList.slice(i, i + chunkSize);
      const { error: messagesError } = await supabase
        .from("linos_messages")
        .delete()
        .in("chat_id", chunk);
      if (messagesError) throw messagesError;
    }
  }

  for (const table of USER_SCOPED_TABLES) {
    for (const uid of variants) {
      const { error } = await supabase.from(table).delete().eq("user_id", uid);
      if (error && error.code !== "42P01") throw error;
    }
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
      const message = error.message?.toLowerCase() ?? "";
      if (message.includes("not found") || message.includes("does not exist")) {
        return;
      }
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
    const { error } = await supabase.storage
      .from(SCREEN_CAPTURE_BUCKET)
      .remove(chunk);
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
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES" && code !== "EPERM") throw e;
  }

  try {
    await fs.rm(widgetDir, { recursive: true, force: true });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "EACCES" && code !== "EPERM") throw e;
  }
}

export type DeleteUserAccountResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

/**
 * Permanently delete all persisted data for the signed-in user (and linked legacy OAuth id).
 * `pronode_vault_shares` cascade when vault rows are removed.
 */
export async function deleteUserAccount(options: {
  userId: string;
  legacyUserIds?: Array<string | null | undefined>;
  removeCredentialUser?: boolean;
}): Promise<DeleteUserAccountResult> {
  const userIds = uniqueUserIds(options.userId, ...(options.legacyUserIds ?? []));

  try {
    if (isServerlessRuntime() && !shouldUseSupabasePersistence()) {
      return {
        ok: false,
        error:
          "Account deletion is unavailable: database storage is not configured on this server.",
        status: 503,
      };
    }

    if (shouldUseSupabasePersistence()) {
      const supabase = createSupabaseAdminClient();
      await deleteRowsForUserIds(supabase, userIds);

      const captureIds = new Set(userIds.map((id) => sanitizeUserId(id)));
      for (const id of captureIds) {
        try {
          await deleteScreenCapturesForUser(supabase, id);
        } catch (e) {
          console.warn(
            "[delete-user-account] screen capture cleanup failed (continuing):",
            e,
          );
        }
      }
    }

    if (shouldUseFilesystemDevPersistence()) {
      for (const id of userIds) {
        await deleteLocalDevFiles(id);
      }
    }

    if (options.removeCredentialUser) {
      if (!shouldUseSupabaseCredentialStore() && isServerlessRuntime()) {
        return {
          ok: false,
          error:
            "Account deletion could not remove your sign-in record. Database storage is not configured on this server.",
          status: 503,
        };
      }
      await deleteCredentialUserById(options.userId);
    }

    await markAccountsDeleted(userIds);

    return { ok: true };
  } catch (e) {
    const pgCode =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : null;
    console.error("[delete-user-account] failed:", e);
    if (pgCode === "42501") {
      return {
        ok: false,
        error:
          "Account deletion is temporarily blocked by database permissions. Please try again shortly or contact support@lifenodeos.com.",
        status: 503,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Account deletion failed",
      status: 500,
    };
  }
}
