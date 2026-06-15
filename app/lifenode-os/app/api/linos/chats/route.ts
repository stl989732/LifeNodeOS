import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createChat,
  listChatsWithPreview,
  resolveActiveChatId,
} from "@/src/lib/linos/linosDb";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** GET — list past chats, or resolve active chat id (?resolve=1&storedId=). */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const resolve = url.searchParams.get("resolve") === "1";

  try {
    if (resolve) {
      const storedId = url.searchParams.get("storedId");
      const chatId = await resolveActiveChatId(String(userId), storedId);
      return NextResponse.json({ chatId });
    }

    const limit = Number(url.searchParams.get("limit") ?? "30");
    const chats = await listChatsWithPreview(
      String(userId),
      Number.isFinite(limit) ? Math.min(limit, 100) : 30,
    );

    return NextResponse.json({ chats });
  } catch (e) {
    const message = e instanceof Error ? e.message : "linos_chats_failed";
    console.error("GET /api/linos/chats:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — create a new Linos chat for the signed-in user. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: { nodeType?: string };
  try {
    body = (await request.json()) as { nodeType?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const nodeType =
    typeof body.nodeType === "string" && body.nodeType.trim()
      ? body.nodeType.trim()
      : "BizNode";

  try {
    const chat = await createChat(String(userId), nodeType);
    return NextResponse.json({ id: chat.id, chat });
  } catch (e) {
    const message = e instanceof Error ? e.message : "linos_create_failed";
    console.error("POST /api/linos/chats:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
