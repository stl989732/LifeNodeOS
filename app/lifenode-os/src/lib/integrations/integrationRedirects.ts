import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions } from "./oauthState";

export function nodeReturnPath(targetNode?: string): string {
  const node = (targetNode ?? "BIZ").toUpperCase();
  return node === "VA" ? "/vanode" : "/work";
}

export function integrationReturnRedirect(
  query: Record<string, string>,
  targetNode?: string,
  clearOAuthCookie = false,
) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    "http://localhost:3000";
  const url = new URL(nodeReturnPath(targetNode), base.replace(/\/$/, ""));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const response = NextResponse.redirect(url);
  if (clearOAuthCookie) {
    response.cookies.set(OAUTH_STATE_COOKIE, "", {
      ...oauthStateCookieOptions(),
      maxAge: 0,
    });
  }
  return response;
}
