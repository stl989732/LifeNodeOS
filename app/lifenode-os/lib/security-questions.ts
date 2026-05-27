/**
 * Client-safe mirror of the security question bank. The server's source of
 * truth lives in `lib/auth-users-store.ts`; keep these two arrays in sync
 * when you add or rename questions.
 *
 * We keep them separate so this file (and anything that imports it) can be
 * bundled to the client — `auth-users-store.ts` pulls in `fs`/`bcryptjs`
 * and is server-only.
 */

export type SecurityQuestionOption = {
  id: string;
  question: string;
};

export const SECURITY_QUESTION_OPTIONS: SecurityQuestionOption[] = [
  { id: "first-pet", question: "What was the name of your first pet?" },
  { id: "birth-city", question: "In what city were you born?" },
  { id: "mother-maiden", question: "What is your mother's maiden name?" },
  { id: "first-school", question: "What was the name of your first school?" },
  { id: "favorite-teacher", question: "Who was your favorite teacher?" },
  { id: "first-street", question: "What street did you grow up on?" },
  { id: "first-car", question: "What was the make of your first car?" },
];

export const SECURITY_QUESTIONS_REQUIRED = 2;
