"use client";

import { Loader2, RefreshCw } from "lucide-react";
import {
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import {
  encodeScheduleDrag,
  SCHEDULE_DRAG_MIME,
} from "@/src/lib/calendar/scheduleDrag";
import { formatDateKey } from "@/src/lib/calendar/storage";
import type {
  CalendarIntegration,
  ScheduleItem,
  ScheduleItemKind,
} from "@/src/lib/calendar/types";

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ConnectedCalendarCardProps = {
  integration: CalendarIntegration;
  items: ScheduleItem[];
  anchorDateKey: string;
  kindColors: Record<ScheduleItemKind, string>;
  onMoveItem: (itemId: string, newDate: string) => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  onExportLocal?: () => void;
  syncing?: boolean;
  disconnecting?: boolean;
  exporting?: boolean;
};

function weekDaysFromAnchor(anchorKey: string): Date[] {
  const anchor = new Date(`${anchorKey}T12:00:00`);
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function ConnectedCalendarCard({
  integration,
  items,
  anchorDateKey,
  kindColors,
  onMoveItem,
  onSync,
  onDisconnect,
  onExportLocal,
  syncing,
  disconnecting,
  exporting,
}: ConnectedCalendarCardProps) {
  const weekDays = weekDaysFromAnchor(anchorDateKey);

  function itemsForDay(dateKey: string) {
    return items
      .filter((row) => row.date === dateKey)
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }

  function handleDropOnDay(e: React.DragEvent<HTMLDivElement>, dateKey: string) {
    e.preventDefault();
    const raw =
      e.dataTransfer.getData(SCHEDULE_DRAG_MIME) ||
      e.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { itemId?: string };
      if (parsed.itemId) onMoveItem(parsed.itemId, dateKey);
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      className={`${AURA_GLASS_CLASS} p-4 md:p-5`}
      style={AURA_GLASS_STYLE}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-sm font-bold ${AURA_TEXT.title}`}>
            {integration.label}
          </h3>
          <p className={`text-[11px] ${AURA_TEXT.muted}`}>
            Drag events to another day to reschedule on your dashboard. External
            calendars stay read-only until write access is enabled.
          </p>
        </div>
        {integration.id === "google" && onSync ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/30 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50"
              onClick={onSync}
              disabled={syncing || disconnecting || exporting}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync
            </button>
            {onExportLocal ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-400/80 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                onClick={onExportLocal}
                disabled={syncing || disconnecting || exporting}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Export local
              </button>
            ) : null}
            {onDisconnect ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-50"
                onClick={onDisconnect}
                disabled={syncing || disconnecting || exporting}
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Disconnect
              </button>
            ) : null}
          </div>
        ) : onDisconnect ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-50"
            onClick={onDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Disconnect
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const dateKey = formatDateKey(day);
          const dayItems = itemsForDay(dateKey);
          return (
            <div
              key={dateKey}
              className="min-h-[5.5rem] rounded-xl border border-dashed border-white/35 bg-white/15 p-1.5"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => handleDropOnDay(e, dateKey)}
            >
              <p className="text-center text-[10px] font-bold text-slate-600">
                {WEEKDAY_SHORT[(day.getDay() + 6) % 7]}
              </p>
              <p className="text-center text-xs font-bold text-slate-800">
                {day.getDate()}
              </p>
              <div className="mt-1 space-y-0.5">
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      const payload = encodeScheduleDrag({
                        itemId: item.id,
                        sourceProvider: integration.id,
                      });
                      e.dataTransfer.setData(SCHEDULE_DRAG_MIME, payload);
                      e.dataTransfer.setData("text/plain", payload);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className={`cursor-grab truncate rounded px-1 py-0.5 text-[9px] font-semibold text-white active:cursor-grabbing ${kindColors[item.kind]}`}
                    title={`${item.title} — drag to reschedule`}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className={`mt-3 text-xs ${AURA_TEXT.muted}`}>
          No events from {integration.label} in this week. Use Sync to pull your
          Google events in. New local tasks/appointments push to Google when connected.
          latest schedule.
        </p>
      ) : (
        <p className="mt-3 text-[10px] text-slate-500">
          Tip: drag chips between days here, or drop onto a date in the month
          grid above.
        </p>
      )}
    </section>
  );
}
