import { NextResponse } from "next/server";
import {
  findCredentialUserByEmail,
  verifyCredentialPassword,
} from "@/lib/auth-users-store";
import { enforceAuthIpRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";

/**
 * POST /api/auth/check-credentials
 *
 * Pre-flight identical to `authorize()` in `auth.ts`, but allowed to
 * surface specific reason codes back to the UI:
 *   - "INVALID"     — wrong email or password
 *   - "UNVERIFIED"  — credentials match but the account isn't activated
 *
 * The signin form calls this BEFORE invoking `signIn("credentials", ...)`
 * so we can show the right "please activate" CTA instead of a generic
 * "Invalid email or password" toast.
 */
export async function POST(request: Request) {
  try {
    const rateLimited = await enforceAuthIpRateLimit(
      request,
      "check-credentials",
      "auth_moderate",
    );
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ ok: false, reason: "INVALID" });
    }
    const user = await findCredentialUserByEmail(email);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "INVALID" });
    }
    const passwordOk = await verifyCredentialPassword(user, password);
    if (!passwordOk) {
      return NextResponse.json({ ok: false, reason: "INVALID" });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ ok: false, reason: "UNVERIFIED" });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID" });
  }
}
