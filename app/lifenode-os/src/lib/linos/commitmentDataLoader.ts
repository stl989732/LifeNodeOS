import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import type { Project } from "@/lib/user-state-store";
import { loadCalendarStore, calendarStorageKey } from "@/src/lib/calendar/storage";
import type { CalendarStore } from "@/src/lib/calendar/types";
import {
  loadKanbanStore,
  kanbanStorageKey,
  normalizeKanbanStore,
} from "@/src/lib/kanban/storage";
import type { KanbanStore } from "@/src/lib/kanban/types";
import {
  computeCalendarCommitmentSignals,
  computeKanbanCommitmentSignals,
  computeLifePulseCommitmentSignals,
  computeProjectCommitmentSignals,
} from "@/src/lib/linos/commitmentSignals";
import type { BridgeSignals } from "@/src/context/LifeNodeContext";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import {
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
} from "@/src/lib/nodeWidgetSync";

export type CommitmentDataSnapshot = {
  calendarItems: CalendarStore["items"];
  kanban: KanbanStore;
  trackers: LifePulseTracker[];
  projects: Project[];
};

export async function loadCommitmentData(
  userId: string,
): Promise<CommitmentDataSnapshot> {
  const localCal = loadCalendarStore(userId);
  const localKan = loadKanbanStore(userId);

  const [remote, trackersRes, stateRes] = await Promise.all([
    fetchNodeWidgetsWithMeta([
      NODE_WIDGET_KEYS.shell.calendar,
      NODE_WIDGET_KEYS.shell.kanban,
    ]),
    fetch("/api/life-pulse/trackers", {
      cache: "no-store",
      credentials: "include",
    }).catch(() => null),
    fetch("/api/user-state", {
      cache: "no-store",
      credentials: "include",
    }).catch(() => null),
  ]);

  const calKey = calendarStorageKey(userId);
  const kanKey = kanbanStorageKey(userId);

  const calResolved = resolveWidgetBootstrap({
    local: localCal,
    localUpdatedAt: readLocalWidgetUpdatedAt(calKey),
    remote: remote[NODE_WIDGET_KEYS.shell.calendar],
    parseRemote: (payload) => {
      const p = payload as Partial<CalendarStore>;
      return {
        items: Array.isArray(p.items) ? p.items : localCal.items,
        integrations:
          Array.isArray(p.integrations) && p.integrations.length > 0
            ? p.integrations
            : localCal.integrations,
      };
    },
    hasMeaningfulLocal: (store) => store.items.length > 0,
    remoteHasData: (payload) => {
      const p = payload as { items?: unknown[] };
      return Array.isArray(p.items) && p.items.length > 0;
    },
  });

  const kanResolved = resolveWidgetBootstrap({
    local: localKan,
    localUpdatedAt: readLocalWidgetUpdatedAt(kanKey),
    remote: remote[NODE_WIDGET_KEYS.shell.kanban],
    parseRemote: (payload) => {
      const p = payload as Partial<KanbanStore>;
      const boards = Array.isArray(p.boards) ? p.boards : localKan.boards;
      const cards = Array.isArray(p.cards) ? p.cards : localKan.cards;
      return normalizeKanbanStore({
        boards,
        cards,
        activeBoardId:
          typeof p.activeBoardId === "string"
            ? p.activeBoardId
            : localKan.activeBoardId,
      });
    },
    hasMeaningfulLocal: (store) => store.cards.length > 0,
    remoteHasData: (payload) => {
      const p = payload as { cards?: unknown[] };
      return Array.isArray(p.cards) && p.cards.length > 0;
    },
  });

  let trackers: LifePulseTracker[] = [];
  if (trackersRes?.ok) {
    try {
      const data = (await trackersRes.json()) as { trackers?: LifePulseTracker[] };
      trackers = Array.isArray(data.trackers) ? data.trackers : [];
    } catch {
      trackers = [];
    }
  }

  let projects: Project[] = [];
  if (stateRes?.ok) {
    try {
      const data = (await stateRes.json()) as { state?: { projects?: Project[] } };
      projects = Array.isArray(data.state?.projects) ? data.state.projects : [];
    } catch {
      projects = [];
    }
  }

  return {
    calendarItems: calResolved.value.items,
    kanban: kanResolved.value,
    trackers,
    projects,
  };
}

/** Build a partial `BridgeSignals` patch from loaded schedule / task / project data. */
export function commitmentSignalsFromSnapshot(
  snapshot: CommitmentDataSnapshot,
  now = new Date(),
): Partial<BridgeSignals> {
  return {
    ...computeCalendarCommitmentSignals(snapshot.calendarItems, now),
    ...computeKanbanCommitmentSignals(snapshot.kanban, now),
    ...computeLifePulseCommitmentSignals(snapshot.trackers, now),
    ...computeProjectCommitmentSignals(snapshot.projects),
  };
}
