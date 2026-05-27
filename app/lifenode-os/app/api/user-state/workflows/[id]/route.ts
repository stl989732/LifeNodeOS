import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteWorkflow } from "@/lib/user-state-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }
  const state = await deleteWorkflow(userId, id);
  return NextResponse.json({ workflows: state.workflows });
}
