import { NextResponse } from "next/server";
import { recordWebAppPageView } from "@/src/lib/admin/webAppViews";

export const runtime = "nodejs";

const VISITOR_RE = /^[a-zA-Z0-9_-]{8,128}$/;

/**
 * Public beacon: records one page view for Admin dashboard rollups.
 * Body: { visitorKey: string }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const visitorKey =
    body &&
    typeof body === "object" &&
    "visitorKey" in body &&
    typeof (body as { visitorKey: unknown }).visitorKey === "string"
      ? (body as { visitorKey: string }).visitorKey.trim()
      : "";

  if (!VISITOR_RE.test(visitorKey)) {
    return NextResponse.json({ ok: false, error: "invalid_visitor" }, { status: 400 });
  }

  const result = await recordWebAppPageView(visitorKey);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason ?? "failed" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
