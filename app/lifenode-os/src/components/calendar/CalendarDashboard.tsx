"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";
import ConnectedCalendarCard from "@/src/components/calendar/ConnectedCalendarCard";
import ConnectCalendarsModal from "@/src/components/calendar/ConnectCalendarsModal";
import DayFocusModal from "@/src/components/calendar/DayFocusModal";
import KanbanBoardSection from "@/src/components/calendar/KanbanBoardSection";
import {
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_SUNRISE_BG,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { connectAppToNode } from "@/src/lib/integrations";
import { appLabelToProvider } from "@/src/lib/integrations/appProviderMap";
import { syncCalendarProvider } from "@/src/lib/calendar/clientSync";
import {
  CALENDAR_CONNECT_APPS,
  CALENDAR_TARGET_NODE,
  connectedAppKey,
} from "@/src/lib/calendar/integrationConnect";
import { mergeSyncedItems } from "@/src/lib/calendar/mergeSyncedItems";
import { readScheduleDrag, SCHEDULE_DRAG_MIME } from "@/src/lib/calendar/scheduleDrag";
import { transferInboxDrop } from "@/src/hooks/useInboxDropTransfer";
import {
  buildMonthGrid,
  calendarStorageKey,
  formatDateKey,
  itemsForDate,
  loadCalendarStore,
  newScheduleItemId,
  saveCalendarStore,
} from "@/src/lib/calendar/storage";
import {
  SCHEDULE_KIND_LABELS,
  type CalendarIntegration,
  type ScheduleItem,
  type ScheduleItemKind,
  type ScheduleProvider,
} from "@/src/lib/calendar/types";
import {
  kanbanStorageKey,
  loadKanbanStore,
  normalizeKanbanStore,
  saveKanbanStore,
} from "@/src/lib/kanban/storage";
import type { KanbanStore } from "@/src/lib/kanban/types";
import {
  NODE_WIDGET_KEYS,
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
  scheduleNodeWidgetSave,
} from "@/src/lib/nodeWidgetSync";
import { computeCalendarCommitmentSignals } from "@/src/lib/linos/commitmentSignals";
import { useConnectedApps } from "@/src/lib/useConnectedApps";
import { toConnectedAppId } from "@/src/lib/integrations/appProviderMap";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALL_KINDS = Object.keys(SCHEDULE_KIND_LABELS) as ScheduleItemKind[];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const KIND_COLORS: Record<ScheduleItemKind, string> = {
  task: "bg-sky-500/90",
  appointment: "bg-violet-500/90",
  event: "bg-amber-500/90",
  travel: "bg-emerald-500/90",
  project: "bg-rose-500/90",
};

const NAV_BTN =
  "rounded-lg border border-slate-400/70 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-md transition hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40";

const NAV_ICON_BTN =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-400/70 bg-white text-slate-900 shadow-md transition hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_credentials:
    "Google OAuth is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.",
  account_link_failed:
    "Could not link your account for calendar sync. Sign out and sign in again, then retry.",
  invalid_state: "OAuth session expired. Close this tab and connect again from Calendar.",
  session_mismatch: "Session changed during OAuth. Sign in and connect again.",
  token_exchange_failed: "Google rejected the token exchange. Check redirect URI and OAuth client settings.",
};

function buildYearOptions(anchor: number) {
  return Array.from({ length: 21 }, (_, i) => anchor - 10 + i);
}

function formatOAuthError(reason: string | null, integration: string | null): string {
  if (reason && OAUTH_ERROR_MESSAGES[reason]) {
    return OAUTH_ERROR_MESSAGES[reason];
  }
  if (reason) return `Connection failed: ${reason.replace(/_/g, " ")}`;
  return `Could not connect ${integration ?? "calendar"}. Try again.`;
}

export default function CalendarDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;

  return <CalendarDashboardInner key={userId ?? "guest"} userId={userId} />;
}

