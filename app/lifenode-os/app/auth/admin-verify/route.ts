import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ADMIN_FORBIDDEN_ERROR,
  ADMIN_SIGNIN_QUERY,
  adminForbiddenMessage,
} from "@/src/lib/admin/adminAuth";
import { isAdminUser } from "@/src/lib/admin/isAdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const origin = new URL(request.url).origin;

  if (!session?.user?.id) {
    const url = new URL("/auth/signin", origin);
    url.searchParams.set(ADMIN_SIGNIN_QUERY, "1");
    return NextResponse.redirect(url);
  }

  if (
    !isAdminUser({
      userId: session.user.id,
      email: session.user.email,
    })
  ) {
    const url = new URL("/auth/signin", origin);
    url.searchParams.set(ADMIN_SIGNIN_QUERY, "1");
    url.searchParams.set("error", ADMIN_FORBIDDEN_ERROR);
    url.searchParams.set("message", adminForbiddenMessage());
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/admin", origin));
}
