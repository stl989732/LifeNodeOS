/** Canonical Supabase widget keys for node dashboard cards. */
export const NODE_WIDGET_KEYS = {
  home: {
    setup: "home.setup",
    notes: "home.notes",
    savedNotes: "home.saved_notes",
    budget: "home.budget",
    chores: "home.chores",
    activityPrep: "home.activity_prep",
    engagement: "home.engagement",
    recipeVault: "home.recipe_vault",
    nativeGrocery: "home.native_grocery",
    kitchenAi: "home.kitchen_ai",
  },
  vanode: {
    dashboard: "vanode.dashboard",
    screenCaptures: "vanode.screen_captures",
  },
  shell: {
    whiteboard: "shell.whiteboard",
    kanban: "shell.kanban",
    calendar: "shell.calendar",
  },
  vital: {
    dashboard: "vital.dashboard",
    nightCaptures: "vital.night_captures",
  },
  trader: {
    settings: "trader.settings",
    journal: "trader.journal",
  },
  biz: {
    founderNotes: "biz.founder_notes",
    onboardingSync: "biz.onboarding_sync",
    dataHub: "biz.data_hub",
  },
  pro: {
    setup: "pro.setup",
    billableSessions: "pro.billable_sessions",
  },
} as const;

export type NodeWidgetKey =
  | (typeof NODE_WIDGET_KEYS)["home"][keyof (typeof NODE_WIDGET_KEYS)["home"]]
  | (typeof NODE_WIDGET_KEYS)["vanode"][keyof (typeof NODE_WIDGET_KEYS)["vanode"]]
  | (typeof NODE_WIDGET_KEYS)["vital"][keyof (typeof NODE_WIDGET_KEYS)["vital"]]
  | (typeof NODE_WIDGET_KEYS)["trader"][keyof (typeof NODE_WIDGET_KEYS)["trader"]]
  | (typeof NODE_WIDGET_KEYS)["biz"][keyof (typeof NODE_WIDGET_KEYS)["biz"]]
  | (typeof NODE_WIDGET_KEYS)["pro"][keyof (typeof NODE_WIDGET_KEYS)["pro"]]
  | (typeof NODE_WIDGET_KEYS)["shell"][keyof (typeof NODE_WIDGET_KEYS)["shell"]];

const ALLOWED_KEY = /^[a-z][a-z0-9._-]{0,127}$/;

export function isNodeWidgetKey(value: string): value is NodeWidgetKey {
  return ALLOWED_KEY.test(value);
}
