import * as Sentry from "@sentry/nextjs";
import { getUserPlan } from "@/src/lib/billing/getUserPlan";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getClientIp } from "./getClientIp";
import {
  aiRateLimitsForPlan,
  RATE_LIMIT_PRESETS,
  type RateLimitPreset,
} from "./presets";
import { rateLimitDeniedResponse } from "./rateLimitResponse";
import type { NextResponse } from "next/server";

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
};

type MemoryBucket = {
  windowStart: number;
  count: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function rateLimitSkipped(): boolean {
  return process.env.SKIP_RATE_LIMIT === "1";
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function windowStartEpoch(nowEpoch: number, windowSeconds: number): number {
  return Math.floor(nowEpoch / windowSeconds) * windowSeconds;
}

function parseResetAt(value: unknown, windowSeconds: number): Date {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const nowEpoch = Math.floor(Date.now() / 1000);
  const start = windowStartEpoch(nowEpoch, windowSeconds);
  return new Date((start + windowSeconds) * 1000);
}

function memoryRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const windowStart = windowStartEpoch(nowEpoch, windowSeconds);
  const resetAt = new Date((windowStart + windowSeconds) * 1000);
  const existing = memoryBuckets.get(bucketKey);

  if (!existing || existing.windowStart !== windowStart) {
    memoryBuckets.set(bucketKey, { windowStart, count: 1 });
    return { allowed: true, count: 1, limit, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, count: existing.count, limit, resetAt };
  }

  existing.count += 1;
  return { allowed: true, count: existing.count, limit, resetAt };
}

function parseRpcResult(
  data: unknown,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  if (!data || typeof data !== "object") {
    return {
      allowed: true,
      count: 0,
      limit,
      resetAt: parseResetAt(null, windowSeconds),
    };
  }

  const row = data as Record<string, unknown>;
  const count =
    typeof row.count === "number" && Number.isFinite(row.count)
      ? row.count
      : 0;
  const parsedLimit =
    typeof row.limit === "number" && Number.isFinite(row.limit)
      ? row.limit
      : limit;

  return {
    allowed: row.allowed === true,
    count,
    limit: parsedLimit,
    resetAt: parseResetAt(row.reset_at, windowSeconds),
  };
}

type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export async function checkRateLimit(
  bucketKey: string,
  preset: RateLimitPreset,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMIT_PRESETS[preset];
  return checkRateLimitWithConfig(bucketKey, { limit, windowSeconds });
}

export async function checkRateLimitWithConfig(
  bucketKey: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = config;
  const key = bucketKey.trim();
  if (!key) {
    return {
      allowed: false,
      count: 0,
      limit,
      resetAt: parseResetAt(null, windowSeconds),
    };
  }

  if (rateLimitSkipped()) {
    return {
      allowed: true,
      count: 0,
      limit,
      resetAt: parseResetAt(null, windowSeconds),
    };
  }

  if (!supabaseConfigured()) {
    return memoryRateLimit(key, limit, windowSeconds);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("check_and_increment_rate_limit", {
      p_bucket_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      Sentry.captureMessage("[rate-limit] RPC failed — allowing request", {
        level: "warning",
        extra: { bucketKey: key, limit, windowSeconds, message: error.message },
      });
      return memoryRateLimit(key, limit, windowSeconds);
    }

    return parseRpcResult(data, limit, windowSeconds);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "rate-limit" },
      extra: { bucketKey: key, limit, windowSeconds },
    });
    return memoryRateLimit(key, limit, windowSeconds);
  }
}

export async function enforceRateLimitOrResponse(
  bucketKey: string,
  preset: RateLimitPreset,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(bucketKey, preset);
  if (!result.allowed) return rateLimitDeniedResponse(result);
  return null;
}

async function enforceRateLimitConfigOrResponse(
  bucketKey: string,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await checkRateLimitWithConfig(bucketKey, config);
  if (!result.allowed) return rateLimitDeniedResponse(result);
  return null;
}

/** Burst + hourly guards for authenticated AI routes (plan-tiered). */
export async function enforceAiRateLimit(
  userId: string,
): Promise<NextResponse | null> {
  const plan = await getUserPlan(userId);
  const { burstPerMinute, requestsPerHour } = aiRateLimitsForPlan(plan);

  const burst = await enforceRateLimitConfigOrResponse(`ai:user:${userId}`, {
    limit: burstPerMinute,
    windowSeconds: 60,
  });
  if (burst) return burst;

  return enforceRateLimitConfigOrResponse(`ai:user:${userId}:hour`, {
    limit: requestsPerHour,
    windowSeconds: 3600,
  });
}

/** Per-IP guard for unauthenticated or mixed AI endpoints. */
export async function enforceAiIpRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return enforceRateLimitOrResponse(`ai:ip:${ip}`, "ai_burst");
}

export async function enforceAuthIpRateLimit(
  request: Request,
  action: string,
  preset: "auth_strict" | "auth_moderate" = "auth_strict",
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return enforceRateLimitOrResponse(`auth:ip:${ip}:${action}`, preset);
}

export async function enforceAuthEmailRateLimit(
  email: string,
  action: string,
): Promise<NextResponse | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return enforceRateLimitOrResponse(
    `auth:email:${action}:${normalized}`,
    "auth_email",
  );
}

export async function enforceBillingCheckoutRateLimit(
  userId: string,
): Promise<NextResponse | null> {
  return enforceRateLimitOrResponse(
    `billing:checkout:${userId}`,
    "billing_checkout",
  );
}

export async function enforcePublicProxyRateLimit(
  request: Request,
  action: string,
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  return enforceRateLimitOrResponse(`proxy:ip:${ip}:${action}`, "proxy_public");
}
