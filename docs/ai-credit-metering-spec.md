# LifeNode OS — AI Credit Metering Implementation Spec

**Status:** Draft for engineering — **Phase 1 (billing/webhooks) implemented 2026-06-07**  
**Last updated:** 2026-06-06  
**Companion:** [`pricing-page-spec.md`](./pricing-page-spec.md) (Option B limits)  
**Scope:** Unified daily metering for `/api/chat`, `/api/homenode/kitchen-ai`, `/api/life-pulse/linos-chat`, `/api/life-pulse/generate-tracker`, `/api/vanode/ai`

---

## 1. Goals

1. **Single system** for plan limits (Core / Sync / Nexus) and daily AI usage.  
2. **Atomic increments** — no race conditions under concurrent requests.  
3. **Two-layer gate** — per-feature daily cap AND shared AI credit pool.  
4. **Replace ad-hoc limits** — supersede `linosUsageLimit.ts` (hardcoded 10) and env-based `KITCHEN_IMAGE_DAILY_CAP` with plan-aware limits.  
5. **Fail closed on paid abuse; fail open on metering outage** — if Supabase metering RPC errors, log to Sentry and allow the request (same as current kitchen image cap behavior) to avoid blocking paying users during incidents.

---

## 2. Architecture overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  API route      │────▶│  meterAiUsage()      │────▶│  Supabase RPC       │
│  (chat, etc.)   │     │  lib/ai-metering/*   │     │  check_and_meter_ai │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                         │                           │
         │                         ▼                           │
         │               ┌──────────────────────┐             │
         │               │  getPlanEntitlements │◀────────────┘
         │               │  user_subscriptions  │
         │               └──────────────────────┘
         ▼
   429 + JSON body if denied
   proceed if allowed (increment already committed)
```

**Flow:**

1. Authenticate request → `userId`.  
2. Classify **meter event** (feature + credit cost + sub-counters).  
3. Load plan entitlements (`core` | `sync` | `nexus`).  
4. Call `check_and_meter_ai(user_id, plan, event)` — atomic.  
5. If `false` → `429` with structured error.  
6. If `true` → run Gemini call; **do not refund** on downstream failure (prevents abuse).

---

## 3. Plan entitlements (code constants)

File: `app/lifenode-os/src/lib/billing/planEntitlements.ts`

```typescript
export type PlanKey = "core" | "sync" | "nexus";

export type PlanEntitlements = {
  plan: PlanKey;
  aiCreditsDaily: number;
  features: {
    linos_assistant: number;      // /api/chat
    vanode_ai: number;            // /api/vanode/ai
    biznode_ai: number;           // /api/chat with biz context OR future dedicated route
    lifepulse_plan: number;       // breakdown + generate-tracker (combined counter)
    lifepulse_intake: number;     // linos-chat intake only
    chef_text: number;            // kitchen-ai text modes
    chef_image: number;           // kitchen-ai recipe/chef_execute image modality
  };
  nodes: ShellHatKey[];
  maxIntegrations: number;
  maxVaClients: number;
  maxTrackers: number;
};

export const PLAN_ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  core: {
    plan: "core",
    aiCreditsDaily: 25,
    features: {
      linos_assistant: 15,
      vanode_ai: 5,
      biznode_ai: 3,
      lifepulse_plan: 2,
      lifepulse_intake: 5,
      chef_text: 3,
      chef_image: 0,
    },
    nodes: ["work", "va"],
    maxIntegrations: 3,
    maxVaClients: 1,
    maxTrackers: 5,
  },
  sync: {
    plan: "sync",
    aiCreditsDaily: 120,
    features: {
      linos_assistant: 60,
      vanode_ai: 20,
      biznode_ai: 15,
      lifepulse_plan: 10,
      lifepulse_intake: 20,
      chef_text: 15,
      chef_image: 8,
    },
    nodes: ["work", "va", "home", "vital"],
    maxIntegrations: 10,
    maxVaClients: 5,
    maxTrackers: 30,
  },
  nexus: {
    plan: "nexus",
    aiCreditsDaily: 500,
    features: {
      linos_assistant: 250,
      vanode_ai: 50,
      biznode_ai: 40,
      lifepulse_plan: 30,
      lifepulse_intake: 60,
      chef_text: 60,
      chef_image: 40,
    },
    nodes: ["work", "va", "home", "vital", "trader", "pro"],
    maxIntegrations: 999,
    maxVaClients: 999,
    maxTrackers: 999,
  },
};
```

---

## 4. Meter events & credit costs

File: `app/lifenode-os/src/lib/ai-metering/events.ts`

| Event key | Credits | Feature counter key | Routes |
|-----------|---------|---------------------|--------|
| `linos_assistant_message` | 1 | `linos_assistant` | `POST /api/chat` |
| `linos_assistant_biz` | 2 | `biznode_ai` | `POST /api/chat` when `activeNode === BizNode` or system context includes biz executive mode |
| `vanode_ai` | 2 | `vanode_ai` | `POST /api/vanode/ai` (all modes) |
| `lifepulse_intake` | 1 | `lifepulse_intake` | `POST /api/life-pulse/linos-chat` phase=`intake` |
| `lifepulse_plan` | 4 | `lifepulse_plan` | `linos-chat` phase=`breakdown` **and** `POST /api/life-pulse/generate-tracker` |
| `chef_text` | 2 | `chef_text` | `kitchen-ai` modes: `chef_discover`, `chef_tip`, `categorize`, `vision_ingredients`, `transcribe_audio` |
| `chef_recipe_text_only` | 2 | `chef_text` | `kitchen-ai` `recipe` / `chef_execute` when multimodal images disabled |
| `chef_recipe_with_image` | 6 | `chef_text` + `chef_image` | `kitchen-ai` `recipe` / `chef_execute` when image modality used |

**Note on LifePulse:** Increment `lifepulse_plan` once per breakdown. `generate-tracker` does **not** double-charge if breakdown already metered in same session — pass optional `skipMeterIfBreakdownMetered` header or check session flag; if called standalone (direct API), meter `lifepulse_plan`.

**Note on `/api/chat`:** Default event = `linos_assistant_message` (1 credit). If request includes `meterContext: "biznode"` from client OR server detects BizNode pathname, use `linos_assistant_biz` (2 credits, `biznode_ai` counter). **Do not** increment both counters for one message.

---

## 5. Database schema

Migration: `app/lifenode-os/supabase/migrations/YYYYMMDDHHMMSS_ai_metering_and_subscriptions.sql`

### 5.1 Subscriptions

```sql
create table if not exists public.user_subscriptions (
  user_id text primary key,
  plan text not null default 'core'
    check (plan in ('core', 'sync', 'nexus')),
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled', 'expired')),
  lemon_customer_id text,
  lemon_subscription_id text unique,
  variant_slug text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_subscriptions is
  'Billing plan per NextAuth user. Core by default; updated via Lemon Squeezy webhooks.';

alter table public.user_subscriptions enable row level security;
-- No public policies; service_role only from Next.js server.
grant select, insert, update on public.user_subscriptions to service_role;
```

On user registration (credentials or OAuth first sign-in): upsert `plan=core`, `status=active`.

### 5.2 Daily usage counters

```sql
create table if not exists public.ai_daily_usage (
  user_id text not null,
  usage_date date not null default ((now() at time zone 'utc')::date),
  credits_used integer not null default 0 check (credits_used >= 0),
  linos_assistant integer not null default 0,
  vanode_ai integer not null default 0,
  biznode_ai integer not null default 0,
  lifepulse_plan integer not null default 0,
  lifepulse_intake integer not null default 0,
  chef_text integer not null default 0,
  chef_image integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

comment on table public.ai_daily_usage is
  'UTC-day AI usage counters and credit sum per user.';
```

### 5.3 Atomic meter RPC

```sql
create or replace function public.check_and_meter_ai(
  p_user_id text,
  p_plan text,
  p_event text,
  p_credits integer,
  p_feature_key text,
  p_credit_limit integer,
  p_feature_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_row ai_daily_usage%rowtype;
  v_credits_after integer;
  v_feature_after integer;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_user');
  end if;

  insert into ai_daily_usage as u (user_id, usage_date)
  values (p_user_id, v_today)
  on conflict (user_id, usage_date) do nothing;

  select * into v_row
  from ai_daily_usage
  where user_id = p_user_id and usage_date = v_today
  for update;

  v_credits_after := v_row.credits_used + p_credits;
  v_feature_after := case p_feature_key
    when 'linos_assistant' then v_row.linos_assistant + 1
    when 'vanode_ai' then v_row.vanode_ai + 1
    when 'biznode_ai' then v_row.biznode_ai + 1
    when 'lifepulse_plan' then v_row.lifepulse_plan + 1
    when 'lifepulse_intake' then v_row.lifepulse_intake + 1
    when 'chef_text' then v_row.chef_text + 1
    when 'chef_image' then v_row.chef_image + 1
    else v_row.linos_assistant + 1
  end;

  if v_credits_after > p_credit_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'credits_exhausted',
      'credits_used', v_row.credits_used,
      'credits_limit', p_credit_limit
    );
  end if;

  if v_feature_after > p_feature_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'feature_exhausted',
      'feature', p_feature_key,
      'feature_used', v_feature_after - 1,
      'feature_limit', p_feature_limit
    );
  end if;

  update ai_daily_usage set
    credits_used = v_credits_after,
    linos_assistant = case when p_feature_key = 'linos_assistant' then v_feature_after else linos_assistant end,
    vanode_ai = case when p_feature_key = 'vanode_ai' then v_feature_after else vanode_ai end,
    biznode_ai = case when p_feature_key = 'biznode_ai' then v_feature_after else biznode_ai end,
    lifepulse_plan = case when p_feature_key = 'lifepulse_plan' then v_feature_after else lifepulse_plan end,
    lifepulse_intake = case when p_feature_key = 'lifepulse_intake' then v_feature_after else lifepulse_intake end,
    chef_text = case when p_feature_key = 'chef_text' then v_feature_after else chef_text end,
    chef_image = case when p_feature_key = 'chef_image' then v_feature_after else chef_image end,
    updated_at = now()
  where user_id = p_user_id and usage_date = v_today;

  return jsonb_build_object(
    'allowed', true,
    'credits_used', v_credits_after,
    'credits_limit', p_credit_limit
  );
end;
$$;
```

**Implementation note:** For `chef_recipe_with_image`, extend the RPC with optional parameters `p_secondary_feature_key text`, `p_secondary_feature_limit integer`. Before updating, verify both feature counters and add `p_credits` (6) to the credit pool in one transaction. If the secondary check fails, return `feature_exhausted` for `chef_image` without incrementing anything.

Grant execute to `service_role` only.

### 5.4 Deprecate (after migration)

- `user_state.linosDailyUsage` JSON field — stop writing after cutover.  
- `daily_image_generation_caps` + `check_and_increment_image_cap` — remove after kitchen-ai uses unified meter (keep table one release for rollback).

---

## 6. TypeScript module layout

```
app/lifenode-os/src/lib/
  billing/
    planEntitlements.ts      # constants above
    getUserPlan.ts           # read user_subscriptions → PlanKey
    lemonsqueezy/
      verifyWebhook.ts
      mapVariantToPlan.ts
  ai-metering/
    events.ts                # event definitions + credit costs
    meterAiUsage.ts          # main entry
    getUsageStatus.ts        # for UI meter
    errors.ts                # AiMeterDeniedError, response shape
```

### 6.1 `meterAiUsage.ts`

```typescript
export type MeterResult =
  | { allowed: true; creditsUsed: number; creditsLimit: number }
  | { allowed: false; reason: "credits_exhausted" | "feature_exhausted" | "invalid_user"; /* ... */ };

