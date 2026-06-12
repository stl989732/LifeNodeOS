import * as Sentry from "@sentry/nextjs";
import { getPlanEntitlements } from "@/src/lib/billing/planEntitlements";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  METER_EVENTS,
  type MeterEventKey,
  type MeterFeatureKey,
} from "./events";

export type MeterResult =
  | {
      allowed: true;
      creditsUsed: number;
      creditsLimit: number;
      feature: MeterFeatureKey;
      featureUsed: number;
      featureLimit: number;
    }
  | {
      allowed: false;
      reason: "credits_exhausted" | "feature_exhausted" | "invalid_user";
      creditsUsed: number;
      creditsLimit: number;
      feature?: MeterFeatureKey;
      featureUsed?: number;
      featureLimit?: number;
    };

function meteringSkipped(): boolean {
  return process.env.SKIP_AI_METERING === "1";
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function parseMeterRpcResult(
  data: unknown,
  creditsLimit: number,
  featureKey: MeterFeatureKey,
  featureLimit: number,
): MeterResult {
  if (!data || typeof data !== "object") {
    return {
      allowed: true,
      creditsUsed: 0,
      creditsLimit,
      feature: featureKey,
      featureUsed: 0,
      featureLimit,
    };
  }

  const row = data as Record<string, unknown>;
  if (row.allowed === true) {
    return {
      allowed: true,
      creditsUsed: Number(row.credits_used ?? 0),
      creditsLimit: Number(row.credits_limit ?? creditsLimit),
      feature: featureKey,
      featureUsed: Number(row.feature_used ?? 0),
      featureLimit: Number(row.feature_limit ?? featureLimit),
    };
  }

  const reason =
    row.reason === "credits_exhausted" ||
    row.reason === "feature_exhausted" ||
    row.reason === "invalid_user"
      ? row.reason
      : "credits_exhausted";

  return {
    allowed: false,
    reason,
    creditsUsed: Number(row.credits_used ?? 0),
    creditsLimit: Number(row.credits_limit ?? creditsLimit),
    feature:
      typeof row.feature === "string"
        ? (row.feature as MeterFeatureKey)
        : featureKey,
    featureUsed:
      typeof row.feature_used === "number" ? row.feature_used : undefined,
    featureLimit:
      typeof row.feature_limit === "number" ? row.feature_limit : featureLimit,
  };
}

export async function meterAiUsage(
  userId: string,
  eventKey: MeterEventKey,
): Promise<MeterResult> {
  const event = METER_EVENTS[eventKey];
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const creditsLimit = entitlements.aiCreditsDaily;
  const featureLimit = entitlements.features[event.featureKey];

  const allowedFallback: MeterResult = {
    allowed: true,
    creditsUsed: 0,
    creditsLimit,
    feature: event.featureKey,
    featureUsed: 0,
    featureLimit,
  };

  if (meteringSkipped() || !supabaseConfigured()) {
    return allowedFallback;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_and_meter_ai", {
      p_user_id: userId,
      p_plan: plan,
      p_event: eventKey,
      p_credits: event.credits,
      p_feature_key: event.featureKey,
      p_credit_limit: creditsLimit,
      p_feature_limit: featureLimit,
    });

    if (error) {
      console.error("[ai-metering] RPC failed:", error.message);
      Sentry.captureException(error, { tags: { feature: "ai-metering" } });
      return allowedFallback;
    }

    return parseMeterRpcResult(
      data,
      creditsLimit,
      event.featureKey,
      featureLimit,
    );
  } catch (err) {
    console.error("[ai-metering] unexpected error:", err);
    Sentry.captureException(err, { tags: { feature: "ai-metering" } });
    return allowedFallback;
  }
}

export type ChatMessageForMeter = {
  role: string;
  content?: string;
};

/** BizNode widget sends BizNode in system context; optional explicit meterContext. */
export function resolveChatMeterEvent(
  body: { meterContext?: string; messages?: ChatMessageForMeter[] },
): MeterEventKey {
  if (body.meterContext === "biznode") {
    return "linos_assistant_biz";
  }

  const systemText = (body.messages ?? [])
    .filter((m) => m.role === "system")
    .map((m) => (m.content ?? "").toLowerCase())
    .join("\n");

  if (systemText.includes("biznode")) {
    return "linos_assistant_biz";
  }

  return "linos_assistant_message";
}
