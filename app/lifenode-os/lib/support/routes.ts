export const SUPPORT_FEEDBACK_SURVEY_ID = "waJcGVAChC3S206wU851";
export const SUPPORT_TICKET_SURVEY_ID = "W7Z3EOqPhYf9hBbvTcRw";

/** Where form submissions land (Verpexx / GoHighLevel surveys). Override in env if your sub-account differs. */
export const SUPPORT_SURVEY_HOST =
  process.env.LIFENODE_SUPPORT_SURVEY_HOST?.trim() ||
  "https://scale.verpexxsystems.dev";

export const SUPPORT_ROUTES = {
  feedback: "/support/feedback",
  ticket: "/support/ticket",
} as const;

export function supportSurveyEmbedUrl(surveyId: string): string {
  return `${SUPPORT_SURVEY_HOST}/widget/survey/${surveyId}`;
}

export function supportSurveyResponsesUrl(surveyId: string): string {
  return `${SUPPORT_SURVEY_HOST}/surveys/${surveyId}/responses`;
}
