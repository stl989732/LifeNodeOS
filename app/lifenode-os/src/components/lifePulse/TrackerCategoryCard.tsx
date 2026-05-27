"use client";

import { useEffect, useRef } from "react";
import {
  trackerCompletionPercent,
  updateLifePulseTracker,
} from "@/src/lib/lifePulse/trackers";
import { getTableRows } from "@/src/lib/lifePulse/tableRows";
import { rowsHaveContent } from "@/src/lib/lifePulse/linosTableNormalize";
import { repairBlankPlanTable } from "@/src/lib/lifePulse/repairBlankPlanTable";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import { formatPlannedTimestamp } from "./TrackerPlanBody";
import TrackerGoalBar from "./TrackerGoalBar";
import TrackerEditableTable, { mergeRowsIntoContext } from "./TrackerEditableTable";
import ProjectManagementTable from "./ProjectManagementTable";
import type { TrackerTableRow } from "@/src/lib/lifePulse/tableRows";
import { AURA_INPUT_CLASS, AURA_TEXT } from "./lifePulseAura";

function contextMetrics(tracker: LifePulseTracker): Record<string, unknown> {
  return tracker.context_data ?? tracker.metrics ?? {};
}

type Props = {
  tracker: LifePulseTracker;
  onUpdated: (t: LifePulseTracker) => void;
  onDelete: (id: string) => void;
  savingId: string | null;
  setSavingId: (id: string | null) => void;
};

async function patchMetrics(
  tracker: LifePulseTracker,
  metrics: Record<string, unknown>,
  onUpdated: (t: LifePulseTracker) => void,
  setSavingId: (id: string | null) => void,
) {
  setSavingId(tracker.id);
  try {
    const progress = trackerCompletionPercent({
      ...tracker,
      context_data: metrics,
      progress_percent: null,
    });
    const next = await updateLifePulseTracker(tracker.id, {
      context_data: metrics,
      progress_percent: progress,
    });
    onUpdated(next);
  } finally {
    setSavingId(null);
  }
}

