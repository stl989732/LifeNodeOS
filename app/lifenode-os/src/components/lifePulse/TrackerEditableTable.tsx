"use client";

import { useState } from "react";
import { Maximize2, Minimize2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getTableColumns,
  getTableRows,
  newTableRowId,
  rowsToContext,
  type TrackerTableRow,
} from "@/src/lib/lifePulse/tableRows";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import { AURA_INPUT_CLASS, AURA_TEXT } from "./lifePulseAura";

type Props = {
  tracker: LifePulseTracker;
  onSaveRows: (rows: TrackerTableRow[], columns: string[]) => void;
  busy?: boolean;
  /** Short intro above the table (replaces removed bullet list). */
  introText?: string;
  /** When true, Status column starts empty (project management). */
  emptyStatusDefault?: boolean;
};

export default function TrackerEditableTable({
  tracker,
  onSaveRows,
  busy,
  introText,
  emptyStatusDefault = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const ctx = tracker.context_data ?? tracker.metrics ?? {};
  const columns = getTableColumns(tracker.category, ctx);
  const rows = getTableRows(ctx);

  function persist(nextRows: TrackerTableRow[]) {
    onSaveRows(nextRows, columns);
  }

  function updateCell(rowId: string, col: string, value: string) {
    persist(
      rows.map((r) =>
        r.id === rowId
          ? { ...r, cells: { ...r.cells, [col]: value } }
          : r,
      ),
    );
  }

  function addRow() {
    const cells: Record<string, string> = {};
    for (const col of columns) {
      cells[col] =
        emptyStatusDefault && col === "Status" ? "" : "";
    }
    persist([...rows, { id: newTableRowId(), cells }]);
  }

  function deleteRow(rowId: string) {
    if (!window.confirm("Delete this row permanently?")) return;
    persist(rows.filter((r) => r.id !== rowId));
  }

  const shellClass = expanded
    ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-2xl backdrop-blur-xl"
    : "overflow-hidden rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm";

  return (
    <div className={shellClass}>
      {expanded ? (
        <div
          className="absolute inset-0 -z-10 bg-slate-900/40"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      ) : null}

      <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${AURA_TEXT.label}`}>
          Plan table · {tracker.category.replace(/_/g, " ")}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 rounded-lg bg-white/25 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white/40"
            title={expanded ? "Minimize table" : "Maximize table for editing"}
          >
            {expanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
            {expanded ? "Minimize" : "Maximize"}
          </button>
          <button
            type="button"
            onClick={addRow}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-white/25 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-white/40"
          >
            <Plus className="h-3 w-3" />
            Add row
          </button>
        </div>
      </div>

      {introText ? (
        <p className={`border-b border-white/10 px-3 py-2 text-xs leading-relaxed ${AURA_TEXT.body}`}>
          {introText}
        </p>
      ) : null}

      <div className={expanded ? "min-h-0 flex-1 overflow-auto" : "overflow-x-auto"}>
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/15 bg-white/10">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-2 font-semibold text-slate-700"
                >
                  {col}
                </th>
              ))}
              <th className="w-10 px-2 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No rows yet — add one or use Linos Quick Add to generate a plan.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/10">
                  {columns.map((col) => (
                    <td key={col} className="px-1 py-1">
                      <input
                        value={row.cells[col] ?? ""}
                        onChange={(e) =>
                          updateCell(row.id, col, e.target.value)
                        }
                        disabled={busy}
                        placeholder={
                          emptyStatusDefault && col === "Status"
                            ? "e.g. In progress"
                            : undefined
                        }
                        className={`${AURA_INPUT_CLASS} min-w-[80px] py-1.5 text-xs`}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      disabled={busy}
                      className="rounded p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-700"
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p
        className={`flex shrink-0 items-center gap-1 border-t border-white/10 px-3 py-2 text-[10px] ${AURA_TEXT.muted}`}
      >
        <Pencil className="h-3 w-3" />
        Edit cells inline — changes save automatically.
      </p>
    </div>
  );
}

export function mergeRowsIntoContext(
  tracker: LifePulseTracker,
  rows: TrackerTableRow[],
  columns: string[],
): Record<string, unknown> {
  const base = { ...(tracker.context_data ?? tracker.metrics ?? {}) };
  return { ...base, ...rowsToContext(columns, rows) };
}

/** Default empty rows for project management workspace. */
export function createEmptyPmRows(count = 5): TrackerTableRow[] {
  const columns = ["Task", "Label", "Due", "Status", "Notes"];
  return Array.from({ length: count }, () => {
    const cells: Record<string, string> = {};
    for (const col of columns) cells[col] = "";
    return { id: newTableRowId(), cells };
  });
}
