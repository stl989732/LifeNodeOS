import type { QualifyingQuestion } from "./qualifyingQuestions";

/** Skip questions already answered in the user's initial spark text. */
export function filterQuestionsForPrompt(
  questions: QualifyingQuestion[],
  rawPrompt: string,
): QualifyingQuestion[] {
  const p = rawPrompt.toLowerCase();

  return questions.filter((q) => {
    if (q.id === "event_name" && /\b(highlevel|philippines|conference|summit|event|gala)\b/i.test(p)) {
      return false;
    }
    if (q.id === "destination" && /\b(italy|switzerland|japan|greece|france|spain|thailand|usa|uk)\b/i.test(p)) {
      return false;
    }
    if (q.id === "study_subject" && /\b(math|english|physics|chemistry|biology|economics)\b/i.test(p)) {
      return false;
    }
    if (q.id === "study_duration" && /\b\d{1,2}\s*[- ]?\s*day|\b1\s*month|\b\d{1,2}\s*week/i.test(p)) {
      return false;
    }
    if (q.id === "niche" && p.length > 25 && /\b(niche|content|automation|fitness|beauty)\b/i.test(p)) {
      return false;
    }
    return true;
  });
}
