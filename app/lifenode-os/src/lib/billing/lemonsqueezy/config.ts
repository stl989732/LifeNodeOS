import type { BillingInterval, PaidPlanKey } from "../plans";
import type { VariantCheckoutTarget } from "../subscriptionStore";

/** Prefer BILLING_* env names; fall back to legacy LEMONSQUEEZY_* during migration. */
function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

const ENV = {
  apiKey: ["BILLING_API_KEY", "LEMONSQUEEZY_API_KEY"],
  storeId: ["BILLING_STORE_ID", "LEMONSQUEEZY_STORE_ID"],
  webhookSecret: ["BILLING_WEBHOOK_SECRET", "LEMONSQUEEZY_WEBHOOK_SECRET"],
} as const;

const VARIANT_ENV: Record<
  `${PaidPlanKey}_${BillingInterval}`,
  { env: [string, string]; slug: string }
> = {
  sync_monthly: {
    env: ["BILLING_VARIANT_SYNC_MONTHLY", "LEMONSQUEEZY_VARIANT_SYNC_MONTHLY"],
    slug: "sync-monthly",
  },
  sync_annual: {
    env: ["BILLING_VARIANT_SYNC_ANNUAL", "LEMONSQUEEZY_VARIANT_SYNC_ANNUAL"],
    slug: "sync-annual",
  },
  nexus_monthly: {
    env: ["BILLING_VARIANT_NEXUS_MONTHLY", "LEMONSQUEEZY_VARIANT_NEXUS_MONTHLY"],
    slug: "nexus-monthly",
  },
  nexus_annual: {
    env: ["BILLING_VARIANT_NEXUS_ANNUAL", "LEMONSQUEEZY_VARIANT_NEXUS_ANNUAL"],
    slug: "nexus-annual",
  },
};

function readVariantEnv(plan: PaidPlanKey, interval: BillingInterval): string {
  const key = `${plan}_${interval}` as keyof typeof VARIANT_ENV;
  return readEnv(...VARIANT_ENV[key].env);
}

export function getLemonSqueezyApiKey(): string | null {
  const key = readEnv(...ENV.apiKey);
  return key || null;
}

export function getLemonSqueezyStoreId(): string | null {
  const id = readEnv(...ENV.storeId);
  return id || null;
}

export function getLemonSqueezyWebhookSecret(): string | null {
  const secret = readEnv(...ENV.webhookSecret);
  return secret || null;
}

export function resolveCheckoutVariant(
  plan: PaidPlanKey,
  interval: BillingInterval,
): VariantCheckoutTarget | null {
  const key = `${plan}_${interval}` as keyof typeof VARIANT_ENV;
  const meta = VARIANT_ENV[key];
  if (!meta) return null;
  const variantId = readVariantEnv(plan, interval);
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
    const configured = readEnv(...meta.env);
    if (configured && configured === id) {
      const [plan] = compound.split("_") as [PaidPlanKey, BillingInterval];
      return { plan, variantSlug: meta.slug };
    }
  }
  return null;
}

export type BillingConfigDiagnostic = {
  configured: boolean;
  missing: string[];
};

/** Safe for API responses — names only, never secret values. */
export function getBillingConfigDiagnostic(): BillingConfigDiagnostic {
  const missing: string[] = [];
  if (!getLemonSqueezyApiKey()) missing.push(ENV.apiKey[0]);
  if (!getLemonSqueezyStoreId()) missing.push(ENV.storeId[0]);
  if (!resolveCheckoutVariant("sync", "monthly")) {
    missing.push(VARIANT_ENV.sync_monthly.env[0]);
  }
  return {
    configured: missing.length === 0,
    missing,
  };
}

export function isLemonSqueezyConfigured(): boolean {
  return getBillingConfigDiagnostic().configured;
}
