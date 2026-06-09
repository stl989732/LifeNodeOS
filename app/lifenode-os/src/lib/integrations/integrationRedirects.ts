import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, oauthStateCookieOptions } from "./oauthState";

const NODE_RETURN_PATHS: Record<string, string> = {
  VA: "/vanode",
  BIZ: "/work",
  CALENDAR: "/calendar",
  PULSE: "/pulse",
  HOME: "/home",
  VITAL: "/vital",
  TRADER: "/trader",
  PRO: "/pro",
};

export function nodeReturnPath(targetNode?: string): string {
  const node = (targetNode ?? "BIZ").toUpperCase();
  return NODE_RETURN_PATHS[node] ?? "/work";
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
