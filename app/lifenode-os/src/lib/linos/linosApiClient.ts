/** Browser client for Linos chat persistence (NextAuth session + server API). */

export type LinosChatSummary = {
  id: string;
  node_type?: string;
  created_at?: string;
  preview?: string;
};

export type LinosMessage = {
  id: string;
  role: string;
  content: string;
  attachments?: unknown[];
  created_at?: string;
};

export type LinosAttachmentRecord = {
  bucket: string;
  path: string;
  publicUrl?: string;
  signedUrl?: string;
  name: string;
  mime: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export async function resolveLinosChatId(
  storedId?: string | null,
): Promise<string | null> {
  const params = new URLSearchParams({ resolve: "1" });
  if (storedId?.trim()) params.set("storedId", storedId.trim());

  const res = await fetch(`/api/linos/chats?${params.toString()}`, {
    credentials: "same-origin",
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;

  const data = await parseJson<{ chatId?: string | null }>(res);
  return typeof data.chatId === "string" && data.chatId ? data.chatId : null;
}

export async function listLinosChats(
  limit = 30,
): Promise<LinosChatSummary[]> {
  const res = await fetch(`/api/linos/chats?limit=${limit}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return [];

  const data = await parseJson<{ chats?: LinosChatSummary[] }>(res);
  return Array.isArray(data.chats) ? data.chats : [];
}

export async function createLinosChat(
  nodeType: string,
): Promise<{ id: string } | null> {
  const res = await fetch("/api/linos/chats", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeType }),
  });
  if (!res.ok) return null;

  const data = await parseJson<{ id?: string }>(res);
  return typeof data.id === "string" && data.id ? { id: data.id } : null;
}

export async function verifyLinosChat(chatId: string): Promise<boolean> {
  const res = await fetch(
    `/api/linos/chats/${encodeURIComponent(chatId)}`,
    { credentials: "same-origin" },
  );
  return res.ok;
}

export async function fetchLinosMessages(
  chatId: string,
): Promise<LinosMessage[]> {
  const res = await fetch(
    `/api/linos/chats/${encodeURIComponent(chatId)}/messages`,
    { credentials: "same-origin" },
  );
  if (!res.ok) {
    const data = await parseJson<{ error?: string }>(res);
    throw new Error(data.error ?? "Could not load chat history.");
  }

  const data = await parseJson<{ messages?: LinosMessage[] }>(res);
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function insertLinosMessage(
  chatId: string,
  input: {
    role: "user" | "assistant" | "system";
    content: string;
    attachments?: LinosAttachmentRecord[];
  },
): Promise<void> {
  const res = await fetch(
    `/api/linos/chats/${encodeURIComponent(chatId)}/messages`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const data = await parseJson<{ error?: string }>(res);
    throw new Error(data.error ?? "Could not save message.");
  }
}

export async function uploadLinosAttachment(
  chatId: string,
  file: File,
  index: number,
): Promise<LinosAttachmentRecord> {
  const form = new FormData();
  form.set("file", file);
  form.set("index", String(index));

  const res = await fetch(
    `/api/linos/chats/${encodeURIComponent(chatId)}/attachments`,
    {
      method: "POST",
      credentials: "same-origin",
      body: form,
    },
  );

  if (!res.ok) {
    const data = await parseJson<{ error?: string }>(res);
    throw new Error(data.error ?? "Upload failed.");
  }

  const data = await parseJson<{ attachment?: LinosAttachmentRecord }>(res);
  if (!data.attachment) {
    throw new Error("Upload failed.");
  }
  return data.attachment;
}
