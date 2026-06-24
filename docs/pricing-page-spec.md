# LifeNode OS — Pricing Page Spec (Option A)

**Status:** Implemented in `planEntitlements.ts` + `/pricing`  
**Last updated:** 2026-06-18  
**Billing provider:** [Lemon Squeezy](https://docs.lemonsqueezy.com/) (not Stripe)  
**Launch wedge:** VANode + BizNode + HomeNode (parents)  
**Free tier:** No credit card required — plan key `core`, display name **Starter**

---

## 1. Plan summary (source of truth)

| | **Starter** (`core`) | **Operator** (`sync`) | **All Access** (`nexus`) |
|---|:---:|:---:|:---:|
| **Price (monthly)** | Free | **$24/mo** | **$49/mo** |
| **Price (annual)** | Free | **$228/yr** (~$19/mo) | **$468/yr** (~$39/mo) |
| **Card required** | No | Yes | Yes |
| **Included Nodes** | Biz + VA + Home | + VitalNode | All 6 Nodes |
| **Whiteboard** | ✓ | ✓ | ✓ |
| **AI credits / day** | 20 | 150 | 1,000 (soft cap) |
| **LifePulse trackers** | 3 | 40 | Unlimited |
| **VANode clients** | 2 | 8 | Unlimited |
| **Invoices** | 2 | 50 | Unlimited |
| **EOD reports** | 2 | 50 | Unlimited |
| **Transcriptions** | 2 | 30 | Unlimited |
| **Kanban boards** | 1 | 10 | Unlimited |
| **Integrations** | 2 | 12 | Unlimited |
| **Logic bridges & Linos alerts** | — | ✓ | ✓ |
| **Support** | Community | Email (48h) | Priority (24h) |

**Credit weights** (internal; surfaced in UI as “AI credits”):

| Action | Credits |
|--------|---------|
| Linos Assistant message | 1 |
| VANode AI (email / SOP / summary) | 2 |
| BizNode executive summary (via Linos or widget) | 2 |
| LifePulse intake (linos-chat phase=intake) | 1 |
| LifePulse full plan (linos-chat breakdown + generate-tracker) | 4 |
| ChefNode text-only (discover, tip, vision, categorize, transcribe) | 2 |
| ChefNode recipe with image (recipe, chef_execute) | 6 |

Daily limits apply **two gates**: (1) per-feature cap, (2) total AI credits. A request must pass both.

---

## 2. Lemon Squeezy catalog

Create **one Product** with **four paid Variants** (Core is not a Lemon Squeezy product — account signup only).

### Product

| Field | Value |
|-------|-------|
| **Product name** | LifeNode OS |
| **Slug** | `lifenode-os` |
| **Description** | The operating system for work and client ops. BizNode + VANode at the core; add Home, Vital, Trader, and Pro as you grow. |

### Variants (map to `variant_id` in webhooks)

| Variant name | SKU slug | Price | Billing | Plan key (app) |
|--------------|----------|-------|---------|----------------|
| Sync — Monthly | `sync-monthly` | $24.00 USD | Every month | `sync` |
| Sync — Annual | `sync-annual` | $228.00 USD | Every year | `sync` |
| Nexus — Monthly | `nexus-monthly` | $49.00 USD | Every month | `nexus` |
| Nexus — Annual | `nexus-annual` | $468.00 USD | Every year | `nexus` |

### Checkout settings

- **Core:** No Lemon Squeezy checkout. User registers at `/auth/register` → lands on shell with `plan = core`.
- **Sync / Nexus:** Lemon Squeezy hosted checkout or overlay from pricing page CTAs.
- Enable **customer portal** for plan changes, cancellation, and invoice history.
- **Trial:** None at launch (free Core is the trial).
- **Tax:** Enable Lemon Squeezy tax handling if selling internationally.

### Environment variables

```env
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_VARIANT_SYNC_MONTHLY=
LEMONSQUEEZY_VARIANT_SYNC_ANNUAL=
LEMONSQUEEZY_VARIANT_NEXUS_MONTHLY=
LEMONSQUEEZY_VARIANT_NEXUS_ANNUAL=
```

### Webhook endpoint

`POST /api/billing/lemonsqueezy/webhook`

Handle at minimum:

| Event | Action |
|-------|--------|
| `subscription_created` | Set `user_subscriptions.plan`, `status=active`, store `lemon_subscription_id` |
| `subscription_updated` | Sync plan variant → `sync` or `nexus` |
| `subscription_cancelled` | Set `status=cancelled`, `plan=core` at period end |
| `subscription_expired` | Set `plan=core`, clear paid entitlements |
| `subscription_payment_success` | Refresh `current_period_end` |
| `subscription_payment_failed` | Set `status=past_due`; grace 3 days then downgrade to Core |

Match Lemon Squeezy `custom_data.user_id` (pass NextAuth user id at checkout creation).

---

## 3. Entitlements by plan (app logic)

### Nodes

| Plan | Enabled hats (`ShellHatKey`) |
|------|------------------------------|
| Starter (`core`) | `work` (BizNode), `va` (VANode), `home` (HomeNode) |
| Operator (`sync`) | `work`, `va`, `home`, `vital` |
| All Access (`nexus`) | `work`, `va`, `home`, `vital`, `trader`, `pro` |

Core users who try to enable HomeNode / TraderNode / ProNode see upgrade modal → Sync or Nexus.

### Integrations (`user_connected_apps` / OAuth)

| Plan | Max connected apps |
|------|-------------------|
| Core | 3 |
| Sync | 10 |
| Nexus | 999 (display “Unlimited”) |

Recommended Core integrations copy: GoHighLevel, Gmail, Google Calendar.

### VANode

| Plan | Client workspaces | Screen capture | EOD reports | Invoicing |
|------|-------------------|----------------|-------------|-----------|
| Core | 1 | ✓ | ✓ | ✓ |
| Sync | 5 | ✓ | ✓ | ✓ |
| Nexus | Unlimited | ✓ | ✓ | ✓ |

### BizNode

| Plan | Deal triage (manual + rules) | Pipeline / tasks | GHL sync |
|------|------------------------------|------------------|----------|
| Core | ✓ | ✓ | ✓ (within integration limit) |
| Sync | ✓ | ✓ | ✓ |
| Nexus | ✓ | ✓ | ✓ |

BizNode “AI summaries” count toward VANode/Linos buckets when generated via `/api/chat` with BizNode context or dedicated triage AI (future).

### Non-AI (always available on all plans)

- Manual LifePulse tables and edits  
- Home chores, budget rows (if HomeNode unlocked)  
- Trader journal & sniper mode (if TraderNode unlocked)  
- VANode local screen recordings  
- Notifications shell (non-AI)  
- BizNode deal triage without LLM (`/api/triage` rule-based scoring)

---

## 4. Pricing page — exact copy

### Meta

| Field | Copy |
|-------|------|
| **Title tag** | Pricing — LifeNode OS |
| **Meta description** | Start free with BizNode and VANode. Upgrade when you need more clients, integrations, and AI capacity. No card required for Core. |

---

### Hero

**Eyebrow:** Pricing

**Headline:** Run your business and your clients from one calm OS.

**Subheadline:** Core is free — BizNode and VANode included, no credit card. Upgrade when you need more hats, integrations, and AI capacity.

---

### Billing toggle

Label: **Monthly** | **Annual**  
Annual helper (when annual selected): *Save 2 months with annual billing.*

---

### Plan cards (left → right: Core, Sync, Nexus)

#### Card 1 — Core

**Badge:** Free forever  

**Plan name:** Core  

**Price line:** $0  
**Price suffix:** / month  

**Tagline:** Start with BizNode + VANode. No card required.

**CTA button:** `Start free` → `/auth/register`  
**CTA subtext:** No credit card · Cancel anytime by staying on Core

**Feature list:**

- **BizNode + VANode** — your launch pair for leads and client work  
- **1 VANode client** workspace  
- **3 app integrations** (e.g. GHL, Gmail, Calendar)  
- **25 AI credits / day** — Linos Assistant, email drafts, and light planning  
- **5 VANode AI assists / day** — email replies, SOPs, session summaries  
- **Deal triage & pipeline** — manual intake and smart sorting  
- **Screen capture & EOD reports** — proof of work, local-first  
- **5 LifePulse trackers** — manual plans and tables  

**Footnote:** HomeNode, VitalNode, TraderNode, and ProNode require Sync or Nexus.

---

#### Card 2 — Sync ★ Most popular

**Badge:** Most popular  

**Plan name:** Sync  

**Price line (monthly):** $19  
**Price line (annual):** $190  
**Price suffix:** / month (or / year on annual toggle)  

**Tagline:** For operators wearing four hats — business, clients, home, and health.

**CTA button:** `Get Sync` → Lemon Squeezy checkout (variant by toggle)  
**CTA subtext:** Secure checkout via Lemon Squeezy · Upgrade or cancel in your account

**Feature list:**

- **Everything in Core**, plus:  
- **4 Nodes** — BizNode, VANode, HomeNode, VitalNode  
- **5 VANode clients**  
- **10 integrations**  
- **120 AI credits / day**  
- **60 Linos Assistant messages / day**  
- **20 VANode AI assists / day**  
- **15 BizNode AI summaries / day**  
- **30 LifePulse trackers** with full AI plan generation  
- **Logic bridges & Linos alerts** — cross-node nudges when work affects home or recovery  
- **Email support** — 48-hour response  

---

#### Card 3 — Nexus

**Badge:** Maximum capacity  

**Plan name:** Nexus  

**Price line (monthly):** $39  
**Price line (annual):** $390  
**Price suffix:** / month (or / year on annual toggle)  

**Tagline:** All six Nodes and enough AI for heavy daily use across clients and features.

**CTA button:** `Get Nexus` → Lemon Squeezy checkout  
**CTA subtext:** For power users and multi-client VAs

**Feature list:**

- **Everything in Sync**, plus:  
- **All 6 Nodes** — add TraderNode and ProNode  
- **Unlimited VANode clients**  
- **Unlimited integrations**  
- **500 AI credits / day**  
- **250 Linos messages / day**  
- **50 VANode AI assists / day**  
- **40 BizNode AI summaries / day**  
- **Unlimited LifePulse trackers**  
- **40 ChefNode image recipes / day** (HomeNode kitchen AI)  
- **Priority support** — 24-hour response  

---

### Comparison table (below cards)

| | Core | Sync | Nexus |
|---|:---:|:---:|:---:|
| Price | Free | $19/mo | $39/mo |
| Credit card | Not required | Required | Required |
| Nodes | Biz + VA | + Home + Vital | All 6 |
| AI credits / day | 25 | 120 | 500 |
| VANode clients | 1 | 5 | Unlimited |
| Integrations | 3 | 10 | Unlimited |
| Logic bridges | — | ✓ | ✓ |
| Support | Community | Email 48h | Priority 24h |

---

### FAQ (exact copy)

**Do I need a credit card for Core?**  
No. Create an account and use BizNode and VANode free. We only ask for payment when you choose Sync or Nexus.

**What are AI credits?**  
AI credits measure how much intelligence you use in a day — Linos messages, VANode email drafts, LifePulse plans, and ChefNode recipes. Each action costs 1–6 credits. Your plan includes a daily pool; heavier actions use more credits.

**What’s included in the free Core plan?**  
BizNode and VANode: one client workspace, three integrations, deal triage, screen capture, EOD reports, and 25 AI credits per day. Enough to run a solo practice or test with one client.

**Can I add HomeNode or TraderNode on Core?**  
Those Nodes unlock on Sync (Home + Vital) or Nexus (all six). Core is focused on the business + client ops wedge.

**What happens if I hit my daily AI limit?**  
You’ll see a calm in-app notice with credits remaining and when limits reset (midnight UTC). Manual features — triage, trackers, recordings — keep working. Upgrade or wait until tomorrow.

**Can I switch plans later?**  
Yes. Use the billing portal from Settings → Plan. Upgrades apply immediately; downgrades take effect at the end of your billing period.

**Who is Nexus for?**  
Virtual assistants juggling many clients, founders running BizNode + VANode + HomeNode daily, or anyone routinely using 20+ AI assists per feature.

**Is my client data safe on VANode?**  
Screen recordings and invoices default to local-first storage. Cloud sync is opt-in. See our Privacy Policy for details.

---

### Founding member banner (optional launch)

**Banner copy:**  
*Founding members: Sync at $15/mo or Nexus at $29/mo for your first 12 months.*  
Use Lemon Squeezy discount codes `FOUNDING-SYNC` / `FOUNDING-NEXUS` — limited to first 100 subscribers.

---

### Footer legal line

Prices in USD. Taxes calculated at checkout where applicable. By upgrading you agree to our Terms of Service and Privacy Policy.

---

## 5. In-app upgrade surfaces (copy snippets)

| Surface | Copy |
|---------|------|
| Node locked (Core → Home) | **HomeNode is on Sync** — Add household logistics and ChefNode when you upgrade to Sync ($19/mo). |
| AI limit reached | **You’ve used today’s AI credits** — Limits reset at midnight UTC. [View plans] or continue with manual tools. |
| VANode client limit | **One client on Core** — Upgrade to Sync for up to 5 client workspaces. |
| Integration limit | **3 integrations on Core** — Connect up to 10 on Sync. |
| Settings → Plan | **Your plan: Core** — BizNode + VANode, 25 AI credits/day. [Upgrade to Sync] [Upgrade to Nexus] |

---

## 6. Database fields (subscription)

Table: `user_subscriptions` (see metering spec)

| Column | Core default |
|--------|--------------|
| `plan` | `core` |
| `status` | `active` |
| `lemon_customer_id` | null |
| `lemon_subscription_id` | null |
| `variant_slug` | null |
| `current_period_end` | null |

New signups: insert `plan=core` row automatically (no Lemon Squeezy event).

---

## 7. Launch checklist

- [ ] Create Lemon Squeezy product + 4 variants  
- [ ] Wire checkout URLs on pricing page CTAs  
- [ ] Implement webhook handler + `user_subscriptions`  
- [ ] Enforce Node gates in shell hat picker  
- [ ] Enforce AI metering on all generation routes  
- [ ] Add Settings → Plan with usage meter (credits used / limit)  
- [ ] Add Lemon Squeezy customer portal link for paid users  
- [ ] Verify Core signup path never redirects to checkout  

---

## 8. Related docs

- Implementation: [`ai-credit-metering-spec.md`](./ai-credit-metering-spec.md)
