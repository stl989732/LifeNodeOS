import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAccountDeleted } from "@/lib/account-deleted";

export const runtime = "nodejs";

/**
 * Lightweight session health check for cross-device sign-out after account
 * deletion. Polled by AccountSessionWatchdog on focus + interval.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const deleted = await isAccountDeleted(
    session.user.id,
    session.user.legacyUserId,
  );
  if (deleted) {
    return NextResponse.json(
      { ok: false, code: "ACCOUNT_DELETED" },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
