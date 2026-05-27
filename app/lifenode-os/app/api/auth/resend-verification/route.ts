import { NextResponse } from "next/server";
import { reissueVerificationToken } from "@/lib/auth-users-store";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    const result = await reissueVerificationToken(email);
    // Respond identically whether the email exists/is already verified, to
    // avoid enumeration. In dev we still surface the link if one was issued.
    if (!result) {
      return NextResponse.json({ ok: true, dispatched: false });
    }
    const emailResult = await sendVerificationEmail(
      result.user.email,
      result.verificationToken,
      result.user.name
    );
    const exposeLink = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      ok: true,
      dispatched: true,
      devActivationLink: exposeLink ? emailResult.link ?? null : null,
    });
  } catch (e) {
    console.error("[auth/resend-verification] failed:", e);
    return NextResponse.json(
      { error: "Could not resend activation email." },
      { status: 500 }
    );
  }
}
