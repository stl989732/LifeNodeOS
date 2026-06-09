import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { resolveSessionPersistence } from "@/lib/persistence-user-id";

export type PersistenceAuth =
  | { ok: true; session: Session; userId: string }
  | { ok: false; response: NextResponse };

export async function requirePersistenceAuth(): Promise<PersistenceAuth> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const resolved = await resolveSessionPersistence(session);
  if (!resolved) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { ok: true, session, userId: resolved.userId };
}
