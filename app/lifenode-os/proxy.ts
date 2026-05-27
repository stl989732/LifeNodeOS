import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe gate: do not import `@/auth` here — it pulls in credential storage (Node/fs)
 * and breaks Turbopack's Edge bundle. JWT verification only.
 *
 * Renamed from `middleware` → `proxy` for Next 16's new file convention
 * (see https://nextjs.org/docs/messages/middleware-to-proxy).
 */
const PROTECTED = [
  "/shell",
  "/dashboard",
  "/work",
  "/home",
  "/pulse",
  "/vanode",
  "/vital",
  "/pro",
  "/trade",
  "/trader",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    console.error(
      "[proxy] AUTH_SECRET is missing. Add it to app/lifenode-os/.env.local",
    );
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({
      req: request,
      secret,
      secureCookie: process.env.NODE_ENV === "production",
    });
  } catch (err) {
    console.error("[proxy] getToken failed:", err);
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL("/auth/signin", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/shell",
    "/shell/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/work",
    "/work/:path*",
    "/home",
    "/home/:path*",
    "/pulse",
    "/pulse/:path*",
    "/vanode",
    "/vanode/:path*",
    "/vital",
    "/vital/:path*",
    "/pro",
    "/pro/:path*",
    "/trade",
    "/trade/:path*",
    "/trader",
    "/trader/:path*",
  ],
};
