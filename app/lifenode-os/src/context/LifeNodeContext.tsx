"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";
import {
  hydrateConfiguredHatKeys,
  notifyConfiguredHatsUpdated,
  savePendingShellHats,
} from "@/lib/sync-configured-hats";
import type { ShellHatKey } from "@/lib/node-mappings";
import type { ProRoleId } from "@/src/lib/proNode/types";
import {
  readProWorkspaceRole,
  writeProWorkspaceRole,
} from "@/src/lib/proNode/workspaceContext";
import { LifeNodeSettingsEffects } from "@/src/hooks/useLifeNodeSettings";

/** Canonical node identifiers — LifeNode OS “brain” keys. */
export type ActiveNode =
  | "BizNode"
  | "HomeNode"
  | "VANode"
  | "VitalNode"
  | "ProNode"
  | "TraderNode";

export type LifeNodeTheme =
  | "deep-onyx"
  | "studio-gray"
  | "mint-cream"
  | "grainy-dawn";

export type LinoMessage = {
  text: string;
  type: string;
  actionLabel: string;
  targetNode: string;
};

export type VitalStats = {
  heartRate: number;
  stressLevel: number;
  /** Minutes of deep focus while ProNode is active (synced from focus timer). */
  focusTime: number;
};

export type NodePulse = {
  summary: string;
  alerts: string[];
};

export type PulseData = {
  BizNode: NodePulse;
  HomeNode: NodePulse;
  VitalNode: NodePulse;
  TraderNode: NodePulse;
  VANode: NodePulse;
  ProNode: NodePulse;
};

/** Simulated signals feeding Logic Bridges (APIs, wearables, timers). */
export type BridgeSignals = {
  traderDailyPnlPercent: number;
  traderStopLossThresholdPercent: number;
  vaHighPriorityPingCount: number;
  vitalSleepScore: number;
  proWorkloadScore: number;
  bizUnreadLeadCount: number;
  bizLastFollowUpMinutesAgo: number;
  homeCalendarHasConflict: boolean;
  homeNextEventMinutesUntil: number;
  proFocusSecondsWhileOnPro: number;
  homeFridgeMilkLow: boolean;
  homeUserNearStore: boolean;
  /** Calendar & Task Management — next timed item today (minutes); 999 = none. */
  calendarNextCommitmentMinutes: number;
  calendarOverdueCount: number;
  calendarTodayCount: number;
  calendarHasCommitments: boolean;
  /** LifePulse trackers with due dates. */
  lifePulseOverdueCount: number;
  lifePulseDueTodayCount: number;
  lifePulseHasCommitments: boolean;
};

export type LogicBridgeActionKind =
  | "assemble_navigate"
  | "enable_deep_work"
  | "navigate_route";

export type LogicBridgeAlert = {
  bridgeId: string;
  triggerSource: string;
  condition: string;
  message: string;
  targetNode?: ActiveNode;
  /** When set, primary action navigates here (Calendar, LifePulse, etc.). */
  primaryRoute?: string;
  primaryActionLabel: string;
  actionKind: LogicBridgeActionKind;
};

export const NODE_ROUTE: Record<ActiveNode, string> = {
  BizNode: "/work",
  HomeNode: "/home",
  VitalNode: "/vital",
  TraderNode: "/trader",
  VANode: "/vanode",
  ProNode: "/pro",
};

const NODE_LABEL: Record<ActiveNode, string> = {
  BizNode: "BizNode",
  HomeNode: "HomeNode",
  VitalNode: "VitalNode",
  TraderNode: "TraderNode",
  VANode: "VANode",
  ProNode: "ProNode",
};

/** Visual shell: deep focus vs softer operational surfaces. */
export const ACTIVE_NODE_THEME: Record<ActiveNode, LifeNodeTheme> = {
  BizNode: "deep-onyx",
  ProNode: "deep-onyx",
  TraderNode: "deep-onyx",
  HomeNode: "mint-cream",
  VANode: "studio-gray",
  VitalNode: "studio-gray",
};

const DEFAULT_BRIDGE_SIGNALS: BridgeSignals = {
  traderDailyPnlPercent: 0,
  traderStopLossThresholdPercent: -2,
  vaHighPriorityPingCount: 0,
  vitalSleepScore: 0,
  proWorkloadScore: 0,
  bizUnreadLeadCount: 0,
  bizLastFollowUpMinutesAgo: 0,
  homeCalendarHasConflict: false,
  homeNextEventMinutesUntil: 999,
  proFocusSecondsWhileOnPro: 0,
  homeFridgeMilkLow: false,
  homeUserNearStore: false,
  calendarNextCommitmentMinutes: 999,
  calendarOverdueCount: 0,
  calendarTodayCount: 0,
  calendarHasCommitments: false,
  lifePulseOverdueCount: 0,
  lifePulseDueTodayCount: 0,
  lifePulseHasCommitments: false,
};

const EMPTY_NODE_PULSE: NodePulse = { summary: "", alerts: [] };

const EMPTY_PULSE_DATA: PulseData = {
  BizNode: { ...EMPTY_NODE_PULSE },
  HomeNode: { ...EMPTY_NODE_PULSE },
  VitalNode: { ...EMPTY_NODE_PULSE },
  TraderNode: { ...EMPTY_NODE_PULSE },
  VANode: { ...EMPTY_NODE_PULSE },
  ProNode: { ...EMPTY_NODE_PULSE },
};

