import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  buildTrackerInsertRow,
  categoryFromDb,
  insertTrackerRow,
  normalizeTracker,
} from "@/src/lib/lifePulse/trackerDb";
import type { CreateLifePulseTrackerInput, LifePulseCategoryId } from "@/src/lib/lifePulse/types";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("lifenode_trackers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch trackers error:", error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 400 },
      );
    }

    const trackers = (data ?? []).map((row) => {
      const normalized = normalizeTracker(row as Record<string, unknown>);
      return {
        ...normalized,
        category: categoryFromDb(String(row.category ?? normalized.category)),
      };
    });

    return NextResponse.json({ trackers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/life-pulse/trackers:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const input = body as CreateLifePulseTrackerInput;
  if (!input.title?.trim() || !input.category) {
    return NextResponse.json({ error: "TITLE_AND_CATEGORY_REQUIRED" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const row = buildTrackerInsertRow(input, userId);
    const { data, error } = await insertTrackerRow(
      supabase,
      row,
      input.category as LifePulseCategoryId,
    );

    if (error || !data) {
      console.error("Supabase insert tracker error:", error);
      return NextResponse.json(
        {
          error: error?.message ?? "INSERT_FAILED",
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        },
        { status: 400 },
      );
    }

    const tracker = normalizeTracker(data);
    return NextResponse.json({
      tracker: {
        ...tracker,
        category: categoryFromDb(String(data.category ?? tracker.category)),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/life-pulse/trackers:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
