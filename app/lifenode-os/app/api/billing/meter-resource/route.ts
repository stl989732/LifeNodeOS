import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  meterPlanResource,
  planLimitKeyForResource,
  type PlanResourceFeature,
} from "@/src/lib/billing/meterPlanResource";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { planLimitDeniedResponse } from "@/src/lib/billing/planLimitResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURES = new Set<PlanResourceFeature>([
  "invoices",
  "eod_records",
  "transcriptions",
  "kanban_boards",
]);

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: { feature?: string } = {};
  try {
    body = (await request.json()) as { feature?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const feature = body.feature as PlanResourceFeature | undefined;
  if (!feature || !FEATURES.has(feature)) {
    return NextResponse.json({ error: "INVALID_FEATURE" }, { status: 400 });
  }

  const result = await meterPlanResource(userId, feature);
  if (!result.allowed) {
    const plan = await getUserPlan(userId);
    const entitlements = getPlanEntitlements(plan);
    return planLimitDeniedResponse({
      limit: planLimitKeyForResource(feature),
      current: result.used,
      max: result.limit,
      planDisplayName: entitlements.displayName,
    });
  }

  return NextResponse.json({
    ok: true,
    feature: result.feature,
    used: result.used,
    limit: result.limit,
  });
}
