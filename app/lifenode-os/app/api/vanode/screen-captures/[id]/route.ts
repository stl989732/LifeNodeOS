import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "user-screen-captures";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { id } = await context.params;
  const captureId = id?.trim();
  if (!captureId || !/^[a-zA-Z0-9_-]{8,128}$/.test(captureId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const objectPath = `${sanitizeUserId(userId)}/${captureId}`;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(objectPath);

    if (error || !data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": data.type || "video/webm",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("GET /api/vanode/screen-captures/[id]:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
