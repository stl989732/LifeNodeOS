import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createLemonSqueezyCheckout } from "@/src/lib/billing/lemonsqueezy/client";
import {
  getBillingConfigDiagnostic,
  isLemonSqueezyConfigured,
} from "@/src/lib/billing/lemonsqueezy/config";
import { isPaidPlanKey, type BillingInterval } from "@/src/lib/billing/plans";
import { ensureCoreSubscription } from "@/src/lib/billing/subscriptionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Sign in to subscribe to a paid plan.",
    },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) return unauthorized();

  if (!isLemonSqueezyConfigured()) {
    const diagnostic = getBillingConfigDiagnostic();
    return NextResponse.json(
      {
        error: "BILLING_NOT_CONFIGURED",
        message:
          "Checkout is not configured. Set billing env vars in Vercel and redeploy.",
        missing: diagnostic.missing,
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const planRaw = typeof obj.plan === "string" ? obj.plan : "";
  const intervalRaw = typeof obj.interval === "string" ? obj.interval : "monthly";

  if (!isPaidPlanKey(planRaw)) {
    return NextResponse.json(
      { error: "INVALID_PLAN", message: "Plan must be sync or nexus." },
      { status: 400 },
    );
  }

  const interval: BillingInterval =
    intervalRaw === "annual" ? "annual" : "monthly";

  const redirectUrl =
    typeof obj.redirectUrl === "string" && obj.redirectUrl.trim()
      ? obj.redirectUrl.trim()
      : undefined;

  try {
    await ensureCoreSubscription(userId);

    const checkout = await createLemonSqueezyCheckout({
      userId,
      userEmail,
      userName: session.user?.name,
      plan: planRaw,
      interval,
      redirectUrl,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    console.error("[billing/checkout]", message);
    return NextResponse.json(
      {
        error: message,
        message:
          message === "BILLING_NOT_CONFIGURED"
            ? "Checkout is not configured."
            : `Could not start checkout: ${message}`,
      },
      { status: 500 },
    );
  }
}
