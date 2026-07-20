import { NODE_WIDGET_KEYS, type NodeWidgetKey } from "@/lib/node-widget-keys";
import { VANODE_STORAGE_KEY } from "@/lib/vanode/constants";
import {
  readScopedLocalStorage,
  userScopedStorageKey,
} from "@/src/lib/userScopedStorage";
import { payloadHasData } from "@/src/lib/nodeWidgetSync";

type WidgetBridge = {
  storageKey: (userId: string) => string;
  read: (userId: string) => unknown;
  write: (userId: string, payload: unknown) => void;
  hasMeaningfulLocal?: (value: unknown) => boolean;
  parseRemote?: (payload: unknown) => unknown;
};

function readJson(storageKey: string, legacyKeys: string[] = []): unknown {
  const raw = readScopedLocalStorage(storageKey, legacyKeys);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(storageKey: string, payload: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function readString(storageKey: string): string {
  return readScopedLocalStorage(storageKey) ?? "";
}

function writeString(storageKey: string, payload: unknown): void {
  if (typeof window === "undefined") return;
  const text = typeof payload === "string" ? payload : "";
  try {
    window.localStorage.setItem(storageKey, text);
  } catch {
    /* quota */
  }
}

const HOME_SETUP = "lifenode.homenode.setup.v1";
const HOME_NOTES = "lifenode.homenode.notes.v1";
const HOME_SAVED_NOTES = "lifenode.homenode.saved-notes.v1";
const HOME_BUDGET = "lifenode.homenode.budget-rows.v1";
const HOME_CHORES = "lifenode.homenode.chore-rows.v1";
const HOME_PREP = "lifenode.homenode.activity-prep.v1";
const HOME_ENGAGEMENT = "lifenode.homenode.upcoming-engagement.v1";
const HOME_RECIPE = "lifenode.homenode.recipe-vault.v1";
const HOME_GROCERY = "lifenode.homenode.native-grocery.v1";
const HOME_KITCHEN_AI = "lifenode.homenode.kitchen-ai.v1";
const BIZ_ONBOARDING = "lifenode.biznode.master-sync.v3";
const BIZ_ONBOARDING_LEGACY = "lifenode.biznode.master-sync.v2";
const BIZ_DATA_HUB = "lifenode.biznode.data-hub.v1";
const VITAL_V3 = "lifenode.vitalnode.v3";
const VITAL_V2 = "lifenode.vitalnode.v2";
const WB_SCENE = "lifenode_excalidraw_global_v1";

function parseWhiteboardScene(payload: unknown): Record<string, unknown> | null {
  if (typeof payload === "string" && payload.trim()) {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (payload && typeof payload === "object") {
    if ("scene" in payload) {
      const scene = (payload as { scene?: unknown }).scene;
      if (typeof scene === "string" && scene.trim()) {
        try {
          return JSON.parse(scene) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
    return payload as Record<string, unknown>;
  }
  return null;
}

function hasMeaningfulWhiteboard(value: unknown): boolean {
  const scene = parseWhiteboardScene(value);
  if (!scene) return false;
  const elements = scene.elements;
  return Array.isArray(elements) && elements.length > 0;
}

export const WIDGET_LOCAL_STORAGE_BRIDGES: Partial<
  Record<NodeWidgetKey, WidgetBridge>
> = {
  [NODE_WIDGET_KEYS.home.setup]: {
    storageKey: (userId) => userScopedStorageKey(HOME_SETUP, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_SETUP, userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_SETUP, userId), payload),
  },
  [NODE_WIDGET_KEYS.home.notes]: {
    storageKey: (userId) => userScopedStorageKey(HOME_NOTES, userId),
    read: (userId) => readString(userScopedStorageKey(HOME_NOTES, userId)),
    write: (userId, payload) =>
      writeString(userScopedStorageKey(HOME_NOTES, userId), payload),
    hasMeaningfulLocal: (v) => typeof v === "string" && v.trim().length > 0,
  },
  [NODE_WIDGET_KEYS.home.savedNotes]: {
    storageKey: (userId) => userScopedStorageKey(HOME_SAVED_NOTES, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_SAVED_NOTES, userId)) ?? [],
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_SAVED_NOTES, userId), payload),
    hasMeaningfulLocal: (v) => Array.isArray(v) && v.length > 0,
  },
  [NODE_WIDGET_KEYS.home.budget]: {
    storageKey: (userId) => userScopedStorageKey(HOME_BUDGET, userId),
    read: (userId) => {
      const parsed = readJson(userScopedStorageKey(HOME_BUDGET, userId));
      if (Array.isArray(parsed)) {
        return { currency: "USD", monthlySalary: null, rows: parsed };
      }
      if (parsed && typeof parsed === "object") return parsed;
      return { currency: "USD", monthlySalary: null, rows: [] };
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_BUDGET, userId), payload),
    hasMeaningfulLocal: (v) => {
      if (!v || typeof v !== "object") return false;
      const rows = (v as { rows?: unknown }).rows;
      const salary = (v as { monthlySalary?: unknown }).monthlySalary;
      return (
        (Array.isArray(rows) && rows.length > 0) ||
        (salary != null && Number.isFinite(Number(salary)))
      );
    },
  },
  [NODE_WIDGET_KEYS.home.chores]: {
    storageKey: (userId) => userScopedStorageKey(HOME_CHORES, userId),
    read: (userId) => {
      const parsed = readJson(userScopedStorageKey(HOME_CHORES, userId));
      if (Array.isArray(parsed)) return { children: [], chores: parsed };
      if (parsed && typeof parsed === "object") return parsed;
      return { children: [], chores: [] };
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_CHORES, userId), payload),
    hasMeaningfulLocal: (v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (!v || typeof v !== "object") return false;
      const chores = (v as { chores?: unknown }).chores;
      const children = (v as { children?: unknown }).children;
      return (
        (Array.isArray(chores) && chores.length > 0) ||
        (Array.isArray(children) && children.length > 0)
      );
    },
  },
  [NODE_WIDGET_KEYS.home.activityPrep]: {
    storageKey: (userId) => userScopedStorageKey(HOME_PREP, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_PREP, userId)) ?? [],
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_PREP, userId), payload),
    hasMeaningfulLocal: (v) => Array.isArray(v) && v.length > 0,
  },
  [NODE_WIDGET_KEYS.home.engagement]: {
    storageKey: (userId) => userScopedStorageKey(HOME_ENGAGEMENT, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_ENGAGEMENT, userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_ENGAGEMENT, userId), payload),
  },
  [NODE_WIDGET_KEYS.home.recipeVault]: {
    storageKey: (userId) => userScopedStorageKey(HOME_RECIPE, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_RECIPE, userId)) ?? [],
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_RECIPE, userId), payload),
    hasMeaningfulLocal: (v) => Array.isArray(v) && v.length > 0,
  },
  [NODE_WIDGET_KEYS.home.nativeGrocery]: {
    storageKey: (userId) => userScopedStorageKey(HOME_GROCERY, userId),
    read: (userId) => {
      const parsed = readJson(userScopedStorageKey(HOME_GROCERY, userId));
      if (Array.isArray(parsed)) return { budget: null, items: parsed };
      if (parsed && typeof parsed === "object") return parsed;
      return { budget: null, items: [] };
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_GROCERY, userId), payload),
    hasMeaningfulLocal: (v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (!v || typeof v !== "object") return false;
      const items = (v as { items?: unknown }).items;
      const budget = (v as { budget?: unknown }).budget;
      return (
        (Array.isArray(items) && items.length > 0) ||
        (budget != null && Number.isFinite(Number(budget)))
      );
    },
  },
  [NODE_WIDGET_KEYS.home.kitchenAi]: {
    storageKey: (userId) => userScopedStorageKey(HOME_KITCHEN_AI, userId),
    read: (userId) => readJson(userScopedStorageKey(HOME_KITCHEN_AI, userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(HOME_KITCHEN_AI, userId), payload),
  },
  [NODE_WIDGET_KEYS.shell.kanban]: {
    storageKey: (userId) => userScopedStorageKey("lifenode.kanban.v1", userId),
    read: (userId) =>
      readJson(userScopedStorageKey("lifenode.kanban.v1", userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey("lifenode.kanban.v1", userId), payload),
  },
  [NODE_WIDGET_KEYS.shell.calendar]: {
    storageKey: (userId) => userScopedStorageKey("lifenode.calendar.v1", userId),
    read: (userId) =>
      readJson(userScopedStorageKey("lifenode.calendar.v1", userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey("lifenode.calendar.v1", userId), payload),
  },
  [NODE_WIDGET_KEYS.shell.whiteboard]: {
    storageKey: (userId) => userScopedStorageKey(WB_SCENE, userId),
    read: (userId) =>
      readJson(userScopedStorageKey(WB_SCENE, userId)) ?? {},
    write: (userId, payload) => {
      const scene = parseWhiteboardScene(payload);
      if (scene) writeJson(userScopedStorageKey(WB_SCENE, userId), scene);
    },
    hasMeaningfulLocal: hasMeaningfulWhiteboard,
    parseRemote: parseWhiteboardScene,
  },
  [NODE_WIDGET_KEYS.vital.dashboard]: {
    storageKey: (userId) => userScopedStorageKey(VITAL_V3, userId),
    read: (userId) => {
      const key = userScopedStorageKey(VITAL_V3, userId);
      return (
        readJson(key, [userScopedStorageKey(VITAL_V2, userId)]) ?? null
      );
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(VITAL_V3, userId), payload),
  },
  [NODE_WIDGET_KEYS.trader.settings]: {
    storageKey: (userId) =>
      userScopedStorageKey("lifenode.tradernode.v1", userId),
    read: (userId) =>
      readJson(userScopedStorageKey("lifenode.tradernode.v1", userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey("lifenode.tradernode.v1", userId), payload),
  },
  [NODE_WIDGET_KEYS.trader.journal]: {
    storageKey: (userId) =>
      userScopedStorageKey("lifenode.tradernode.journal.v1", userId),
    read: (userId) =>
      readJson(userScopedStorageKey("lifenode.tradernode.journal.v1", userId)) ??
      [],
    write: (userId, payload) =>
      writeJson(
        userScopedStorageKey("lifenode.tradernode.journal.v1", userId),
        payload,
      ),
    hasMeaningfulLocal: (v) => Array.isArray(v) && v.length > 0,
  },
  [NODE_WIDGET_KEYS.pro.billableSessions]: {
    storageKey: (userId) =>
      userScopedStorageKey("lifenode.pronode.billable-sessions.v1", userId),
    read: (userId) =>
      readJson(
        userScopedStorageKey("lifenode.pronode.billable-sessions.v1", userId),
      ) ?? [],
    write: (userId, payload) =>
      writeJson(
        userScopedStorageKey("lifenode.pronode.billable-sessions.v1", userId),
        payload,
      ),
    hasMeaningfulLocal: (v) => Array.isArray(v) && v.length > 0,
  },
  [NODE_WIDGET_KEYS.vanode.dashboard]: {
    storageKey: (userId) => userScopedStorageKey(VANODE_STORAGE_KEY, userId),
    read: (userId) => readJson(userScopedStorageKey(VANODE_STORAGE_KEY, userId)),
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(VANODE_STORAGE_KEY, userId), payload),
  },
  [NODE_WIDGET_KEYS.vanode.screenCaptures]: {
    storageKey: (userId) =>
      userScopedStorageKey("lifenode.vanode.screen-captures.v1", userId),
    read: (userId) =>
      readJson(
        userScopedStorageKey("lifenode.vanode.screen-captures.v1", userId),
      ),
    write: (userId, payload) =>
      writeJson(
        userScopedStorageKey("lifenode.vanode.screen-captures.v1", userId),
        payload,
      ),
  },
  [NODE_WIDGET_KEYS.biz.onboardingSync]: {
    storageKey: (userId) => userScopedStorageKey(BIZ_ONBOARDING, userId),
    read: (userId) => {
      const scoped = userScopedStorageKey(BIZ_ONBOARDING, userId);
      const legacyScoped = userScopedStorageKey(BIZ_ONBOARDING_LEGACY, userId);
      return (
        readJson(scoped, [legacyScoped, BIZ_ONBOARDING, BIZ_ONBOARDING_LEGACY]) ??
        null
      );
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(BIZ_ONBOARDING, userId), payload),
    hasMeaningfulLocal: (v) => {
      if (!v || typeof v !== "object") return false;
      const apps = (v as { selectedApps?: unknown }).selectedApps;
      return Array.isArray(apps) && apps.length > 0;
    },
  },
  [NODE_WIDGET_KEYS.biz.dataHub]: {
    storageKey: (userId) => userScopedStorageKey(BIZ_DATA_HUB, userId),
    read: (userId) => {
      const scoped = userScopedStorageKey(BIZ_DATA_HUB, userId);
      const parsed =
        readJson(scoped, [BIZ_DATA_HUB]) ??
        readJson(BIZ_DATA_HUB);
      if (!parsed || typeof parsed !== "object") return null;
      const primary = (parsed as { primary?: unknown }).primary;
      return typeof primary === "string" ? { primary } : null;
    },
    write: (userId, payload) =>
      writeJson(userScopedStorageKey(BIZ_DATA_HUB, userId), payload),
    hasMeaningfulLocal: (v) => {
      if (!v || typeof v !== "object") return false;
      return typeof (v as { primary?: unknown }).primary === "string";
    },
  },
  [NODE_WIDGET_KEYS.biz.founderNotes]: {
    storageKey: () => "",
    read: () => null,
    write: () => {},
    hasMeaningfulLocal: () => false,
  },
};

export function readBridgedWidgetLocal(
  userId: string,
  widgetKey: NodeWidgetKey,
): unknown {
  const bridge = WIDGET_LOCAL_STORAGE_BRIDGES[widgetKey];
  if (!bridge) return null;
  return bridge.read(userId);
}

export function writeBridgedWidgetLocal(
  userId: string,
  widgetKey: NodeWidgetKey,
  payload: unknown,
): void {
  const bridge = WIDGET_LOCAL_STORAGE_BRIDGES[widgetKey];
  if (!bridge || !payloadHasData(payload)) return;
  bridge.write(userId, payload);
}
