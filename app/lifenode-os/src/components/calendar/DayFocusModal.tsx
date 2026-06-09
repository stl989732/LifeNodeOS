"use client";

import { Filter, Pencil, Plus, Trash2, X } from "lucide-react";
import EmojiPickerButton from "@/src/components/calendar/EmojiPickerButton";
import {
  AURA_BTN_PRIMARY,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_TEXT,
} from "@/src/components/lifePulse/lifePulseAura";
import {
  SCHEDULE_KIND_LABELS,
  type ScheduleItem,
  type ScheduleItemKind,
  type ScheduleProvider,
} from "@/src/lib/calendar/types";

type DayFocusModalProps = {
  open: boolean;
  dateKey: string;
  items: ScheduleItem[];
  filteredItems: ScheduleItem[];
  kindFilters: Set<ScheduleItemKind>;
  filterOpen: boolean;
  kindColors: Record<ScheduleItemKind, string>;
  allKinds: ScheduleItemKind[];
  title: string;
  kind: ScheduleItemKind;
  startTime: string;
  endTime: string;
  allDay: boolean;
  notes: string;
  editingId: string | null;
  providerLabel: (provider: ScheduleProvider) => string;
  onClose: () => void;
  onToggleFilter: () => void;
  onCloseFilter: () => void;
  onToggleKindFilter: (kind: ScheduleItemKind) => void;
  onStartEdit: (item: ScheduleItem) => void;
  onRemove: (id: string) => void;
  onTitleChange: (value: string) => void;
  onKindChange: (kind: ScheduleItemKind) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onAllDayChange: (value: boolean) => void;
  onNotesChange: (value: string) => void;
  onInsertEmoji: (emoji: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
};

export default function DayFocusModal({
  open,
  dateKey,
  items,
  filteredItems,
  kindFilters,
  filterOpen,
  kindColors,
  allKinds,
  title,
  kind,
  startTime,
  endTime,
  allDay,
  notes,
  editingId,
  providerLabel,
  onClose,
  onToggleFilter,
  onCloseFilter,
  onToggleKindFilter,
  onStartEdit,
  onRemove,
  onTitleChange,
  onKindChange,
  onStartTimeChange,
  onEndTimeChange,
  onAllDayChange,
  onNotesChange,
  onInsertEmoji,
  onSave,
  onCancelEdit,
}: DayFocusModalProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-[3px]"
        aria-label="Close day schedule"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-focus-title"
        className={`fixed left-1/2 top-1/2 z-[201] flex max-h-[min(92vh,44rem)] w-[min(94vw,36rem)] -translate-x-1/2 -translate-y-1/2 flex-col ${AURA_GLASS_CLASS} shadow-2xl`}
        style={AURA_GLASS_STYLE}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/25 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Day schedule
            </p>
            <h2
              id="day-focus-title"
              className={`text-lg font-bold ${AURA_TEXT.title}`}
            >
              {parseDisplayDate(dateKey)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                  filterOpen || kindFilters.size < allKinds.length
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-slate-300/80 bg-white/70 text-slate-800 hover:border-teal-500 hover:bg-teal-50"
                }`}
                aria-expanded={filterOpen}
                onClick={onToggleFilter}
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
                    onClick={onCloseFilter}
                  />
                  <div className="absolute right-0 z-[101] mt-1 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    {allKinds.map((k) => (
                      <label
                        key={k}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={kindFilters.has(k)}
                          onChange={() => onToggleKindFilter(k)}
                        />
                        <span
                          className={`h-2 w-2 rounded-full ${kindColors[k]}`}
                        />
                        {SCHEDULE_KIND_LABELS[k]}
                      </label>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-300/80 bg-white/80 p-2 text-slate-600 shadow-sm transition hover:border-slate-500 hover:bg-white hover:text-slate-900"
              aria-label="Exit day view"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-2">
            {filteredItems.length === 0 ? (
              <li className={`text-sm ${AURA_TEXT.muted}`}>
                {items.length > 0
                  ? "No items match your filters."
                  : "Nothing scheduled for this day yet."}
              </li>
            ) : (
              filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-white/30 bg-white/25 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${kindColors[item.kind]}`}
                      />
                      <span className="truncate text-sm font-bold text-slate-900">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {SCHEDULE_KIND_LABELS[item.kind]}
                      {item.source !== "local"
                        ? ` · ${providerLabel(item.source)}`
                        : ""}
                      {item.allDay
                        ? " · All day"
                        : item.startTime
                          ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
                          : ""}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-teal-800"
                      aria-label={`Edit ${item.title}`}
                      onClick={() => onStartEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${item.title}`}
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="shrink-0 border-t border-white/25 px-5 py-4">
          <h3
            className={`mb-3 flex items-center gap-2 text-sm font-bold ${AURA_TEXT.title}`}
          >
            {editingId ? (
              <>
                <Pencil className="h-4 w-4" />
                Edit item
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add to this day
              </>
            )}
          </h3>
          <div className="space-y-2">
            <input
              className={`w-full ${AURA_INPUT_CLASS}`}
              placeholder="Title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
            <select
              className={`w-full ${AURA_INPUT_CLASS}`}
              value={kind}
              onChange={(e) =>
                onKindChange(e.target.value as ScheduleItemKind)
              }
            >
              {allKinds.map((k) => (
                <option key={k} value={k}>
                  {SCHEDULE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => onAllDayChange(e.target.checked)}
              />
              All day
            </label>
            {!allDay ? (
              <div className="flex gap-2">
                <input
                  type="time"
                  className={`flex-1 ${AURA_INPUT_CLASS}`}
                  value={startTime}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                />
                <input
                  type="time"
                  className={`flex-1 ${AURA_INPUT_CLASS}`}
                  value={endTime}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                />
              </div>
            ) : null}
            <div className="relative">
              <textarea
                className={`min-h-[72px] w-full resize-y pr-11 ${AURA_INPUT_CLASS}`}
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
              />
              <EmojiPickerButton
                className="absolute bottom-2 right-2"
                onPick={onInsertEmoji}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 ${AURA_BTN_PRIMARY}`}
                onClick={onSave}
              >
                {editingId ? "Update item" : "Save to day"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
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
