import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { handleLemonSqueezyWebhookEvent } from "@/src/lib/billing/lemonsqueezy/handleWebhookEvent";
import { verifyLemonSqueezyWebhookSignature } from "@/src/lib/billing/lemonsqueezy/verifyWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  if (!verifyLemonSqueezyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const result = await handleLemonSqueezyWebhookEvent(
      payload as Parameters<typeof handleLemonSqueezyWebhookEvent>[0],
    );
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: "lemonsqueezy-webhook" } });
    console.error("[billing/webhook] handler failed:", error);
    return NextResponse.json({ error: "WEBHOOK_HANDLER_FAILED" }, { status: 500 });
  }
}
