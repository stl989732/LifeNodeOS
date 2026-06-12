import { ensureCoreSubscription } from "@/src/lib/billing/subscriptionStore";

/**
 * Fire-and-forget Core plan row for a new or returning user.
 * Safe to call on every sign-in; no-ops when a row already exists.
 */
export function provisionCoreSubscription(userId: string | undefined | null): void {
  const id = userId?.trim();
  if (!id) return;
  void ensureCoreSubscription(id).catch((err) => {
    console.error("[billing] provisionCoreSubscription failed:", err);
  });
}
