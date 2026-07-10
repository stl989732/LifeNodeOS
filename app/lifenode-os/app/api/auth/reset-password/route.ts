import { NextResponse } from "next/server";
import {
  findUserByResetToken,
  publicSecurityQuestions,
  resetPasswordWithToken,
} from "@/lib/auth-users-store";
import { enforceAuthIpRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";

/**
 * Endpoint for the password reset funnel.
 *
 * GET  /api/auth/reset-password?token=...   — surface the user's security
 *                                              questions (id + display text
 *                                              only; never the answer hash)
 * POST /api/auth/reset-password             — { token, answers, newPassword }
 *                                              answers are checked against
 *                                              the stored bcrypt hashes
 */
export async function GET(request: Request) {
  const ipLimited = await enforceAuthIpRateLimit(
    request,
    "reset-password-get",
    "auth_moderate",
  );
  if (ipLimited) return ipLimited;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const user = await findUserByResetToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "This reset link has expired or already been used." },
      { status: 410 }
    );
  }
  return NextResponse.json({
    ok: true,
    // Mask the email so we don't leak the full address to whoever clicked.
    emailMasked: maskEmail(user.email),
    securityQuestions: publicSecurityQuestions(user),
  });
}

export async function POST(request: Request) {
  try {
    const ipLimited = await enforceAuthIpRateLimit(
      request,
      "reset-password",
      "auth_moderate",
    );
    if (ipLimited) return ipLimited;

    const body = (await request.json()) as {
      token?: string;
      newPassword?: string;
      answers?: { id?: string; answer?: string }[];
    };
    const token = body.token?.trim() ?? "";
    const newPassword = body.newPassword ?? "";
    const answers = Array.isArray(body.answers)
      ? body.answers
          .map((a) => ({
            id: typeof a.id === "string" ? a.id : "",
            answer: typeof a.answer === "string" ? a.answer : "",
          }))
          .filter((a) => a.id !== "")
      : [];
    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    try {
      const user = await resetPasswordWithToken({
        token,
        answers,
        newPassword,
      });
      if (!user) {
        return NextResponse.json(
          { error: "This reset link has expired or already been used." },
          { status: 410 }
        );
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === "SECURITY_ANSWERS_INCORRECT") {
          return NextResponse.json(
            {
              error:
                "One or more security answers don't match. Try again — answers are case-insensitive.",
            },
            { status: 401 }
          );
        }
        if (e.message === "PASSWORD_TOO_SHORT") {
          return NextResponse.json(
            { error: "Password must be at least 8 characters." },
            { status: 400 }
          );
        }
      }
      throw e;
    }
  } catch (e) {
    console.error("[auth/reset-password] failed:", e);
    return NextResponse.json(
      { error: "Could not reset password." },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${
    local[local.length - 1]
  }@${domain}`;
}
