import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { verifyScreenCaptureShareToken } from "@/lib/vanode/screenCaptureShareToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "user-screen-captures";

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const payload = verifyScreenCaptureShareToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "This recording link is invalid or has expired." },
      { status: 404 },
    );
  }

  const objectPath = `${sanitizeUserId(payload.userId)}/${payload.captureId}`;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(objectPath);
    if (error || !data) {
      return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const safeFilename = encodeURIComponent(payload.filename);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": payload.mimeType || data.type || "video/webm",
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${safeFilename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (error) {
    console.error("GET public screen-capture share:", error);
    return NextResponse.json({ error: "Could not load recording." }, { status: 500 });
  }
}
