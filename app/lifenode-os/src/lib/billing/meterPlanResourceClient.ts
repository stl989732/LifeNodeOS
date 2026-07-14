"use client";

import {
  countCreatedThisUtcMonth,
  type PlanResourceFeature,
} from "@/src/lib/billing/meterPlanResource";

export type MeterResourceClientResult =
  | { ok: true; used: number; limit: number }
  | { ok: false; status: number; used?: number; limit?: number };

/**
 * Server-authoritative meter for monthly plan resources.
 * Falls back to local UTC-month count when the API is unreachable.
 */
export async function requestMeterPlanResource(
  feature: PlanResourceFeature,
  localMonthCount: number,
  max: number,
): Promise<MeterResourceClientResult> {
  if (max >= 999) {
    return { ok: true, used: localMonthCount + 1, limit: max };
  }

  if (localMonthCount >= max) {
    return { ok: false, status: 403, used: localMonthCount, limit: max };
  }

  try {
    const res = await fetch("/api/billing/meter-resource", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feature }),
    });

    if (res.ok) {
      const data = (await res.json()) as { used?: number; limit?: number };
      return {
        ok: true,
        used: Number(data.used ?? localMonthCount + 1),
        limit: Number(data.limit ?? max),
      };
    }

    if (res.status === 403) {
      return { ok: false, status: 403, used: localMonthCount, limit: max };
    }

    // Fail open to local monthly count when metering infra is unavailable.
    return { ok: true, used: localMonthCount + 1, limit: max };
  } catch {
    return { ok: true, used: localMonthCount + 1, limit: max };
  }
}

export function localMonthUsageCount(
  items: Array<{ createdAt?: string | null; startedAt?: string | null }>,
): number {
  return countCreatedThisUtcMonth(items);
}
