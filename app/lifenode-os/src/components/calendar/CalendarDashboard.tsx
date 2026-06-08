"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  AURA_BTN_PRIMARY,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_SUNRISE_BG,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import {
  buildMonthGrid,
  formatDateKey,
  itemsForDate,
  loadCalendarStore,
  newScheduleItemId,
  saveCalendarStore,
  toggleIntegration,
} from "@/src/lib/calendar/storage";
import {
  SCHEDULE_KIND_LABELS,
  type CalendarIntegration,
  type ScheduleItem,
  type ScheduleItemKind,
} from "@/src/lib/calendar/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_COLORS: Record<ScheduleItemKind, string> = {
  task: "bg-sky-500/90",
  appointment: "bg-violet-500/90",
  event: "bg-amber-500/90",
  travel: "bg-emerald-500/90",
  project: "bg-rose-500/90",
};

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function CalendarDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;

  return <CalendarDashboardInner key={userId ?? "guest"} userId={userId} />;
}

function CalendarDashboardInner({ userId }: { userId: string | null }) {
  const initialStore = loadCalendarStore(userId);

  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);

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

  const persist = useCallback(
    (nextItems: ScheduleItem[], nextIntegrations = integrations) => {
      setItems(nextItems);
      saveCalendarStore(userId, {
        items: nextItems,
        integrations: nextIntegrations,
      });
    },
    [integrations, userId],
  );

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const selectedItems = useMemo(
    () => itemsForDate(items, selectedDate),
    [items, selectedDate],
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function addItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
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
    setTitle("");
    setNotes("");
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this schedule item?")) return;
    persist(items.filter((i) => i.id !== id));
  }

  function handleConnect(id: CalendarIntegration["id"]) {
    const next = toggleIntegration(integrations, id);
    setIntegrations(next);
    saveCalendarStore(userId, { items, integrations: next });
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
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-slate-700" />
                <h2 className={`text-lg font-bold ${AURA_TEXT.title}`}>
                  {monthLabel(viewYear, viewMonth)}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-white/30 bg-white/20 p-2 hover:bg-white/35"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/35"
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
                  className="rounded-lg border border-white/30 bg-white/20 p-2 hover:bg-white/35"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
              <h3 className={`text-sm font-bold ${AURA_TEXT.title}`}>
                {parseDisplayDate(selectedDate)}
              </h3>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {selectedItems.length === 0 ? (
                  <li className={`text-xs ${AURA_TEXT.muted}`}>
                    Nothing scheduled — add below.
                  </li>
                ) : (
                  selectedItems.map((item) => (
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
                      <button
                        type="button"
                        className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
                <Plus className="h-4 w-4" />
                Add to calendar
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
                  {(Object.keys(SCHEDULE_KIND_LABELS) as ScheduleItemKind[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {SCHEDULE_KIND_LABELS[k]}
                      </option>
                    ),
                  )}
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
                <textarea
                  className={`min-h-[60px] w-full resize-y ${AURA_INPUT_CLASS}`}
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  className={`w-full ${AURA_BTN_PRIMARY}`}
                  onClick={addItem}
                >
                  Save to {selectedDate}
                </button>
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
            Toggle a provider to mark it connected locally. OAuth sync for Google
            Calendar and others uses LifeNode integrations — wire-up coming next.
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
                  className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    row.connected
                      ? "border border-emerald-600/40 bg-emerald-50 text-emerald-900"
                      : "border border-slate-300/80 bg-white/50 text-slate-800 hover:bg-white/80"
                  }`}
                  onClick={() => handleConnect(row.id)}
                >
                  {row.connected ? "Connected" : "Connect"}
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
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
