import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  insertMessageForChat,
  listMessagesForChat,
  type LinosAttachmentRecord,
} from "@/src/lib/linos/linosDb";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ chatId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — list messages for an owned chat. */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { chatId } = await context.params;
  if (!chatId?.trim()) {
    return NextResponse.json({ error: "INVALID_CHAT_ID" }, { status: 400 });
  }

  try {
    const messages = await listMessagesForChat(String(userId), chatId.trim());
    return NextResponse.json({ messages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "linos_messages_failed";
    console.error("GET /api/linos/chats/[chatId]/messages:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — append a message to an owned chat. */
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { chatId } = await context.params;
  if (!chatId?.trim()) {
    return NextResponse.json({ error: "INVALID_CHAT_ID" }, { status: 400 });
  }

  let body: {
    role?: string;
    content?: string;
    attachments?: LinosAttachmentRecord[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const role = body.role;
  if (role !== "user" && role !== "assistant" && role !== "system") {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content : "";

  try {
    const message = await insertMessageForChat(String(userId), chatId.trim(), {
      role,
      content,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    });
    return NextResponse.json({ message });
  } catch (e) {
    const message = e instanceof Error ? e.message : "linos_insert_failed";
    const status = message === "Chat not found." ? 404 : 500;
    console.error("POST /api/linos/chats/[chatId]/messages:", e);
    return NextResponse.json({ error: message }, { status });
  }
}
