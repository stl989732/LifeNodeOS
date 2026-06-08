import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { IntegrationProviderId } from "./types";

const STATE_TTL_MS = 10 * 60 * 1000;

export const OAUTH_STATE_COOKIE = "oauth_state";

/** 10-minute validation buffer for the OAuth round-trip. */
export const OAUTH_STATE_MAX_AGE = 60 * 10;

export function oauthStateCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_STATE_MAX_AGE,
  };
}

function stateSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() ??
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for OAuth state signing.");
  }
  return secret;
}

type StatePayload = {
  /** Supabase auth user id — used for `user_integrations` token storage. */
  userId: string;
  /** NextAuth session user id — used for `user_connected_apps` card state. */
  sessionUserId: string;
  /** VANode / BizNode card slug (e.g. `gdrive`, `slack`). */
  appId: string;
  provider: IntegrationProviderId;
  /** Node scope for redirects + user_connected_apps (e.g. BIZ, VA). */
  targetNode: string;
  nonce: string;
  exp: number;
};

function sign(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createOAuthState(input: {
  integrationUserId: string;
  sessionUserId: string;
  appId: string;
  provider: IntegrationProviderId;
  targetNode?: string;
}): string {
  const payload: StatePayload = {
    userId: input.integrationUserId,
    sessionUserId: input.sessionUserId,
    appId: input.appId.toLowerCase(),
    provider: input.provider,
    targetNode: (input.targetNode ?? "BIZ").toUpperCase(),
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = JSON.stringify(payload);
  const signature = sign(body);
  return Buffer.from(JSON.stringify({ body, signature })).toString("base64url");
}

export function verifyOAuthState(state: string): StatePayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { body?: string; signature?: string };
    if (!parsed.body || !parsed.signature) return null;

    const expected = sign(parsed.body);
    const a = Buffer.from(expected);
    const b = Buffer.from(parsed.signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(parsed.body) as StatePayload;
    if (!payload.userId || !payload.provider || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return {
      ...payload,
      sessionUserId: payload.sessionUserId || payload.userId,
      appId: payload.appId || payload.provider,
      targetNode: payload.targetNode?.toUpperCase() || "BIZ",
    };
  } catch {
    return null;
  }
}

/** Query `state` must match the httpOnly cookie set on the init redirect. */
export function oauthStateMatchesCookie(
  queryState: string | null,
  cookieState: string | undefined,
): boolean {
  if (!queryState || !cookieState) return false;
  const a = Buffer.from(queryState);
  const b = Buffer.from(cookieState);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
