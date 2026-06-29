import type { PlanKey } from "./plans";
import { getPlanEntitlements } from "./planEntitlements";

/** Daily AI generation caps shown on pricing / marketing (per node). */
export function dailyAiGenerationBullets(plan: PlanKey): string[] {
  const e = getPlanEntitlements(plan);
  const f = e.features;
  return [
    `${f.linos_assistant} Linos assistant chats / day`,
    `${f.lifepulse_intake} LifePulse intake answers · ${f.lifepulse_plan} plan generations / day`,
    `VANode AI ${f.vanode_ai}/day · BizNode AI ${f.biznode_ai}/day`,
    `ChefNode ${f.chef_text} text · ${f.chef_image} image gens / day`,
  ];
}

export function planHasBillableHours(plan: PlanKey): boolean {
  return plan === "sync" || plan === "nexus";
}
