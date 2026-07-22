import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  getNodeWidget,
  upsertNodeWidget,
  NodeWidgetPersistenceError,
} from "@/lib/node-widget-data-store";
import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import { SCREEN_CAPTURE_MAX_BYTES } from "@/lib/vanode/screenCaptureLimits";

export const runtime = "nodejs";

const BUCKET = "user-screen-captures";
const MAX_BYTES = SCREEN_CAPTURE_MAX_BYTES;

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

type CaptureMeta = {
  id: string;
  filename: string;
  mimeType: string;
  durationSec: number;
  includeMic: boolean;
  clientId?: string | null;
  createdAt: string;
  sizeBytes: number;
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const file = form.get("file");
  const metaRaw = form.get("meta");
  if (!(file instanceof Blob) || typeof metaRaw !== "string") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  let meta: CaptureMeta;
  try {
    meta = JSON.parse(metaRaw) as CaptureMeta;
  } catch {
    return NextResponse.json({ error: "INVALID_META" }, { status: 400 });
  }

  if (!meta.id || !meta.filename) {
    return NextResponse.json({ error: "INVALID_META" }, { status: 400 });
  }

  const safeUser = sanitizeUserId(userId);
  const objectPath = `${safeUser}/${meta.id}`;

  try {
    const supabase = createSupabaseAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: meta.mimeType || file.type || "video/webm",
        upsert: true,
      });

    if (uploadError) {
      console.error("[screen-captures] upload failed:", uploadError);
      return NextResponse.json(
        { error: "UPLOAD_FAILED", message: uploadError.message },
        { status: 503 },
      );
    }

    const existing = await getNodeWidget(userId, NODE_WIDGET_KEYS.vanode.screenCaptures);
    const manifest = Array.isArray(existing?.payload)
      ? (existing!.payload as CaptureMeta[])
      : [];
    const record = { ...meta, cloudSynced: true };
    const next = [
      record,
      ...manifest.filter((row) => row.id !== meta.id),
    ].slice(0, 24);

    await upsertNodeWidget(userId, NODE_WIDGET_KEYS.vanode.screenCaptures, next);
    return NextResponse.json({ ok: true, id: meta.id });
  } catch (e) {
    if (e instanceof NodeWidgetPersistenceError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("POST /api/vanode/screen-captures:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
