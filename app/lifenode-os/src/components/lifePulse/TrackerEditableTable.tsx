"use client";

import { useState } from "react";
import { Maximize2, Minimize2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  getTableColumns,
  getTableRows,
  isDateTimeColumn,
  newTableRowId,
  rowsToContext,
  type TrackerTableRow,
} from "@/src/lib/lifePulse/tableRows";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import DateTimeField, { datetimeLocalToIso, isoToDatetimeLocal } from "@/src/components/ui/DateTimeField";
import { AURA_INPUT_CLASS, AURA_TEXT } from "./lifePulseAura";
import PlanTableFocusModal from "./PlanTableFocusModal";

type Props = {
  tracker: LifePulseTracker;
  onSaveRows: (rows: TrackerTableRow[], columns: string[]) => void;
  busy?: boolean;
  /** Short intro above the table (replaces removed bullet list). */
  introText?: string;
  /** When true, Status column starts empty (project management). */
  emptyStatusDefault?: boolean;
};

function isTotalRow(row: TrackerTableRow): boolean {
  const item = row.cells.Item ?? row.cells.item ?? row.cells.Task ?? "";
  return /^total|grand total|estimated total/i.test(item.trim());
}

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
  const categoryLabel = tracker.category.replace(/_/g, " ");
  const modalTitle = `Plan table · ${categoryLabel}`;

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

  function renderTableBody(focusMode: boolean) {
    const textSize = focusMode ? "text-sm" : "text-xs";
    const cellPad = focusMode ? "px-3 py-2.5" : "px-1 py-1";
    const inputClass = focusMode
      ? `${AURA_INPUT_CLASS} min-w-[120px] py-2 text-sm`
      : `${AURA_INPUT_CLASS} min-w-[80px] py-1.5 text-xs`;

    return (
      <table className={`w-full min-w-[480px] text-left ${textSize}`}>
        <thead>
          <tr className="border-b border-white/15 bg-white/10">
            {columns.map((col) => (
              <th
                key={col}
                className={`${cellPad} font-semibold text-slate-700`}
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
            rows.map((row) => {
              const total = isTotalRow(row);
              return (
                <tr
                  key={row.id}
                  className={`border-b border-white/10 ${total ? "bg-white/25 font-semibold" : ""}`}
                >
                  {columns.map((col) => (
                    <td key={col} className={cellPad}>
                      {isDateTimeColumn(col) ? (
                        <DateTimeField
                          value={isoToDatetimeLocal(row.cells[col]) || row.cells[col] || ""}
                          onChange={(next) => {
                            const stored = datetimeLocalToIso(next) ?? next;
                            updateCell(row.id, col, stored);
                          }}
                          disabled={busy}
                          inputClassName={
                            focusMode
                              ? `${AURA_INPUT_CLASS} min-w-[11rem] py-2 text-sm`
                              : `${AURA_INPUT_CLASS} min-w-[9rem] py-1.5 text-xs`
                          }
                        />
                      ) : (
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
                          className={inputClass}
                        />
                      )}
                    </td>
                  ))}
                  <td className={`${cellPad} text-center`}>
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
              );
            })
          )}
        </tbody>
      </table>
    );
  }

  function renderToolbar(focusMode: boolean) {
    return (
      <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
        <p
          className={`font-bold uppercase tracking-widest text-slate-700 ${focusMode ? "text-xs" : `text-[10px] ${AURA_TEXT.label}`}`}
        >
          {modalTitle}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={`inline-flex items-center gap-1 rounded-lg bg-white/25 font-semibold text-slate-800 hover:bg-white/40 ${focusMode ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]"}`}
            title={expanded ? "Minimize table" : "Maximize table for editing"}
          >
            {expanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            {expanded ? "Minimize" : "Maximize"}
          </button>
          <button
            type="button"
            onClick={addRow}
            disabled={busy}
            className={`inline-flex items-center gap-1 rounded-lg bg-white/25 font-semibold text-slate-800 hover:bg-white/40 ${focusMode ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]"}`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add row
          </button>
        </div>
      </div>
    );
  }

  function renderFooter(focus: boolean) {
    return (
      <p
        className={`flex shrink-0 items-center gap-1 border-t border-white/10 px-3 py-2 ${focus ? "text-xs text-slate-600" : `text-[10px] ${AURA_TEXT.muted}`}`}
      >
        <Pencil className="h-3 w-3" />
        Edit cells inline — changes save automatically.
      </p>
    );
  }

  const inlineShell = (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm">
      {renderToolbar(false)}
      {introText ? (
        <p className={`border-b border-white/10 px-3 py-2 text-xs leading-relaxed ${AURA_TEXT.body}`}>
          {introText}
        </p>
      ) : null}
      <div className="overflow-x-auto">{renderTableBody(false)}</div>
      {renderFooter(false)}
    </div>
  );

  const focusContent = (
    <>
      {renderToolbar(true)}
      {introText ? (
        <p className="border-b border-white/10 px-5 py-3 text-sm leading-relaxed text-slate-700">
          {introText}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">{renderTableBody(true)}</div>
      {renderFooter(true)}
    </>
  );

  return (
    <>
      {inlineShell}
      <PlanTableFocusModal
        open={expanded}
        title={modalTitle}
        onClose={() => setExpanded(false)}
      >
        {focusContent}
      </PlanTableFocusModal>
    </>
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
