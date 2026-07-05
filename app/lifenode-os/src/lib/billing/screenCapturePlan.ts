import type { ScreenCaptureRecord } from "@/lib/vanode/screenCaptureSync";
import {
  canAddWithinPlanLimit,
  isUnlimitedPlanCap,
} from "@/src/lib/billing/planLimits";
import type { PlanEntitlements } from "@/src/lib/billing/planEntitlements";

export function utcMonthPrefix(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function countScreenCapturesThisMonth(
  records: ScreenCaptureRecord[],
): number {
  const prefix = utcMonthPrefix();
  return records.filter((row) => row.createdAt.startsWith(prefix)).length;
}

export function screenCaptureLimitReached(
  entitlements: PlanEntitlements,
  records: ScreenCaptureRecord[],
): boolean {
  const used = countScreenCapturesThisMonth(records);
  return !canAddWithinPlanLimit(used, entitlements.maxScreenCapturesMonthly);
}

export function maxScreenRecordingSeconds(entitlements: PlanEntitlements): number {
  return entitlements.maxScreenCaptureMinutes * 60;
}

export function screenCaptureLimitLabel(entitlements: PlanEntitlements): string {
  if (isUnlimitedPlanCap(entitlements.maxScreenCapturesMonthly)) {
    return "Unlimited EOD screen recordings / month";
  }
  return `${entitlements.maxScreenCapturesMonthly} EOD screen recordings / month`;
}

export function screenCaptureLimitMessage(planDisplayName: string): string {
  if (planDisplayName === "Core") {
    return "You've used all 3 EOD screen recordings for this month on Core. Upgrade to Sync for 15 downloadable recordings per month, or Nexus for unlimited.";
  }
  if (planDisplayName === "Sync") {
    return "You've used all 15 EOD screen recordings for this month on Sync. Upgrade to Nexus for unlimited recordings.";
  }
  return `You've reached the EOD screen recording limit on ${planDisplayName}.`;
}

export function screenCaptureDownloadBlockedMessage(planDisplayName: string): string {
  if (planDisplayName === "Core") {
    return "Downloads are available on Sync and Nexus. On Core you can review recordings in the browser only.";
  }
  return "Screen recording download is not included on your plan.";
}