function mergeAlertLists(...lists: LogicBridgeAlert[][]): LogicBridgeAlert[] {
  const seen = new Set<string>();
  const out: LogicBridgeAlert[] = [];
  for (const list of lists) {
    for (const a of list) {
      if (!seen.has(a.bridgeId)) {
        seen.add(a.bridgeId);
        out.push(a);
      }
    }
  }
  return out;
}

function linoTypeFromBridgeId(bridgeId: string): string {
  if (bridgeId === "pro-cognitive-break") return "cognitive_break";
  if (bridgeId === "biz-va-lead-bottleneck") return "va_bottleneck";
  if (bridgeId === "transition-guard-6pm") return "transition_guard";
  if (bridgeId === "home-pro-transition-warning") return "calendar_handoff";
  return "logic_bridge";
}

function bridgeToLinoMessage(alert: LogicBridgeAlert): LinoMessage {
  return {
    text: alert.message,
    type: linoTypeFromBridgeId(alert.bridgeId),
    actionLabel: alert.primaryActionLabel,
    targetNode: alert.targetNode ?? "",
  };
}

/**
 * Global alerts (Master Architecture).
 * - Cross-hat bridges (Biz→VA, Home→Pro heads-up): only when the shell session has **more than one** hat.
 * - **Transition Guard (6 PM)**: always evaluated so single-hat operators still get the work→home nudge.
 */
export function checkGlobalTriggers(ctx: {
  signals: BridgeSignals;
  activeNode: ActiveNode;
  configuredHats: ActiveNode[];
  now: Date;
}): LogicBridgeAlert[] {
  const alerts: LogicBridgeAlert[] = [];
  const crossHatAutomation = ctx.configuredHats.length !== 1;

  if (crossHatAutomation && ctx.signals.bizUnreadLeadCount > 5) {
    alerts.push({
      bridgeId: "biz-va-lead-bottleneck",
      triggerSource: "BizNode → VANode",
      condition: "Active leads > 5 (VA bottleneck risk)",
      message:
        "Your lead queue is backing up. VANode can run triage, proof-of-work, and client comms—open it to clear the bottleneck?",
      targetNode: "VANode",
      primaryActionLabel: "Open VANode",
      actionKind: "assemble_navigate",
    });
  }

  if (
    crossHatAutomation &&
    ctx.signals.homeNextEventMinutesUntil > 0 &&
    ctx.signals.homeNextEventMinutesUntil <= 15
  ) {
    alerts.push({
      bridgeId: "home-pro-transition-warning",
      triggerSource: "HomeNode → ProNode",
      condition: "Calendar event starting within 15 minutes",
      message:
        "A calendar block is starting soon. Switch to ProNode to land your focus before the hard start.",
      targetNode: "ProNode",
      primaryActionLabel: "Switch to ProNode",
      actionKind: "assemble_navigate",
    });
  }

  const h = ctx.now.getHours();
  /** Local 6:00–6:59 PM window (avoids missing the guard when the timer isn’t aligned to :00). */
  if (
    (ctx.activeNode === "BizNode" || ctx.activeNode === "ProNode") &&
    h === 18
  ) {
    alerts.push({
      bridgeId: "transition-guard-6pm",
      triggerSource: "Transition Guard",
      condition: "6:00 PM hour while still in BizNode / ProNode",
      message:
        "It’s 6:00 PM. Park open tasks and switch to HomeNode for recovery and family context?",
      targetNode: "HomeNode",
      primaryActionLabel: "Park & go HomeNode",
      actionKind: "assemble_navigate",
    });
  }

  return alerts;
}

