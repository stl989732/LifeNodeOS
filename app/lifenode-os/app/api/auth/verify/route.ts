import { NextResponse } from "next/server";
import { markEmailVerified } from "@/lib/auth-users-store";

/**
 * GET /api/auth/verify?token=...
 *
 * Consumes a verification token and marks the underlying account as
 * activated. We always 302 the user back to `/auth/verify-email?status=...`
 * so the experience is a single page rather than a JSON response in the
 * browser address bar.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const base = `${url.origin}/auth/verify-email`;
  if (!token) {
    return NextResponse.redirect(`${base}?status=missing`);
  }

  try {
    const user = await markEmailVerified(token);
    if (!user) {
      return NextResponse.redirect(`${base}?status=invalid`);
    }
    return NextResponse.redirect(`${base}?status=ok`);
  } catch (e) {
    console.error("[auth/verify] failed:", e);
    return NextResponse.redirect(`${base}?status=error`);
  }
}
