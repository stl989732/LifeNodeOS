import type { LifePulseCategoryId } from "./types";

export type PlanIntent = {
  /** User-requested plan length in days (0 = not specified). */
  durationDays: number;
  /** Resolved end date ISO if duration known. */
  dueDateIso: string | null;
  studySubject: string | null;
  primaryTopic: string;
};

const SUBJECT_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bmathematics?\b|\bmaths?\b/i, label: "Mathematics" },
  { re: /\benglish\b|\besl\b|\bielts\b|\btoefl\b/i, label: "English" },
  { re: /\bphysics\b/i, label: "Physics" },
  { re: /\bchemistry\b|\bchem\b/i, label: "Chemistry" },
  { re: /\bbiology\b|\bbio\b/i, label: "Biology" },
  { re: /\beconomics?\b|\bmicroeconomics?\b|\bmacroeconomics?\b/i, label: "Economics" },
  { re: /\bhistory\b/i, label: "History" },
  { re: /\bcomputer science\b|\bprogramming\b|\bcoding\b/i, label: "Computer Science" },
  { re: /\bstatistics\b|\bstats\b/i, label: "Statistics" },
  { re: /\baccounting\b/i, label: "Accounting" },
  { re: /\bpsychology\b/i, label: "Psychology" },
];

function endOfDayIsoFromNow(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

/** Extract how many days the user asked for (20-day plan, 1 month, etc.). */
export function parsePlanDurationDays(raw: string): number {
  const lower = raw.toLowerCase();

  const dayMatch = lower.match(/\b(\d{1,2})\s*[- ]?\s*day/);
  if (dayMatch) return clampDays(Number.parseInt(dayMatch[1], 10));

  const weekMatch = lower.match(/\b(\d{1,2})\s*[- ]?\s*week/);
  if (weekMatch) return clampDays(Number.parseInt(weekMatch[1], 10) * 7);

  if (/\b(?:one|1)\s*month\b|\b30\s*[- ]?day|\ba\s*month\b/.test(lower)) return 30;
  if (/\b(?:two|2)\s*weeks?\b|\b14\s*[- ]?day|\bfourteen\s*day/.test(lower)) return 14;
  if (/\b(?:three|3)\s*weeks?\b/.test(lower)) return 21;

  return 0;
}

function clampDays(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(60, Math.max(1, Math.round(n)));
}

export function detectStudySubject(raw: string): string | null {
  for (const { re, label } of SUBJECT_PATTERNS) {
    if (re.test(raw)) return label;
  }
  return null;
}

function detectStudySubjectFromAnswers(
  answers?: Record<string, string>,
): string | null {
  if (!answers) return null;
  const text = Object.values(answers).join(" ");
  if (/\bmath/i.test(text)) return "Mathematics";
  if (/\benglish|grammar|idiom/i.test(text)) return "English";
  if (/\bphysics/i.test(text)) return "Physics";
  if (/\bchemistry|\bchem\b/i.test(text)) return "Chemistry";
  if (/\bbiology|\bbio\b/i.test(text)) return "Biology";
  if (/\beconomics?/i.test(text)) return "Economics";
  return null;
}

function parseDurationFromQualifyingAnswers(
  answers?: Record<string, string>,
): number {
  if (!answers) return 0;
  const durationAnswer = answers.study_duration ?? answers.routine_window;
  if (durationAnswer) {
    const n = Number.parseInt(durationAnswer.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > 0) return clampDays(n);
  }
  for (const v of Object.values(answers)) {
    const m = v.match(/\b(\d{1,2})\s*days?\b/i) ?? v.match(/\b(7|14|15|20|21|30|60)\b/);
    if (m) return clampDays(Number.parseInt(m[1], 10));
  }
  return 0;
}

export function resolvePlanIntent(
  rawPrompt: string,
  category: LifePulseCategoryId,
  dueDateHint: string | null,
  qualifyingAnswers?: Record<string, string>,
): PlanIntent {
  const durationDays =
    parsePlanDurationDays(rawPrompt) ||
    parseDurationFromQualifyingAnswers(qualifyingAnswers);
  const studySubject =
    category === "study"
      ? detectStudySubject(rawPrompt) ?? detectStudySubjectFromAnswers(qualifyingAnswers)
      : null;

  let dueDateIso = dueDateHint;
  const travelDateRaw = qualifyingAnswers?.travel_date?.trim();
  if (!dueDateIso && travelDateRaw) {
    const parsed = new Date(travelDateRaw);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(23, 59, 59, 0);
      dueDateIso = parsed.toISOString();
    }
  }
  if (!dueDateIso && durationDays > 0) {
    dueDateIso = endOfDayIsoFromNow(durationDays);
  }

  const primaryTopic =
    studySubject ??
    (category === "skincare"
      ? "Skincare routine"
      : category === "travel"
        ? extractDestination(rawPrompt) ?? "Travel plan"
        : rawPrompt.trim().slice(0, 80) || "Personal goal");

  return {
    durationDays,
    dueDateIso,
    studySubject,
    primaryTopic,
  };
}

function extractDestination(raw: string): string | null {
  const m = raw.match(
    /\b(?:travel|trip|visit)\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  );
  if (m) return m[1];
  const countries =
    /\b(switzerland|japan|italy|france|spain|thailand|korea|australia|canada|uk|usa)\b/i;
  const c = raw.match(countries);
  return c ? c[1].charAt(0).toUpperCase() + c[1].slice(1).toLowerCase() : null;
}

export function defaultDurationForCategory(category: LifePulseCategoryId): number {
  switch (category) {
    case "study":
      return 15;
    case "social_media":
      return 30;
    case "skincare":
      return 30;
    case "travel":
      return 7;
    default:
      return 7;
  }
}

export function effectivePlanDays(intent: PlanIntent, category: LifePulseCategoryId): number {
  return intent.durationDays > 0
    ? intent.durationDays
    : defaultDurationForCategory(category);
}
