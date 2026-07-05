import type { PlanKey } from "./plans";
import { getPlanEntitlements } from "./planEntitlements";
import { screenCaptureLimitLabel } from "./screenCapturePlan";

/** Daily AI generation caps shown on pricing / marketing (per node). */
export function dailyAiGenerationBullets(plan: PlanKey): string[] {
  const e = getPlanEntitlements(plan);
  const f = e.features;
  const bullets = [
    `${f.linos_assistant} Linos assistant chats / day`,
    e.lifepulsePlanPeriod === "monthly"
      ? `${f.lifepulse_intake} LifePulse intake answers / day · ${f.lifepulse_plan} LifePulse plan generations / month`
      : `${f.lifepulse_intake} LifePulse intake answers · ${f.lifepulse_plan} plan generations / day`,
    `VANode AI ${f.vanode_ai}/day · BizNode AI ${f.biznode_ai}/day`,
  ];

  if (plan === "nexus") {
    bullets.push(`ChefNode ${f.chef_text} text · ${f.chef_image} image gens / day`);
  }

  return bullets;
}

export function screenCapturePlanBullets(plan: PlanKey): string[] {
  const e = getPlanEntitlements(plan);
  const limit = screenCaptureLimitLabel(e);
  const duration = `${e.maxScreenCaptureMinutes}-minute max per recording`;
  if (e.screenCapturesDownloadable) {
    return [`${limit} (downloadable)`, duration];
  }
  return [`${limit} (in-browser review only — no download)`, duration];
}

export function planHasBillableHours(plan: PlanKey): boolean {
  return plan === "sync" || plan === "nexus";
}
