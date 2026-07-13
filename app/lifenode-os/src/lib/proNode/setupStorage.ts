import {
  NODE_WIDGET_KEYS,
  scheduleNodeWidgetSave,
} from "@/src/lib/nodeWidgetSync";

export type ProNativeToolkit = {
  sidecar: boolean;
  pulse: boolean;
  triage: boolean;
};

export type ProSetupState = {
  setupDone: boolean;
  nativeToolkit: ProNativeToolkit;
};

export const PRO_SETUP_STORAGE_KEY = "lifenode.pronode.setup.v1";

export const DEFAULT_PRO_NATIVE_TOOLKIT: ProNativeToolkit = {
  sidecar: true,
  pulse: true,
  triage: true,
};

export function defaultProSetupState(): ProSetupState {
  return {
    setupDone: false,
    nativeToolkit: { ...DEFAULT_PRO_NATIVE_TOOLKIT },
  };
}

function normalizeToolkit(value: unknown): ProNativeToolkit {
  const base = DEFAULT_PRO_NATIVE_TOOLKIT;
  if (!value || typeof value !== "object") return { ...base };
  const o = value as Record<string, unknown>;
  return {
    sidecar: typeof o.sidecar === "boolean" ? o.sidecar : base.sidecar,
    pulse: typeof o.pulse === "boolean" ? o.pulse : base.pulse,
    triage: typeof o.triage === "boolean" ? o.triage : base.triage,
  };
}

export function parseProSetupPayload(payload: unknown): ProSetupState {
  if (!payload || typeof payload !== "object") return defaultProSetupState();
  const o = payload as Record<string, unknown>;
  return {
    setupDone: o.setupDone === true,
    nativeToolkit: normalizeToolkit(o.nativeToolkit),
  };
}

export function loadProSetupFromLocal(storageKey: string): ProSetupState {
  if (typeof window === "undefined") return defaultProSetupState();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultProSetupState();
    return parseProSetupPayload(JSON.parse(raw));
  } catch {
    return defaultProSetupState();
  }
}

export function persistProSetup(storageKey: string, state: ProSetupState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.pro.setup, state);
  } catch {
    /* quota */
  }
}
