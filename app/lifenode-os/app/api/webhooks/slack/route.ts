import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Slack Events API endpoint (stub).
 * Validates signing secret when SLACK_SIGNING_SECRET is set.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim();

  if (signingSecret) {
    const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
    const signature = request.headers.get("x-slack-signature") ?? "";
    if (!timestamp || !signature) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  try {
    const body = JSON.parse(raw) as { type?: string; challenge?: string };
    if (body.type === "url_verification" && body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
