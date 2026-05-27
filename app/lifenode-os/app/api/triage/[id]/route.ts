import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH — archive a deal-triage card (keeps row for metrics). */
export async function PATCH(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing card id." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("biz_deal_triage")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", String(userId));

    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Archive failed";
    console.error("PATCH /api/triage/[id]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — permanently remove a deal-triage card. */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing card id." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("biz_deal_triage")
      .delete()
      .eq("id", id)
      .eq("user_id", String(userId));

    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    console.error("DELETE /api/triage/[id]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
