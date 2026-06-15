import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadLinosAttachment } from "@/src/lib/linos/linosDb";
import { LINOS_ATTACHMENT_MAX_BYTES } from "@/src/lib/linos/linosAttachments";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ chatId: string }> };

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

/** POST — upload an attachment for an owned chat (multipart form: file, index). */
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  const { chatId } = await context.params;
  if (!chatId?.trim()) {
    return NextResponse.json({ error: "INVALID_CHAT_ID" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const file = form.get("file");
  const indexRaw = form.get("index");
  const index = Number(indexRaw ?? "0");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
  }

  if (file.size > LINOS_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const fileName =
    file instanceof File && file.name.trim() ? file.name : "attachment";

  try {
    const attachment = await uploadLinosAttachment(
      String(userId),
      chatId.trim(),
      file,
      fileName,
      file.type || "application/octet-stream",
      Number.isFinite(index) ? index : 0,
    );
    return NextResponse.json({ attachment });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload_failed";
    const status = message === "Chat not found." ? 404 : 500;
    console.error("POST /api/linos/chats/[chatId]/attachments:", e);
    return NextResponse.json({ error: message }, { status });
  }
}