function CalendarDashboardInner({ userId }: { userId: string | null }) {
  const searchParams = useSearchParams();
  const initialStore = loadCalendarStore(userId);
  const initialKanban = loadKanbanStore(userId);
  const { patchBridgeSignals } = useLifeNodeContext();
  const { connectedApps } = useConnectedApps(userId ?? "");

  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const yearOptions = useMemo(() => buildYearOptions(today.getFullYear()), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [items, setItems] = useState<ScheduleItem[]>(() => initialStore.items);
  const [integrations, setIntegrations] = useState(() => initialStore.integrations);
  const [kanbanStore, setKanbanStore] = useState<KanbanStore>(() => initialKanban);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ScheduleItemKind>("task");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kindFilters, setKindFilters] = useState<Set<ScheduleItemKind>>(
    () => new Set(),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<ScheduleProvider | null>(
    null,
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [shellSyncReady, setShellSyncReady] = useState(!userId);

  useEffect(() => {
    if (!userId) {
      setShellSyncReady(true);
      return;
    }

    let cancelled = false;
    setShellSyncReady(false);

    void (async () => {
      const calKey = calendarStorageKey(userId);
      const kanKey = kanbanStorageKey(userId);
      const localCal = loadCalendarStore(userId);
      const localKan = loadKanbanStore(userId);

      const remote = await fetchNodeWidgetsWithMeta([
        NODE_WIDGET_KEYS.shell.calendar,
        NODE_WIDGET_KEYS.shell.kanban,
      ]);

      const calResolved = resolveWidgetBootstrap({
        local: localCal,
        localUpdatedAt: readLocalWidgetUpdatedAt(calKey),
        remote: remote[NODE_WIDGET_KEYS.shell.calendar],
        parseRemote: (payload) => {
          const p = payload as Partial<typeof localCal>;
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

      if (cancelled) return;

      saveCalendarStore(userId, calResolved.value);
      saveKanbanStore(userId, kanResolved.value);
      setItems(calResolved.value.items);
      setIntegrations(calResolved.value.integrations);
      setKanbanStore(kanResolved.value);

      if (calResolved.pushLocal && calResolved.value.items.length > 0) {
        scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.calendar, calResolved.value, 200);
      }
      if (kanResolved.pushLocal && kanResolved.value.cards.length > 0) {
        scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.kanban, kanResolved.value, 200);
      }

      setShellSyncReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const syncCommitmentSignals = useCallback(
    (nextItems: ScheduleItem[]) => {
      patchBridgeSignals(computeCalendarCommitmentSignals(nextItems));
    },
    [patchBridgeSignals],
  );

  useEffect(() => {
    syncCommitmentSignals(items);
  }, [items, syncCommitmentSignals]);

  useEffect(() => {
    setIntegrations((prev) =>
      prev.map((row) => {
        if (row.id === "local") return row;
        const appLabel = CALENDAR_CONNECT_APPS[row.id];
        const appId = toConnectedAppId(appLabel);
        const key = connectedAppKey(appId);
        const status = connectedApps[key];
        return {
          ...row,
          connected: status === "connected" || status === "syncing",
        };
      }),
    );
  }, [connectedApps]);

  const persist = useCallback(
    (nextItems: ScheduleItem[], nextIntegrations = integrations) => {
      setItems(nextItems);
      const payload = {
        items: nextItems,
        integrations: nextIntegrations,
      };
      saveCalendarStore(userId, payload);
      if (userId && shellSyncReady && nextItems.length > 0) {
        scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.calendar, payload);
      }
      syncCommitmentSignals(nextItems);
    },
    [integrations, shellSyncReady, syncCommitmentSignals, userId],
  );

  const persistKanban = useCallback(
    (next: KanbanStore) => {
      setKanbanStore(next);
      saveKanbanStore(userId, next);
      if (userId && shellSyncReady && next.cards.length > 0) {
        scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.kanban, next);
      }
    },
    [shellSyncReady, userId],
  );

  const connectedIntegrations = useMemo(
    () => integrations.filter((row) => row.connected && row.id !== "local"),
    [integrations],
  );

  const monthAnchorKey = useMemo(
    () => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`,
    [viewMonth, viewYear],
  );

  const runProviderSync = useCallback(
    async (provider: ScheduleProvider) => {
      if (!userId) return;
      setSyncingProvider(provider);
      setSyncNotice(null);
      try {
        const result = await syncCalendarProvider(provider, monthAnchorKey);
        if (!result.ok) {
          setSyncNotice(result.error ?? "Could not sync calendar.");
          return;
        }
        if (result.items.length > 0) {
          setItems((prev) => {
            const merged = mergeSyncedItems(prev, result.items, provider);
            saveCalendarStore(userId, { items: merged, integrations });
            syncCommitmentSignals(merged);
            return merged;
          });
        }
        setSyncNotice(
          result.message ??
            (result.liveSync
              ? result.items.length > 0
                ? `Synced ${result.items.length} event${result.items.length === 1 ? "" : "s"} from ${providerLabel(provider)}.`
                : `No upcoming events found in ${providerLabel(provider)} for this month.`
              : `${providerLabel(provider)} connected — live sync coming soon.`),
        );
      } catch {
        setSyncNotice("Sync failed. Try again in a moment.");
      } finally {
        setSyncingProvider(null);
      }
    },
    [integrations, monthAnchorKey, syncCommitmentSignals, userId],
  );

  function clearIntegrationQueryParams() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("integration");
    url.searchParams.delete("status");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  useEffect(() => {
    const status = searchParams.get("status");
    const integration = searchParams.get("integration");
    const reason = searchParams.get("reason");

    if (status === "error") {
      setSyncNotice(formatOAuthError(reason, integration));
      setConnectModalOpen(true);
      clearIntegrationQueryParams();
      return;
    }

    if (status === "connected" && integration?.includes("google")) {
      setConnectModalOpen(false);
      setSyncNotice("Google Calendar connected. Syncing your events…");
      void runProviderSync("google");
      clearIntegrationQueryParams();
    }
  }, [runProviderSync, searchParams]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; node?: string; app?: string };
      if (data?.type !== "lifenode-integration-connected") return;
      if (data.node?.toUpperCase() !== CALENDAR_TARGET_NODE) return;
      setConnectModalOpen(false);
      setSyncNotice(
        `${data.app ?? "App"} connected. Live event sync for this tool will appear when OAuth is enabled.`,
      );
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const googleKey = connectedAppKey(toConnectedAppId(CALENDAR_CONNECT_APPS.google));
    const hasGoogleItems = items.some((row) => row.source === "google");
    if (connectedApps[googleKey] === "connected" && !hasGoogleItems) {
      void runProviderSync("google");
    }
  }, [connectedApps, items, runProviderSync]);

  function selectDate(key: string) {
    setSelectedDate(key);
    setDayModalOpen(true);
    resetForm();
  }

  function closeDayModal() {
    setDayModalOpen(false);
    setFilterOpen(false);
    resetForm();
  }

  function providerLabel(provider: ScheduleProvider): string {
    return integrations.find((row) => row.id === provider)?.label ?? provider;
  }

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedItems = useMemo(
    () => itemsForDate(items, selectedDate),
    [items, selectedDate],
  );

  const filteredSelectedItems = useMemo(
    () => selectedItems.filter((item) => kindFilters.has(item.kind)),
    [selectedItems, kindFilters],
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      if (!kindFilters.has(item.kind)) continue;
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items, kindFilters]);

  const itemsByProvider = useMemo(() => {
    const map = new Map<ScheduleProvider, ScheduleItem[]>();
    for (const item of items) {
      if (item.source === "local") continue;
      const list = map.get(item.source) ?? [];
      list.push(item);
      map.set(item.source, list);
    }
    return map;
  }, [items]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function resetForm() {
    setTitle("");
    setNotes("");
    setKind("task");
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setEditingId(null);
  }

  function startEdit(item: ScheduleItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setKind(item.kind);
    setStartTime(item.startTime ?? "09:00");
    setEndTime(item.endTime ?? "10:00");
    setAllDay(Boolean(item.allDay));
    setNotes(item.notes ?? "");
  }

  function saveItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();

    if (editingId) {
      persist(
        items.map((row) =>
          row.id === editingId
            ? {
                ...row,
                title: trimmed,
                kind,
                date: selectedDate,
                startTime: allDay ? undefined : startTime,
                endTime: allDay ? undefined : endTime,
                allDay,
                notes: notes.trim() || undefined,
                updatedAt: now,
              }
            : row,
        ),
      );
      resetForm();
      return;
    }

    const row: ScheduleItem = {
      id: newScheduleItemId(),
      title: trimmed,
      kind,
      date: selectedDate,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      allDay,
      notes: notes.trim() || undefined,
      source: "local",
      createdAt: now,
      updatedAt: now,
    };
    persist([...items, row]);
    resetForm();
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this schedule item?")) return;
    if (editingId === id) resetForm();
    persist(items.filter((i) => i.id !== id));
  }

  function moveItemDate(itemId: string, newDate: string) {
    const now = new Date().toISOString();
    persist(
      items.map((row) =>
        row.id === itemId
          ? { ...row, date: newDate, updatedAt: now }
          : row,
      ),
    );
    setSyncNotice(
      "Event rescheduled on your dashboard. External calendars are read-only until write access is enabled.",
    );
  }

  async function handleDropOnDate(
    e: React.DragEvent<HTMLButtonElement>,
    dateKey: string,
  ) {
    e.preventDefault();
    setDragOverDate(null);
    const inboxTransferred = await transferInboxDrop(e, {
      type: "date",
      date: dateKey,
    });
    if (inboxTransferred) {
      setSyncNotice("Inbox item scheduled on your calendar.");
      return;
    }
    const payload = readScheduleDrag(e);
    if (payload?.itemId) moveItemDate(payload.itemId, dateKey);
  }

  function toggleKindFilter(k: ScheduleItemKind) {
    setKindFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function handleConnect(row: CalendarIntegration) {
    if (row.id === "local") return;

    if (!userId) {
      window.location.href = "/auth/signin?callbackUrl=/calendar";
      return;
    }

    setConnectingId(row.id);
    setSyncNotice(null);
    try {
      const appLabel = CALENDAR_CONNECT_APPS[row.id];
      const oauthProvider = appLabelToProvider(appLabel);
      const ok = await connectAppToNode(userId, CALENDAR_TARGET_NODE, appLabel);
      if (!ok) {
        window.alert(
          "Could not start connection. Sign in and try again, or check that Google OAuth credentials are set in Vercel.",
        );
        return;
      }

      if (!oauthProvider) {
        setSyncNotice(
          `${row.label} connection started. Complete the popup to finish linking.`,
        );
      }
    } finally {
      setConnectingId(null);
    }
  }

  function insertEmoji(emoji: string) {
    setNotes((prev) => (prev ? `${prev} ${emoji}` : emoji));
  }

  return (
    <div className={`${AURA_SUNRISE_BG} px-4 pb-16 pt-6 md:px-8`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Default · Always on
            </p>
            <h1 className={`text-2xl font-bold md:text-3xl ${AURA_TEXT.title}`}>
              Calendar & Task Management
            </h1>
            <p className={`max-w-2xl text-sm ${AURA_TEXT.body}`}>
              Plan tasks, appointments, events, travel, and projects in one view.
              Click any date to open its schedule. Connect external calendars and
              drag events between days.
            </p>
            {syncNotice ? (
              <p className="max-w-xl rounded-lg border border-teal-600/30 bg-teal-50/80 px-3 py-2 text-xs font-medium text-teal-900">
                {syncNotice}
              </p>
            ) : null}
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch gap-2 md:w-auto md:min-w-[15rem] md:items-end">
            {connectedIntegrations.map((row) => (
              <div
                key={row.id}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50/90 px-3 py-2 shadow-sm md:min-w-[15rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-emerald-950">
                    {row.label}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-800/80">
                    Connected
                  </p>
                </div>
                {row.id === "google" ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/30 bg-white px-2 py-1 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100"
                    onClick={() => void runProviderSync("google")}
                    disabled={syncingProvider === "google"}
                  >
                    {syncingProvider === "google" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Sync
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-500/70 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md transition hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 md:w-auto"
              onClick={() => setConnectModalOpen(true)}
            >
              <Link2 className="h-4 w-4" />
              Connect Calendars & Schedulers
            </button>
          </div>
        </header>

        <section
          className={`${AURA_GLASS_CLASS} p-5 md:p-6`}
          style={AURA_GLASS_STYLE}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays className="h-5 w-5 text-slate-800" />
              <label className="sr-only" htmlFor="calendar-month">
                Month
              </label>
              <select
                id="calendar-month"
                className="min-w-[8.5rem] rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm backdrop-blur-sm"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="calendar-year">
                Year
              </label>
              <select
                id="calendar-year"
                className="min-w-[5.5rem] rounded-xl border border-white/40 bg-white/60 px-3 py-2 text-sm font-bold text-slate-900 shadow-sm backdrop-blur-sm"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={NAV_ICON_BTN}
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={NAV_BTN}
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                  selectDate(todayKey);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className={NAV_ICON_BTN}
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[72px] rounded-xl bg-white/5"
                    aria-hidden
                  />
                );
              }
              const key = formatDateKey(cell);
              const dayItems = itemsByDate.get(key) ?? [];
              const isSelected = key === selectedDate && dayModalOpen;
              const isToday = key === todayKey;
              const isDragTarget = dragOverDate === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDate(key)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverDate(key);
                  }}
                  onDragLeave={() => {
                    if (dragOverDate === key) setDragOverDate(null);
                  }}
                  onDrop={(e) => handleDropOnDate(e, key)}
                  className={`min-h-[72px] rounded-xl border p-1.5 text-left transition ${
                    isDragTarget
                      ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/30"
                      : isSelected
                        ? "border-slate-800/40 bg-white/45 ring-2 ring-slate-800/20"
                        : "border-white/20 bg-white/15 hover:bg-white/28"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? "bg-slate-900 text-white" : "text-slate-800"
                    }`}
                  >
                    {cell.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          const payload = JSON.stringify({ itemId: item.id });
                          e.dataTransfer.setData(SCHEDULE_DRAG_MIME, payload);
                          e.dataTransfer.setData("text/plain", payload);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-semibold text-white ${KIND_COLORS[item.kind]}`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 ? (
                      <div className="text-[9px] font-semibold text-slate-600">
                        +{dayItems.length - 2} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {connectedIntegrations.length > 0 ? (
          <div className="space-y-4">
            <h2 className={`text-lg font-bold ${AURA_TEXT.title}`}>
              Connected calendars
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {connectedIntegrations.map((row) => (
                <ConnectedCalendarCard
                  key={row.id}
                  integration={row}
                  items={itemsByProvider.get(row.id) ?? []}
                  anchorDateKey={selectedDate}
                  kindColors={KIND_COLORS}
                  onMoveItem={moveItemDate}
                  onSync={
                    row.id === "google"
                      ? () => void runProviderSync("google")
                      : undefined
                  }
                  syncing={syncingProvider === row.id}
                />
              ))}
            </div>
          </div>
        ) : null}

        <KanbanBoardSection
          store={kanbanStore}
          userId={userId}
          onStoreChange={persistKanban}
        />

        <DayFocusModal
          open={dayModalOpen}
          dateKey={selectedDate}
          items={selectedItems}
          filteredItems={filteredSelectedItems}
          kindFilters={kindFilters}
          filterOpen={filterOpen}
          kindColors={KIND_COLORS}
          allKinds={ALL_KINDS}
          title={title}
          kind={kind}
          startTime={startTime}
          endTime={endTime}
          allDay={allDay}
          notes={notes}
          editingId={editingId}
          providerLabel={providerLabel}
          onClose={closeDayModal}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onCloseFilter={() => setFilterOpen(false)}
          onToggleKindFilter={toggleKindFilter}
          onStartEdit={startEdit}
          onRemove={removeItem}
          onTitleChange={setTitle}
          onKindChange={setKind}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onAllDayChange={setAllDay}
          onNotesChange={setNotes}
          onInsertEmoji={insertEmoji}
          onSave={saveItem}
          onCancelEdit={resetForm}
        />

        <ConnectCalendarsModal
          open={connectModalOpen}
          integrations={integrations.filter((row) => row.id !== "local")}
          connectingId={connectingId}
          onClose={() => setConnectModalOpen(false)}
          onConnect={(row) => void handleConnect(row)}
        />
      </div>
    </div>
  );
}
