import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type {
  InboxItemRow,
  InboxItemUpsert,
  InboxSource,
  InboxStatus,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function rowToClientItem(row: InboxItemRow) {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    kind: row.kind,
    title: row.title,
    snippet: row.snippet,
    body: row.body,
    fromLabel: row.from_label,
    fromId: row.from_id,
    receivedAt: row.received_at,
    status: row.status,
    transferMeta: row.transfer_meta ?? {},
    providerPayload: row.provider_payload ?? {},
    localNotes: row.local_notes,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

export type InboxClientItem = ReturnType<typeof rowToClientItem>;

export async function upsertInboxItems(
  userId: string,
  items: InboxItemUpsert[],
): Promise<number> {
  if (items.length === 0) return 0;

  const supabase = createSupabaseAdminClient();
  const syncedAt = nowIso();
  const rows = items.map((item) => ({
    user_id: userId,
    source: item.source,
    external_id: item.external_id,
    kind: item.kind,
    title: item.title,
    snippet: item.snippet,
    body: item.body,
    from_label: item.from_label,
    from_id: item.from_id,
    received_at: item.received_at,
    status: item.status ?? "inbox",
    transfer_meta: item.transfer_meta ?? {},
    provider_payload: item.provider_payload ?? {},
    local_notes: item.local_notes ?? null,
    synced_at: item.synced_at ?? syncedAt,
    updated_at: syncedAt,
  }));

  const { error } = await supabase.from("inbox_items").upsert(rows, {
    onConflict: "user_id,source,external_id",
    ignoreDuplicates: false,
  });

  if (error) {
    if (error.code === "42P01") {
      throw new Error("inbox_items table missing — apply Supabase migration.");
    }
    throw new Error(`Failed to upsert inbox items: ${error.message}`);
  }

  return rows.length;
}

export async function listInboxItems(
  userId: string,
  options?: {
    source?: InboxSource;
    status?: InboxStatus;
    limit?: number;
    cursor?: string;
  },
): Promise<InboxItemRow[]> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("inbox_items")
    .select("*")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.source) {
    query = query.eq("source", options.source);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  } else {
    query = query.neq("status", "archived");
  }
  if (options?.cursor) {
    query = query.lt("received_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(`Failed to list inbox items: ${error.message}`);
  }

  return (data ?? []) as InboxItemRow[];
}

export async function getInboxItem(
  userId: string,
  id: string,
): Promise<InboxItemRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inbox_items")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(`Failed to load inbox item: ${error.message}`);
  }

  return (data as InboxItemRow | null) ?? null;
}

export async function patchInboxItem(
  userId: string,
  id: string,
  patch: Partial<{
    status: InboxStatus;
    transfer_meta: Record<string, unknown>;
    local_notes: string | null;
    body: string | null;
  }>,
): Promise<InboxItemRow | null> {
  const existing = await getInboxItem(userId, id);
  if (!existing) return null;

  const mergedTransfer =
    patch.transfer_meta !== undefined
      ? { ...(existing.transfer_meta ?? {}), ...patch.transfer_meta }
      : existing.transfer_meta;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("inbox_items")
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.local_notes !== undefined ? { local_notes: patch.local_notes } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      transfer_meta: mergedTransfer,
      updated_at: nowIso(),
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update inbox item: ${error.message}`);
  }

  return (data as InboxItemRow | null) ?? null;
}

export async function archiveInboxItem(
  userId: string,
  id: string,
): Promise<boolean> {
  const row = await patchInboxItem(userId, id, { status: "archived" });
  return row !== null;
}
