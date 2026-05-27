import fs from "fs/promises";
import path from "path";
import {
  ACTIVE_NODE_NAMES,
  NODE_ONBOARDING_STEPS,
  SHELL_HAT_KEYS,
  isActiveNodeName,
  isNodeOnboardingStep,
  isShellHatKey,
  type ActiveNodeName,
  type NodeOnboardingStep,
  type ShellHatKey,
} from "./node-mappings";

/**
 * Per-user persistent state for the LifeNode OS shell.
 *
 * Storage model: one JSON file per user at `data/user-state/<userId>.json`.
 * Mirrors the file-based pattern from `lib/auth-users-store.ts` so we stay
 * Prisma-free until/unless we move to a real DB.
 *
 * The shape below maps cleanly onto a future Prisma schema:
 *   model UserState        { ...userId, displayName, ... }
 *   model UserNodeStatus   { userId, nodeType, onboardingCompleted, completedSteps[], completedAt }
 *   model Workflow         { userId, id, ... }
 *   model Notification     { userId, id, ... }
 *   model Project          { userId, id, name, status, progressPercent, pendingApprovals }
 *
 * Pure constants (node names, hat keys, route maps, type guards) live in
 * `./node-mappings` so client components can import them without dragging
 * `fs/promises` into the browser bundle.
 */

export {
  ACTIVE_NODE_NAMES,
  NODE_ONBOARDING_STEPS,
  SHELL_HAT_KEYS,
  type ActiveNodeName,
  type NodeOnboardingStep,
  type ShellHatKey,
};

export type UserNodeStatus = {
  nodeType: ActiveNodeName;
  onboardingCompleted: boolean;
  completedSteps: NodeOnboardingStep[];
  completedAt: string | null;
  updatedAt: string;
};

/**
 * Saved workflow definition. Workflows are user-authored automations that
 * tie a triggering node to one or more downstream actions (Logic Bridges).
 */
export type WorkflowDefinition = {
  id: string;
  name: string;
  triggerNode: ActiveNodeName;
  triggerCondition: string;
  actionNode: ActiveNodeName;
  actionLabel: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Notifications log — out-of-scope Lino alerts (i.e. alerts whose target
 * node isn't the user's currently-worn hat) get pushed here instead of
 * popping up. Bounded length to prevent unbounded growth on disk.
 */
export const NOTIFICATIONS_MAX_LENGTH = 200;

export type StoredNotification = {
  id: string;
  bridgeId: string;
  triggerSource: string;
  message: string;
  targetNode: ActiveNodeName | null;
  primaryActionLabel: string | null;
  createdAt: string;
  read: boolean;
};

/**
 * Project = a unit of cross-node work the operator is tracking. Used by the
 * contextual `/dashboard` to render a "Construction Pulse" header. The label
 * is intentionally generic — works for construction, agency clients, courses,
 * trades-in-flight, etc.
 */
export type ProjectStatus = "planning" | "in-progress" | "blocked" | "complete";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  progressPercent: number;
  pendingApprovals: number;
  updatedAt: string;
};

export type UserState = {
  userId: string;
  displayName: string | null;
  configuredHats: ShellHatKey[];
  lastActiveNode: ActiveNodeName | null;
  workflows: WorkflowDefinition[];
  nodeOnboarding: Partial<Record<ActiveNodeName, UserNodeStatus>>;
  notifications: StoredNotification[];
  projects: Project[];
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "user-state");

const isOnboardingStep = isNodeOnboardingStep;

function sanitizeUserId(userId: string): string {
  // Defense in depth: prevent path traversal even though IDs come from JWT `sub`.
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function userFilePath(userId: string): string {
  return path.join(DATA_DIR, `${sanitizeUserId(userId)}.json`);
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultNodeStatus(nodeType: ActiveNodeName): UserNodeStatus {
  return {
    nodeType,
    onboardingCompleted: false,
    completedSteps: [],
    completedAt: null,
    updatedAt: nowIso(),
  };
}

function defaultState(userId: string): UserState {
  const now = nowIso();
  return {
    userId,
    displayName: null,
    configuredHats: [],
    lastActiveNode: null,
    workflows: [],
    nodeOnboarding: {},
    notifications: [],
    projects: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function normalizeNodeOnboarding(
  raw: unknown
): Partial<Record<ActiveNodeName, UserNodeStatus>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<ActiveNodeName, UserNodeStatus>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isActiveNodeName(key)) continue;
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const completedSteps = Array.isArray(v.completedSteps)
      ? (v.completedSteps.filter(isOnboardingStep) as NodeOnboardingStep[])
      : [];
    out[key] = {
      nodeType: key,
      onboardingCompleted: Boolean(v.onboardingCompleted),
      completedSteps,
      completedAt:
        typeof v.completedAt === "string" ? v.completedAt : null,
      updatedAt:
        typeof v.updatedAt === "string" ? v.updatedAt : nowIso(),
    };
  }
  return out;
}

function normalizeNotifications(raw: unknown): StoredNotification[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (n): n is StoredNotification =>
        Boolean(n) &&
        typeof n === "object" &&
        typeof (n as Record<string, unknown>).id === "string"
    )
    .map((n) => ({
      id: String(n.id),
      bridgeId: typeof n.bridgeId === "string" ? n.bridgeId : "",
      triggerSource:
        typeof n.triggerSource === "string" ? n.triggerSource : "",
      message: typeof n.message === "string" ? n.message : "",
      targetNode: isActiveNodeName(n.targetNode) ? n.targetNode : null,
      primaryActionLabel:
        typeof n.primaryActionLabel === "string"
          ? n.primaryActionLabel
          : null,
      createdAt: typeof n.createdAt === "string" ? n.createdAt : nowIso(),
      read: Boolean(n.read),
    }))
    .slice(-NOTIFICATIONS_MAX_LENGTH);
}

