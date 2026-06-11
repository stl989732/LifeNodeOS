import { NextResponse } from "next/server";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

/**
 * Runs OAuth ↔ credential legacy migration server-side, then returns the
 * canonical persistence user id for cross-device widget sync.
 */
export async function GET() {
  const authResult = await requirePersistenceAuth();
  if (!authResult.ok) return authResult.response;

  const legacyUserId =
    authResult.session.user?.legacyUserId?.trim() &&
    authResult.session.user.legacyUserId.trim() !== authResult.userId
      ? authResult.session.user.legacyUserId.trim()
      : null;

  return NextResponse.json({
    userId: authResult.userId,
    legacyUserId,
  });
}
