import {
  getLemonSqueezyApiKey,
  getLemonSqueezyStoreId,
  resolveCheckoutVariant,
} from "./config";
import type { BillingInterval, PaidPlanKey } from "../plans";

type CheckoutResponse = {
  url: string;
};

export async function createLemonSqueezyCheckout(input: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  plan: PaidPlanKey;
  interval: BillingInterval;
  redirectUrl?: string;
}): Promise<CheckoutResponse> {
  const apiKey = getLemonSqueezyApiKey();
  const storeId = getLemonSqueezyStoreId();
  const variant = resolveCheckoutVariant(input.plan, input.interval);

  if (!apiKey || !storeId || !variant) {
    throw new Error("BILLING_NOT_CONFIGURED");
  }

  const appUrl =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: input.userEmail,
          name: input.userName ?? undefined,
          custom: {
            user_id: input.userId,
          },
        },
        product_options: {
          redirect_url: input.redirectUrl ?? `${appUrl}/shell?checkout=success`,
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: storeId },
        },
        variant: {
          data: { type: "variants", id: variant.variantId },
        },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[billing] Lemon Squeezy checkout failed:", errText);
    let detail = "CHECKOUT_CREATE_FAILED";
    try {
      const parsed = JSON.parse(errText) as {
        errors?: Array<{ detail?: string; title?: string }>;
      };
      const first = parsed.errors?.[0];
      if (first?.detail) detail = first.detail;
      else if (first?.title) detail = first.title;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }

  const json = (await res.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error("CHECKOUT_URL_MISSING");
  return { url };
}

export async function fetchLemonSubscriptionPortalUrl(
  lemonSubscriptionId: string,
): Promise<string | null> {
  const apiKey = getLemonSqueezyApiKey();
  if (!apiKey) return null;

  const res = await fetch(
    `https://api.lemonsqueezy.com/v1/subscriptions/${lemonSubscriptionId}`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!res.ok) {
    console.error("[billing] fetch subscription failed:", await res.text());
    return null;
  }

  const json = (await res.json()) as {
    data?: { attributes?: { urls?: { customer_portal?: string } } };
  };
  return json.data?.attributes?.urls?.customer_portal ?? null;
}
