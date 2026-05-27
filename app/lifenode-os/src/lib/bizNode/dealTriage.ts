import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

export type DealTriageMetadata = {
  lead_name?: string;
  ai_summary?: string;
  urgency_score?: string;
  detection_channel?: string;
  linos_action?: string;
};

export type TriageDetectionChannel = "crm" | "email" | "notion" | "manual" | "notes";

export type TriageSourcePresentation = {
  channel: TriageDetectionChannel;
  badgeLabel: string;
  actionHint: string;
  badgeClass: string;
};

/** How Linos surfaces where a lead was detected and what to do next. */
export function resolveTriageSourcePresentation(
  sourceProvider?: string,
  rawNotes?: string,
): TriageSourcePresentation {
  const src = (sourceProvider ?? "").toLowerCase();
  const notes = (rawNotes ?? "").toLowerCase();

  if (src.includes("notion") || notes.includes("notion")) {
    return {
      channel: "notion",
      badgeLabel: "Notion · Linos detected",
      actionHint: "Open the linked Notion page and mark the task complete.",
      badgeClass: "bg-violet-500/15 text-violet-300",
    };
  }
  if (
    src.includes("gmail") ||
    src.includes("email") ||
    src.includes("inbox") ||
    /\b(re:|fwd:|@)\b/i.test(notes)
  ) {
    return {
      channel: "email",
      badgeLabel: "Email · Linos detected",
      actionHint: "Reply in your inbox or schedule a follow-up call today.",
      badgeClass: "bg-sky-500/15 text-sky-300",
    };
  }
  if (
    src.includes("gohighlevel") ||
    src.includes("hubspot") ||
    src.includes("salesforce") ||
    src === "crm" ||
    src.includes("ghl")
  ) {
    return {
      channel: "crm",
      badgeLabel: "CRM · Linos detected",
      actionHint: "Push to pipeline stage and assign an owner in your CRM.",
      badgeClass: "bg-cyan-500/15 text-cyan-300",
    };
  }
  if (src === "manual_intake") {
    return {
      channel: "manual",
      badgeLabel: "Manual intake",
      actionHint: "Qualify the lead and book the first call.",
      badgeClass: "bg-slate-500/20 text-slate-300",
    };
  }
  return {
    channel: "notes",
    badgeLabel: "Notes · Linos scanned",
    actionHint: "Review intake notes and set the next action.",
    badgeClass: "bg-amber-500/15 text-amber-200",
  };
}

/** v2 Supabase row shape for BizNode deal cards. */
export type BizDealTriageCard = {
  id: string;
  user_id?: string;
  source_provider?: string;
  raw_notes_or_payload?: string;
  metadata?: DealTriageMetadata | null;
  kanban_column?: string;
  status?: string;
  created_at: string;
};

export type DealTriageRow = {
  id: string;
  user_id: string;
  source: string;
  lead_name: string;
  intake_notes: string;
  intent_label: string;
  intent_level: "high" | "medium" | "low";
  stage: string;
  created_at: string;
};

export type IntentScore = {
  intent_label: string;
  intent_level: "high" | "medium" | "low";
};

const HIGH_SIGNALS =
  /\b(quote|proposal|budget|urgent|asap|construction|contract|retainer|demo|book|schedule)\b/i;
const LOW_SIGNALS = /\b(spam|unsubscribe|test|wrong number|not interested|free sample)\b/i;

export function scoreLeadIntent(notes: string, leadName = ""): IntentScore {
  const text = `${leadName} ${notes}`.trim();
  if (LOW_SIGNALS.test(text)) {
    return { intent_label: "Low Intent — Likely spam or mismatch", intent_level: "low" };
  }
  if (HIGH_SIGNALS.test(text)) {
    const topic = /construction|renovation|build/i.test(text)
      ? "Construction quote request"
      : /salon|beauty|spa/i.test(text)
        ? "Service booking request"
        : /automation|agency|saas/i.test(text)
          ? "Agency / automation inquiry"
          : "High-intent qualified lead";
    return {
      intent_label: `High Intent — ${topic}`,
      intent_level: "high",
    };
  }
  return {
    intent_label: "Medium Intent — Needs qualification call",
    intent_level: "medium",
  };
}

function urgencyToIntentLevel(urgency: string): DealTriageRow["intent_level"] {
  const u = urgency.toUpperCase();
  if (u === "HIGH" || u === "CRITICAL") return "high";
  if (u === "LOW") return "low";
  return "medium";
}

