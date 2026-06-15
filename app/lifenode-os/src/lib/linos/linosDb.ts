import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { sanitizeStorageFileName } from "@/src/lib/linos/linosAttachments";

const ATTACHMENTS_BUCKET = "linos-attachments";
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

export type LinosChatRow = {
  id: string;
  user_id: string;
  node_type: string;
  created_at: string;
};

export type LinosMessageRow = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  attachments: LinosAttachmentRecord[];
  created_at: string;
};

export type LinosAttachmentRecord = {
  bucket: string;
  path: string;
  publicUrl?: string;
  signedUrl?: string;
  name: string;
  mime: string;
};

export type LinosChatListItem = LinosChatRow & {
  preview: string;
};

function normalizeUserId(userId: string): string {
  return userId.trim();
}

async function requireOwnedChat(
  userId: string,
  chatId: string,
): Promise<LinosChatRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("linos_chats")
    .select("id, user_id, node_type, created_at")
    .eq("id", chatId)
    .eq("user_id", normalizeUserId(userId))
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(`Failed to load chat: ${error.message}`);
  }

  return (data as LinosChatRow | null) ?? null;
}

export async function resolveActiveChatId(
  userId: string,
  storedId?: string | null,
): Promise<string | null> {
  const uid = normalizeUserId(userId);
  if (!uid) return null;

  const supabase = createSupabaseAdminClient();

  if (storedId?.trim()) {
    const owned = await requireOwnedChat(uid, storedId.trim());
    if (owned?.id) return owned.id;
  }

  const { data, error } = await supabase
    .from("linos_chats")
    .select("id")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(`Failed to resolve chat: ${error.message}`);
  }

  return typeof data?.id === "string" ? data.id : null;
}

export async function getOwnedChat(
  userId: string,
  chatId: string,
): Promise<LinosChatRow | null> {
  return requireOwnedChat(userId, chatId);
}

export async function listChatsWithPreview(
  userId: string,
  limit = 30,
): Promise<LinosChatListItem[]> {
  const uid = normalizeUserId(userId);
  const supabase = createSupabaseAdminClient();

  const { data: chats, error: chatsError } = await supabase
    .from("linos_chats")
    .select("id, user_id, node_type, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (chatsError) {
    if (chatsError.code === "42P01") return [];
    throw new Error(`Failed to list chats: ${chatsError.message}`);
  }

  const rows = (chats ?? []) as LinosChatRow[];
  const withPreview: LinosChatListItem[] = [];

  for (const chat of rows) {
    const { data: msg } = await supabase
      .from("linos_messages")
      .select("content")
      .eq("chat_id", chat.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const preview =
      typeof msg?.content === "string" && msg.content.trim()
        ? msg.content.trim().slice(0, 72)
        : "New conversation";

    withPreview.push({ ...chat, preview });
  }

  return withPreview;
}

export async function createChat(
  userId: string,
  nodeType: string,
): Promise<LinosChatRow> {
  const uid = normalizeUserId(userId);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("linos_chats")
    .insert({
      user_id: uid,
      node_type: nodeType,
    })
    .select("id, user_id, node_type, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create chat session.");
  }

  return data as LinosChatRow;
}

async function signAttachmentUrls(
  attachments: unknown,
): Promise<LinosAttachmentRecord[]> {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const out: LinosAttachmentRecord[] = [];

  for (const raw of attachments) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as LinosAttachmentRecord;
    const path = typeof rec.path === "string" ? rec.path : "";
    const bucket =
      typeof rec.bucket === "string" ? rec.bucket : ATTACHMENTS_BUCKET;

    let signedUrl = rec.signedUrl ?? rec.publicUrl;
    if (path && bucket === ATTACHMENTS_BUCKET) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_TTL_SEC);
      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
      }
    }

    out.push({
      bucket,
      path,
      name: typeof rec.name === "string" ? rec.name : "file",
      mime: typeof rec.mime === "string" ? rec.mime : "application/octet-stream",
      signedUrl,
      publicUrl: signedUrl,
    });
  }

  return out;
}

export async function listMessagesForChat(
  userId: string,
  chatId: string,
): Promise<LinosMessageRow[]> {
  const owned = await requireOwnedChat(userId, chatId);
  if (!owned) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("linos_messages")
    .select("id, chat_id, role, content, attachments, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  const rows = (data ?? []) as LinosMessageRow[];
  const enriched: LinosMessageRow[] = [];

  for (const row of rows) {
    enriched.push({
      ...row,
      attachments: await signAttachmentUrls(row.attachments),
    });
  }

  return enriched;
}

export async function insertMessageForChat(
  userId: string,
  chatId: string,
  input: {
    role: "user" | "assistant" | "system";
    content: string;
    attachments?: LinosAttachmentRecord[];
  },
): Promise<LinosMessageRow> {
  const owned = await requireOwnedChat(userId, chatId);
  if (!owned) {
    throw new Error("Chat not found.");
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("linos_messages")
    .insert({
      chat_id: chatId,
      role: input.role,
      content: input.content,
      attachments: input.attachments ?? [],
    })
    .select("id, chat_id, role, content, attachments, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save message.");
  }

  const row = data as LinosMessageRow;
  return {
    ...row,
    attachments: await signAttachmentUrls(row.attachments),
  };
}

export async function uploadLinosAttachment(
  userId: string,
  chatId: string,
  file: Blob,
  fileName: string,
  mimeType: string,
  index: number,
): Promise<LinosAttachmentRecord> {
  const owned = await requireOwnedChat(userId, chatId);
  if (!owned) {
    throw new Error("Chat not found.");
  }

  const safeName = sanitizeStorageFileName(fileName);
  const path = `${chatId}/${Date.now()}_${index}_${safeName}`;

  const supabase = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: mimeType || "application/octet-stream",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message ?? "Could not sign attachment URL.");
  }

  return {
    bucket: ATTACHMENTS_BUCKET,
    path,
    name: fileName,
    mime: mimeType || "application/octet-stream",
    signedUrl: signed.signedUrl,
    publicUrl: signed.signedUrl,
  };
}
