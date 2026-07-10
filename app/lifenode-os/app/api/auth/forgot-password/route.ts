import { NextResponse } from "next/server";
import { issuePasswordResetToken } from "@/lib/auth-users-store";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  enforceAuthEmailRateLimit,
  enforceAuthIpRateLimit,
} from "@/src/lib/rateLimit/enforceRateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Always returns `{ ok: true }` to avoid email enumeration, with one
 * exception: if the account exists but has no security questions set up,
 * we surface a specific `reason` so the UI can tell the operator to
 * contact support. (Legacy accounts may not have questions yet.)
 *
 * Dev only: includes a `devResetLink` field so the developer can click
 * through without an inbox.
 */
export async function POST(request: Request) {
  try {
    const ipLimited = await enforceAuthIpRateLimit(request, "forgot-password");
    if (ipLimited) return ipLimited;

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const emailLimited = await enforceAuthEmailRateLimit(email, "forgot-password");
    if (emailLimited) return emailLimited;

    let issued: Awaited<ReturnType<typeof issuePasswordResetToken>> = null;
    try {
      issued = await issuePasswordResetToken(email);
    } catch (e) {
      if (e instanceof Error && e.message === "NO_SECURITY_QUESTIONS") {
        return NextResponse.json({
          ok: true,
          reason: "NO_SECURITY_QUESTIONS",
        });
      }
      throw e;
    }
    if (!issued) {
      // Account doesn't exist — respond as if it did.
      return NextResponse.json({ ok: true });
    }

    const emailResult = await sendPasswordResetEmail(
      issued.user.email,
      issued.resetToken,
      issued.user.name
    );

    const exposeLink = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      ok: true,
      devResetLink: exposeLink ? emailResult.link ?? null : null,
    });
  } catch (e) {
    console.error("[auth/forgot-password] failed:", e);
    return NextResponse.json(
      { error: "Could not start password recovery." },
      { status: 500 }
    );
  }
}
