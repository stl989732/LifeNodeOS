import type { ProRoleId } from "./types";

export type DiscoveryGroup = {
  category: string;
  tools: string[];
};

export type DiscoveryCatalog = {
  headline: string;
  groups: DiscoveryGroup[];
};

const LEGAL: DiscoveryCatalog = {
  headline: "⚖️ Lawyers / Legal professionals",
  groups: [
    {
      category: "Specialty CRM / Practice management",
      tools: [
        "MyCase",
        "PracticePanther",
        "Litify",
        "Rocket Matter",
        "Smokeball",
        "Filevine",
        "Lawmatics",
        "CosmoLex",
        "LEAP Legal Software",
        "Actionstep",
      ],
    },
    {
      category: "Communication & Comms",
      tools: [
        "Zoom for Legal",
        "Dialpad",
        "Smith.ai",
        "LawTap",
        "GoTo Connect",
      ],
    },
    {
      category: "Research",
      tools: ["LexisNexis", "Casetext", "Fastcase", "HeinOnline", "Bloomberg Law"],
    },
    {
      category: "Billing / Time tracking",
      tools: ["Bill4Time", "TimeSolv", "Chrometa", "Harvest", "LawPay"],
    },
  ],
};

const MEDICAL: DiscoveryCatalog = {
  headline: "🩺 Doctors / Medical professionals",
  groups: [
    {
      category: "Specialty CRM / PM",
      tools: [
        "Athenahealth",
        "Cerner",
        "DrChrono",
        "SimplePractice",
        "Kareo",
        "Practice Fusion",
        "NextGen Healthcare",
        "Jane App",
        "NexHealth",
        "Healthie",
      ],
    },
    {
      category: "Communication",
      tools: ["Doximity", "TigerConnect", "OhMD", "Spruce Health", "Updox"],
    },
    {
      category: "Research",
      tools: ["UpToDate", "ClinicalKey", "Cochrane Library", "Medscape", "DynaMed"],
    },
    {
      category: "Billing",
      tools: ["AdvancedMD", "CareCloud", "Tebra", "MDToolbox", "TherapyNotes"],
    },
  ],
};

const DESIGNER: DiscoveryCatalog = {
  headline: "🎨 Designers",
  groups: [
    {
      category: "PM / Creative ops",
      tools: [
        "Adobe Workfront",
        "Milanote",
        "Framer",
        "InVision",
        "Asana",
        "Monday.com",
        "Trello",
        "Airtable",
        "Miro",
        "Notion",
      ],
    },
    {
      category: "Communication",
      tools: ["Loom", "Frame.io", "Discord", "Basecamp", "Whereby"],
    },
    {
      category: "Billing",
      tools: ["Bonsai", "FreshBooks", "HoneyBook", "Plutio", "Invoice Ninja"],
    },
  ],
};

const TECH: DiscoveryCatalog = {
  headline: "💻 Computer engineers / IT / Developers",
  groups: [
    {
      category: "PM / DevOps",
      tools: [
        "Linear",
        "Azure DevOps",
        "YouTrack",
        "Shortcut",
        "Redmine",
        "Backlog",
        "Bitbucket",
        "Postman",
        "Sentry",
        "Datadog",
      ],
    },
    {
      category: "Communication",
      tools: ["Mattermost", "Rocket.Chat", "PagerDuty", "Opsgenie", "Statuspage"],
    },
    {
      category: "Billing / Tracking",
      tools: ["Tempo Timesheets", "Everhour", "ClockShark", "Paymo", "Timely"],
    },
  ],
};

const TEACHER: DiscoveryCatalog = {
  headline: "🧑‍🏫 Teachers / Educators",
  groups: [
    {
      category: "LMS / Classroom management",
      tools: [
        "Google Classroom",
        "Schoology",
        "Blackboard",
        "Moodle",
        "Seesaw",
        "PowerSchool",
        "ClassDojo",
        "Nearpod",
        "Edmodo",
        "Kahoot!",
      ],
    },
    {
      category: "Communication",
      tools: ["Remind", "ParentSquare", "Bloomz", "Zoom Education", "Microsoft Education"],
    },
  ],
};

const COACH: DiscoveryCatalog = {
  headline: "🧠 Coaches (Business / Fitness / Life)",
  groups: [
    {
      category: "CRM / Client management",
      tools: [
        "CoachAccountable",
        "Practice Better",
        "Trainerize",
        "TrueCoach",
        "Paperbell",
        "Satori",
        "Nudge Coach",
        "Kajabi",
        "Teachable",
        "Mighty Networks",
      ],
    },
    {
      category: "Billing",
      tools: ["Stripe Billing", "ThriveCart", "Paddle", "SamCart", "Wave"],
    },
  ],
};

const ENGINEERING_CIVIL: DiscoveryCatalog = {
  headline: "🏗️ Engineers (Civil / Mechanical / Industrial)",
  groups: [
    {
      category: "PM / Operations",
      tools: [
        "Procore",
        "Autodesk Construction Cloud",
        "PlanGrid",
        "Buildertrend",
        "Bluebeam",
        "Primavera P6",
        "Fieldwire",
        "Asite",
        "Newforma",
        "BQE CORE",
      ],
    },
    {
      category: "Billing / Tracking",
      tools: ["Deltek Ajera", "Deltek Vantagepoint", "Replicon", "BigTime", "Unanet"],
    },
  ],
};

const CATALOG_BY_ROLE: Record<ProRoleId, DiscoveryCatalog> = {
  legal: LEGAL,
  medical: MEDICAL,
  designer: DESIGNER,
  tech: TECH,
  teacher: TEACHER,
  coach: COACH,
  engineering: ENGINEERING_CIVIL,
};

export function getDiscoveryCatalog(role: ProRoleId): DiscoveryCatalog {
  return CATALOG_BY_ROLE[role] ?? LEGAL;
}

/** Flatten tools with optional category filter for search UI. */
export function flattenDiscoveryTools(catalog: DiscoveryCatalog): { category: string; tool: string }[] {
  const out: { category: string; tool: string }[] = [];
  for (const g of catalog.groups) {
    for (const tool of g.tools) {
      out.push({ category: g.category, tool });
    }
  }
  return out;
}

export function filterDiscoveryCatalog(
  catalog: DiscoveryCatalog,
  query: string,
): DiscoveryCatalog {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return {
    ...catalog,
    groups: catalog.groups
      .map((g) => ({
        ...g,
        tools: g.tools.filter(
          (t) => t.toLowerCase().includes(q) || g.category.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.tools.length > 0),
  };
}
