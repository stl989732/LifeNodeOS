import { NextResponse } from "next/server";
import { planLimitMessage } from "./planLimits";

export function chefRecipeLimitDeniedResponse(input: {
  recipesUsed: number;
  recipesLimit: number;
  planDisplayName: string;
}) {
  return NextResponse.json(
    {
      error: "PLAN_LIMIT_REACHED",
      message: planLimitMessage("chef_recipes", input.planDisplayName),
      limit: "chef_recipes",
      current: input.recipesUsed,
      max: input.recipesLimit,
      upgradeUrl: "/pricing",
    },
    { status: 403 },
  );
}
