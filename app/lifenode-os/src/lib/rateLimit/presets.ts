import type { PlanKey } from "@/src/lib/billing/plans";

/** Fixed-window rate limit presets (limit + window in seconds). */
export const RATE_LIMIT_PRESETS = {
  /** Burst guard on AI routes — complements plan metering. */
  ai_burst: { limit: 24, windowSeconds: 60 },
  /** Sustained AI usage per user per hour. */
  ai_hour: { limit: 120, windowSeconds: 3600 },
  /** Sign-up, password reset — per IP. */
  auth_strict: { limit: 3, windowSeconds: 900 },
  /** Resend verification, reset-password POST — per IP. */
  auth_moderate: { limit: 8, windowSeconds: 900 },
  /** Forgot-password / resend — per normalized email. */
  auth_email: { limit: 2, windowSeconds: 3600 },
  /** Public proxies (kitchen image) — per IP. */
  proxy_public: { limit: 60, windowSeconds: 60 },
  /** Checkout session creation — per user. */
  billing_checkout: { limit: 10, windowSeconds: 3600 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

/** Per-plan AI abuse caps (on top of daily credit metering). */
export const AI_RATE_LIMIT_BY_PLAN: Record<
  PlanKey,
  { burstPerMinute: number; requestsPerHour: number }
> = {
  core: { burstPerMinute: 12, requestsPerHour: 60 },
  sync: { burstPerMinute: 24, requestsPerHour: 120 },
  nexus: { burstPerMinute: 60, requestsPerHour: 300 },
};

export function aiRateLimitsForPlan(plan: PlanKey) {
  return AI_RATE_LIMIT_BY_PLAN[plan] ?? AI_RATE_LIMIT_BY_PLAN.core;
}
