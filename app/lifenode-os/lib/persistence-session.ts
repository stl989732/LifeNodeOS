import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { isAccountDeleted } from "@/lib/account-deleted";
import { resolveSessionPersistence } from "@/lib/persistence-user-id";

export type PersistenceAuth =
  | { ok: true; session: Session; userId: string }
  | { ok: false; response: NextResponse };

function accountDeletedResponse() {
  return NextResponse.json(
    { error: "ACCOUNT_DELETED" },
    { status: 401 },
  );
}

export async function requirePersistenceAuth(): Promise<PersistenceAuth> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  const legacyUserId = session.user.legacyUserId?.trim() || null;
  if (await isAccountDeleted(session.user.id, legacyUserId)) {
    return { ok: false, response: accountDeletedResponse() };
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