function normalizeProjects(raw: unknown): Project[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<ProjectStatus>([
    "planning",
    "in-progress",
    "blocked",
    "complete",
  ]);
  return raw
    .filter(
      (p): p is Project =>
        Boolean(p) &&
        typeof p === "object" &&
        typeof (p as Record<string, unknown>).id === "string" &&
        typeof (p as Record<string, unknown>).name === "string"
    )
    .map((p) => ({
      id: String(p.id),
      name: String(p.name),
      status: allowed.has(p.status as ProjectStatus)
        ? (p.status as ProjectStatus)
        : "planning",
      progressPercent: Math.max(
        0,
        Math.min(100, Number(p.progressPercent ?? 0))
      ),
      pendingApprovals: Math.max(0, Math.floor(Number(p.pendingApprovals ?? 0))),
      updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : nowIso(),
    }));
}

function normalizeState(raw: unknown, userId: string): UserState {
  const base = defaultState(userId);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const hats = Array.isArray(obj.configuredHats)
    ? (obj.configuredHats.filter(isShellHatKey) as ShellHatKey[])
    : base.configuredHats;
  const lastActive = isActiveNodeName(obj.lastActiveNode)
    ? obj.lastActiveNode
    : base.lastActiveNode;
  const workflows = Array.isArray(obj.workflows)
    ? (obj.workflows as WorkflowDefinition[]).filter(
        (w) =>
          w &&
          typeof w === "object" &&
          typeof w.id === "string" &&
          typeof w.name === "string"
      )
    : base.workflows;
  return {
    userId,
    displayName:
      typeof obj.displayName === "string" ? obj.displayName : base.displayName,
    configuredHats: hats,
    lastActiveNode: lastActive,
    workflows,
    nodeOnboarding: normalizeNodeOnboarding(obj.nodeOnboarding),
    notifications: normalizeNotifications(obj.notifications),
    projects: normalizeProjects(obj.projects),
    createdAt:
      typeof obj.createdAt === "string" ? obj.createdAt : base.createdAt,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : base.updatedAt,
  };
}

const USER_STATE_CACHE_MS = 30_000;
const userStateCache = new Map<
  string,
  { state: UserState; expiresAt: number }
>();

export async function getUserState(userId: string): Promise<UserState> {
  if (!userId) throw new Error("MISSING_USER_ID");

  const cached = userStateCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.state;
  }

  await ensureDir();
  const filePath = userFilePath(userId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const state = normalizeState(JSON.parse(raw), userId);
    userStateCache.set(userId, {
      state,
      expiresAt: Date.now() + USER_STATE_CACHE_MS,
    });
    return state;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      const state = defaultState(userId);
      userStateCache.set(userId, {
        state,
        expiresAt: Date.now() + USER_STATE_CACHE_MS,
      });
      return state;
    }
    const state = defaultState(userId);
    userStateCache.set(userId, {
      state,
      expiresAt: Date.now() + USER_STATE_CACHE_MS,
    });
    return state;
  }
}

async function writeUserState(state: UserState): Promise<void> {
  await ensureDir();
  const filePath = userFilePath(state.userId);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
  userStateCache.set(state.userId, {
    state,
    expiresAt: Date.now() + USER_STATE_CACHE_MS,
  });
}

export type UserStatePatch = {
  displayName?: string | null;
  configuredHats?: ShellHatKey[];
  lastActiveNode?: ActiveNodeName | null;
};

