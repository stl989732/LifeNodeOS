import { detectStudySubject } from "./planIntent";
import type { LifePulseCategoryId } from "./types";

const DOMAIN_PATTERNS: { id: LifePulseCategoryId; re: RegExp }[] = [
  { id: "events", re: /\b(event|conference|summit|gala|ticket|speaker|networking|gohighlevel|seminar|workshop)\b/i },
  { id: "travel", re: /\b(travel|trip|flight|hotel|vacation|visit|itinerary|abroad|tour)\b/i },
  { id: "study", re: /\b(study|learn|lesson|course|exam|homework|english|math|language skills)\b/i },
  { id: "skincare", re: /\b(skin|skincare|acne|moisturizer|spf|dermat|complexion|routine)\b/i },
  { id: "pets", re: /\b(pet|dog|cat|bird|vet|vaccine|puppy|kitten)\b/i },
  { id: "social_media", re: /\b(content|post|instagram|tiktok|youtube|linkedin|creator|followers|reel)\b/i },
  { id: "business_goals", re: /\b(business|startup|revenue|saas|company|entrepreneur)\b/i },
  { id: "project_management", re: /\b(project|tasks|deliverable|milestone|sprint|kanban)\b/i },
  { id: "life", re: /\b(house|car|career|healthy|slim|life goal|automation specialist)\b/i },
];

/** Infer LifePulse domain from user text; optional UI hint is a weak fallback only. */
export function detectDomainFromPrompt(
  rawPrompt: string,
  categoryHint?: LifePulseCategoryId,
): LifePulseCategoryId {
  const text = rawPrompt.trim();
  if (!text) return categoryHint ?? "life";

  for (const { id, re } of DOMAIN_PATTERNS) {
    if (re.test(text)) return id;
  }

  if (detectStudySubject(text)) return "study";

  return categoryHint ?? "life";
}

export function domainLabel(id: LifePulseCategoryId): string {
  const labels: Record<LifePulseCategoryId, string> = {
    travel: "Travel",
    events: "Events",
    skincare: "Skincare",
    life: "Life Goals",
    business_goals: "Business",
    social_media: "Social Media",
    project_management: "Project Management",
    study: "Study",
    pets: "Pet Care",
  };
  return labels[id] ?? id;
}
