const STORAGE_KEY = "lifenode.biznode.master-sync.v3";
const LEGACY_KEYS = ["lifenode.biznode.master-sync.v2"];

export type OnboardingSyncDraft = {
  selectedNode?: string;
  selectedApps: string[];
  deferredApps: string[];
  selectedFocusAreas: string[];
  primaryDataTool: string | null;
  syncStep: number;
};

const EMPTY: OnboardingSyncDraft = {
  selectedApps: [],
  deferredApps: [],
  selectedFocusAreas: [],
  primaryDataTool: null,
  syncStep: 2,
};

export function readOnboardingSyncDraft(): OnboardingSyncDraft | null {
  if (typeof window === "undefined") return null;
  const keys = [STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<OnboardingSyncDraft>;
      return {
        selectedApps: Array.isArray(parsed.selectedApps) ? parsed.selectedApps : [],
        deferredApps: Array.isArray(parsed.deferredApps) ? parsed.deferredApps : [],
        selectedFocusAreas: Array.isArray(parsed.selectedFocusAreas)
          ? parsed.selectedFocusAreas
          : [],
        primaryDataTool:
          typeof parsed.primaryDataTool === "string" ? parsed.primaryDataTool : null,
        syncStep:
          typeof parsed.syncStep === "number" && parsed.syncStep >= 2 && parsed.syncStep <= 3
            ? parsed.syncStep
            : 2,
        selectedNode: parsed.selectedNode,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export function writeOnboardingSyncDraft(draft: OnboardingSyncDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearOnboardingSyncDraft(): void {
  if (typeof window === "undefined") return;
  for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
    window.localStorage.removeItem(key);
  }
}

export { STORAGE_KEY as ONBOARDING_SYNC_STORAGE_KEY, EMPTY as EMPTY_ONBOARDING_DRAFT };
