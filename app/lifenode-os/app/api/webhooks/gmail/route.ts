import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Gmail Pub/Sub push endpoint (stub).
 * Configure Google Cloud Pub/Sub to POST here; verify token and enqueue sync.
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-goog-channel-token");
  const expected = process.env.GMAIL_WEBHOOK_TOKEN?.trim();
  if (expected && token !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await request.json();
  } catch {
    return NextResponse.json({ ok: true, queued: false });
  }

  return NextResponse.json({ ok: true, queued: true });
}
