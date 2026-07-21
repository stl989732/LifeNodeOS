import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;

type ScreenCaptureSharePayload = {
  userId: string;
  captureId: string;
  filename: string;
  mimeType: string;
  expiresAt: number;
};

function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is required for screen-capture share links");
  }
  return value;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", secret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createScreenCaptureShareToken(
  payload: Omit<ScreenCaptureSharePayload, "expiresAt">,
): { token: string; expiresAt: string } {
  const expiresAt = Math.floor(Date.now() / 1000) + SHARE_TTL_SECONDS;
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, expiresAt } satisfies ScreenCaptureSharePayload),
  ).toString("base64url");
  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyScreenCaptureShareToken(
  token: string,
): ScreenCaptureSharePayload | null {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  const expected = Buffer.from(sign(encodedPayload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as ScreenCaptureSharePayload;
    if (
      !payload.userId ||
      !payload.captureId ||
      !payload.filename ||
      !payload.mimeType ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
