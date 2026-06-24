import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function shouldUseSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

/** Collect canonical + sanitized id variants for tombstone checks. */
export function accountIdVariants(...userIds: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const raw of userIds) {
    const id = raw?.trim();
    if (!id) continue;
    seen.add(id);
    const safe = sanitizeUserId(id);
    seen.add(safe);
  }
  return Array.from(seen);
}

export async function markAccountsDeleted(
  userIds: string[],
): Promise<void> {
  if (!shouldUseSupabase()) return;

  const variants = accountIdVariants(...userIds);
  if (!variants.length) return;

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const rows = variants.map((user_id) => ({ user_id, deleted_at: now }));

  const { error } = await supabase
    .from("deleted_account_ids")
    .upsert(rows, { onConflict: "user_id", ignoreDuplicates: false });

  if (error) throw error;
}

export async function isAccountDeleted(
  ...userIds: Array<string | null | undefined>
): Promise<boolean> {
  if (!shouldUseSupabase()) return false;

  const variants = accountIdVariants(...userIds);
  if (!variants.length) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("deleted_account_ids")
    .select("user_id")
    .in("user_id", variants)
    .limit(1);

  if (error) {
    console.error("[account-deleted] tombstone lookup failed:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
