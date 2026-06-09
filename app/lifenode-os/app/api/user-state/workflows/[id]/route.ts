import { NextResponse } from "next/server";
import { deleteWorkflow } from "@/lib/user-state-store";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;
  const userId = authResult.userId;
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }
  const state = await deleteWorkflow(userId, id);
  return NextResponse.json({ workflows: state.workflows });
}
