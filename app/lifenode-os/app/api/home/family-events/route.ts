import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

export type FamilyEventRow = {
  id: string;
  user_id: string;
  title: string;
  event_time: string;
  category: string;
  event_date: string;
  source: string | null;
  created_at: string;
};

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim() || todayDateKey();

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("family_events")
      .select("*")
      .eq("user_id", userId)
      .eq("event_date", date)
      .order("event_time", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ events: [], date, warning: "TABLE_MISSING" });
      }
      console.error("family_events fetch:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      events: (data ?? []) as FamilyEventRow[],
      date,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/home/family-events:", e);
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

  const obj = body as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const eventTime = typeof obj.event_time === "string" ? obj.event_time : "";
  const category =
    typeof obj.category === "string" && obj.category.trim()
      ? obj.category.trim()
      : "home";
  const eventDate =
    typeof obj.event_date === "string" && obj.event_date.trim()
      ? obj.event_date.trim()
      : todayDateKey();
  const source = typeof obj.source === "string" ? obj.source.trim() : null;

  if (!title || !eventTime) {
    return NextResponse.json({ error: "TITLE_AND_TIME_REQUIRED" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("family_events")
      .insert({
        user_id: userId,
        title,
        event_time: eventTime,
        category,
        event_date: eventDate,
        source,
      })
      .select("*")
      .single();

    if (error) {
      console.error("family_events insert:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ event: data as FamilyEventRow });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
