export type ProRoleId =
  | "legal"
  | "medical"
  | "engineering"
  | "teacher"
  | "tech"
  | "coach"
  | "designer";

export type TimelineSource = "gmail" | "slack" | "github" | "figma" | "system" | "zoom";

export type TimelineEvent = {
  id: string;
  at: string;
  /** Supabase `event_table.node_type` — scopes workspace timeline rows. */
  node_type: string;
  source: TimelineSource;
  title: string;
  excerpt: string;
  fact?: string;
  caseId?: string;
  /** CoachNode: Zoom/Loom-style flagged moment */
  videoSnapshot?: { label: string; timestamp: string };
};

export type ClauseBlock = {
  id: string;
  role: ProRoleId | "universal";
  title: string;
  category: string;
  body: string;
};

export type RedlineIssue = {
  id: string;
  phrase: string;
  reason: string;
  timelineRef: string;
  severity: "high" | "medium";
};
