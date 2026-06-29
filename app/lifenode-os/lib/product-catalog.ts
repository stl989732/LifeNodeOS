import { NODE_FEATURE_CATALOG } from "@/src/components/shell/node-feature-catalog";

export type ProductFeature = {
  id: string;
  label: string;
  description?: string;
};

export type ProductSurface = {
  id: string;
  label: string;
  route: string;
  blurb: string;
  color?: string;
  features: ProductFeature[];
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  overview: "Your node home — status, shortcuts, and what needs attention today.",
  integrations: "Connect Google Calendar and other apps so events stay in sync.",
  gmail: "Read and reply to Gmail threads without leaving the shell.",
  slack: "Catch up on Slack channels and reply from one feed.",
  google_calendar: "See calendar events alongside messages in the inbox.",
  "calm-wheel": "Visual calm score and recovery ring across your enabled nodes.",
  trackers: "Create and manage Life Pulse trackers for habits and commitments.",
  "linos-chat": "Chat with Linos about your trackers and daily priorities.",
  pipeline: "Track deal velocity and pipeline health at a glance.",
  "deal-triage": "Sort inbound leads and opportunities into actionable queues.",
  "connected-apps": "OAuth-connect Slack, Gmail, Notion, and more per node.",
  "unified-brain": "Cross-app intelligence and triage powered by Linos.",
  "founder-utils": "Quick calculators and founder-focused utilities.",
  eod: "End-of-day logs per client with exportable summaries.",
  vault: "Secure notes, SOPs, and client snippets with copy-friendly fields.",
  ai: "Draft replies, summaries, and task breakdowns with AI assistance.",
  rhythm: "Chaos calculator and timezone bridge for multi-client VAs.",
  meeting: "Live meeting capture with transcript and AI recap.",
  waiting: "Track items you are waiting on from clients or teammates.",
  clients: "Client profiles, timezones, work hours, and credential vault.",
  invoice: "Build, print, and share invoices with currency-aware totals.",
  "billable-hours":
    "Immutable timetracker per client — breaks, alarms, share links, EOD invoice hours (Sync+).",
  "home-overview": "Family command deck — cart, chores, budget, and kitchen at a glance.",
  "chef-node": "AI recipe discovery, meal planning, and save-to-vault.",
  "smart-cart": "Grocery list with cross-device sync; add items inline.",
  "chore-hub": "Chore rewards, points, and activity prep for kids and family.",
  momentum: "Daily momentum view tied to your wellness goals.",
  sleep: "Sleep and nutrition signals from connected health apps.",
  architect: "Design your VitalNode routines with Linos guidance.",
  focus: "Discovery flow to choose your ProNode workspace role.",
  cases: "Case folders, projects, and matter organization.",
  editor: "Distraction-free deep work editor with citations.",
  timeline: "Auto-built timelines from your case activity.",
  command: "Pro command center for research and deliverables.",
  watchlist: "Symbols and price alerts for your watchlist.",
  journal: "Trade journal entries with tags and review.",
  risk: "Position sizing and risk guardrail reminders.",
};

function fromCatalog(
  hatId: string,
  extras: ProductFeature[] = [],
): ProductFeature[] {
  const base = (NODE_FEATURE_CATALOG[hatId] ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    description: FEATURE_DESCRIPTIONS[f.id],
  }));
  return [...base, ...extras];
}

