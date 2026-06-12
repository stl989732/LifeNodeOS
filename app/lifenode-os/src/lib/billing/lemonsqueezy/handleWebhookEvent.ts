import { mapVariantIdToPlan } from "./config";
import type { PlanKey } from "../plans";
import {
  findSubscriptionByLemonId,
  upsertSubscription,
} from "../subscriptionStore";

export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function readCustomUserId(meta: LemonWebhookPayload["meta"]): string | null {
  const custom = meta?.custom_data;
  if (!custom || typeof custom !== "object") return null;
  const userId = custom.user_id;
  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

function readAttr(
  attributes: Record<string, unknown> | undefined,
  key: string,
): unknown {
  return attributes?.[key];
}

function readStringAttr(
  attributes: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = readAttr(attributes, key);
  if (value === null || value === undefined) return null;
  return String(value);
}

function readIsoAttr(
  attributes: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const raw = readStringAttr(attributes, key);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function resolveUserId(
  payload: LemonWebhookPayload,
  lemonSubscriptionId: string,
): Promise<string | null> {
  const fromCustom = readCustomUserId(payload.meta);
  if (fromCustom) return fromCustom;

  const existing = await findSubscriptionByLemonId(lemonSubscriptionId);
  return existing?.user_id ?? null;
}

function planFromVariant(variantId: string | null): {
  plan: PlanKey;
  variantSlug: string | null;
} {
  if (!variantId) return { plan: "core", variantSlug: null };
  const mapped = mapVariantIdToPlan(variantId);
  if (!mapped) return { plan: "core", variantSlug: null };
  return { plan: mapped.plan, variantSlug: mapped.variantSlug };
}

export async function handleLemonSqueezyWebhookEvent(
  payload: LemonWebhookPayload,
): Promise<{ handled: boolean; event?: string; userId?: string }> {
  const eventName = payload.meta?.event_name ?? "";
  const attributes = payload.data?.attributes;
  const lemonSubscriptionId = payload.data?.id ? String(payload.data.id) : null;

  if (!eventName || !lemonSubscriptionId) {
    return { handled: false };
  }

  const userId = await resolveUserId(payload, lemonSubscriptionId);
  if (!userId) {
    console.warn("[billing] webhook missing user_id for", eventName, lemonSubscriptionId);
    return { handled: false, event: eventName };
  }

  const variantId = readStringAttr(attributes, "variant_id");
  const customerId = readStringAttr(attributes, "customer_id");
  const renewsAt = readIsoAttr(attributes, "renews_at");
  const endsAt = readIsoAttr(attributes, "ends_at");

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed": {
      const { plan, variantSlug } = planFromVariant(variantId);
      await upsertSubscription({
        userId,
        plan: plan === "core" ? "sync" : plan,
        status: "active",
        lemonCustomerId: customerId,
        lemonSubscriptionId,
        variantSlug,
        currentPeriodEnd: renewsAt ?? endsAt,
        pastDueSince: null,
      });
      break;
    }

    case "subscription_payment_success": {
      const { plan, variantSlug } = planFromVariant(variantId);
      await upsertSubscription({
        userId,
        plan: plan === "core" ? undefined : plan,
        status: "active",
        lemonCustomerId: customerId,
        lemonSubscriptionId,
        variantSlug: variantSlug ?? undefined,
        currentPeriodEnd: renewsAt ?? endsAt,
        pastDueSince: null,
      });
      break;
    }

    case "subscription_payment_failed": {
      await upsertSubscription({
        userId,
        status: "past_due",
        lemonCustomerId: customerId,
        lemonSubscriptionId,
        pastDueSince: new Date().toISOString(),
      });
      break;
    }

    case "subscription_cancelled": {
      await upsertSubscription({
        userId,
        status: "cancelled",
        lemonCustomerId: customerId,
        lemonSubscriptionId,
        currentPeriodEnd: endsAt ?? renewsAt,
        pastDueSince: null,
      });
      break;
    }

    case "subscription_expired": {
      await upsertSubscription({
        userId,
        plan: "core",
        status: "expired",
        lemonCustomerId: customerId,
        lemonSubscriptionId,
        variantSlug: null,
        currentPeriodEnd: endsAt ?? renewsAt,
        pastDueSince: null,
      });
      break;
    }

    default:
      return { handled: false, event: eventName, userId };
  }

  return { handled: true, event: eventName, userId };
}
