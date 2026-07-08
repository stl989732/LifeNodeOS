/**
 * Competitor comparison content for marketing pages.
 * Pricing reflects public list prices as of mid-2026 — verify before publishing changes.
 */

export type CompetitorSlug =
  | "notion"
  | "motion"
  | "sunsama"
  | "honeybook"
  | "dubsado";

export type ComparisonRow = {
  category: string;
  feature: string;
  lifenode: string;
  competitor: string;
};

export type CompetitorProfile = {
  slug: CompetitorSlug;
  name: string;
  tagline: string;
  summary: string;
  pricing: {
    free: string;
    paid: string;
    top: string;
  };
  rows: ComparisonRow[];
};

export const LIFENODE_PRICING_SUMMARY = {
  free: "Core — $0 (BizNode, VANode, HomeNode)",
  paid: "Sync — $24/mo or $19/mo billed annually",
  top: "Nexus — $59/mo or $49/mo billed annually",
} as const;

export const COMPETITOR_SLUGS: CompetitorSlug[] = [
  "notion",
  "motion",
  "sunsama",
  "honeybook",
  "dubsado",
];

export const COMPETITORS: Record<CompetitorSlug, CompetitorProfile> = {
  notion: {
    slug: "notion",
    name: "Notion",
    tagline: "Flexible workspace — you build the system",
    summary:
      "Notion is a powerful blank canvas for notes, wikis, and databases. LifeNode OS ships role-specific Nodes (Biz, VA, Home, Vital, Trader, Pro) with OAuth integrations and AI tuned to each hat — less DIY, more daily ops out of the box.",
    pricing: {
      free: "Yes — unlimited pages for solo use; AI is limited/trial",
      paid: "Plus ~$10/seat/mo",
      top: "Business ~$20/seat/mo (full AI bundle)",
    },
    rows: [
      {
        category: "Product model",
        feature: "Structure",
        lifenode: "Six role Nodes (Biz, VA, Home, Vital, Trader, Pro) in one OS",
        competitor: "Blank workspace — you design databases and views",
      },
      {
        category: "Product model",
        feature: "Multi-hat life ops",
        lifenode: "Switch hats; shell state and widgets follow your roles",
        competitor: "Single workspace; hats are manual tags or separate pages",
      },
      {
        category: "AI",
        feature: "AI access on free tier",
        lifenode: "20 AI credits/day on Core (Linos, VA/Biz triage, Chef text, LifePulse)",
        competitor: "AI gated to paid Business tier for full access",
      },
      {
        category: "Integrations",
        feature: "OAuth app connections",
        lifenode: "Gmail, Slack, calendars, and more per Node",
        competitor: "Many via Notion AI connectors; setup varies by use case",
      },
      {
        category: "VANode / clients",
        feature: "Client workspaces & EOD proof",
        lifenode: "VANode: clients, EOD reports, screen capture, invoicing",
        competitor: "Custom CRM databases; no native EOD screen recording",
      },
      {
        category: "Home / family",
        feature: "Parent & household tools",
        lifenode: "HomeNode: ChefNode recipes, chores, grocery flows on Core (free)",
        competitor: "Templates only — no dedicated parent Node",
      },
      {
        category: "Health",
        feature: "Recovery & scheduling",
        lifenode: "VitalNode on Sync+ (sleep, recovery, AI scheduling)",
        competitor: "Manual trackers or third-party embeds",
      },
      {
        category: "Pricing",
        feature: "Solo founder / VA wedge",
        lifenode: "Core free includes Biz + VA + Home — no card required",
        competitor: "Free for manual work; AI and teams add per-seat cost",
      },
    ],
  },
  motion: {
    slug: "motion",
    name: "Motion",
    tagline: "AI calendar & task auto-scheduling",
    summary:
      "Motion excels at auto-scheduling tasks on your calendar with AI credits. LifeNode OS covers the same busy professional — plus client ops (VANode), home logistics (HomeNode), and health (VitalNode) in one dashboard.",
    pricing: {
      free: "7-day trial — no permanent free tier",
      paid: "Pro AI ~$19–29/mo",
      top: "Business AI ~$29–49/mo + monthly AI credit pools",
    },
    rows: [
      {
        category: "Focus",
        feature: "Primary job",
        lifenode: "Multi-domain life OS (work, clients, home, health)",
        competitor: "Calendar-first auto-scheduling and project tasks",
      },
      {
        category: "AI",
        feature: "AI model",
        lifenode: "Per-feature caps (triage, EOD, Chef, LifePulse) + daily pool",
        competitor: "Credit-based scheduling and task AI; overage on some plans",
      },
      {
        category: "VANode / clients",
        feature: "Freelancer / VA workflows",
        lifenode: "Client workspaces, email drafts, EOD screen capture, invoices",
        competitor: "Tasks and meetings — not client CRM or proof-of-work video",
      },
      {
        category: "Home / family",
        feature: "Household logistics",
        lifenode: "HomeNode on Core: recipes, chores, family scheduling hooks",
        competitor: "Personal tasks only — no parent/household Node",
      },
      {
        category: "Integrations",
        feature: "Connected apps",
        lifenode: "OAuth per Node (email, chat, calendar, etc.)",
        competitor: "Calendar and task integrations; narrower ops surface",
      },
      {
        category: "Pricing",
        feature: "Entry price",
        lifenode: "Core $0 with 3 Nodes; Sync from $19/mo annual",
        competitor: "Paid from day one after trial (~$19–29/mo)",
      },
      {
        category: "Pricing",
        feature: "Free tier",
        lifenode: "Permanent Core plan — manual + limited AI",
        competitor: "No ongoing free tier",
      },
    ],
  },
  sunsama: {
    slug: "sunsama",
    name: "Sunsama",
    tagline: "Calm daily planner across calendars",
    summary:
      "Sunsama helps you plan each day across calendars and task tools. LifeNode OS adds domain depth — client delivery (VANode), business pipelines (BizNode), and family ops (HomeNode) — not just a daily planning ritual.",
    pricing: {
      free: "Trial only — no permanent free tier",
      paid: "~$19–25/mo",
      top: "Single premium tier ~$34/mo",
    },
    rows: [
      {
        category: "Focus",
        feature: "Daily workflow",
        lifenode: "Role Nodes with persistent widgets and cloud sync",
        competitor: "Daily planning ritual across imported calendars/tasks",
      },
      {
        category: "Product model",
        feature: "Domains covered",
        lifenode: "Work, VA clients, home, health, trading, pro vault",
        competitor: "Tasks + calendar aggregation — one planning layer",
      },
      {
        category: "VANode / clients",
        feature: "Client delivery",
        lifenode: "Per-client workspaces, EOD reports, screen recordings",
        competitor: "No client CRM or proof-of-work capture",
      },
      {
        category: "BizNode",
        feature: "Founder / deal ops",
        lifenode: "Deal triage, pipelines, executive summaries (AI on paid tiers)",
        competitor: "Generic tasks — no deal-focused Node",
      },
      {
        category: "Home / family",
        feature: "Parents & household",
        lifenode: "ChefNode, chores, grocery flows in HomeNode (Core)",
        competitor: "Not designed for household logistics",
      },
      {
        category: "AI",
        feature: "Assistant",
        lifenode: "Linos cross-Node assistant + feature-specific AI",
        competitor: "Limited AI; focus is planning UX not generation",
      },
      {
        category: "Pricing",
        feature: "Free wedge",
        lifenode: "Core free forever for 3 Nodes",
        competitor: "Subscription required after trial",
      },
    ],
  },
  honeybook: {
    slug: "honeybook",
    name: "HoneyBook",
    tagline: "Client CRM for creatives & service pros",
    summary:
      "HoneyBook is strong for client intake, contracts, and payments for creatives. LifeNode OS matches client ops in VANode — and adds BizNode, HomeNode, and VitalNode so one subscription covers life beyond client bookings.",
    pricing: {
      free: "Trial only",
      paid: "Starter ~$29/mo (unlimited clients)",
      top: "Teams ~$109/mo",
    },
    rows: [
      {
        category: "Focus",
        feature: "Core buyer",
        lifenode: "Multi-hat operators (founder + VA + parent + health)",
        competitor: "Creative freelancers and service businesses",
      },
      {
        category: "VANode / clients",
        feature: "Client management",
        lifenode: "Client workspaces, email AI, EOD, invoicing limits by plan",
        competitor: "Strong CRM, contracts, invoices, payments in one flow",
      },
      {
        category: "BizNode",
        feature: "Business / deals",
        lifenode: "Deal triage, kanban, founder dashboards on Core+",
        competitor: "Project-based client work — not founder deal rooms",
      },
      {
        category: "Home / family",
        feature: "Household",
        lifenode: "HomeNode with ChefNode on Core (free)",
        competitor: "Not offered",
      },
      {
        category: "Health",
        feature: "Recovery & habits",
        lifenode: "VitalNode on Sync+",
        competitor: "Not offered",
      },
      {
        category: "AI",
        feature: "AI features",
        lifenode: "Linos, VA/Biz triage, Chef, LifePulse plans",
        competitor: "Smart fields and automation; less cross-life AI",
      },
      {
        category: "Pricing",
        feature: "Entry paid",
        lifenode: "Sync $24/mo — unlimited clients on Nexus; 8 on Sync",
        competitor: "~$29/mo for unlimited clients",
      },
      {
        category: "Pricing",
        feature: "Free tier",
        lifenode: "Core $0 with 2 VA clients, 3 Nodes",
        competitor: "No permanent free tier",
      },
    ],
  },
  dubsado: {
    slug: "dubsado",
    name: "Dubsado",
    tagline: "Workflows & CRM for solo service businesses",
    summary:
      "Dubsado’s free tier (3 clients) is the closest comp to VANode. LifeNode OS matches that wedge — then adds AI-native triage, EOD screen capture, and HomeNode for parents without a second subscription.",
    pricing: {
      free: "Yes — up to 3 clients forever",
      paid: "Starter ~$28/mo",
      top: "Premier ~$44/mo (automation)",
    },
    rows: [
      {
        category: "VANode / clients",
        feature: "Free client cap",
        lifenode: "2 clients on Core; 8 on Sync; unlimited on Nexus",
        competitor: "3 clients forever on free",
      },
      {
        category: "VANode / clients",
        feature: "Proof of work",
        lifenode: "EOD screen recording + review (plan limits apply)",
        competitor: "Time tracking and forms — no native screen capture",
      },
      {
        category: "AI",
        feature: "AI-native workflows",
        lifenode: "Email drafts, triage, EOD summaries, LifePulse plans",
        competitor: "Templates and automation rules — minimal generative AI",
      },
      {
        category: "BizNode",
        feature: "Founder / deals",
        lifenode: "Deal triage and pipelines alongside VA work",
        competitor: "Client projects only",
      },
      {
        category: "Home / family",
        feature: "Parents",
        lifenode: "HomeNode + ChefNode on Core",
        competitor: "Not offered",
      },
      {
        category: "Integrations",
        feature: "Connected apps",
        lifenode: "OAuth integrations scaled by plan (2 → 12 → unlimited)",
        competitor: "Zapier, calendars, payment processors",
      },
      {
        category: "Pricing",
        feature: "Paid entry",
        lifenode: "Sync $24/mo ($19/mo annual)",
        competitor: "~$28/mo",
      },
      {
        category: "Pricing",
        feature: "All-in-one life OS",
        lifenode: "Six Nodes — one login for work, clients, home, health",
        competitor: "Client business management only",
      },
    ],
  },
};

export function getCompetitor(slug: string): CompetitorProfile | null {
  if (slug in COMPETITORS) {
    return COMPETITORS[slug as CompetitorSlug];
  }
  return null;
}

export function comparisonPageTitle(competitor: CompetitorProfile): string {
  return `LifeNode OS vs ${competitor.name}`;
}
