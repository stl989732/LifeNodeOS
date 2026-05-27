/** Global flare / recovery protocol — VitalNode triggers, other nodes react. */

export const FLARE_MODE_STORAGE_KEY = "lifenode.flare-mode.v1";
export const FLARE_MODE_CHANGED = "lifenode-flare-mode-changed";

export type FlareModeState = {
  active: boolean;
  activatedAt: string | null;
  triggerNote: string | null;
  /** Filled when user deactivates and answers post-recovery prompt */
  lastRecoveryInsight: string | null;
};

const DEFAULT: FlareModeState = {
  active: false,
  activatedAt: null,
  triggerNote: null,
  lastRecoveryInsight: null,
};

export function readFlareMode(): FlareModeState {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(FLARE_MODE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<FlareModeState>;
    return {
      active: Boolean(p.active),
      activatedAt: typeof p.activatedAt === "string" ? p.activatedAt : null,
      triggerNote: typeof p.triggerNote === "string" ? p.triggerNote : null,
      lastRecoveryInsight:
        typeof p.lastRecoveryInsight === "string" ? p.lastRecoveryInsight : null,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeFlareMode(next: FlareModeState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FLARE_MODE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(FLARE_MODE_CHANGED));
}

export function activateFlareMode(note?: string) {
  writeFlareMode({
    active: true,
    activatedAt: new Date().toISOString(),
    triggerNote: note?.trim() || null,
    lastRecoveryInsight: readFlareMode().lastRecoveryInsight,
  });
}

export function deactivateFlareMode(recoveryInsight?: string) {
  const prev = readFlareMode();
  writeFlareMode({
    active: false,
    activatedAt: null,
    triggerNote: null,
    lastRecoveryInsight: recoveryInsight?.trim() || prev.lastRecoveryInsight,
  });
}

/** High-priority Biz/Work tasks flagged during flare — stored for reschedule badges */
export const FLARE_TASK_FLAGS_KEY = "lifenode.flare-task-flags.v1";

export type FlareTaskFlag = { id: string; title: string; flaggedAt: string };

export function readFlareTaskFlags(): FlareTaskFlag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FLARE_TASK_FLAGS_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export function seedFlareTaskFlags(titles: string[]) {
  if (typeof window === "undefined") return;
  const flags: FlareTaskFlag[] = titles.slice(0, 8).map((title) => ({
    id: crypto.randomUUID(),
    title,
    flaggedAt: new Date().toISOString(),
  }));
  window.localStorage.setItem(FLARE_TASK_FLAGS_KEY, JSON.stringify(flags));
  window.dispatchEvent(new Event(FLARE_MODE_CHANGED));
}

export function clearFlareTaskFlags() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FLARE_TASK_FLAGS_KEY);
  window.dispatchEvent(new Event(FLARE_MODE_CHANGED));
}