/** Shell-wide surfaces available across nodes (sidebar + global chrome). */
export const SHELL_SURFACES: ProductSurface[] = [
  {
    id: "calendar",
    label: "Calendar",
    route: "/calendar",
    blurb: "Unified schedule with connected calendar apps.",
    color: "#6366F1",
    features: fromCatalog("calendar"),
  },
  {
    id: "inbox",
    label: "Unified Inbox",
    route: "/inbox",
    blurb: "Gmail, Slack, and calendar in one triage feed — reply, archive, transfer.",
    color: "#0EA5E9",
    features: [
      ...fromCatalog("inbox"),
      {
        id: "transfer",
        label: "Transfer actions",
        description:
          "Move items to today's calendar, kanban backlog, BizNode triage, or VANode vault.",
      },
      {
        id: "shortcuts",
        label: "Keyboard shortcuts",
        description: "Z adds to backlog; S schedules for today.",
      },
    ],
  },
  {
    id: "pulse",
    label: "LifePulse",
    route: "/pulse",
    blurb: "Trackers, calm wheel, and Linos chat for cross-hat commitments.",
    color: "#A855F7",
    features: fromCatalog("pulse"),
  },
  {
    id: "dashboard",
    label: "Unified Hub",
    route: "/dashboard",
    blurb: "Your signed-in home — projects, display name, and shell overview.",
    color: "#64748B",
    features: [
      {
        id: "projects",
        label: "Projects",
        description: "Pinned projects and quick links from your shell state.",
      },
      {
        id: "display-name",
        label: "Display name",
        description: "How you appear across nodes and notifications.",
      },
    ],
  },
  {
    id: "shell",
    label: "Node Gallery",
    route: "/shell",
    blurb: "Pick which nodes (hats) appear in your sidebar and Linos context.",
    color: "#475569",
    features: [
      {
        id: "hat-picker",
        label: "Hat selection",
        description: "Enable BizNode, HomeNode, VANode, VitalNode, ProNode, and TraderNode.",
      },
      {
        id: "onboarding",
        label: "Per-node onboarding",
        description: "Progress bars show stack sync and first-workflow setup.",
      },
    ],
  },
  {
    id: "kanban",
    label: "Kanban",
    route: "/shell",
    blurb: "Boards for backlog and today — fed by inbox transfers and orchestrator.",
    color: "#F59E0B",
    features: [
      {
        id: "boards",
        label: "My board",
        description: "Personal columns for tasks you pull from inbox or nodes.",
      },
      {
        id: "transfer-in",
        label: "Inbox → Kanban",
        description: "Transfer unified inbox items directly into your board.",
      },
    ],
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    route: "/shell",
    blurb: "Excalidraw-powered sketch board synced to your account.",
    color: "#EC4899",
    features: [
      {
        id: "draw",
        label: "Freeform canvas",
        description: "Sketch flows, wireframes, and notes; persists across sessions.",
      },
      {
        id: "vault-bridge",
        label: "Vault bridge",
        description: "Send whiteboard snapshots to node vaults where supported.",
      },
    ],
  },
  {
    id: "linos",
    label: "Linos Assistant",
    route: "/shell",
    blurb: "In-app AI guide — triage, how-to, and cross-node orchestration.",
    color: "#14B8A6",
    features: [
      {
        id: "chat",
        label: "Context-aware chat",
        description: "Knows your active node, enabled hats, and bridge signals.",
      },
      {
        id: "alerts",
        label: "Logic bridge alerts",
        description: "Surfaces cross-hat nudges when workload affects recovery.",
      },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    route: "/shell",
    blurb: "Bell icon alerts for workflows, integrations, and node events.",
    color: "#94A3B8",
    features: [
      {
        id: "bell",
        label: "Notification center",
        description: "Review and dismiss alerts without leaving your current node.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    route: "/shell",
    blurb: "Account, integrations overview, and preferences.",
    color: "#64748B",
    features: [
      {
        id: "account",
        label: "Account & deletion",
        description: "Update profile and manage account lifecycle safely.",
      },
      {
        id: "integrations",
        label: "Integration health",
        description: "See which apps are connected per node.",
      },
    ],
  },
];

const HOME_EXTRAS: ProductFeature[] = [
  {
    id: "budget",
    label: "Monthly Budget Tracker",
    description: "Household categories, currency, and remaining balances.",
  },
  {
    id: "recipe-vault",
    label: "Recipe Vault",
    description: "Save AI and kitchen recipes; syncs across web and mobile.",
  },
  {
    id: "family-notes",
    label: "Family Notes",
    description: "Color-coded notes and saved snippets for the household.",
  },
  {
    id: "activity-prep",
    label: "Activity Prep",
    description: "Prep lists for kids' activities and family events.",
  },
  {
    id: "home-intel",
    label: "Home Intelligence",
    description: "Linos-powered household Q&A and logistics suggestions.",
  },
];

const VA_EXTRAS: ProductFeature[] = [
  {
    id: "credential-vault",
    label: "Credential Vault",
    description: "Per-client secrets and 2FA placeholders in client profiles.",
  },
  {
    id: "unified-feed",
    label: "Unified Feed",
    description: "Embedded inbox-style feed on the VANode dashboard.",
  },
  {
    id: "scratch-pad",
    label: "Scratch Pad",
    description: "Quick capture with tags; save drafts to Smart Vault.",
  },
  {
    id: "billable-hours",
    label: "Billable Hours Timetracker",
    description:
      "Per-client workday timer with breaks, alarms, client share links, and EOD invoice hours (Sync+).",
  },
];

/** Domain nodes users enable as “hats” at sign-in. */
export const PRODUCT_NODES: ProductSurface[] = [
  {
    id: "work",
    label: "BizNode",
    route: "/work",
    blurb: "Business, pipelines, and operations.",
    color: "#2563EB",
    features: fromCatalog("work"),
  },
  {
    id: "va",
    label: "VANode",
    route: "/vanode",
    blurb: "Client sandboxes, EOD reports, billable hours, and invoicing.",
    color: "#0D9488",
    features: [...fromCatalog("va"), ...VA_EXTRAS],
  },
  {
    id: "home",
    label: "HomeNode",
    route: "/home",
    blurb: "Fridge vision, groceries, chores, and family hub.",
    color: "#F59E0B",
    features: [...fromCatalog("home"), ...HOME_EXTRAS],
  },
  {
    id: "vital",
    label: "VitalNode",
    route: "/vital",
    blurb: "Sleep, health, and AI scheduling.",
    color: "#84A59D",
    features: fromCatalog("vital"),
  },
  {
    id: "pro",
    label: "ProNode",
    route: "/pro",
    blurb: "Legal, medical, and case-style deep work.",
    color: "#1E293B",
    features: fromCatalog("pro"),
  },
  {
    id: "trader",
    label: "TraderNode",
    route: "/trader",
    blurb: "Markets, journals, and sniper mode.",
    color: "#06B6D4",
    features: fromCatalog("trader"),
  },
];

export const ALL_PRODUCT_SURFACES: ProductSurface[] = [
  ...SHELL_SURFACES,
  ...PRODUCT_NODES,
];

export const GETTING_STARTED_STEPS = [
  {
    title: "Create your account",
    body: "Sign up from the landing page or /auth/signup. Use the same account on web and mobile.",
  },
  {
    title: "Pick your hats",
    body: "On the landing quiz, select the nodes that match your life — BizNode, HomeNode, VANode, and others. You can change hats later in the Node Gallery (/shell).",
  },
  {
    title: "Open the shell",
    body: "After sign-in, visit /shell to see your enabled nodes in the sidebar. Open /dashboard for your unified hub.",
  },
  {
    title: "Connect apps",
    body: "In each node, use Connected Apps or the Calendar/Inbox integrations page to OAuth-link Gmail, Slack, Google Calendar, and health tools.",
  },
  {
    title: "Work in nodes",
    body: "Each node saves your inputs automatically. Sign in on another device to sync recipes, lists, hats, and widget data from Supabase.",
  },
];

export const DATA_PERSISTENCE_NOTE =
  "LifeNode OS stores shell state (hats, display name, last node) in Supabase. Node widgets — recipes, grocery lists, budgets, kanban, and more — sync per user. Local storage is a fast cache; cloud wins when newer. Your data is merged, not reset, on refresh or deploy.";

export const INTEGRATIONS_LIST = [
  "Gmail — inbox read/reply and BizNode triage",
  "Slack — unified inbox and notifications",
  "Google Calendar — calendar view and inbox context",
  "Apple Health / Oura / Whoop — VitalNode signals (where connected)",
  "Notion, Asana, Stripe, Shopify, Figma — BizNode and HomeNode app connectors",
];
