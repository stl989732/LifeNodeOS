import { NextResponse } from "next/server";
import type { MeterResult } from "./meterAiUsage";

function nextUtcMidnightIso(): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return next.toISOString();
}

export function meterDeniedResponse(
  result: Extract<MeterResult, { allowed: false }>,
) {
  const message =
    result.reason === "credits_exhausted"
      ? "You've used today's AI credits. Limits reset at midnight UTC."
      : `You've reached today's limit for this feature. Limits reset at midnight UTC.`;

  return NextResponse.json(
    {
      error: "AI_LIMIT_REACHED",
      message,
      usage: {
        creditsUsed: result.creditsUsed,
        creditsLimit: result.creditsLimit,
        feature: result.feature,
        featureUsed: result.featureUsed,
        featureLimit: result.featureLimit,
        resetsAt: nextUtcMidnightIso(),
      },
      upgradeUrl: "/pricing",
    },
    { status: 429 },
  );
}
