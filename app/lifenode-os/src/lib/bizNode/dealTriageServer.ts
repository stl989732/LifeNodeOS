import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

/** Server-side feed load (service role) — matches signed-in NextAuth user id. */
export async function fetchBizDealTriageRows(
  userId: string,
): Promise<Record<string, unknown>[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("biz_deal_triage")
    .select("*")
    .eq("user_id", String(userId))
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;

  if ((data ?? []).length > 0) {
    return data as Record<string, unknown>[];
  }

  return [];
}
