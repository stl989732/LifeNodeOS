import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNodeWidget } from "@/lib/node-widget-data-store";
import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import { createScreenCaptureShareToken } from "@/lib/vanode/screenCaptureShareToken";
import { getUserPlanSnapshot } from "@/src/lib/billing/getUserPlan";

export const runtime = "nodejs";

type CaptureMeta = {
  id?: string;
  filename?: string;
  mimeType?: string;
  cloudSynced?: boolean;
};

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

  const widget = await getNodeWidget(
    userId,
    NODE_WIDGET_KEYS.vanode.screenCaptures,
  );
  const rows = Array.isArray(widget?.payload)
    ? (widget.payload as CaptureMeta[])
    : [];
  const capture = rows.find((row) => row.id === captureId);
  if (!capture?.cloudSynced || !capture.filename) {
    return NextResponse.json({ error: "NOT_UPLOADED" }, { status: 409 });
  }

  const { token, expiresAt } = createScreenCaptureShareToken({
    userId,
    captureId,
    filename: capture.filename,
    mimeType: capture.mimeType || "video/webm",
  });
  const origin = new URL(request.url).origin;
  const url = `${origin}/api/vanode/screen-captures/public/${token}`;

  return NextResponse.json({ url, expiresAt });
}
