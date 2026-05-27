import { NextResponse } from "next/server";
import {
  createCredentialUser,
  findCredentialUserByEmail,
  SECURITY_QUESTIONS_REQUIRED,
} from "@/lib/auth-users-store";
import { sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RawSecurityAnswer = {
  id?: string;
  answer?: string;
};

const ERROR_COPY: Record<string, string> = {
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  SECURITY_QUESTIONS_REQUIRED: `Pick and answer at least ${SECURITY_QUESTIONS_REQUIRED} security questions.`,
  DUPLICATE_SECURITY_QUESTION: "Each security question must be unique.",
  EMPTY_SECURITY_ANSWER: "Security answers cannot be blank.",
  INVALID_SECURITY_QUESTION: "One of the security questions isn't recognized.",
  EMAIL_IN_USE: "An account with this email already exists.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      securityQuestions?: RawSecurityAnswer[];
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const name = body.name?.trim() ?? "";
    const rawQuestions = Array.isArray(body.securityQuestions)
      ? body.securityQuestions
      : [];

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: ERROR_COPY.PASSWORD_TOO_SHORT },
        { status: 400 }
      );
    }

    const questions = rawQuestions
      .map((q) => ({
        id: typeof q.id === "string" ? q.id.trim() : "",
        answer: typeof q.answer === "string" ? q.answer : "",
      }))
      .filter((q) => q.id !== "");
    if (questions.length < SECURITY_QUESTIONS_REQUIRED) {
      return NextResponse.json(
        { error: ERROR_COPY.SECURITY_QUESTIONS_REQUIRED },
        { status: 400 }
      );
    }

    const existing = await findCredentialUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: ERROR_COPY.EMAIL_IN_USE },
        { status: 409 }
      );
    }

    const { user, verificationToken } = await createCredentialUser({
      email,
      password,
      name: name || email.split("@")[0],
      securityQuestions: questions,
    });

    const emailResult = await sendVerificationEmail(
      user.email,
      verificationToken,
      user.name
    );

    const exposeLink = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ok: true,
      email: user.email,
      requiresActivation: true,
      // In dev only: surface the link so the developer can click through
      // without leaving the app. Never returned in production.
      devActivationLink: exposeLink ? emailResult.link ?? null : null,
    });
  } catch (e) {
    if (e instanceof Error && ERROR_COPY[e.message]) {
      const status = e.message === "EMAIL_IN_USE" ? 409 : 400;
      return NextResponse.json({ error: ERROR_COPY[e.message] }, { status });
    }
    console.error("[auth/register] failed:", e);
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }
}
