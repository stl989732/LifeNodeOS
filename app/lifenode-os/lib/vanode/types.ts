export type ClientCredential = {
  id: string;
  label: string;
  /** Placeholder / secret string — blurred in vault UI until hover. */
  secret: string;
};

export type ClientProfile = {
  id: string;
  name: string;
  industry: string;
  timezone: string;
  /** Optional per-client secrets (2FA / vault demo). */
  credentials?: ClientCredential[];
};

export type Note = {
  id: string;
  title: string;
  body: string;
  clientId: string | null;
  labels: string[];
  updatedAt: string;
};

export type EodLog = {
  id: string;
  clientId: string | null;
  accomplishments: string;
  timeSpent: string;
  blockers: string;
  recordingBlobUrl: string | null;
  recordingFilename: string | null;
  attachRecording: boolean;
  shareToken: string | null;
  createdAt: string;
};

export type WaitingTask = {
  id: string;
  label: string;
  clientId: string | null;
  /** ISO — used for Blocker Radar (>24h nudges + pulse). */
  createdAt: string;
};

export type ValueMetrics = {
  inboxTriaged: number;
  inboxReplied: number;
  /** Rolling “admin hours reclaimed” headline for clients. */
  hoursSavedThisMonth: number;
};

export type LiveTranscriptSession = {
  id: string;
  title: string;
  kind: "meeting" | "webinar" | "interview" | "other";
  startedAt: string;
  endedAt: string | null;
  transcript: string;
  aiSummary: string | null;
  cloudQueued: boolean;
  /** Optional meeting / recording URL (Zoom, Loom, YouTube, etc.). */
  meetingUrl?: string | null;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type Invoice = {
  id: string;
  clientId: string | null;
  clientName: string;
  lineItems: { description: string; amount: number }[];
  dueDate: string;
  status: InvoiceStatus;
  createdAt: string;
  eodLogIds: string[];
  /** From invoice builder — shown on PDF/print. */
  businessAgencyName?: string;
  ownerFullName?: string;
  signatureMode?: "type" | "upload";
  signatureTypedName?: string;
  signatureImageDataUrl?: string | null;
};

export type NativeToolKey = "aiTask" | "eod" | "chaosCalc" | "smartNotes";

/** Scratch pad tag pills (fixed palette). */
export type ScratchPadTag = "URGENT" | "GENERAL" | "HIGH_PRIORITY" | "RANDOM";

export type ScratchPadState = {
  text: string;
  tags: ScratchPadTag[];
};

/** Snapshots when user clicks Save on the scratch pad (local storage). */
export type ScratchPadSavedEntry = {
  id: string;
  text: string;
  tags: ScratchPadTag[];
  savedAt: string;
};

export type VanodePersisted = {
  discoveryComplete: boolean;
  syncedToolIds: string[];
  nativeTools: Record<NativeToolKey, boolean>;
  settings: {
    cloudSyncRecording: boolean;
    /** VANode settings modal — notification placeholders. */
    vaEmailNotifications: boolean;
    vaSlackNotifications: boolean;
    /** Default IANA zone for new clients / scheduling hints. */
    defaultClientTimezone: string;
  };
  /** Quick note / scratch area on the overview grid. */
  scratchPad: ScratchPadState;
  /** Saved scratch snapshots (visible list + delete). */
  scratchPadSaves: ScratchPadSavedEntry[];
  /** Global VA “hat” — filters vault, invoicing list, waiting queue. */
  activeClientId: string | null;
  valueMetrics: ValueMetrics;
  liveTranscripts: LiveTranscriptSession[];
  clients: ClientProfile[];
  notes: Note[];
  eodLogs: EodLog[];
  waitingTasks: WaitingTask[];
  invoices: Invoice[];
};
