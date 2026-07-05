import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getBillingConfigDiagnostic,
  getLemonSqueezyStoreId,
  resolveCheckoutVariant,
} from "@/src/lib/billing/lemonsqueezy/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signed-in diagnostic: which billing env keys are set (never returns secret values). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const diagnostic = getBillingConfigDiagnostic();
  const variants = {
    syncMonthly: Boolean(resolveCheckoutVariant("sync", "monthly")),
    syncAnnual: Boolean(resolveCheckoutVariant("sync", "annual")),
    nexusMonthly: Boolean(resolveCheckoutVariant("nexus", "monthly")),
    nexusAnnual: Boolean(resolveCheckoutVariant("nexus", "annual")),
  };

  return NextResponse.json({
    configured: diagnostic.configured,
    missing: diagnostic.missing,
    storeIdSet: Boolean(getLemonSqueezyStoreId()),
    variants,
    hint:
      "Use BILLING_* env names in Vercel Production. Redeploy after changing env vars.",
  });
}