export default function TrackerCategoryCard({
  tracker,
  onUpdated,
  onDelete,
  savingId,
  setSavingId,
}: Props) {
  const m = contextMetrics(tracker);
  const busy = savingId === tracker.id;
  const isLinosPlan = Boolean(
    tracker.description?.trim() || m.linos_generated === true,
  );
  const tableRows = getTableRows(m);
  const hasTable =
    tableRows.length > 0 ||
    isLinosPlan ||
    tracker.category === "project_management";
  const plannedLabel = tracker.planned_at
    ? formatPlannedTimestamp(tracker.planned_at)
    : formatPlannedTimestamp(tracker.created_at);
  const repairAttempted = useRef(false);

  useEffect(() => {
    if (repairAttempted.current || busy) return;
    if (!isLinosPlan || rowsHaveContent(tableRows)) return;

    const repaired = repairBlankPlanTable(
      tracker.category,
      m,
      tracker.due_date ?? tracker.target_date ?? null,
    );
    if (!repaired) return;

    repairAttempted.current = true;
    void (async () => {
      setSavingId(tracker.id);
      try {
        const ctx = {
          ...m,
          table_columns: repaired.table_columns,
          table_rows: repaired.table_rows,
        };
        const next = await updateLifePulseTracker(tracker.id, { context_data: ctx });
        onUpdated(next);
      } finally {
        setSavingId(null);
      }
    })();
  }, [
    tracker.id,
    isLinosPlan,
    tableRows,
    busy,
    tracker.category,
    tracker.due_date,
    tracker.target_date,
    onUpdated,
    setSavingId,
  ]);

  async function saveTitle(nextTitle: string) {
    setSavingId(tracker.id);
    try {
      const next = await updateLifePulseTracker(tracker.id, { title: nextTitle });
      onUpdated(next);
    } finally {
      setSavingId(null);
    }
  }

  async function saveTableRows(rows: TrackerTableRow[], columns: string[]) {
    setSavingId(tracker.id);
    try {
      const ctx = mergeRowsIntoContext(tracker, rows, columns);
      const next = await updateLifePulseTracker(tracker.id, { context_data: ctx });
      onUpdated(next);
    } finally {
      setSavingId(null);
    }
  }

  async function saveContext(ctx: Record<string, unknown>) {
    setSavingId(tracker.id);
    try {
      const next = await updateLifePulseTracker(tracker.id, { context_data: ctx });
      onUpdated(next);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <TrackerGoalBar tracker={tracker} onDelete={onDelete} busy={busy}>
      <label className={`mb-3 block text-xs ${AURA_TEXT.label}`}>
        Tracker title
        <input
          defaultValue={tracker.title}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== tracker.title) void saveTitle(v);
          }}
          className={`${AURA_INPUT_CLASS} mt-1`}
          disabled={busy}
        />
      </label>

      {hasTable && tracker.category === "project_management" ? (
        <ProjectManagementTable
          tracker={tracker}
          onSaveContext={(ctx) => void saveContext(ctx)}
          busy={busy}
        />
      ) : null}

      {hasTable && tracker.category !== "project_management" ? (
        <TrackerEditableTable
          tracker={tracker}
          onSaveRows={(rows, cols) => void saveTableRows(rows, cols)}
          busy={busy}
          introText={
            typeof m.linos_intro === "string" && m.linos_intro.trim()
              ? m.linos_intro.trim()
              : undefined
          }
        />
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "skincare" ? (
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={Boolean(m.morning_done)}
              onChange={async (e) => {
                await patchMetrics(
                  tracker,
                  { ...m, morning_done: e.target.checked },
                  onUpdated,
                  setSavingId,
                );
              }}
              className="accent-slate-700"
            />
            Morning: {String(m.morning ?? "Routine")}
          </label>
          <label className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              checked={Boolean(m.night_done)}
              onChange={async (e) => {
                await patchMetrics(
                  tracker,
                  { ...m, night_done: e.target.checked },
                  onUpdated,
                  setSavingId,
                );
              }}
              className="accent-slate-700"
            />
            Night: {String(m.night ?? "Routine")}
          </label>
          <p className="text-xs text-slate-600">Hydration: {String(m.skin_hydration ?? "—")}</p>
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "pets" ? (
        <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-slate-800 backdrop-blur-sm">
          <p>
            <span className="text-slate-600">Pet:</span> {String(m.pet_name || "—")}
          </p>
          <p className="mt-1">
            <span className="text-slate-600">Vaccine due:</span> {String(m.vaccine_due || "—")}
          </p>
          <p className="mt-1">
            <span className="text-slate-600">Food:</span> {String(m.food_brand || "—")}
          </p>
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "travel" ? (
        <div className="space-y-2 text-sm">
          <p className="text-slate-800">
            {String(m.destination || "Destination TBD")} · Budget ${Number(m.budget) || 0}
          </p>
          {(Array.isArray(m.packing_list) ? (m.packing_list as string[]) : []).map((item) => {
            const packed = (m.packed ?? {}) as Record<string, boolean>;
            return (
              <label key={item} className="flex items-center gap-2 text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(packed[item])}
                  onChange={async (e) => {
                    await patchMetrics(
                      tracker,
                      { ...m, packed: { ...packed, [item]: e.target.checked } },
                      onUpdated,
                      setSavingId,
                    );
                  }}
                  className="accent-slate-700"
                />
                {item}
              </label>
            );
          })}
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "business_goals" ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Revenue</span>
            <span>
              ${Number(m.current_revenue) || 0} / ${Number(m.kpi_target) || 0}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Number(m.kpi_target) || 100000}
            value={Number(m.current_revenue) || 0}
            onChange={async (e) => {
              await patchMetrics(
                tracker,
                { ...m, current_revenue: Number(e.target.value) },
                onUpdated,
                setSavingId,
              );
            }}
            className="w-full accent-slate-700"
          />
          <p className="text-[11px] text-slate-600">Source: {String(m.source ?? "—")}</p>
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "events" ? (
        <div className="space-y-2 text-sm">
          <p className="text-slate-800">{String(m.event_name || tracker.title)}</p>
          {(Array.isArray(m.checklist) ? (m.checklist as string[]) : []).map((item) => {
            const checked = (m.checked ?? {}) as Record<string, boolean>;
            return (
              <label key={item} className="flex items-center gap-2 text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(checked[item])}
                  onChange={async (e) => {
                    await patchMetrics(
                      tracker,
                      { ...m, checked: { ...checked, [item]: e.target.checked } },
                      onUpdated,
                      setSavingId,
                    );
                  }}
                  className="accent-slate-700"
                />
                {item}
              </label>
            );
          })}
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "life" ? (
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">{String(m.focus ?? "")}</p>
          {(Array.isArray(m.habits) ? (m.habits as string[]) : []).map((habit) => {
            const habitDone = (m.habit_done ?? {}) as Record<string, boolean>;
            return (
              <label key={habit} className="flex items-center gap-2 text-slate-800">
                <input
                  type="checkbox"
                  checked={Boolean(habitDone[habit])}
                  onChange={async (e) => {
                    await patchMetrics(
                      tracker,
                      { ...m, habit_done: { ...habitDone, [habit]: e.target.checked } },
                      onUpdated,
                      setSavingId,
                    );
                  }}
                  className="accent-slate-700"
                />
                {habit}
              </label>
            );
          })}
        </div>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "social_media" ? (
        <div className="space-y-2 text-sm text-slate-800">
          <p>{String(m.platform ?? "Platform")}</p>
          <label className="block">
            Posts done: {Number(m.posts_done) || 0} / {Number(m.posts_planned) || 0}
            <input
              type="range"
              min={0}
              max={Number(m.posts_planned) || 12}
              value={Number(m.posts_done) || 0}
              onChange={async (e) => {
                await patchMetrics(
                  tracker,
                  { ...m, posts_done: Number(e.target.value) },
                  onUpdated,
                  setSavingId,
                );
              }}
              className="mt-1 w-full accent-slate-700"
            />
          </label>
        </div>
      ) : null}

      {!hasTable && tracker.category === "project_management" ? (
        <label className="block text-sm text-slate-800">
          Tasks done: {Number(m.tasks_done) || 0} / {Number(m.tasks_total) || 0}
          <input
            type="range"
            min={0}
            max={Number(m.tasks_total) || 10}
            value={Number(m.tasks_done) || 0}
            onChange={async (e) => {
              await patchMetrics(
                tracker,
                { ...m, tasks_done: Number(e.target.value) },
                onUpdated,
                setSavingId,
              );
            }}
            className="mt-1 w-full accent-slate-700"
          />
        </label>
      ) : null}

      {!hasTable && !isLinosPlan && tracker.category === "study" ? (
        <label className="block text-sm text-slate-800">
          Study hours: {Number(m.hours_done) || 0} / {Number(m.hours_target) || 0}
          <input
            type="range"
            min={0}
            max={Number(m.hours_target) || 20}
            value={Number(m.hours_done) || 0}
            onChange={async (e) => {
              await patchMetrics(
                tracker,
                { ...m, hours_done: Number(e.target.value) },
                onUpdated,
                setSavingId,
              );
            }}
            className="mt-1 w-full accent-slate-700"
          />
        </label>
      ) : null}

      {isLinosPlan ? (
        <p className={`mt-3 border-t border-white/15 pt-2 text-[10px] ${AURA_TEXT.muted}`}>
          Planned on {plannedLabel}
        </p>
      ) : null}
    </TrackerGoalBar>
  );
}
