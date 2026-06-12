import type { BillingInterval, PaidPlanKey } from "../plans";
import type { VariantCheckoutTarget } from "../subscriptionStore";

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getLemonSqueezyApiKey(): string | null {
  const key = readEnv("LEMONSQUEEZY_API_KEY");
  return key || null;
}

export function getLemonSqueezyStoreId(): string | null {
  const id = readEnv("LEMONSQUEEZY_STORE_ID");
  return id || null;
}

export function getLemonSqueezyWebhookSecret(): string | null {
  const secret = readEnv("LEMONSQUEEZY_WEBHOOK_SECRET");
  return secret || null;
}

const VARIANT_ENV: Record<
  `${PaidPlanKey}_${BillingInterval}`,
  { env: string; slug: string }
> = {
  sync_monthly: {
    env: "LEMONSQUEEZY_VARIANT_SYNC_MONTHLY",
    slug: "sync-monthly",
  },
  sync_annual: {
    env: "LEMONSQUEEZY_VARIANT_SYNC_ANNUAL",
    slug: "sync-annual",
  },
  nexus_monthly: {
    env: "LEMONSQUEEZY_VARIANT_NEXUS_MONTHLY",
    slug: "nexus-monthly",
  },
  nexus_annual: {
    env: "LEMONSQUEEZY_VARIANT_NEXUS_ANNUAL",
    slug: "nexus-annual",
  },
};

export function resolveCheckoutVariant(
  plan: PaidPlanKey,
  interval: BillingInterval,
): VariantCheckoutTarget | null {
  const key = `${plan}_${interval}` as keyof typeof VARIANT_ENV;
  const meta = VARIANT_ENV[key];
  if (!meta) return null;
  const variantId = readEnv(meta.env);
  if (!variantId) return null;
  return {
    variantId,
    variantSlug: meta.slug,
    plan,
    interval,
  };
}

export function mapVariantIdToPlan(variantId: string): {
  plan: PaidPlanKey;
  variantSlug: string;
} | null {
  const id = String(variantId);
  for (const [compound, meta] of Object.entries(VARIANT_ENV)) {
    const configured = readEnv(meta.env);
    if (configured && configured === id) {
      const [plan] = compound.split("_") as [PaidPlanKey, BillingInterval];
      return { plan, variantSlug: meta.slug };
    }
  }
  return null;
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    getLemonSqueezyApiKey() &&
      getLemonSqueezyStoreId() &&
      resolveCheckoutVariant("sync", "monthly"),
  );
}