function evaluateLogicBridges(signals: BridgeSignals): LogicBridgeAlert[] {
  const alerts: LogicBridgeAlert[] = [];

  const traderBreached =
    signals.traderDailyPnlPercent <= signals.traderStopLossThresholdPercent;
  if (traderBreached) {
    alerts.push({
      bridgeId: "trader-stop-loss",
      triggerSource: "TraderNode",
      condition: "PnL at or below stop-loss threshold",
      message:
        "Take a break. You're entering a 'Revenge Trading' state. Switching to HomeNode for 10 mins?",
      targetNode: "HomeNode",
      primaryActionLabel: "Go to HomeNode",
      actionKind: "assemble_navigate",
    });
  }

  if (signals.vaHighPriorityPingCount >= 3) {
    alerts.push({
      bridgeId: "va-slack-bottleneck",
      triggerSource: "VANode",
      condition: "3+ high-priority client pings on Slack",
      message:
        "Urgent: 3 clients are waiting. Should we jump into VANode to clear the bottleneck?",
      targetNode: "VANode",
      primaryActionLabel: "Open VANode",
      actionKind: "assemble_navigate",
    });
  }

  if (signals.vitalSleepScore < 45 && signals.proWorkloadScore > 70) {
    alerts.push({
      bridgeId: "vital-pro-recovery",
      triggerSource: "VitalNode",
      condition: "Low sleep score + high ProNode workload",
      message:
        "You're low on recovery. I've enabled 'Deep Work Mode' and dimmed non-essential notifications.",
      targetNode: "ProNode",
      primaryActionLabel: "Apply Deep Work shell",
      actionKind: "enable_deep_work",
    });
  }

  if (signals.bizUnreadLeadCount > 5 && signals.bizLastFollowUpMinutesAgo > 120) {
    alerts.push({
      bridgeId: "biz-lead-stack",
      triggerSource: "BizNode",
      condition: "High unread lead volume + no follow-up in 2+ hours",
      message:
        "Leads are stacking up in GHL. Should we trigger the 'Auto-Nudge' sequence or jump into BizNode to triage?",
      targetNode: "BizNode",
      primaryActionLabel: "Triage in BizNode",
      actionKind: "assemble_navigate",
    });
  }

  if (signals.homeCalendarHasConflict) {
    alerts.push({
      bridgeId: "home-calendar-clash",
      triggerSource: "HomeNode",
      condition: "Calendar conflict (work vs family)",
      message:
        "I've detected a schedule clash. Your ProNode focus block overlaps with a family event. Want me to reschedule the focus time?",
      targetNode: "HomeNode",
      primaryActionLabel: "Resolve in HomeNode",
      actionKind: "assemble_navigate",
    });
  }

  /** ProNode → VitalNode: sustained focus without break. */
  if (signals.proFocusSecondsWhileOnPro >= 90 * 60) {
    alerts.push({
      bridgeId: "pro-cognitive-break",
      triggerSource: "ProNode → VitalNode",
      condition: "Deep work exceeds 90 minutes without break",
      message:
        "You've been in the zone for over 90 minutes. Take a cognitive break in VitalNode—hydrate, move, and reset before the next block.",
      targetNode: "VitalNode",
      primaryActionLabel: "Cognitive break in VitalNode",
      actionKind: "assemble_navigate",
    });
  }

  if (signals.homeFridgeMilkLow && signals.homeUserNearStore) {
    alerts.push({
      bridgeId: "home-fridge-proximity",
      triggerSource: "HomeNode",
      condition: "Grocery low (Fridge Vision) + store nearby",
      message:
        "I noticed we're out of milk and you're near the store. Should I pull up the 'Smart Cart' for a quick 5-minute stop?",
      targetNode: "HomeNode",
      primaryActionLabel: "Open Smart Cart",
      actionKind: "assemble_navigate",
    });
  }

  if (
    signals.calendarOverdueCount > 0 &&
    signals.calendarHasCommitments
  ) {
    alerts.push({
      bridgeId: "calendar-overdue",
      triggerSource: "Calendar & Tasks",
      condition: `${signals.calendarOverdueCount} overdue schedule item(s)`,
      message:
        "You have calendar items that passed their window. Open your schedule to reprioritize or reschedule?",
      primaryRoute: "/calendar",
      primaryActionLabel: "Open Calendar",
      actionKind: "navigate_route",
    });
  }

  if (
    signals.calendarNextCommitmentMinutes <= 15 &&
    signals.calendarNextCommitmentMinutes >= 0 &&
    signals.calendarTodayCount > 0
  ) {
    alerts.push({
      bridgeId: "calendar-starting-soon",
      triggerSource: "Calendar & Tasks",
      condition: "Commitment starting within 15 minutes",
      message:
        "A task or appointment on your calendar is starting soon. Want to review the details before you begin?",
      primaryRoute: "/calendar",
      primaryActionLabel: "Review schedule",
      actionKind: "navigate_route",
    });
  }

  if (signals.lifePulseOverdueCount > 0 && signals.lifePulseHasCommitments) {
    alerts.push({
      bridgeId: "lifepulse-overdue",
      triggerSource: "LifePulse",
      condition: `${signals.lifePulseOverdueCount} tracker(s) past due date`,
      message:
        "LifePulse shows commitments that are overdue. Should we open your planner and adjust due dates?",
      primaryRoute: "/pulse",
      primaryActionLabel: "Open LifePulse",
      actionKind: "navigate_route",
    });
  }

  if (signals.lifePulseDueTodayCount > 0 && signals.lifePulseHasCommitments) {
    alerts.push({
      bridgeId: "lifepulse-due-today",
      triggerSource: "LifePulse",
      condition: `${signals.lifePulseDueTodayCount} tracker(s) due today`,
      message:
        "You have LifePulse goals due today. Want to check progress before the day runs away?",
      primaryRoute: "/pulse",
      primaryActionLabel: "View trackers",
      actionKind: "navigate_route",
    });
  }

  return alerts;
}

export type AssemblingNavigation = {
  targetNode: ActiveNode;
  route: string;
  label: string;
} | null;

/** Shell hat keys (`work`, `home`, …) → canonical `ActiveNode` (shared by rail + API). */
export const HAT_SHELL_TO_ACTIVE: Record<string, ActiveNode> = {
  work: "BizNode",
  home: "HomeNode",
  vital: "VitalNode",
  trader: "TraderNode",
  va: "VANode",
  pro: "ProNode",
};

/** Inverse map: canonical node → shell “hat” key (for session / analytics). */
export const ACTIVE_TO_SHELL_HAT: Record<ActiveNode, string> = {
  BizNode: "work",
  HomeNode: "home",
  VitalNode: "vital",
  TraderNode: "trader",
  VANode: "va",
  ProNode: "pro",
};

