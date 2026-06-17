# LifeNode OS — User Guide

> **Live version:** [https://lifenodeos.com/docs](https://lifenodeos.com/docs)  
> **Source of truth for feature lists:** `app/lifenode-os/lib/product-catalog.ts`

LifeNode OS is a multi-node productivity shell. You enable **hats** (BizNode, HomeNode, VANode, VitalNode, ProNode, TraderNode) and use shared **shell surfaces** (calendar, inbox, LifePulse, kanban, whiteboard, Linos) across them.

---

## Getting started

1. **Create your account** — Sign up from the landing page or `/auth/signup`. Use the same account on web and mobile.

2. **Pick your hats** — On the landing quiz, select the nodes that match your life. You can change hats later in the **Node Gallery** (`/shell`).

3. **Open the shell** — After sign-in, visit `/shell` to see enabled nodes in the sidebar. Open `/dashboard` for your unified hub.

4. **Connect apps** — In each node, use **Connected Apps** or the Calendar/Inbox integrations page to OAuth-link Gmail, Slack, Google Calendar, and health tools.

5. **Work in nodes** — Each node saves your inputs automatically. Sign in on another device to sync recipes, lists, hats, and widget data from Supabase.

---

## How data saves

LifeNode OS stores shell state (hats, display name, last active node) in **Supabase** (`user_shell_state`). Node widgets — recipes, grocery lists, budgets, kanban, and more — sync per user in `user_node_widget_data` and node-specific tables.

Local storage is a fast cache; cloud wins when newer. Your data is **merged, not reset**, on refresh or deploy.

Sign in on every device you use. If the UI looks empty after a deploy, check that production has Supabase URL and service role key configured — rows may still exist in the database.

---

## Shell surfaces

### Calendar (`/calendar`)

Unified schedule with connected calendar apps.

- **Calendar** — Your node home for schedule and status.
- **Connect Apps** — Link Google Calendar and other apps so events stay in sync.

### Unified Inbox (`/inbox`)

Gmail, Slack, and calendar in one triage feed.

- **Unified Inbox** — Single feed for cross-app messages.
- **Gmail** — Read and reply without leaving the shell.
- **Slack** — Catch up on channels from one place.
- **Calendar** — See events alongside messages.
- **Transfer actions** — Move items to today's calendar, kanban backlog, BizNode triage, or VANode vault.
- **Keyboard shortcuts** — `Z` adds to backlog; `S` schedules for today.

### LifePulse (`/pulse`)

Trackers, calm wheel, and Linos chat for cross-hat commitments.

- **Overview** — Pulse home and summary.
- **Calm Wheel** — Visual calm score across enabled nodes.
- **Trackers** — Life Pulse habit and commitment trackers.
- **Linos Chat** — Chat about trackers and daily priorities.

### Unified Hub (`/dashboard`)

Signed-in home — projects, display name, and shell overview.

### Node Gallery (`/shell`)

Pick which nodes appear in your sidebar and Linos context.

- **Hat selection** — Enable BizNode, HomeNode, VANode, VitalNode, ProNode, TraderNode.
- **Per-node onboarding** — Progress shows stack sync and first-workflow setup.

### Kanban

Boards for backlog and today — fed by inbox transfers.

- **My board** — Personal columns for tasks from inbox or nodes.
- **Inbox → Kanban** — Transfer unified inbox items into your board.

### Whiteboard

Excalidraw-powered sketch board synced to your account.

### Linos Assistant

In-app AI guide — triage, how-to, and cross-node orchestration.

### Notifications & Settings

Bell alerts for workflows and integrations; account and integration health in settings.

---

## Domain nodes

### BizNode (`/work`)

Business, pipelines, and operations.

- Overview, Pipeline Velocity, Deal Triage, Connected Apps, Unified Node Brain, Founder Utilities

### VANode (`/vanode`)

Client sandboxes, EOD reports, and invoicing.

- Overview, EOD Log, Smart Vault, AI Assistant, Chaos & Timezones, Meeting Recorder, Waiting On, Clients, Invoicing
- **Credential Vault** — Per-client secrets in client profiles.
- **Unified Feed** — Inbox-style feed on the dashboard.
- **Scratch Pad** — Quick capture; save drafts to Smart Vault.

### HomeNode (`/home`)

Fridge vision, groceries, chores, and family hub.

- Home Overview, ChefNode, Smart Cart, Chore & Reward Hub
- **Monthly Budget Tracker** — Household categories and balances.
- **Recipe Vault** — Saved recipes; syncs across web and mobile.
- **Family Notes** — Color-coded household notes.
- **Activity Prep** — Prep lists for kids' activities.
- **Home Intelligence** — Linos household Q&A and logistics.

### VitalNode (`/vital`)

Sleep, health, and AI scheduling.

- Overview, Momentum Mode, Sleep & Nutrition, Vital Architect

### ProNode (`/pro`)

Legal, medical, and case-style deep work.

- Overview, Focus Discovery, Cases & Projects, Deep Focus Editor, Auto-Timeline, Command Center

### TraderNode (`/trader`)

Markets, journals, and sniper mode.

- Overview, Watchlist, Trading Journal, Risk Guardrails

---

## Integrations

Connect from **Connected Apps** in each node, or from Calendar and Unified Inbox:

- Gmail — inbox read/reply and BizNode triage
- Slack — unified inbox and notifications
- Google Calendar — calendar view and inbox context
- Apple Health / Oura / Whoop — VitalNode signals (where connected)
- Notion, Asana, Stripe, Shopify, Figma — BizNode and HomeNode connectors

OAuth flows start from the app and complete at `/api/integrations/[provider]/callback`.

---

## Support

- [Feedback & suggestions](https://lifenodeos.com/support/feedback)
- [Ticket escalation](https://lifenodeos.com/support/ticket)

---

## For maintainers

When adding or renaming features:

1. Update `node-feature-catalog.ts` for sidebar/deep links.
2. Extend `lib/product-catalog.ts` for shell extras and HomeNode/VANode additions.
3. Landing catalog (`LandingNodesCatalog`) and `/docs` read from `product-catalog.ts` automatically.
4. Refresh this file when user-facing prose should change beyond auto-generated lists.
