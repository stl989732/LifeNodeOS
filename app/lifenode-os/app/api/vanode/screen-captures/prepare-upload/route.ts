import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  SCREEN_CAPTURE_MAX_BYTES,
} from "@/lib/vanode/screenCaptureLimits";

export const runtime = "nodejs";

const BUCKET = "user-screen-captures";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

type PrepareBody = {
  id?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

/**
 * Issues a short-lived signed upload URL so the browser can PUT the recording
 * straight to Supabase Storage (avoids Vercel’s ~4.5MB request body limit).
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: PrepareBody;
  try {
    body = (await request.json()) as PrepareBody;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const filename = typeof body.filename === "string" ? body.filename.trim() : "";
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType.trim()
      ? body.mimeType.trim()
      : "video/webm";
  const sizeBytes =
    typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes)
      ? body.sizeBytes
      : 0;

  if (!id || !/^[a-zA-Z0-9_-]{8,128}$/.test(id) || !filename) {
    return NextResponse.json({ error: "INVALID_META" }, { status: 400 });
  }
  if (sizeBytes <= 0 || sizeBytes > SCREEN_CAPTURE_MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const objectPath = `${sanitizeUserId(userId)}/${id}`;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath, { upsert: true });

    if (error || !data?.token || !data.path) {
      console.error("[screen-captures] prepare-upload failed:", error);
      return NextResponse.json(
        { error: "PREPARE_FAILED", message: error?.message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      id,
      mimeType,
      filename,
    });
  } catch (e) {
    console.error("POST /api/vanode/screen-captures/prepare-upload:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
