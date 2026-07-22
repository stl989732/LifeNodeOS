import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNodeWidget, upsertNodeWidget } from "@/lib/node-widget-data-store";
import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import { SITE_URL } from "@/lib/site-url";
import { createScreenCaptureShareToken } from "@/lib/vanode/screenCaptureShareToken";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getUserPlanSnapshot } from "@/src/lib/billing/getUserPlan";

export const runtime = "nodejs";

const BUCKET = "user-screen-captures";

type CaptureMeta = {
  id?: string;
  filename?: string;
  mimeType?: string;
  cloudSynced?: boolean;
  durationSec?: number;
  includeMic?: boolean;
  clientId?: string | null;
  createdAt?: string;
  sizeBytes?: number;
};

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function publicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host && /localhost|127\.0\.0\.1/i.test(host)) {
    return `${proto}://${host}`;
  }
  // Prefer canonical production host so shared links aren't preview-deployment URLs.
  if (process.env.VERCEL_ENV === "production" || !host) {
    return SITE_URL;
  }
  return `${proto}://${host}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const plan = await getUserPlanSnapshot(userId);
  if (!plan.entitlements.screenCapturesDownloadable) {
    return NextResponse.json({ error: "PLAN_REQUIRED" }, { status: 403 });
  }

  const { id } = await context.params;
  const captureId = id?.trim();
  if (!captureId || !/^[a-zA-Z0-9_-]{8,128}$/.test(captureId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  let bodyFilename: string | undefined;
  let bodyMimeType: string | undefined;
  let bodySizeBytes: number | undefined;
  try {
    const body = (await request.json()) as {
      filename?: string;
      mimeType?: string;
      sizeBytes?: number;
    };
    if (typeof body.filename === "string" && body.filename.trim()) {
      bodyFilename = body.filename.trim();
    }
    if (typeof body.mimeType === "string" && body.mimeType.trim()) {
      bodyMimeType = body.mimeType.trim();
    }
    if (typeof body.sizeBytes === "number" && Number.isFinite(body.sizeBytes)) {
      bodySizeBytes = body.sizeBytes;
    }
  } catch {
    // Body is optional for older clients.
  }

  const objectPath = `${sanitizeUserId(userId)}/${captureId}`;
  const supabase = createSupabaseAdminClient();
  const { data: listed, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(sanitizeUserId(userId), { search: captureId, limit: 5 });
  const objectExists = !listError && Boolean(listed?.some((row) => row.name === captureId));
  if (!objectExists) {
    return NextResponse.json({ error: "NOT_UPLOADED" }, { status: 409 });
  }

  const widget = await getNodeWidget(
    userId,
    NODE_WIDGET_KEYS.vanode.screenCaptures,
  );
  const rows = Array.isArray(widget?.payload)
    ? (widget.payload as CaptureMeta[])
    : [];
  let capture = rows.find((row) => row.id === captureId);

  const filename = capture?.filename || bodyFilename;
  if (!filename) {
    return NextResponse.json({ error: "NOT_UPLOADED" }, { status: 409 });
  }

  const mimeType = capture?.mimeType || bodyMimeType || "video/webm";

  // Heal stale manifests: object is in storage but widget missing / not marked synced.
  if (!capture?.cloudSynced) {
    const healed: CaptureMeta = {
      ...(capture || {}),
      id: captureId,
      filename,
      mimeType,
      cloudSynced: true,
      sizeBytes: capture?.sizeBytes ?? bodySizeBytes,
      createdAt: capture?.createdAt || new Date().toISOString(),
      durationSec: capture?.durationSec ?? 0,
      includeMic: capture?.includeMic ?? false,
      clientId: capture?.clientId ?? null,
    };
    const next = [healed, ...rows.filter((row) => row.id !== captureId)].slice(
      0,
      24,
    );
    await upsertNodeWidget(userId, NODE_WIDGET_KEYS.vanode.screenCaptures, next);
    capture = healed;
  }

  const { token, expiresAt } = createScreenCaptureShareToken({
    userId,
    captureId,
    filename,
    mimeType,
  });
  const url = `${publicOrigin(request)}/api/vanode/screen-captures/public/${token}`;

  return NextResponse.json({ url, expiresAt });
}
