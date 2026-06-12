import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { syncAllInboxProviders } from "@/src/lib/orchestrator/syncAll";

export const runtime = "nodejs";

/**
 * Vercel Cron — refreshes inbox_items for users with active integrations.
 * Set CRON_SECRET in env and configure vercel.json cron to hit this route.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: integrations, error } = await supabase
    .from("user_integrations")
    .select("user_id")
    .in("provider_name", ["gmail", "slack", "google"]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((integrations ?? []).map((r) => String(r.user_id)))];

  let synced = 0;
  const errors: string[] = [];

  for (const integrationUserId of userIds.slice(0, 50)) {
    try {
      const { data: shell } = await supabase
        .from("user_shell_state")
        .select("user_id")
        .eq("user_id", integrationUserId)
        .maybeSingle();

      const sessionUserId = shell?.user_id
        ? String(shell.user_id)
        : integrationUserId;

      await syncAllInboxProviders({
        integrationUserId,
        sessionUserId,
      });
      synced += 1;
    } catch (e) {
      errors.push(
        e instanceof Error ? e.message : `sync_failed:${integrationUserId}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: synced,
    errors: errors.slice(0, 10),
  });
}
