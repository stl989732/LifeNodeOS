import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPlanSnapshot } from "@/src/lib/billing/getUserPlan";
import { fetchLemonSubscriptionPortalUrl } from "@/src/lib/billing/lemonsqueezy/client";
import { isLemonSqueezyConfigured } from "@/src/lib/billing/lemonsqueezy/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  try {
    const snapshot = await getUserPlanSnapshot(userId);
    let customerPortalUrl: string | null = null;

    if (
      isLemonSqueezyConfigured() &&
      snapshot.subscription.lemon_subscription_id
    ) {
      customerPortalUrl = await fetchLemonSubscriptionPortalUrl(
        snapshot.subscription.lemon_subscription_id,
      );
    }

    return NextResponse.json({
      plan: snapshot.plan,
      status: snapshot.status,
      isPaid: snapshot.isPaid,
      displayName: snapshot.entitlements.displayName,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      variantSlug: snapshot.variantSlug,
      entitlements: snapshot.entitlements,
      billingConfigured: isLemonSqueezyConfigured(),
      customerPortalUrl,
    });
  } catch (error) {
    console.error("[billing/subscription] GET failed:", error);
    return NextResponse.json(
      { error: "SUBSCRIPTION_READ_FAILED" },
      { status: 500 },
    );
  }
}
