/** Bridge ids for schedule / task / project reminders — cleared on sign-in & hourly nudge. */
export const PROACTIVE_CHECK_IN_BRIDGE_ID = "proactive-commitment-check-in";

export const COMMITMENT_BRIDGE_IDS = [
  PROACTIVE_CHECK_IN_BRIDGE_ID,
  "calendar-overdue",
  "calendar-starting-soon",
  "calendar-schedule-conflict",
  "kanban-overdue",
  "kanban-due-today",
  "lifepulse-overdue",
  "lifepulse-due-today",
  "projects-needs-attention",
  "home-calendar-clash",
  "usage-ai-credits",
  "usage-linos-assistant",
  "usage-invoices",
  "usage-eod-records",
  "usage-transcriptions",
  "usage-kanban-boards",
] as const;

export type CommitmentBridgeId = (typeof COMMITMENT_BRIDGE_IDS)[number];
