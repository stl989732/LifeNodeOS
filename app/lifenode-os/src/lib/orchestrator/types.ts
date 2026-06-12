export const INBOX_SOURCES = ["gmail", "slack", "google_calendar"] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_KINDS = ["email", "slack_message", "calendar_event"] as const;
export type InboxKind = (typeof INBOX_KINDS)[number];

export const INBOX_STATUSES = [
  "inbox",
  "scheduled",
  "archived",
  "transferred",
  "backlog",
] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

export type InboxTransferMeta = {
  target?: "calendar" | "kanban" | "biz" | "va" | "home";
  date?: string;
  node?: string;
  transferredAt?: string;
  externalRef?: string;
};

export type InboxItemRow = {
  id: string;
  user_id: string;
  source: InboxSource;
  external_id: string;
  kind: InboxKind;
  title: string;
  snippet: string;
  body: string | null;
  from_label: string | null;
  from_id: string | null;
  received_at: string;
  status: InboxStatus;
  transfer_meta: InboxTransferMeta;
  provider_payload: Record<string, unknown>;
  local_notes: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
};

export type InboxItemUpsert = Omit<
  InboxItemRow,
  "id" | "created_at" | "updated_at" | "synced_at"
> & {
  id?: string;
  synced_at?: string;
};

export type InboxSyncProviderResult = {
  source: InboxSource;
  count: number;
  liveSync: boolean;
  error?: string;
};

export type InboxTransferTarget =
  | { type: "today" }
  | { type: "backlog" }
  | { type: "date"; date: string }
  | { type: "node"; node: "biz" | "va" | "home" };

export const INBOX_DRAG_MIME = "application/x-lifenode-inbox-item";

export type InboxDragPayload = {
  inboxItemId: string;
  source: InboxSource;
};
