import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProRoleId, TimelineEvent, TimelineSource } from "./types";
import { getNodeTypesForProRole } from "./workspaceContext";

/**
 * When Active_Project changes, fetch `event_table` rows where `node_type` matches
 * the active Pro workspace; render Auto-Timeline ordered by `created_at` DESC.
 */

export const EVENT_TABLE = "event_table";

const BASE_EVENTS: TimelineEvent[] = [
  {
    id: "tl-1",
    at: "2026-05-14T09:12:00Z",
    node_type: "legal",
    source: "gmail",
    title: "Agreed settlement amount",
    excerpt: "Client confirms $42,000 cap for Phase 1 deliverables.",
    fact: "Phase 1 cap: $42,000",
    caseId: "case-882",
  },
  {
    id: "tl-2",
    at: "2026-05-14T14:30:00Z",
    node_type: "attorney",
    source: "slack",
    title: "Partner revision request",
    excerpt: "Need draft by noon tomorrow — pricing section must match email thread.",
    caseId: "case-882",
  },
  {
    id: "tl-3",
    at: "2026-05-13T16:45:00Z",
    node_type: "medical",
    source: "gmail",
    title: "Allergy documented",
    excerpt: "Patient chart updated: Penicillin — anaphylaxis.",
    fact: "Allergy: Penicillin (anaphylaxis)",
    caseId: "patient-chen",
  },
  {
    id: "tl-4",
    at: "2026-05-13T11:00:00Z",
    node_type: "engineering",
    source: "system",
    title: "Permit approved",
    excerpt: "City permit #PX-991 cleared — notify connected stack.",
    fact: "Permit PX-991 approved",
    caseId: "rfc-219",
  },
  {
    id: "tl-5",
    at: "2026-05-12T08:20:00Z",
    node_type: "tech",
    source: "github",
    title: "Deploy merged",
    excerpt: "api-gateway v2.4.1 merged to main.",
    caseId: "deploy-gateway",
  },
  {
    id: "tl-6",
    at: "2026-05-12T08:35:00Z",
    node_type: "tech",
    source: "system",
    title: "Server outage",
    excerpt: "us-east-1 latency spike — PagerDuty incident #573.",
    caseId: "deploy-gateway",
  },
  {
    id: "tl-7",
    at: "2026-05-11T15:00:00Z",
    node_type: "parent-check-in",
    source: "slack",
    title: "Parent check-in",
    excerpt: "Thanks for the extra resources — feeling much better about math.",
    caseId: "unit-4",
  },
  {
    id: "tl-7b",
    at: "2026-05-11T11:30:00Z",
    node_type: "teacher",
    source: "gmail",
    title: "Lesson plan feedback",
    excerpt: "Admin approved Unit 4 fractions pacing — ready for classroom.",
    caseId: "unit-4",
  },
  {
    id: "tl-8",
    at: "2026-05-11T10:00:00Z",
    node_type: "designer",
    source: "figma",
    title: "Checkout frame updated",
    excerpt: "v3 checkout — step 3 spacing and CTA color revised.",
    caseId: "checkout-flow",
  },
  {
    id: "tl-9",
    at: "2026-05-10T17:30:00Z",
    node_type: "coach",
    source: "slack",
    title: "Client frustration signal",
    excerpt: "Not sure we're aligned on priorities this quarter.",
    caseId: "jordan-m",
  },
  {
    id: "tl-coach-zoom",
    at: "2026-05-14T18:05:00Z",
    node_type: "coach",
    source: "zoom",
    title: "Zoom — flagged moment",
    excerpt: "Client: \"If we don't fix priorities this quarter, I'm pausing coaching.\"",
    fact: "Key quote bookmarked at clip",
    caseId: "jordan-m",
    videoSnapshot: {
      label: "Session recording · priorities",
      timestamp: "12:42",
    },
  },
];

type EventTableRow = {
  id: string;
  created_at: string;
  node_type: string;
  source?: string | null;
  title?: string | null;
  excerpt?: string | null;
  fact?: string | null;
  case_id?: string | null;
  video_snapshot?: { label: string; timestamp: string } | null;
};

const VALID_SOURCES = new Set<TimelineSource>([
  "gmail",
  "slack",
  "github",
  "figma",
  "system",
  "zoom",
]);

function rowToEvent(row: EventTableRow): TimelineEvent {
  const source = VALID_SOURCES.has(row.source as TimelineSource)
    ? (row.source as TimelineSource)
    : "system";
  return {
    id: row.id,
    at: row.created_at,
    node_type: row.node_type,
    source,
    title: row.title ?? "Untitled event",
    excerpt: row.excerpt ?? "",
    fact: row.fact ?? undefined,
    caseId: row.case_id ?? undefined,
    videoSnapshot: row.video_snapshot ?? undefined,
  };
}

function filterByNodeTypes(events: TimelineEvent[], nodeTypes: string[]): TimelineEvent[] {
  const allowed = new Set(nodeTypes.map((t) => t.toLowerCase()));
  return events.filter((e) => allowed.has(e.node_type.toLowerCase()));
}

export function getTimelineForNodeTypes(nodeTypes: string[]): TimelineEvent[] {
  return filterByNodeTypes(BASE_EVENTS, nodeTypes).sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function getTimelineForRole(role: ProRoleId): TimelineEvent[] {
  return getTimelineForNodeTypes(getNodeTypesForProRole(role));
}

export function filterTimelineByDate(events: TimelineEvent[], asOf: Date): TimelineEvent[] {
  return events.filter((e) => new Date(e.at).getTime() <= asOf.getTime());
}

/**
 * Loads timeline rows scoped to the active workspace `node_type` values.
 * Falls back to mock data when Supabase is unavailable or the table is empty.
 */
export async function fetchTimelineEvents(nodeTypes: string[]): Promise<TimelineEvent[]> {
  if (!nodeTypes.length) return [];

  try {
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from(EVENT_TABLE)
      .select(
        "id,created_at,node_type,source,title,excerpt,fact,case_id,video_snapshot",
      )
      .order("created_at", { ascending: false });

    if (nodeTypes.length === 1) {
      query = query.eq("node_type", nodeTypes[0]);
    } else {
      query = query.in("node_type", nodeTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data as EventTableRow[]) ?? [];
    if (rows.length > 0) {
      return rows.map(rowToEvent);
    }
  } catch {
    /* no mock fallback — blank slate until real events sync */
  }

  return [];
}

export const TIMELINE_SNAPSHOT_DATES = [
  { label: "Today", value: "2026-05-15" },
  { label: "May 14", value: "2026-05-14" },
  { label: "May 13", value: "2026-05-13" },
  { label: "May 12", value: "2026-05-12" },
  { label: "May 11", value: "2026-05-11" },
];