/** Accepts display names, shell keys, or legacy short keys. */
export function normalizeNodeName(raw: string): ActiveNode | null {
  const k = raw.trim();
  const lower = k.toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, ActiveNode> = {
    ...HAT_SHELL_TO_ACTIVE,
    biznode: "BizNode",
    homenode: "HomeNode",
    vanode: "VANode",
    vitalnode: "VitalNode",
    pronode: "ProNode",
    tradernode: "TraderNode",
    work: "BizNode",
    home: "HomeNode",
    vital: "VitalNode",
    trader: "TraderNode",
    va: "VANode",
    pro: "ProNode",
    biz: "BizNode",
  };
  if (aliases[lower]) return aliases[lower];
  if (
    k === "BizNode" ||
    k === "HomeNode" ||
    k === "VANode" ||
    k === "VitalNode" ||
    k === "ProNode" ||
    k === "TraderNode"
  ) {
    return k;
  }
  return null;
}

type LifeNodeContextValue = {
  activeNode: ActiveNode;
  setActiveNode: (node: ActiveNode) => void;
  /** Studio Gray vs Deep Onyx — driven by `ACTIVE_NODE_THEME`. */
  theme: LifeNodeTheme;
  vitalStats: VitalStats;
  setVitalStats: (stats: VitalStats) => void;
  pulseData: PulseData;
  setNodePulse: (node: ActiveNode, pulse: NodePulse) => void;
  isLinoInterrupting: boolean;
  setIsLinoInterrupting: (isInterrupting: boolean) => void;
  bridgeSignals: BridgeSignals;
  patchBridgeSignals: (patch: Partial<BridgeSignals> | ((s: BridgeSignals) => BridgeSignals)) => void;
  activeLogicBridgeAlerts: LogicBridgeAlert[];
  dismissLogicBridgeAlert: (bridgeId: string) => void;
  executeBridgePrimaryAction: (alert: LogicBridgeAlert) => void;
  deepWorkModeEnabled: boolean;
  setDeepWorkModeEnabled: (enabled: boolean) => void;
  assemblingNavigation: AssemblingNavigation;
  beginAssemblingToNode: (node: ActiveNode) => void;
  /** Same as `beginAssemblingToNode` but accepts aliases (e.g. `"biz"`, shell keys). */
  switchNode: (nodeName: string | ActiveNode) => void;
  clearAssemblingNavigation: () => void;
  linoMessage: LinoMessage | null;
  setLinoMessage: (msg: LinoMessage | null) => void;
  /** Clears the current Lino card; dismisses the top bridge alert when present. */
  dismissLino: () => void;
  /** Nodes enabled in shell onboarding (multi-hat). */
  configuredHats: ActiveNode[];
  /** Alias of `configuredHats` for assistant / orchestration UX. */
  userHats: ActiveNode[];
  setConfiguredHatsFromShellKeys: (hatKeys: string[]) => void;
  /** Replace enabled hats (Rail 1 + Linos chips) and persist shell keys when signed in. */
  updateConfiguredHats: (nodes: ActiveNode[]) => void;
  /** Toggle membership; persists like `updateConfiguredHats`. */
  toggleConfiguredHat: (node: ActiveNode) => void;
  /** Ensure the current route’s node appears in the rail (bookmark / deep link). */
  ensureHatForRoute: (node: ActiveNode) => void;
  /** Shell hat key for the current route/node (e.g. `work` ↔ BizNode). */
  activeShellHatKey: string;
  /** Cross-hat global bridges (VA bottleneck, calendar handoff) are active. */
  isCrossHatGlobalAlertsEnabled: boolean;
  /** True once every enabled hat finished node onboarding — unlocks Linos Alerts. */
  linoAlertsArmed: boolean;
  /** True when user data exists on a node or connected integrations supply signals. */
  linoSignalsReady: boolean;
  /** Nodes call this when the user has entered real data on that dashboard. */
  reportNodeUserData: (node: ActiveNode, ready: boolean) => void;
  /** Shell pages with `DualRailCommandCenter` register opening the Node / hat gallery modal. */
  registerHatGalleryLauncher: (fn: (() => void) | null) => void;
  /** Opens the hat gallery when a shell with rails is mounted; otherwise returns false. */
  openHatGallery: () => boolean;
  /** ProNode profession workspace (set during Pro onboarding; drives timeline/vault scope). */
  proWorkspaceRole: ProRoleId;
  setProWorkspaceRole: (role: ProRoleId) => void;
};

const LifeNodeContext = createContext<LifeNodeContextValue | undefined>(
  undefined
);

/** Route-aware shell theme — keeps light gradients visible (lninstructions.md). */
export function resolveLifeNodeTheme(
  pathname: string | null,
  activeNode: ActiveNode
): LifeNodeTheme {
  if (pathname === "/" || pathname === "") return "grainy-dawn";
  if (pathname?.startsWith("/home")) return "mint-cream";
  if (pathname?.startsWith("/calendar") || pathname?.startsWith("/pulse")) {
    return "grainy-dawn";
  }
  return ACTIVE_NODE_THEME[activeNode];
}

