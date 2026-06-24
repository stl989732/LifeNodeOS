import { NextResponse } from "next/server";
import type { PlanLimitKey } from "./planLimits";
import { planLimitMessage } from "./planLimits";

export function planLimitDeniedResponse(input: {
  limit: PlanLimitKey;
  current: number;
  max: number;
  planDisplayName: string;
}) {
  return NextResponse.json(
    {
      error: "PLAN_LIMIT_REACHED",
      message: planLimitMessage(input.limit, input.planDisplayName),
      limit: input.limit,
      current: input.current,
      max: input.max,
      upgradeUrl: "/pricing",
    },
    { status: 403 },
  );
}