export async function meterAiUsage(
  userId: string,
  eventKey: MeterEventKey,
): Promise<MeterResult> {
  const plan = await getUserPlan(userId);
  const entitlements = PLAN_ENTITLEMENTS[plan];
  const event = METER_EVENTS[eventKey];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("check_and_meter_ai", {
    p_user_id: userId,
    p_plan: plan,
    p_event: eventKey,
    p_credits: event.credits,
    p_feature_key: event.featureKey,
    p_credit_limit: entitlements.aiCreditsDaily,
    p_feature_limit: entitlements.features[event.featureKey],
    // optional secondary for chef_image
  });

  if (error) {
    Sentry.captureException(error, { tags: { feature: "ai-metering" } });
    return { allowed: true, creditsUsed: 0, creditsLimit: entitlements.aiCreditsDaily }; // fail open
  }

  return parseMeterRpcResult(data);
}
```

### 6.2 HTTP error shape (429)

```typescript
// lib/ai-metering/errors.ts
export function meterDeniedResponse(result: Extract<MeterResult, { allowed: false }>) {
  return NextResponse.json(
    {
      error: "AI_LIMIT_REACHED",
      message:
        result.reason === "credits_exhausted"
          ? "You've used today's AI credits. Limits reset at midnight UTC."
          : `You've reached today's limit for ${result.feature}. Limits reset at midnight UTC.`,
      usage: {
        creditsUsed: result.creditsUsed,
        creditsLimit: result.creditsLimit,
        feature: result.feature,
        featureUsed: result.featureUsed,
        featureLimit: result.featureLimit,
        resetsAt: nextUtcMidnightIso(),
      },
      upgradeUrl: "/pricing",
    },
    { status: 429 },
  );
}
```

---

## 7. Route integration (exact hooks)

### 7.1 `POST /api/chat`

File: `app/lifenode-os/app/api/chat/route.ts`

| Step | Action |
|------|--------|
| 1 | Require auth (`auth()`); reject 401 if missing |
| 2 | Parse body; determine `eventKey`: default `linos_assistant_message`, or `linos_assistant_biz` if `body.meterContext === "biznode"` |
| 3 | `await meterAiUsage(userId, eventKey)` before Gemini fetch |
| 4 | On deny → `meterDeniedResponse` |
| 5 | Existing Gemini logic unchanged |

Client updates:

- `LinoAssistant.jsx` — handle 429, show upgrade strip  
- `AIWidget.jsx` — pass `meterContext` when on BizNode  
- `HomeNode.jsx` chat calls — unchanged event (home uses chef route for kitchen)

### 7.2 `POST /api/homenode/kitchen-ai`

File: `app/lifenode-os/app/api/homenode/kitchen-ai/route.ts`

| Mode | Event key | Notes |
|------|-----------|-------|
| `chef_tip` | `chef_text` | Always meter |
| `chef_discover`, `categorize`, `vision_ingredients`, `transcribe_audio` | `chef_text` | |
| `recipe`, `chef_execute` | `chef_recipe_with_image` or `chef_recipe_text_only` | If `imageGenerationModes().has(mode)` and multimodal enabled → with_image; else text_only |

Replace block at lines ~451–478 (`check_and_increment_image_cap`) with:

```typescript
const eventKey = imageModes.has(mode) ? "chef_recipe_with_image" : "chef_recipe_text_only";
const meter = await meterAiUsage(userId, eventKey);
if (!meter.allowed) return meterDeniedResponse(meter);
```

Remove dependency on `KITCHEN_IMAGE_DAILY_CAP` env for production (keep `SKIP_KITCHEN_IMAGE_CAP` for dev only).

### 7.3 `POST /api/life-pulse/linos-chat`

File: `app/lifenode-os/app/api/life-pulse/linos-chat/route.ts`

| Phase | Event | When |
|-------|-------|------|
| `intake` | `lifepulse_intake` | Before `runLinosIntake` Gemini call |
| `breakdown` | `lifepulse_plan` | Before `runLinosBreakdown` |

Changes to `linosConversation.ts`:

- Remove direct `getLinosUsageStatus` / `incrementLinosUsage` from breakdown path — metering happens in route **before** calling library functions.  
- Keep usage status in response by calling `getUsageStatus(userId)` after meter.  
- Delete or thin `linosUsageLimit.ts` to re-export from `getUsageStatus`.

Intake currently calls Gemini even when “locked” — move lock check to route-level meter **before** intake.

### 7.4 `POST /api/life-pulse/generate-tracker`

File: `app/lifenode-os/app/api/life-pulse/generate-tracker/route.ts`

| Condition | Meter |
|-----------|-------|
| Request includes `planBlueprint` from prior breakdown (client flag `breakdownMetered: true`) | Skip |
| Direct generation (no blueprint) | `lifepulse_plan` before `generateLinosTrackerPlan` |

### 7.5 `POST /api/vanode/ai`

File: `app/lifenode-os/app/api/vanode/ai/route.ts`

| Step | Action |
|------|--------|
| 1 | Require auth |
| 2 | `meterAiUsage(userId, "vanode_ai")` before any mode branch |
| 3 | On deny → 429 |

All modes (`email_assist`, `video_sop`, `live_summary`) share one counter.

---

## 8. UI: usage meter

### API: `GET /api/billing/usage`

Response:

```json
{
  "plan": "core",
  "creditsUsed": 12,
  "creditsLimit": 25,
  "resetsAt": "2026-06-07T00:00:00.000Z",
  "features": {
    "linos_assistant": { "used": 8, "limit": 15 },
    "vanode_ai": { "used": 2, "limit": 5 },
    "biznode_ai": { "used": 1, "limit": 3 },
    "lifepulse_plan": { "used": 0, "limit": 2 },
    "chef_image": { "used": 0, "limit": 0 }
  }
}
```

### Components

| Location | Behavior |
|----------|----------|
| Settings → Plan | Full usage + upgrade CTAs + Lemon Squeezy portal link |
| LinoAssistant header | Compact `12/25 credits` pill |
| VANode AI card | `Feature: 2/5 today` |
| 429 handler (shared toast) | Message from spec + link to `/pricing` |

---

## 9. Lemon Squeezy webhook handler

File: `app/lifenode-os/app/api/billing/lemonsqueezy/webhook/route.ts`

```typescript
// Pseudocode
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyLemonSignature(raw, req.headers)) return NextResponse.json({ error: "invalid" }, { status: 401 });

  const event = JSON.parse(raw);
  const userId = event.meta?.custom_data?.user_id;
  const variantId = String(event.data?.attributes?.variant_id);

  const plan = mapVariantToPlan(variantId); // sync | nexus
  switch (event.meta.event_name) {
    case "subscription_created":
    case "subscription_updated":
      await upsertSubscription({ userId, plan, status: "active", ... });
      break;
    case "subscription_cancelled":
      await markCancelled(userId, /* effective at period end */);
      break;
    case "subscription_expired":
      await setPlan(userId, "core");
      break;
    // ...
  }
  return NextResponse.json({ received: true });
}
```

Checkout creation (when user clicks Get Sync):

File: `app/lifenode-os/app/api/billing/checkout/route.ts`

- Requires session  
- Calls Lemon Squeezy API to create checkout with `checkout_data.custom.user_id = session.user.id`  
- Returns `{ url }` for redirect  

---

## 10. Node & integration gates (non-AI)

Implement alongside metering:

| Gate | File touchpoints |
|------|------------------|
| Hat picker max nodes | `LifeNodeContext.tsx`, shell onboarding |
| Integration connect | `/api/integrations/[provider]/route.ts` — count rows before OAuth |
| VANode clients | VANode store — count before `addClient` |
| Trackers | `/api/life-pulse/trackers` POST — count active |

Return `403` with `{ error: "PLAN_LIMIT", limit: "max_va_clients", upgradeUrl: "/pricing" }`.

---

## 11. Migration & rollout

| Phase | Work |
|-------|------|
| **1** | SQL migration + `planEntitlements` + `getUserPlan` + webhook |
| **2** | `meterAiUsage` + `/api/billing/usage` |
| **3** | Wire routes (vanode → linos-chat → chat → kitchen-ai → generate-tracker) |
| **4** | UI meter + 429 handlers |
| **5** | Node/integration gates |
| **6** | Remove legacy `linosUsageLimit` hardcode + image cap RPC |

**Feature flag:** `AI_METERING_ENABLED=1` — when `0`, skip RPC (dev/staging).

**Admin bypass:** `AI_METERING_BYPASS_USER_IDS=comma-separated` for founder testing.

---

## 12. Testing checklist

| Test | Expected |
|------|----------|
| Core user sends 16th Linos message | 429 `AI_LIMIT_REACHED` |
| Core user 26 credits mixed features | 429 credits exhausted |
| Core chef image recipe | 429 feature exhausted (limit 0) |
| Sync user 20 VANode AI calls | 21st denied |
| Nexus user 500 credits | 501st denied |
| Concurrent requests at limit | Only `limit` succeed (RPC serializes) |
| Meter RPC failure | Request allowed, Sentry event |
| Webhook subscription_created | Plan → sync, limits increase immediately |
| Subscription expired | Plan → core, Biz+VA only |
| Unauthenticated `/api/chat` | 401 |

---

## 13. Files to create / modify

| File | Action |
|------|--------|
| `supabase/migrations/*_ai_metering_and_subscriptions.sql` | Create |
| `src/lib/billing/planEntitlements.ts` | Create |
| `src/lib/billing/getUserPlan.ts` | Create |
| `src/lib/ai-metering/meterAiUsage.ts` | Create |
| `src/lib/ai-metering/events.ts` | Create |
| `src/lib/ai-metering/errors.ts` | Create |
| `app/api/billing/usage/route.ts` | Create |
| `app/api/billing/checkout/route.ts` | Create |
| `app/api/billing/lemonsqueezy/webhook/route.ts` | Create |
| `app/api/chat/route.ts` | Add auth + meter |
| `app/api/homenode/kitchen-ai/route.ts` | Replace image cap |
| `app/api/life-pulse/linos-chat/route.ts` | Add meter |
| `app/api/life-pulse/generate-tracker/route.ts` | Add meter |
| `app/api/vanode/ai/route.ts` | Add auth + meter |
| `src/lib/lifePulse/linosUsageLimit.ts` | Deprecate → delegate |
| `src/components/LinoAssistant.jsx` | 429 UI |
| `components/vanode/VanodePanels.tsx` | 429 UI |
| Pricing page component | Use copy from pricing-page-spec.md |

---

## 14. Open decisions (defaults chosen)

| Question | Default in this spec |
|----------|----------------------|
| Refund credit on Gemini 500? | No |
| UTC vs user timezone reset? | UTC midnight (matches existing image cap) |
| BizNode triage `/api/triage` | Not metered (no LLM) |
| Annual vs monthly same limits? | Yes — only billing interval differs |