export function LifeNodeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [activeNode, setActiveNode] = useState<ActiveNode>("BizNode");
  const [vitalStats, setVitalStats] = useState<VitalStats>({
    heartRate: 0,
    stressLevel: 0,
    focusTime: 0,
  });
  const [pulseData, setPulseData] = useState<PulseData>(EMPTY_PULSE_DATA);
  const [linoAlertsArmed, setLinoAlertsArmed] = useState(false);
  const [hasConnectedIntegrations, setHasConnectedIntegrations] = useState(false);
  const [nodeUserDataReady, setNodeUserDataReady] = useState<
    Partial<Record<ActiveNode, boolean>>
  >({});
  const [bridgeSignals, setBridgeSignals] = useState<BridgeSignals>(DEFAULT_BRIDGE_SIGNALS);
  const [activeLogicBridgeAlerts, setActiveLogicBridgeAlerts] = useState<LogicBridgeAlert[]>([]);
  const [linoMessage, setLinoMessage] = useState<LinoMessage | null>(null);
  const [configuredHats, setConfiguredHats] = useState<ActiveNode[]>([]);
  const [deepWorkModeEnabled, setDeepWorkModeEnabled] = useState(false);
  const [assemblingNavigation, setAssemblingNavigation] =
    useState<AssemblingNavigation>(null);
  const [proWorkspaceRole, setProWorkspaceRoleState] = useState<ProRoleId>("legal");

  useEffect(() => {
    setProWorkspaceRoleState(readProWorkspaceRole());
  }, []);

  const setProWorkspaceRole = useCallback((role: ProRoleId) => {
    writeProWorkspaceRole(role);
    setProWorkspaceRoleState(role);
  }, []);

  const hatGalleryLauncherRef = useRef<(() => void) | null>(null);

  const registerHatGalleryLauncher = useCallback((fn: (() => void) | null) => {
    hatGalleryLauncherRef.current = fn;
  }, []);

  const openHatGallery = useCallback(() => {
    const launch = hatGalleryLauncherRef.current;
    if (!launch) return false;
    launch();
    return true;
  }, []);

  const dismissedBridgeIdsRef = useRef<Set<string>>(new Set());
  const alertsRef = useRef<LogicBridgeAlert[]>([]);
  /**
   * Out-of-scope alerts get appended to the persistent notifications log
   * once per bridge id (keyed in this ref so a flapping bridge doesn't spam).
   * The `notifications:changed` window event lets `NotificationsBell` refresh
   * without polling.
   */
  const loggedOutOfScopeIdsRef = useRef<Set<string>>(new Set());

  const persistOutOfScopeAlerts = useCallback(
    async (alerts: LogicBridgeAlert[]) => {
      const fresh = alerts.filter(
        (a) => !loggedOutOfScopeIdsRef.current.has(a.bridgeId)
      );
      if (!fresh.length) return;
      fresh.forEach((a) => loggedOutOfScopeIdsRef.current.add(a.bridgeId));

      if (DEV_FRESH_SESSION) {
        // Even in fresh mode we want the bell to light up — broadcast a
        // synthetic event with the alerts so the bell can render them
        // ephemerally. No network call.
        window.dispatchEvent(
          new CustomEvent("lino:notification:ephemeral", {
            detail: fresh.map((a) => ({
              id: `eph_${a.bridgeId}_${Date.now()}`,
              bridgeId: a.bridgeId,
              triggerSource: a.triggerSource,
              message: a.message,
              targetNode: a.targetNode ?? null,
              primaryActionLabel: a.primaryActionLabel ?? null,
              createdAt: new Date().toISOString(),
              read: false,
            })),
          })
        );
        return;
      }

      try {
        await Promise.all(
          fresh.map((a) =>
            fetch("/api/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bridgeId: a.bridgeId,
                triggerSource: a.triggerSource,
                message: a.message,
                targetNode: a.targetNode ?? null,
                primaryActionLabel: a.primaryActionLabel ?? null,
              }),
            }).catch(() => undefined)
          )
        );
        window.dispatchEvent(new CustomEvent("notifications:changed"));
      } catch {
        /* swallow — notifications are best-effort */
      }
    },
    []
  );

  const theme = resolveLifeNodeTheme(pathname, activeNode);
  const lightShell = theme === "mint-cream" || theme === "grainy-dawn";

  useEffect(() => {
    document.documentElement.setAttribute("data-lifenode-theme", theme);
  }, [theme]);
  const activeShellHatKey = ACTIVE_TO_SHELL_HAT[activeNode];
  const isCrossHatGlobalAlertsEnabled = configuredHats.length !== 1;

  const setConfiguredHatsFromShellKeys = useCallback((hatKeys: string[]) => {
    setConfiguredHats(
      hatKeys
        .map((k) => HAT_SHELL_TO_ACTIVE[k])
        .filter((n): n is ActiveNode => Boolean(n))
    );
  }, []);

  const persistConfiguredHatsToServer = useCallback((nodes: ActiveNode[]) => {
    if (DEV_FRESH_SESSION) return;
    const shellKeys = nodes
      .map((n) => ACTIVE_TO_SHELL_HAT[n])
      .filter((k): k is string => Boolean(k));
    void (async () => {
      try {
        const res = await fetch("/api/user-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ configuredHats: shellKeys }),
        });
        if (res.ok) {
          savePendingShellHats(shellKeys as ShellHatKey[]);
          notifyConfiguredHatsUpdated(shellKeys as ShellHatKey[]);
        } else {
          console.error("[LifeNodeContext] hat save failed:", res.status);
        }
      } catch {
        /* offline / guest */
      }
    })();
  }, []);

  const updateConfiguredHats = useCallback(
    (nodes: ActiveNode[]) => {
      const unique = Array.from(new Set(nodes));
      setConfiguredHats(unique);
      persistConfiguredHatsToServer(unique);
    },
    [persistConfiguredHatsToServer]
  );

  const toggleConfiguredHat = useCallback(
    (node: ActiveNode) => {
      setConfiguredHats((prev) => {
        const has = prev.includes(node);
        const next = has ? prev.filter((n) => n !== node) : [...prev, node];
        persistConfiguredHatsToServer(next);
        return next;
      });
    },
    [persistConfiguredHatsToServer]
  );

  const ensureHatForRoute = useCallback(
    (node: ActiveNode) => {
      setConfiguredHats((prev) => {
        if (prev.includes(node)) return prev;
        const next = [...prev, node];
        persistConfiguredHatsToServer(next);
        return next;
      });
    },
    [persistConfiguredHatsToServer]
  );

  useEffect(() => {
    document.documentElement.dataset.lifenodeTheme = theme;
    document.documentElement.style.colorScheme = theme === "deep-onyx" ? "dark" : "dark";
    return () => {
      delete document.documentElement.dataset.lifenodeTheme;
    };
  }, [theme]);

  /**
   * Hydrate configured hats from the server-side per-user state store
   * (`/api/user-state`). Fails silently for unauthenticated visitors so
   * marketing / signin pages don't error.
   *
   * Skipped in `DEV_FRESH_SESSION` mode — the LifeNodeShell becomes the sole
   * authority for `configuredHats` (in-memory only) so the operator can
   * re-test onboarding on every refresh.
   */
  useEffect(() => {
    if (DEV_FRESH_SESSION) return;

    let cancelled = false;

    const applyHats = (hatKeys: string[]) => {
      if (cancelled || !hatKeys.length) return;
      setConfiguredHatsFromShellKeys(hatKeys);
    };

    const onHatsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ hats?: string[] }>).detail;
      if (detail?.hats?.length) applyHats(detail.hats);
    };

    window.addEventListener("lifenode:hats:updated", onHatsUpdated);

    void (async () => {
      const hats = await hydrateConfiguredHatKeys();
      applyHats(hats);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("lifenode:hats:updated", onHatsUpdated);
    };
  }, [status, session?.user?.id, setConfiguredHatsFromShellKeys]);

  /** Linos Alerts fire only after the user finished onboarding for every enabled hat. */
  useEffect(() => {
    if (DEV_FRESH_SESSION || configuredHats.length === 0) {
      setLinoAlertsArmed(false);
      return;
    }
    let cancelled = false;
    const refreshArmed = async () => {
      try {
        const res = await fetch("/api/user-state/onboarding", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setLinoAlertsArmed(false);
          return;
        }
        const data = (await res.json()) as {
          statuses?: Partial<
            Record<
              ActiveNode,
              { onboardingCompleted?: boolean }
            >
          >;
        };
        const statuses = data.statuses ?? {};
        const armed = configuredHats.every(
          (hat) => statuses[hat]?.onboardingCompleted === true,
        );
        if (!cancelled) setLinoAlertsArmed(armed);
      } catch {
        if (!cancelled) setLinoAlertsArmed(false);
      }
    };
    void refreshArmed();
    const onChanged = () => void refreshArmed();
    window.addEventListener("lifenode:onboarding:changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("lifenode:onboarding:changed", onChanged);
    };
  }, [configuredHats]);

  const reportNodeUserData = useCallback((node: ActiveNode, ready: boolean) => {
    setNodeUserDataReady((prev) => {
      if (!!prev[node] === ready) return prev;
      return { ...prev, [node]: ready };
    });
  }, []);

  const linoSignalsReady = useMemo(() => {
    if (hasConnectedIntegrations) return true;
    if (
      bridgeSignals.calendarHasCommitments ||
      bridgeSignals.lifePulseHasCommitments
    ) {
      return true;
    }
    return configuredHats.some((hat) => nodeUserDataReady[hat] === true);
  }, [
    configuredHats,
    hasConnectedIntegrations,
    nodeUserDataReady,
    bridgeSignals.calendarHasCommitments,
    bridgeSignals.lifePulseHasCommitments,
  ]);

  /** Connected OAuth apps can feed bridge signals without manual card entry. */
  useEffect(() => {
    if (!linoAlertsArmed) {
      setHasConnectedIntegrations(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/integrations", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setHasConnectedIntegrations(false);
          return;
        }
        const data = (await res.json()) as {
          integrations?: { connected?: boolean }[];
        };
        const connected = Array.isArray(data.integrations)
          ? data.integrations.some((row) => row.connected === true)
          : false;
        if (!cancelled) setHasConnectedIntegrations(connected);
      } catch {
        if (!cancelled) setHasConnectedIntegrations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linoAlertsArmed]);

  useEffect(() => {
    alertsRef.current = activeLogicBridgeAlerts;
  }, [activeLogicBridgeAlerts]);

  const setNodePulse = useCallback((node: ActiveNode, pulse: NodePulse) => {
    setPulseData((prev) => ({ ...prev, [node]: pulse }));
  }, []);

  const patchBridgeSignals = useCallback(
    (patch: Partial<BridgeSignals> | ((s: BridgeSignals) => BridgeSignals)) => {
      setBridgeSignals((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
      );
    },
    []
  );

  const dismissLogicBridgeAlert = useCallback(
    (bridgeId: string) => {
      dismissedBridgeIdsRef.current.add(bridgeId);
      if (bridgeId === "pro-cognitive-break") {
        patchBridgeSignals({ proFocusSecondsWhileOnPro: 0 });
        setVitalStats((v) => ({ ...v, focusTime: 0 }));
      }
      setActiveLogicBridgeAlerts((prev) => {
        const next = prev.filter((a) => a.bridgeId !== bridgeId);
        queueMicrotask(() =>
          setLinoMessage(next[0] ? bridgeToLinoMessage(next[0]) : null)
        );
        return next;
      });
    },
    [patchBridgeSignals]
  );

  const beginAssemblingToNode = useCallback((node: ActiveNode) => {
    setActiveNode(node);
    setAssemblingNavigation({
      targetNode: node,
      route: NODE_ROUTE[node],
      label: NODE_LABEL[node],
    });
  }, []);

  const switchNode = useCallback(
    (nodeName: string | ActiveNode) => {
      const resolved =
        typeof nodeName === "string" ? normalizeNodeName(nodeName) : nodeName;
      if (resolved) beginAssemblingToNode(resolved);
    },
    [beginAssemblingToNode]
  );

  const clearAssemblingNavigation = useCallback(() => {
    setAssemblingNavigation(null);
  }, []);

  const dismissLino = useCallback(() => {
    const top = alertsRef.current[0];
    if (top) dismissLogicBridgeAlert(top.bridgeId);
    else setLinoMessage(null);
  }, [dismissLogicBridgeAlert]);

  const executeBridgePrimaryAction = useCallback(
    (alert: LogicBridgeAlert) => {
      if (alert.actionKind === "enable_deep_work") {
        setDeepWorkModeEnabled(true);
        dismissLogicBridgeAlert(alert.bridgeId);
        window.dispatchEvent(
          new CustomEvent("lino:deepWorkMode", { detail: { enabled: true } })
        );
        return;
      }
      if (alert.primaryRoute) {
        dismissLogicBridgeAlert(alert.bridgeId);
        window.location.assign(alert.primaryRoute);
        return;
      }
      if (alert.targetNode) {
        beginAssemblingToNode(alert.targetNode);
        dismissLogicBridgeAlert(alert.bridgeId);
      }
    },
    [beginAssemblingToNode, dismissLogicBridgeAlert]
  );

  /** ProNode focus timer — feeds `bridgeSignals` and `vitalStats.focusTime` (minutes). */
  useEffect(() => {
    if (activeNode !== "ProNode") {
      queueMicrotask(() => {
        patchBridgeSignals({ proFocusSecondsWhileOnPro: 0 });
        setVitalStats((v) => ({ ...v, focusTime: 0 }));
      });
      return;
    }
    const id = window.setInterval(() => {
      patchBridgeSignals((s) => {
        const nextSec = s.proFocusSecondsWhileOnPro + 1;
        const mins = Math.floor(nextSec / 60);
        queueMicrotask(() =>
          setVitalStats((v) => ({ ...v, focusTime: mins }))
        );
        return { ...s, proFocusSecondsWhileOnPro: nextSec };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeNode, patchBridgeSignals]);

  const [globalTriggerTick, setGlobalTriggerTick] = useState(0);
  /** Wall-clock aligned: re-run global triggers at the top of each local minute (6 PM guard, etc.). */
  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setGlobalTriggerTick((t) => t + 1);
      intervalId = window.setInterval(() => {
        setGlobalTriggerTick((t) => t + 1);
      }, 60_000);
    }, Math.max(0, 60_000 - (Date.now() % 60_000)));
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  /**
   * Lino Intelligence — background monitor for Logic Bridges + Transition Guard.
   * Merges static bridges, global triggers, and syncs `linoMessage` to the top alert.
   *
   * Two-tier alert routing (Master Architecture):
   *   - **Popup tier** (in-scope): the alert's `targetNode` matches the
   *     `activeNode` the user is currently "wearing", or has no target at
   *     all. These render via `LinoAlert`.
   *   - **Notifications tier** (out-of-scope but still in `configuredHats`):
   *     pushed to the persistent log via `POST /api/notifications` so the
   *     user can read them later via the bell, but they never interrupt.
   *   - **Suppressed**: alert targets a node the user didn't even enable.
   *     Dropped silently — same logic as the previous filter.
   */
  useEffect(() => {
    const commitmentAlertsEnabled =
      bridgeSignals.calendarHasCommitments ||
      bridgeSignals.lifePulseHasCommitments;
    const alertsEnabled =
      linoSignalsReady && (linoAlertsArmed || commitmentAlertsEnabled);

    if (!alertsEnabled) {
      queueMicrotask(() => {
        setActiveLogicBridgeAlerts([]);
        setLinoMessage(null);
      });
      return;
    }

    const staticAlerts = evaluateLogicBridges(bridgeSignals);
    const globalAlerts = checkGlobalTriggers({
      signals: bridgeSignals,
      activeNode,
      configuredHats,
      now: new Date(),
    });
    const merged = mergeAlertLists(staticAlerts, globalAlerts);
    const dismissed = dismissedBridgeIdsRef.current;
    const firingIds = new Set(merged.map((c) => c.bridgeId));
    dismissed.forEach((id) => {
      if (!firingIds.has(id)) dismissed.delete(id);
    });

    const isConfigured = (n: ActiveNode | undefined): boolean =>
      !n || configuredHats.includes(n);
    const isPopupScope = (a: LogicBridgeAlert): boolean =>
      !a.targetNode || a.targetNode === activeNode;

    const undismissed = merged.filter((a) => !dismissed.has(a.bridgeId));
    const popupQueue = undismissed.filter(
      (a) => isConfigured(a.targetNode) && isPopupScope(a)
    );
    const sidelinedForLog = undismissed.filter(
      (a) => isConfigured(a.targetNode) && !isPopupScope(a)
    );

    queueMicrotask(() => {
      setActiveLogicBridgeAlerts(popupQueue);
      setLinoMessage(popupQueue[0] ? bridgeToLinoMessage(popupQueue[0]) : null);
    });

    if (sidelinedForLog.length === 0) return;
    void persistOutOfScopeAlerts(sidelinedForLog);
  }, [
    bridgeSignals,
    activeNode,
    configuredHats,
    globalTriggerTick,
    persistOutOfScopeAlerts,
    linoAlertsArmed,
    linoSignalsReady,
  ]);

  const isLinoInterrupting = useMemo(() => {
    const pulse = pulseData[activeNode];
    const pulseBottleneck = pulse?.alerts?.some((msg) =>
      /(overdue|high-priority|alert|bottleneck|Lino Bridge)/i.test(msg)
    );
    return Boolean(pulseBottleneck || activeLogicBridgeAlerts.length > 0);
  }, [pulseData, activeNode, activeLogicBridgeAlerts]);

  const setIsLinoInterrupting = useCallback((next: boolean) => {
    void next;
  }, []);

  const value = useMemo(
    () => ({
      activeNode,
      setActiveNode,
      theme,
      vitalStats,
      setVitalStats,
      pulseData,
      setNodePulse,
      isLinoInterrupting,
      setIsLinoInterrupting,
      bridgeSignals,
      patchBridgeSignals,
      activeLogicBridgeAlerts,
      dismissLogicBridgeAlert,
      executeBridgePrimaryAction,
      deepWorkModeEnabled,
      setDeepWorkModeEnabled,
      assemblingNavigation,
      beginAssemblingToNode,
      switchNode,
      clearAssemblingNavigation,
      linoMessage,
      setLinoMessage,
      dismissLino,
      configuredHats,
      userHats: configuredHats,
      setConfiguredHatsFromShellKeys,
      updateConfiguredHats,
      toggleConfiguredHat,
      ensureHatForRoute,
      activeShellHatKey,
      isCrossHatGlobalAlertsEnabled,
      linoAlertsArmed,
      linoSignalsReady,
      reportNodeUserData,
      registerHatGalleryLauncher,
      openHatGallery,
      proWorkspaceRole,
      setProWorkspaceRole,
    }),
    [
      activeNode,
      theme,
      vitalStats,
      pulseData,
      setNodePulse,
      isLinoInterrupting,
      bridgeSignals,
      patchBridgeSignals,
      activeLogicBridgeAlerts,
      dismissLogicBridgeAlert,
      executeBridgePrimaryAction,
      deepWorkModeEnabled,
      assemblingNavigation,
      beginAssemblingToNode,
      switchNode,
      clearAssemblingNavigation,
      setIsLinoInterrupting,
      linoMessage,
      configuredHats,
      setConfiguredHatsFromShellKeys,
      updateConfiguredHats,
      toggleConfiguredHat,
      ensureHatForRoute,
      activeShellHatKey,
      isCrossHatGlobalAlertsEnabled,
      linoAlertsArmed,
      linoSignalsReady,
      reportNodeUserData,
      dismissLino,
      registerHatGalleryLauncher,
      openHatGallery,
      proWorkspaceRole,
      setProWorkspaceRole,
    ]
  );

  return (
    <LifeNodeContext.Provider value={value}>
      <LifeNodeSettingsEffects />
      <div
        className={`min-h-full flex flex-col flex-1 transition-[background-color,color] duration-300 ${
          lightShell ? "bg-transparent text-[#1E293B]" : "bg-[var(--ln-surface)] text-[var(--ln-text)]"
        }`}
      >
        {children}
      </div>
    </LifeNodeContext.Provider>
  );
}

export function useLifeNodeContext() {
  const context = useContext(LifeNodeContext);
  if (!context) {
    throw new Error("useLifeNodeContext must be used within a LifeNodeProvider.");
  }
  return context;
}

export function useLifeNode() {
  return useLifeNodeContext();
}
