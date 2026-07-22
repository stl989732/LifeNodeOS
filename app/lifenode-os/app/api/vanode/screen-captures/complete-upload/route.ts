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
  cloudSynced?: boolean;
};

type CompleteBody = {
  id?: string;
  filename?: string;
  mimeType?: string;
  durationSec?: number;
  includeMic?: boolean;
  clientId?: string | null;
  createdAt?: string;
  sizeBytes?: number;
};

/**
 * After a direct-to-storage upload, verify the object exists and mark the
 * capture as cloudSynced in the user's screen-captures widget manifest.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const filename =
    typeof body.filename === "string" ? body.filename.trim() : "";
  if (!id || !/^[a-zA-Z0-9_-]{8,128}$/.test(id) || !filename) {
    return NextResponse.json({ error: "INVALID_META" }, { status: 400 });
  }

  const sizeBytes =
    typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes)
      ? body.sizeBytes
      : 0;
  if (sizeBytes > SCREEN_CAPTURE_MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const objectPath = `${sanitizeUserId(userId)}/${id}`;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: listed, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(sanitizeUserId(userId), {
        search: id,
        limit: 5,
      });

    const found = listed?.some((row) => row.name === id);
    if (listError || !found) {
      console.error("[screen-captures] complete-upload missing object:", listError);
      return NextResponse.json({ error: "NOT_UPLOADED" }, { status: 409 });
    }

    const meta: CaptureMeta = {
      id,
      filename,
      mimeType:
        typeof body.mimeType === "string" && body.mimeType.trim()
          ? body.mimeType.trim()
          : "video/webm",
      durationSec:
        typeof body.durationSec === "number" && Number.isFinite(body.durationSec)
          ? Math.max(0, Math.round(body.durationSec))
          : 0,
      includeMic: Boolean(body.includeMic),
      clientId: body.clientId ?? null,
      createdAt:
        typeof body.createdAt === "string" && body.createdAt.trim()
          ? body.createdAt.trim()
          : new Date().toISOString(),
      sizeBytes: sizeBytes > 0 ? sizeBytes : 0,
      cloudSynced: true,
    };

    const existing = await getNodeWidget(
      userId,
      NODE_WIDGET_KEYS.vanode.screenCaptures,
    );
    const manifest = Array.isArray(existing?.payload)
      ? (existing!.payload as CaptureMeta[])
      : [];
    const next = [
      meta,
      ...manifest.filter((row) => row.id !== meta.id),
    ].slice(0, 24);

    await upsertNodeWidget(userId, NODE_WIDGET_KEYS.vanode.screenCaptures, next);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof NodeWidgetPersistenceError) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    console.error("POST /api/vanode/screen-captures/complete-upload:", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
