import type { BillingInterval, PaidPlanKey } from "@/src/lib/billing/plans";

type CheckoutResponse = {
  url?: string;
  message?: string;
  error?: string;
  missing?: string[];
};

export async function requestPlanCheckout(
  plan: PaidPlanKey,
  interval: BillingInterval,
): Promise<{ ok: true; url: string } | { ok: false; message: string; signInRequired?: boolean }> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, interval }),
  });
  const data = (await res.json().catch(() => ({}))) as CheckoutResponse;

  if (res.status === 401) {
    return {
      ok: false,
      signInRequired: true,
      message: data.message ?? "Sign in to subscribe to a paid plan.",
    };
  }

  if (!res.ok || !data.url) {
    const missing =
      Array.isArray(data.missing) && data.missing.length > 0
        ? ` Missing: ${data.missing.join(", ")}.`
        : "";
    return {
      ok: false,
      message: (data.message ?? "Checkout is not available yet.") + missing,
    };
  }

  return { ok: true, url: data.url };
}

export async function startPlanCheckout(
  plan: PaidPlanKey,
  interval: BillingInterval = "monthly",
): Promise<void> {
  const result = await requestPlanCheckout(plan, interval);
  if (result.ok) {
    window.location.href = result.url;
    return;
  }
  if (result.signInRequired) {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(next)}`;
    return;
  }
  window.alert(result.message);
}
