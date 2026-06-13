import { NextResponse } from "next/server";
import { findCredentialUserByEmail } from "@/lib/auth-users-store";
import { deleteUserAccount } from "@/lib/delete-user-account";
import { requirePersistenceAuth } from "@/lib/persistence-session";

export const runtime = "nodejs";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export async function POST(request: Request) {
  try {
    const authResult = await requirePersistenceAuth();
    if (!authResult.ok) return authResult.response;

    let body: { confirmPhrase?: string } = {};
    try {
      body = (await request.json()) as { confirmPhrase?: string };
    } catch {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    if (body.confirmPhrase?.trim().toUpperCase() !== CONFIRM_PHRASE) {
      return NextResponse.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
    }

    const { userId, session } = authResult;
    const legacyUserId = session.user?.legacyUserId?.trim() || null;

    let removeCredentialUser = false;
    const email = session.user?.email?.trim().toLowerCase();
    if (email) {
      try {
        const cred = await findCredentialUserByEmail(email);
        removeCredentialUser = cred?.id === userId;
      } catch (e) {
        console.error("[account/delete] credential lookup failed:", e);
        return NextResponse.json(
          {
            error:
              "Could not verify your account record. Try again in a moment.",
          },
          { status: 503 },
        );
      }
    }

    const result = await deleteUserAccount({
      userId,
      legacyUserIds: legacyUserId ? [legacyUserId] : [],
      removeCredentialUser,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Account deletion failed." },
        { status: result.status ?? 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account/delete] unhandled:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Account deletion failed due to a server error.",
      },
      { status: 500 },
    );
  }
}
