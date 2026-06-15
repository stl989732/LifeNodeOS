import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnedChat } from "@/src/lib/linos/linosDb";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ chatId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — verify the chat belongs to the signed-in user. */
export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { chatId } = await context.params;
  if (!chatId?.trim()) {
    return NextResponse.json({ error: "INVALID_CHAT_ID" }, { status: 400 });
  }

  try {
    const chat = await getOwnedChat(String(userId), chatId.trim());
    if (!chat) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ chat });
  } catch (e) {
    const message = e instanceof Error ? e.message : "linos_chat_failed";
    console.error("GET /api/linos/chats/[chatId]:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
