import crypto from "node:crypto";
import { getLemonSqueezyWebhookSecret } from "./config";

export function verifyLemonSqueezyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = getLemonSqueezyWebhookSecret();
  if (!secret) {
    console.error("[billing] BILLING_WEBHOOK_SECRET is not set");
    return false;
  }
  if (!signatureHeader?.trim()) return false;

  const digest = Buffer.from(
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8",
  );
  const signature = Buffer.from(signatureHeader.trim(), "utf8");

  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}
