import { NextResponse } from "next/server";
import type { RateLimitResult } from "./enforceRateLimit";

export function rateLimitDeniedResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
  );
  const remaining = Math.max(0, result.limit - result.count);

  return NextResponse.json(
    {
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please wait and try again.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
      },
    },
  );
}
