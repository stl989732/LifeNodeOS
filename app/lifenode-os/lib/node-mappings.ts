/**
 * Pure constants + types for nodes. Safe to import from both client and
 * server modules — has zero Node-only dependencies (no fs, no auth).
 *
 * `lib/user-state-store.ts` re-exports the type aliases for convenience but
 * is server-only because it touches `fs/promises`.
 */

export type ShellHatKey =
  | "work"
  | "home"
  | "vital"
  | "trader"
  | "va"
  | "pro";

export const SHELL_HAT_KEYS: ShellHatKey[] = [
  "work",
  "home",
  "vital",
  "trader",
  "va",
  "pro",
];

export type ActiveNodeName =
  | "BizNode"
  | "HomeNode"
  | "VitalNode"
  | "TraderNode"
  | "VANode"
  | "ProNode";

export const ACTIVE_NODE_NAMES: ActiveNodeName[] = [
  "BizNode",
  "HomeNode",
  "VitalNode",
  "TraderNode",
  "VANode",
  "ProNode",
];

export const HAT_KEY_TO_ACTIVE: Record<ShellHatKey, ActiveNodeName> = {
  work: "BizNode",
  home: "HomeNode",
  vital: "VitalNode",
  trader: "TraderNode",
  va: "VANode",
  pro: "ProNode",
};

export const ACTIVE_TO_HAT_KEY: Record<ActiveNodeName, ShellHatKey> = {
  BizNode: "work",
  HomeNode: "home",
  VitalNode: "vital",
  TraderNode: "trader",
  VANode: "va",
  ProNode: "pro",
};

export const NODE_ROUTE: Record<ActiveNodeName, string> = {
  BizNode: "/work",
  HomeNode: "/home",
  VitalNode: "/vital",
  TraderNode: "/trader",
  VANode: "/vanode",
  ProNode: "/pro",
};

export const NODE_LABEL: Record<ActiveNodeName, string> = {
  BizNode: "BizNode",
  HomeNode: "HomeNode",
  VitalNode: "VitalNode",
  TraderNode: "TraderNode",
  VANode: "VANode",
  ProNode: "ProNode",
};

export type NodeOnboardingStep = "stack-sync" | "kpi-setup" | "first-workflow";

/** Active onboarding flow — stack-sync removed (tools connect inside each node). */
export const NODE_ONBOARDING_STEPS: NodeOnboardingStep[] = [
  "kpi-setup",
  "first-workflow",
];

export const NODE_ONBOARDING_STEP_LABEL: Record<NodeOnboardingStep, string> = {
  "stack-sync": "Stack Sync",
  "kpi-setup": "KPI Setup",
  "first-workflow": "First Workflow",
};

export function isShellHatKey(value: unknown): value is ShellHatKey {
  return typeof value === "string" && (SHELL_HAT_KEYS as string[]).includes(value);
}

export function isActiveNodeName(value: unknown): value is ActiveNodeName {
  return (
    typeof value === "string" && (ACTIVE_NODE_NAMES as string[]).includes(value)
  );
}

export function isNodeOnboardingStep(
  value: unknown
): value is NodeOnboardingStep {
  return (
    typeof value === "string" &&
    (NODE_ONBOARDING_STEPS as string[]).includes(value)
  );
}
