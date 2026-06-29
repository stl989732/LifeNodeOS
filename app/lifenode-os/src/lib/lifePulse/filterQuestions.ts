import type { QualifyingQuestion } from "./qualifyingQuestions";

/** Skip questions already answered in the user's initial spark text. */
export function filterQuestionsForPrompt(
  questions: QualifyingQuestion[],
  rawPrompt: string,
): QualifyingQuestion[] {
  const p = rawPrompt.toLowerCase();

  return questions.filter((q) => {
    if (q.id === "event_name" && /\b(highlevel|philippines|conference|summit|event|gala|concert|festival)\b/i.test(p)) {
      return false;
    }
    if (q.id === "event_date" && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/i.test(p)) {
      return false;
    }
    if (q.id === "event_city" && /\b(in|at)\s+[a-z]{3,}/i.test(p)) {
      return false;
    }
    if (q.id === "destination" && /\b(italy|switzerland|japan|greece|france|spain|thailand|usa|uk|montenegro)\b/i.test(p)) {
      return false;
    }
    if (q.id === "study_subject" && /\b(math|english|physics|chemistry|biology|economics)\b/i.test(p)) {
      return false;
    }
    if (q.id === "study_topic" && p.length > 20 && !/\b(math|english|physics)\b/i.test(p)) {
      return false;
    }
    if (q.id === "study_duration" && /\b\d{1,2}\s*[- ]?\s*day|\b1\s*month|\b\d{1,2}\s*week/i.test(p)) {
      return false;
    }
    if (q.id === "project_name" && p.length > 15 && /\b(project|launch|website|app)\b/i.test(p)) {
      return false;
    }
    if (q.id === "project_deadline" && /\b(deadline|due|by)\s+.{3,}/i.test(p)) {
      return false;
    }
    if (q.id === "pet_name" && /\b(luna|max|buddy|charlie|bella|coco)\b/i.test(p)) {
      return false;
    }
    if (q.id === "pet_type" && /\b(dog|cat|bird|puppy|kitten)\b/i.test(p)) {
      return false;
    }
    if (q.id === "vet_appointment_date" && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})/i.test(p)) {
      return false;
    }
    if (q.id === "niche" && p.length > 25 && /\b(niche|content|automation|fitness|beauty)\b/i.test(p)) {
      return false;
    }
    return true;
  });
}