/** Parse v2 Supabase row → card with metadata bundle intact. */
export function parseBizDealTriageCard(
  row: Record<string, unknown>,
): BizDealTriageCard {
  const rawMeta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  const legacyLevel = String(row.intent_level ?? "medium").toLowerCase();
  const legacyUrgency =
    legacyLevel === "high"
      ? "HIGH"
      : legacyLevel === "low"
        ? "LOW"
        : "MEDIUM";

  const metadata: DealTriageMetadata = {
    lead_name: String(
      rawMeta.lead_name ?? row.lead_name ?? "Unknown Lead",
    ),
    ai_summary: String(
      rawMeta.ai_summary ??
        row.intent_label ??
        row.raw_notes_or_payload ??
        row.intake_notes ??
        "",
    ),
    urgency_score: String(rawMeta.urgency_score ?? legacyUrgency),
    detection_channel: rawMeta.detection_channel
      ? String(rawMeta.detection_channel)
      : undefined,
    linos_action: rawMeta.linos_action
      ? String(rawMeta.linos_action)
      : undefined,
  };

  return {
    id: String(row.id ?? ""),
    user_id: row.user_id != null ? String(row.user_id) : undefined,
    source_provider: String(
      row.source_provider ?? row.source ?? "CRM",
    ),
    raw_notes_or_payload: String(
      row.raw_notes_or_payload ?? row.intake_notes ?? "",
    ),
    metadata,
    kanban_column: String(
      row.kanban_column ?? row.stage ?? "inbound_queue",
    ),
    status: row.status != null ? String(row.status) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

/** Demo sample → v2 card with metadata for consistent rendering. */
export function demoDealToCard(
  demo: Omit<DealTriageRow, "id" | "user_id" | "created_at">,
  id: string,
  userId: string,
  createdAt: string,
): BizDealTriageCard {
  const urgency =
    demo.intent_level === "high"
      ? "HIGH"
      : demo.intent_level === "low"
        ? "LOW"
        : "MEDIUM";
  return {
    id,
    user_id: userId,
    source_provider: demo.source,
    raw_notes_or_payload: demo.intake_notes,
    kanban_column: demo.stage,
    status: "triaged",
    metadata: {
      lead_name: demo.lead_name,
      ai_summary: demo.intent_label,
      urgency_score: urgency,
    },
    created_at: createdAt,
  };
}

/** Map v2 Supabase row (or legacy columns) → UI card shape. */
export function normalizeDealTriageRow(
  row: Record<string, unknown>,
): DealTriageRow {
  if (typeof row.lead_name === "string" && typeof row.intake_notes === "string") {
    return {
      id: String(row.id ?? ""),
      user_id: String(row.user_id ?? ""),
      source: String(row.source ?? "CRM"),
      lead_name: row.lead_name,
      intake_notes: row.intake_notes,
      intent_label: String(row.intent_label ?? ""),
      intent_level: (row.intent_level as DealTriageRow["intent_level"]) ?? "medium",
      stage: String(row.stage ?? "intake"),
      created_at: String(row.created_at ?? new Date().toISOString()),
    };
  }

  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  const urgency = String(metadata.urgency_score ?? "MEDIUM");

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    source: String(row.source_provider ?? "CRM"),
    lead_name: String(metadata.lead_name ?? "Unknown lead"),
    intake_notes: String(row.raw_notes_or_payload ?? ""),
    intent_label: String(
      metadata.ai_summary ?? "Awaiting Linos intent scan.",
    ),
    intent_level: urgencyToIntentLevel(urgency),
    stage: String(row.kanban_column ?? row.status ?? "intake"),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchDealTriageFeed(userId: string): Promise<DealTriageRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("biz_deal_triage")
    .select(
      "id, user_id, source_provider, raw_notes_or_payload, metadata, kanban_column, status, created_at",
    )
    .eq("node_owner", "BIZ")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeDealTriageRow(row as Record<string, unknown>),
  );
}

export const DEMO_DEAL_TRIAGE: Omit<
  DealTriageRow,
  "id" | "user_id" | "created_at"
>[] = [
  {
    source: "Meta Lead Ads",
    lead_name: "Riverstone Build Co.",
    intake_notes: "Need full kitchen renovation quote ASAP — budget ~$45k, timeline Q3.",
    intent_label: "High Intent — Construction quote request",
    intent_level: "high",
    stage: "qualification",
  },
  {
    source: "Website funnel",
    lead_name: "Glow Studio LLC",
    intake_notes: "Interested in monthly social + booking automation for salon.",
    intent_label: "High Intent — Service booking request",
    intent_level: "high",
    stage: "intake",
  },
  {
    source: "Gmail",
    lead_name: "noreply@test",
    intake_notes: "Free sample click — not interested in services.",
    intent_label: "Low Intent — Likely spam or mismatch",
    intent_level: "low",
    stage: "intake",
  },
];