export async function patchUserState(
  userId: string,
  patch: UserStatePatch
): Promise<UserState> {
  const current = await getUserState(userId);
  const next: UserState = {
    ...current,
    ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
    ...(patch.configuredHats !== undefined
      ? { configuredHats: patch.configuredHats.filter(isShellHatKey) }
      : {}),
    ...(patch.lastActiveNode !== undefined
      ? { lastActiveNode: patch.lastActiveNode }
      : {}),
    updatedAt: nowIso(),
  };
  await writeUserState(next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflows
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowInput = {
  name: string;
  triggerNode: ActiveNodeName;
  triggerCondition: string;
  actionNode: ActiveNodeName;
  actionLabel: string;
  enabled?: boolean;
};

export async function addWorkflow(
  userId: string,
  input: WorkflowInput
): Promise<WorkflowDefinition> {
  const current = await getUserState(userId);
  const now = nowIso();
  const wf: WorkflowDefinition = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    triggerNode: input.triggerNode,
    triggerCondition: input.triggerCondition.trim(),
    actionNode: input.actionNode,
    actionLabel: input.actionLabel.trim(),
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  const next: UserState = {
    ...current,
    workflows: [...current.workflows, wf],
    updatedAt: now,
  };
  await writeUserState(next);
  return wf;
}

export async function deleteWorkflow(
  userId: string,
  workflowId: string
): Promise<UserState> {
  const current = await getUserState(userId);
  const next: UserState = {
    ...current,
    workflows: current.workflows.filter((w) => w.id !== workflowId),
    updatedAt: nowIso(),
  };
  await writeUserState(next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Node onboarding
// ─────────────────────────────────────────────────────────────────────────────

export async function getNodeOnboarding(
  userId: string,
  node: ActiveNodeName
): Promise<UserNodeStatus> {
  const state = await getUserState(userId);
  return state.nodeOnboarding[node] ?? defaultNodeStatus(node);
}

export async function getAllNodeOnboarding(
  userId: string
): Promise<Record<ActiveNodeName, UserNodeStatus>> {
  const state = await getUserState(userId);
  const out = {} as Record<ActiveNodeName, UserNodeStatus>;
  for (const node of ACTIVE_NODE_NAMES) {
    out[node] = state.nodeOnboarding[node] ?? defaultNodeStatus(node);
  }
  return out;
}

export type NodeOnboardingPatch = {
  step?: NodeOnboardingStep;
  completed?: boolean;
  reset?: boolean;
};

export async function patchNodeOnboarding(
  userId: string,
  node: ActiveNodeName,
  patch: NodeOnboardingPatch
): Promise<UserNodeStatus> {
  const current = await getUserState(userId);
  const existing =
    current.nodeOnboarding[node] ?? defaultNodeStatus(node);
  const now = nowIso();

  let completedSteps = existing.completedSteps;
  let onboardingCompleted = existing.onboardingCompleted;
  let completedAt = existing.completedAt;

  if (patch.reset) {
    completedSteps = [];
    onboardingCompleted = false;
    completedAt = null;
  }

  if (patch.step && !completedSteps.includes(patch.step)) {
    completedSteps = [...completedSteps, patch.step];
  }

  if (patch.completed) {
    onboardingCompleted = true;
    completedAt = now;
    // Completing implies all steps were touched at least once.
    for (const s of NODE_ONBOARDING_STEPS) {
      if (!completedSteps.includes(s)) completedSteps = [...completedSteps, s];
    }
  } else if (patch.completed === false) {
    onboardingCompleted = false;
    completedAt = null;
  }

  const nextStatus: UserNodeStatus = {
    nodeType: node,
    onboardingCompleted,
    completedSteps,
    completedAt,
    updatedAt: now,
  };

  const next: UserState = {
    ...current,
    nodeOnboarding: { ...current.nodeOnboarding, [node]: nextStatus },
    updatedAt: now,
  };
  await writeUserState(next);
  return nextStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationInput = {
  bridgeId: string;
  triggerSource: string;
  message: string;
  targetNode: ActiveNodeName | null;
  primaryActionLabel: string | null;
};

export async function getNotifications(
  userId: string
): Promise<StoredNotification[]> {
  const state = await getUserState(userId);
  return state.notifications;
}

export async function appendNotification(
  userId: string,
  input: NotificationInput
): Promise<StoredNotification> {
  const current = await getUserState(userId);
  const now = nowIso();
  const notif: StoredNotification = {
    id: crypto.randomUUID(),
    bridgeId: input.bridgeId,
    triggerSource: input.triggerSource,
    message: input.message,
    targetNode: input.targetNode,
    primaryActionLabel: input.primaryActionLabel,
    createdAt: now,
    read: false,
  };
  // Dedupe within the trailing window — the client may dispatch the same
  // bridge multiple times before it dismisses; we only want one log entry.
  const tail = current.notifications.slice(-12);
  const isDuplicate = tail.some(
    (n) => n.bridgeId === notif.bridgeId && !n.read
  );
  const nextNotifications = isDuplicate
    ? current.notifications
    : [...current.notifications, notif].slice(-NOTIFICATIONS_MAX_LENGTH);

  const next: UserState = {
    ...current,
    notifications: nextNotifications,
    updatedAt: now,
  };
  await writeUserState(next);
  return notif;
}

export async function markNotificationRead(
  userId: string,
  id: string
): Promise<StoredNotification[]> {
  const current = await getUserState(userId);
  const nextNotifications = current.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  const next: UserState = {
    ...current,
    notifications: nextNotifications,
    updatedAt: nowIso(),
  };
  await writeUserState(next);
  return nextNotifications;
}

export async function clearNotifications(
  userId: string
): Promise<StoredNotification[]> {
  const current = await getUserState(userId);
  const next: UserState = {
    ...current,
    notifications: [],
    updatedAt: nowIso(),
  };
  await writeUserState(next);
  return next.notifications;
}
