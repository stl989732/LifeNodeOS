import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import {
  getNodeWidget,
  upsertNodeWidget,
} from "@/lib/node-widget-data-store";
import { parseVanodePersisted } from "@/lib/vanode/parseVanodePersisted";
import { scoreLeadIntent, resolveTriageSourcePresentation } from "@/src/lib/bizNode/dealTriage";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { newScheduleItemId } from "@/src/lib/calendar/storage";
import type { CalendarStore, ScheduleItem } from "@/src/lib/calendar/types";
import { createKanbanBoard, normalizeKanbanStore } from "@/src/lib/kanban/storage";
import type { KanbanStore } from "@/src/lib/kanban/types";
import { getInboxItem, patchInboxItem } from "./inboxDb";
import type { InboxItemRow, InboxTransferTarget } from "./types";

function todayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultCalendarStore(): CalendarStore {
  return { items: [], integrations: [] };
}

async function transferToCalendar(
  userId: string,
  item: InboxItemRow,
  date: string,
): Promise<{ ref: string }> {
  const existing = await getNodeWidget(userId, NODE_WIDGET_KEYS.shell.calendar);
  const store = (existing?.payload as CalendarStore | undefined) ?? defaultCalendarStore();
  const now = new Date().toISOString();
  const scheduleItem: ScheduleItem = {
    id: newScheduleItemId(),
    title: item.title,
    kind: item.kind === "calendar_event" ? "event" : "task",
    date,
    notes: [item.snippet, item.body].filter(Boolean).join("\n\n").slice(0, 2000),
    source: "local",
    createdAt: now,
    updatedAt: now,
  };

  await upsertNodeWidget(userId, NODE_WIDGET_KEYS.shell.calendar, {
    ...store,
    items: [scheduleItem, ...(Array.isArray(store.items) ? store.items : [])],
  });

  return { ref: scheduleItem.id };
}

async function transferToKanbanBacklog(
  userId: string,
  item: InboxItemRow,
): Promise<{ ref: string }> {
  const existing = await getNodeWidget(userId, NODE_WIDGET_KEYS.shell.kanban);
  let store = normalizeKanbanStore(
    (existing?.payload as KanbanStore | undefined) ?? {
      boards: [],
      cards: [],
      activeBoardId: null,
    },
  );

  if (store.boards.length === 0) {
    const board = createKanbanBoard("Inbox backlog");
    store = { boards: [board], cards: [], activeBoardId: board.id };
  }

  const board = store.boards.find((b) => b.id === store.activeBoardId) ?? store.boards[0];
  if (!board) throw new Error("No kanban board available");

  const backlogCol =
    board.columns.find((c) => c.label.toLowerCase() === "backlog") ??
    board.columns[0];
  const order = store.cards.filter((c) => c.columnId === backlogCol.id).length;
  const now = new Date().toISOString();
  const cardId = crypto.randomUUID();

  const next: KanbanStore = {
    ...store,
    cards: [
      ...store.cards,
      {
        id: cardId,
        boardId: board.id,
        columnId: backlogCol.id,
        title: item.title,
        notes: item.snippet,
        order,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };

  await upsertNodeWidget(userId, NODE_WIDGET_KEYS.shell.kanban, next);
  return { ref: cardId };
}

async function transferToBizTriage(
  userId: string,
  item: InboxItemRow,
): Promise<{ ref: string }> {
  const leadName = item.from_label ?? item.title;
  const rawNotes = [item.title, item.snippet, item.body].filter(Boolean).join("\n\n");
  const scored = scoreLeadIntent(rawNotes, leadName);
  const urgency =
    /\b(urgent|asap|critical)\b/i.test(rawNotes) ? "CRITICAL" : "MEDIUM";
  const columnMap: Record<string, string> = {
    CRITICAL: "hot_leads",
    HIGH: "needs_immediate_contact",
    MEDIUM: "inbound_queue",
    LOW: "backlog",
  };
  const sourceProvider =
    item.source === "gmail"
      ? "GMAIL"
      : item.source === "slack"
        ? "SLACK"
        : "MANUAL_INTAKE";
  const sourcePresentation = resolveTriageSourcePresentation(
    sourceProvider,
    rawNotes,
  );

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("biz_deal_triage")
    .insert({
      user_id: userId,
      node_owner: "BIZ",
      source_provider: sourceProvider,
      raw_notes_or_payload: rawNotes,
      kanban_column: columnMap[urgency] ?? "inbound_queue",
      status: "triaged",
      metadata: {
        lead_name: leadName,
        ai_summary: scored.intent_label,
        urgency_score: urgency,
        inbox_item_id: item.id,
        detection_channel: sourcePresentation.channel,
        linos_action: sourcePresentation.actionHint,
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { ref: String(data.id) };
}

async function transferToVaVault(
  userId: string,
  item: InboxItemRow,
): Promise<{ ref: string }> {
  const existing = await getNodeWidget(userId, NODE_WIDGET_KEYS.vanode.dashboard);
  const parsed = parseVanodePersisted(
    existing?.payload as Record<string, unknown> | undefined,
  );
  const now = new Date().toISOString();
  const noteId = crypto.randomUUID();

  const next = {
    ...parsed,
    notes: [
      {
        id: noteId,
        title: item.title,
        body: [item.snippet, item.body].filter(Boolean).join("\n\n"),
        clientId: null,
        labels: ["inbox-transfer", item.source],
        updatedAt: now,
      },
      ...parsed.notes,
    ],
  };

  await upsertNodeWidget(userId, NODE_WIDGET_KEYS.vanode.dashboard, next);
  return { ref: noteId };
}

export async function executeInboxTransfer(
  userId: string,
  itemId: string,
  target: InboxTransferTarget,
): Promise<{ ok: true; transferMeta: Record<string, unknown> }> {
  const item = await getInboxItem(userId, itemId);
  if (!item) throw new Error("inbox_item_not_found");

  let ref: string;
  let transferMeta: Record<string, unknown> = {
    transferredAt: new Date().toISOString(),
  };

  if (target.type === "today") {
    const date = todayDateKey();
    const result = await transferToCalendar(userId, item, date);
    ref = result.ref;
    transferMeta = { ...transferMeta, target: "calendar", date, externalRef: ref };
  } else if (target.type === "date") {
    const result = await transferToCalendar(userId, item, target.date);
    ref = result.ref;
    transferMeta = {
      ...transferMeta,
      target: "calendar",
      date: target.date,
      externalRef: ref,
    };
  } else if (target.type === "backlog") {
    const result = await transferToKanbanBacklog(userId, item);
    ref = result.ref;
    transferMeta = { ...transferMeta, target: "kanban", externalRef: ref };
  } else if (target.type === "node") {
    if (target.node === "biz") {
      const result = await transferToBizTriage(userId, item);
      ref = result.ref;
      transferMeta = { ...transferMeta, target: "biz", node: "biz", externalRef: ref };
    } else if (target.node === "va") {
      const result = await transferToVaVault(userId, item);
      ref = result.ref;
      transferMeta = { ...transferMeta, target: "va", node: "va", externalRef: ref };
    } else {
      const date = todayDateKey();
      const result = await transferToCalendar(userId, item, date);
      ref = result.ref;
      transferMeta = {
        ...transferMeta,
        target: "home",
        node: "home",
        date,
        externalRef: ref,
      };
    }
  } else {
    throw new Error("invalid_transfer_target");
  }

  const status =
    target.type === "backlog" ? "backlog" : ("transferred" as const);

  await patchInboxItem(userId, itemId, {
    status,
    transfer_meta: transferMeta,
  });

  return { ok: true, transferMeta };
}
