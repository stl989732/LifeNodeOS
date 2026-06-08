"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import EmojiPickerButton from "@/src/components/calendar/EmojiPickerButton";
import {
  AURA_BTN_PRIMARY,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_SUNRISE_BG,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { connectAppToNode } from "@/src/lib/integrations";
import {
  buildMonthGrid,
  formatDateKey,
  itemsForDate,
  loadCalendarStore,
  newScheduleItemId,
  saveCalendarStore,
} from "@/src/lib/calendar/storage";
import {
  CALENDAR_CONNECT_APPS,
  CALENDAR_TARGET_NODE,
  connectedAppKey,
} from "@/src/lib/calendar/integrationConnect";
import {
  SCHEDULE_KIND_LABELS,
  type CalendarIntegration,
  type ScheduleItem,
  type ScheduleItemKind,
} from "@/src/lib/calendar/types";
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

function buildYearOptions(anchor: number) {
  return Array.from({ length: 21 }, (_, i) => anchor - 10 + i);
}

export default function CalendarDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;

  return <CalendarDashboardInner key={userId ?? "guest"} userId={userId} />;
}

function CalendarDashboardInner({ userId }: { userId: string | null }) {
  const initialStore = loadCalendarStore(userId);
  const { patchBridgeSignals } = useLifeNodeContext();
  const { connectedApps } = useConnectedApps(userId ?? "");

  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const yearOptions = useMemo(() => buildYearOptions(today.getFullYear()), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [items, setItems] = useState<ScheduleItem[]>(() => initialStore.items);
  const [integrations, setIntegrations] = useState(() => initialStore.integrations);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ScheduleItemKind>("task");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kindFilters, setKindFilters] = useState<Set<ScheduleItemKind>>(
    () => new Set(ALL_KINDS),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

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
      saveCalendarStore(userId, {
        items: nextItems,
        integrations: nextIntegrations,
      });
      syncCommitmentSignals(nextItems);
    },
    [integrations, syncCommitmentSignals, userId],
  );

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

  function toggleKindFilter(k: ScheduleItemKind) {
    setKindFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      if (next.size === 0) return new Set(ALL_KINDS);
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
    try {
      const appLabel = CALENDAR_CONNECT_APPS[row.id];
      const ok = await connectAppToNode(userId, CALENDAR_TARGET_NODE, appLabel);
      if (!ok) {
        window.alert(
          "Could not start connection. Sign in and try again, or check OAuth credentials in Settings.",
        );
        return;
      }
      const next = integrations.map((i) =>
        i.id === row.id ? { ...i, connected: true } : i,
      );
      setIntegrations(next);
      saveCalendarStore(userId, { items, integrations: next });
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
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Default · Always on
          </p>
          <h1 className={`text-2xl font-bold md:text-3xl ${AURA_TEXT.title}`}>
            Calendar & Task Management
          </h1>
          <p className={`max-w-2xl text-sm ${AURA_TEXT.body}`}>
            Plan tasks, appointments, events, travel, and projects in one view.
            Connect external calendars to merge schedules — like Motion or
            Sunsama, unified inside LifeNode OS.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                  className={`${AURA_INPUT_CLASS} min-w-[8.5rem] font-bold`}
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
                  className={`${AURA_INPUT_CLASS} min-w-[5.5rem] font-bold`}
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
                    setSelectedDate(todayKey);
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
                const isSelected = key === selectedDate;
                const isToday = key === todayKey;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[72px] rounded-xl border p-1.5 text-left transition ${
                      isSelected
                        ? "border-slate-800/40 bg-white/45 ring-2 ring-slate-800/20"
                        : "border-white/20 bg-white/15 hover:bg-white/28"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-slate-900 text-white"
                          : "text-slate-800"
                      }`}
                    >
                      {cell.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
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

          <aside className="space-y-4">
            <section
              className={`${AURA_GLASS_CLASS} p-4`}
              style={AURA_GLASS_STYLE}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-sm font-bold ${AURA_TEXT.title}`}>
                  {parseDisplayDate(selectedDate)}
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                      filterOpen || kindFilters.size < ALL_KINDS.length
                        ? "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-slate-300/80 bg-white/70 text-slate-800 hover:border-teal-500 hover:bg-teal-50"
                    }`}
                    aria-expanded={filterOpen}
                    onClick={() => setFilterOpen((v) => !v)}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                  </button>
                  {filterOpen ? (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-[100]"
                        aria-label="Close filters"
                        onClick={() => setFilterOpen(false)}
                      />
                      <div className="absolute right-0 z-[101] mt-1 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        {ALL_KINDS.map((k) => (
                          <label
                            key={k}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={kindFilters.has(k)}
                              onChange={() => toggleKindFilter(k)}
                            />
                            <span
                              className={`h-2 w-2 rounded-full ${KIND_COLORS[k]}`}
                            />
                            {SCHEDULE_KIND_LABELS[k]}
                          </label>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {filteredSelectedItems.length === 0 ? (
                  <li className={`text-xs ${AURA_TEXT.muted}`}>
                    {selectedItems.length > 0
                      ? "No items match your filters."
                      : "Nothing scheduled — add below."}
                  </li>
                ) : (
                  filteredSelectedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-white/25 bg-white/20 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${KIND_COLORS[item.kind]}`}
                          />
                          <span className="truncate text-xs font-bold text-slate-900">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          {SCHEDULE_KIND_LABELS[item.kind]}
                          {item.allDay
                            ? " · All day"
                            : item.startTime
                              ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
                              : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-teal-800"
                          aria-label={`Edit ${item.title}`}
                          onClick={() => startEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${item.title}`}
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section
              className={`${AURA_GLASS_CLASS} p-4`}
              style={AURA_GLASS_STYLE}
            >
              <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold ${AURA_TEXT.title}`}>
                {editingId ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit item
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to calendar
                  </>
                )}
              </h3>
              <div className="space-y-2">
                <input
                  className={`w-full ${AURA_INPUT_CLASS}`}
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <select
                  className={`w-full ${AURA_INPUT_CLASS}`}
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as ScheduleItemKind)
                  }
                >
                  {ALL_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {SCHEDULE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                  />
                  All day
                </label>
                {!allDay ? (
                  <div className="flex gap-2">
                    <input
                      type="time"
                      className={`flex-1 ${AURA_INPUT_CLASS}`}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    <input
                      type="time"
                      className={`flex-1 ${AURA_INPUT_CLASS}`}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="relative">
                  <textarea
                    className={`min-h-[72px] w-full resize-y pr-11 ${AURA_INPUT_CLASS}`}
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <EmojiPickerButton
                    className="absolute bottom-2 right-2"
                    onPick={insertEmoji}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 ${AURA_BTN_PRIMARY}`}
                    onClick={saveItem}
                  >
                    {editingId ? "Update item" : `Save to ${selectedDate}`}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section
          className={`${AURA_GLASS_CLASS} p-5 md:p-6`}
          style={AURA_GLASS_STYLE}
        >
          <h2 className={`mb-1 flex items-center gap-2 text-lg font-bold ${AURA_TEXT.title}`}>
            <Link2 className="h-5 w-5" />
            Connect calendars & schedulers
          </h2>
          <p className={`mb-4 text-sm ${AURA_TEXT.muted}`}>
            Connect through LifeNode OAuth (Google Calendar uses your Google sign-in).
            Other tools open the standard LifeNode connection flow.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((row) => (
              <div
                key={row.id}
                className="flex flex-col justify-between rounded-2xl border border-white/25 bg-white/20 p-4"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{row.label}</p>
                  <p className="mt-1 text-xs text-slate-600">{row.description}</p>
                </div>
                <button
                  type="button"
                  disabled={connectingId === row.id || row.connected}
                  className={`mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-default ${
                    row.connected
                      ? "border border-emerald-600/40 bg-emerald-50 text-emerald-900"
                      : "border border-slate-400/80 bg-white text-slate-900 shadow-sm hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900"
                  }`}
                  onClick={() => void handleConnect(row)}
                >
                  {connectingId === row.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting…
                    </>
                  ) : row.connected ? (
                    "Connected"
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function parseDisplayDate(key: string) {
  const d = new Date(`${key}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
