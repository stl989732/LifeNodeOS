export type LandingFaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export const LANDING_FAQ_ITEMS: LandingFaqItem[] = [
  // Nodes
  {
    id: "nodes-what",
    category: "Nodes",
    question: "What are LifeNode OS nodes?",
    answer:
      "Nodes are focused workspaces inside one dashboard — BizNode for business, VANode for client VA work, HomeNode for household logistics, VitalNode for health signals, TraderNode for markets, and ProNode for secure professional vaults. You pick the hats you wear; LifeNode assembles the right surfaces around you.",
  },
  {
    id: "nodes-core",
    category: "Nodes",
    question: "Which nodes are included on the free Core plan?",
    answer:
      "Core includes BizNode, VANode, and HomeNode (with ChefNode recipe tools in HomeNode). VitalNode, TraderNode, and ProNode unlock on Sync or Nexus. You can browse every node in the catalog before upgrading.",
  },
  {
    id: "nodes-biznode",
    category: "Nodes",
    question: "What can I do in BizNode?",
    answer:
      "BizNode covers triage, kanban boards, connected business apps, and AI-assisted workflows for operators and small teams. Sync and Nexus raise limits on boards, integrations, and daily AI credits.",
  },
  {
    id: "nodes-vanode",
    category: "Nodes",
    question: "What is VANode built for?",
    answer:
      "VANode is for virtual assistants and agencies: client sessions, EOD logs, screen recording, live transcription, native invoicing, billable hours timetracker (Sync+), and a client vault. Client limits scale with your plan.",
  },
  {
    id: "nodes-home",
    category: "Nodes",
    question: "What does HomeNode include?",
    answer:
      "HomeNode centralizes family calendars, grocery and meal planning, kitchen setup, and ChefNode AI recipes. Core includes a small monthly recipe allowance; paid plans increase Chef text and image generations.",
  },
  {
    id: "nodes-vital",
    category: "Nodes",
    question: "When do I need VitalNode?",
    answer:
      "VitalNode tracks recovery, sleep, and wellness signals from supported health connectors (where available). It is included from Sync upward and pairs with Life Pulse trackers for habit and metric views.",
  },
  {
    id: "nodes-trader-pro",
    category: "Nodes",
    question: "Who are TraderNode and ProNode for?",
    answer:
      "TraderNode is for active traders who want journals and market context in the same OS. ProNode is a secure vault for sensitive professional notes and share links. Both are Nexus-tier nodes.",
  },
  {
    id: "nodes-multiple",
    category: "Nodes",
    question: "Can I run several nodes at the same time?",
    answer:
      "Yes. Your Unified Hub remembers which hats you enabled. Switch between BizNode, VANode, HomeNode, and others without losing context — shell state and widgets sync per signed-in account.",
  },
  // Integrations
  {
    id: "int-supported",
    category: "Integrations",
    question: "Which apps can I connect today?",
    answer:
      "Supported connectors include Gmail, Slack, Google Calendar, and selected health and business tools (Notion, Asana, Stripe, Shopify, Figma, and more) depending on the node. Open Connected Apps inside a node or use Calendar / Unified Inbox for messaging integrations.",
  },
  {
    id: "int-mobile",
    category: "Integrations",
    question: "Why can't I connect some mobile-only apps?",
    answer:
      "Many consumer mobile apps do not publish a secure public API for third parties. Without OAuth or an official partner API, LifeNode cannot read or write data on your behalf. We integrate where vendors allow it; otherwise we offer manual import, inbox forwarding, or calendar bridges.",
  },
  {
    id: "int-api-issue",
    category: "Integrations",
    question: 'What does an "API issue" mean in Connected Apps?',
    answer:
      "It usually means the provider blocked the request: expired OAuth token, changed API policy, missing scopes, or no API for that product tier. Try reconnecting from Connected Apps. If the app is mobile-only with no web OAuth, connection is not technically possible until the vendor opens an API.",
  },
  {
    id: "int-request",
    category: "Integrations",
    question: "Can I request a new integration?",
    answer:
      "Yes — use Support → Feedback & suggestions and tell us the app, your workflow, and whether the vendor offers a public API. We prioritize connectors with stable OAuth and clear user demand.",
  },
  {
    id: "int-sync",
    category: "Integrations",
    question: "How often does data sync?",
    answer:
      "Inbox and calendar sync on open and on scheduled background jobs where configured. Widget data saves to Supabase when you edit fields. Real-time push depends on each provider's webhooks — not every app supports instant sync.",
  },
  {
    id: "int-security",
    category: "Integrations",
    question: "How are integration tokens stored?",
    answer:
      "OAuth tokens live server-side in Supabase — never in the browser bundle. Disconnecting an app revokes the UI connection; you can remove access from the provider's account settings as well.",
  },
  {
    id: "int-disconnect",
    category: "Integrations",
    question: "Why did my integration show as disconnected?",
    answer:
      "Common causes: password change at the provider, revoked consent, exceeded plan integration limit, or API outage. Re-authenticate from Connected Apps. Your existing LifeNode data is not deleted when a link drops.",
  },
  {
    id: "int-gmail-twice",
    category: "Integrations",
    question: "Can I use the same Gmail in BizNode and Unified Inbox?",
    answer:
      "Yes, when connected through the supported Gmail OAuth flow. One account can feed triage, inbox reply, and calendar context. Plan limits still cap how many distinct integrations you can attach at once.",
  },
  {
    id: "int-apple-health",
    category: "Integrations",
    question: "Why is Apple Health limited compared to web apps?",
    answer:
      "Apple Health data is designed to stay on-device unless an app uses Apple's approved HealthKit export paths. LifeNode connects where platform rules allow; some metrics may require manual entry or a supported wearable bridge.",
  },
  // Features
  {
    id: "feat-linos",
    category: "Features",
    question: "What is Linos?",
    answer:
      "Linos is your in-dashboard assistant for triage, summaries, and node-aware suggestions. Daily AI credits depend on your plan. Linos is hidden on public marketing and legal pages so visitors are not distracted before sign-in.",
  },
  {
    id: "feat-pulse",
    category: "Features",
    question: "What is Life Pulse?",
    answer:
      "Life Pulse is the tracker layer across nodes — habits, metrics, and generated trackers with optional Linos chat. Core includes a small tracker allowance; Sync and Nexus expand counts and AI planning.",
  },
  {
    id: "feat-offline",
    category: "Features",
    question: "Does LifeNode work offline?",
    answer:
      "Some node widgets cache locally for speed, but sign-in, integrations, and cloud sync need the network. Edits merge to Supabase when you're back online — we patch data instead of wiping it.",
  },
  {
    id: "feat-data",
    category: "Features",
    question: "Where is my data stored?",
    answer:
      "Shell state, widgets, trackers, and integration metadata live in Supabase per user. Local storage is a performance cache. Sign in on each device; cloud rows win when newer.",
  },
  {
    id: "feat-inbox",
    category: "Features",
    question: "What is the Unified Inbox?",
    answer:
      "A single pane for Gmail and Slack messages with archive, reply (where supported), and transfer actions. Connect accounts from the inbox or integrations settings on Sync-tier plans and above.",
  },
  {
    id: "feat-va-record",
    category: "Features",
    question: "Can VAs record screens and transcribe calls?",
    answer:
      "VANode supports browser screen capture, saved clips, trim preview, and live transcription cards you can drag around the screen. Monthly transcription limits follow your plan entitlements.",
  },
  {
    id: "feat-bridges",
    category: "Features",
    question: "What are Logic Bridges?",
    answer:
      "Logic Bridges (Sync and Nexus) connect workflows across nodes — for example, surfacing calendar pressure in BizNode or routing inbox items into triage. Core uses nodes independently without cross-node automation.",
  },
  {
    id: "feat-whiteboard",
    category: "Features",
    question: "Is there a whiteboard or planning canvas?",
    answer:
      "Yes — shell whiteboard is enabled on all current plans for visual planning alongside kanban and calendars.",
  },
  // Subscription
  {
    id: "sub-plans",
    category: "Subscription",
    question: "How do Core, Sync, and Nexus differ?",
    answer:
      "Core is free: BizNode, VANode, and HomeNode, 2 LifePulse plan generations per month, 3 EOD screen recordings per month (in-browser only), and tight AI/integration limits. Sync ($24/mo or $19/mo billed annually) adds VitalNode, 15 downloadable EOD recordings per month, Logic Bridges, and higher caps. Nexus ($59/mo or $49/mo billed annually) unlocks every node including Trader and Pro, unlimited EOD recordings (15 min max per session), and the highest AI credits.",
  },
  {
    id: "sub-billing",
    category: "Subscription",
    question: "How does billing work?",
    answer:
      "Paid plans checkout through Lemon Squeezy (monthly or annual). After payment you return to the dashboard with your plan applied. Manage payment method and invoices from the Lemon Squeezy customer portal linked in Settings.",
  },
  {
    id: "sub-switch",
    category: "Subscription",
    question: "Can I upgrade or downgrade later?",
    answer:
      "Yes. Upgrade anytime from Pricing or Settings — checkout opens for the new tier. Downgrades take effect at the next billing cycle through the billing portal; you keep access until the period ends.",
  },
  {
    id: "sub-limits",
    category: "Subscription",
    question: "What happens when I hit a plan limit?",
    answer:
      "You'll see a clear gate or upgrade prompt — for example, extra VA clients, integrations, invoices, daily AI credits, or monthly EOD screen recordings. On Core, recordings are in-browser only (no download). Existing data stays intact; new actions above the cap wait until you upgrade or the period resets.",
  },
  {
    id: "sub-trial",
    category: "Subscription",
    question: "Is there a free trial for Sync or Nexus?",
    answer:
      "Core is permanently free so you can validate your workflow. Paid tiers may run promotional trials when announced on the pricing page; otherwise start monthly and cancel before renewal if it's not a fit.",
  },
  {
    id: "sub-core-ai",
    category: "Subscription",
    question: "Do AI credits reset?",
    answer:
      "Daily AI credits reset on a UTC schedule per plan. Chef recipe generations and EOD screen recordings use separate monthly counters on applicable tiers. Core LifePulse plan generations reset monthly (2/month). Check Settings → Plan usage for a snapshot of remaining allowance.",
  },
  // Cancellation & refunds
  {
    id: "cancel-how",
    category: "Cancellation & refunds",
    question: "How do I cancel a paid subscription?",
    answer:
      "Open Settings → Plan, or use the Lemon Squeezy customer portal from your receipt email. Cancel renewal there — access continues until the end of the paid period, then your account moves to Core limits.",
  },
  {
    id: "cancel-refund",
    category: "Cancellation & refunds",
    question: "What is your refund policy?",
    answer:
      "Paid subscriptions are non-refundable. You can cancel anytime from Settings → Plan or the Lemon Squeezy customer portal; access continues through the end of your billing period, then your account moves to Core limits.",
  },
  {
    id: "cancel-data",
    category: "Cancellation & refunds",
    question: "Is my data deleted when I cancel?",
    answer:
      "No automatic wipe. Your Supabase rows remain unless you delete your account from Settings. Downgrading only applies new limits — it does not erase clients, invoices, or widget payloads.",
  },
  {
    id: "cancel-downgrade",
    category: "Cancellation & refunds",
    question: "Can I stay on Core forever?",
    answer:
      "Yes. Core is designed as a durable free tier for BizNode, VANode, and HomeNode. If you exceed Core limits (integrations, clients, AI), you can trim usage or upgrade — nothing is deleted without your action.",
  },
  // Contact
  {
    id: "contact-support",
    category: "Contact us",
    question: "How do I contact LifeNode OS support?",
    answer:
      "Use the Support menu (top right on the landing page) → Ticket escalation for bugs and billing, or Feedback & suggestions for product ideas. Signed-in users can also open the same links from Settings.",
  },
  {
    id: "contact-bug",
    category: "Contact us",
    question: "How should I report a bug?",
    answer:
      "Open a support ticket with steps to reproduce, browser/device, screenshots, and the node you were using. For integration failures, note the app name and any API or OAuth error text from Connected Apps.",
  },
  {
    id: "contact-feedback",
    category: "Contact us",
    question: "How do I share feature feedback?",
    answer:
      "Visit /support/feedback from the Support menu or User Guide. Tell us which node and workflow you care about — especially integrations blocked by missing APIs — so we can prioritize the roadmap.",
  },
  {
    id: "contact-guide",
    category: "Contact us",
    question: "Where is the full product documentation?",
    answer:
      "Documentation lives at /docs — overview, about, user guide, platform & tools, and security. Legal policies (Terms, Privacy, Cookie preferences) are linked from the landing footer.",
  },
];
