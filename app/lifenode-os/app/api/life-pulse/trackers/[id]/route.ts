import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { categoryFromDb, normalizeTracker } from "@/src/lib/lifePulse/trackerDb";
import {
  normalizePriorityForDb,
  normalizeStatusForDb,
} from "@/src/lib/lifePulse/trackerSchema";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH — update a tracker owned by the signed-in user. */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "MISSING_TRACKER_ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;
  const dbPatch: Record<string, unknown> = {};

  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.due_date !== undefined) {
    dbPatch.target_date = patch.due_date;
    dbPatch.due_date = patch.due_date;
  }
  if (patch.start_date !== undefined) dbPatch.start_date = patch.start_date;
  if (patch.parent_id !== undefined) dbPatch.parent_id = patch.parent_id;
  if (patch.progress_percent !== undefined) {
    dbPatch.progress_percent = Math.round(Number(patch.progress_percent) || 0);
  }
  if (patch.status !== undefined) {
    dbPatch.status = normalizeStatusForDb(String(patch.status));
  }
  if (patch.priority !== undefined) {
    dbPatch.priority = normalizePriorityForDb(String(patch.priority));
  }
  if (patch.context_data !== undefined) {
    dbPatch.context_data = patch.context_data;
  } else if (patch.metrics !== undefined) {
    dbPatch.context_data = patch.metrics;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lifenode_trackers")
      .update(dbPatch)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("PATCH tracker error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const tracker = normalizeTracker(data as Record<string, unknown>);
    return NextResponse.json({
      tracker: {
        ...tracker,
        category: categoryFromDb(String(data.category ?? tracker.category)),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("PATCH /api/life-pulse/trackers/[id]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — remove a tracker owned by the signed-in user. */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "MISSING_TRACKER_ID" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error, count } = await supabase
      .from("lifenode_trackers")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("DELETE tracker error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!count) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("DELETE /api/life-pulse/trackers/[id]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
