"use client";

import { useMemo, useState } from "react";
import { Maximize2, Minimize2, Plus, Trash2, Users, X } from "lucide-react";
import DateTimeField, {
  datetimeLocalToIso,
  isoToDatetimeLocal,
} from "@/src/components/ui/DateTimeField";
import {
  PRO_CRM_COLUMNS,
  PRO_CRM_PRIORITY_OPTIONS,
  PRO_CRM_STATUS_OPTIONS,
  canHideMoreCrmColumns,
  crmRowLabel,
  getVisibleCrmColumns,
  isProCrmDateColumn,
  newProCrmRowId,
  type ProCrmRow,
  type ProCrmState,
} from "@/src/lib/proNode/projectsCrm";

const INPUT_CLASS =
  "w-full min-w-[6.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

type Props = {
  state: ProCrmState;
  onChange: (state: ProCrmState) => void;
  activeRowId?: string | null;
  onSelectRow?: (row: ProCrmRow) => void;
  busy?: boolean;
};

function emptyCells(): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const col of PRO_CRM_COLUMNS) cells[col] = "";
  return cells;
}

export default function ProProjectsCrmTable({
  state,
  onChange,
  activeRowId,
  onSelectRow,
  busy,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { rows, hiddenColumns = [] } = state;
  const visibleColumns = useMemo(
    () => getVisibleCrmColumns(hiddenColumns),
    [hiddenColumns],
  );
  const hiddenList = useMemo(
    () => PRO_CRM_COLUMNS.filter((col) => hiddenColumns.includes(col)),
    [hiddenColumns],
  );

  function updateRows(nextRows: ProCrmRow[]) {
    onChange({ ...state, rows: nextRows });
  }

  function hideColumn(col: string) {
    if (!canHideMoreCrmColumns(hiddenColumns)) return;
    onChange({
      ...state,
      hiddenColumns: [...hiddenColumns, col],
    });
  }

  function showColumn(col: string) {
    onChange({
      ...state,
      hiddenColumns: hiddenColumns.filter((c) => c !== col),
    });
  }

  function updateCell(rowId: string, col: string, value: string) {
    updateRows(
      rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [col]: value } } : r,
      ),
    );
  }

  function addRow() {
    updateRows([...rows, { id: newProCrmRowId(), cells: emptyCells() }]);
  }

  function deleteRow(rowId: string) {
    if (!window.confirm("Delete this row?")) return;
    updateRows(rows.filter((r) => r.id !== rowId));
  }

  function renderCell(row: ProCrmRow, col: string, focusMode: boolean) {
    const value = row.cells[col] ?? "";
    const inputClass = focusMode ? `${INPUT_CLASS} min-w-[8rem] py-2 text-sm` : INPUT_CLASS;

    if (col === "Status") {
      return (
        <select
          value={value}
          disabled={busy}
          onChange={(e) => updateCell(row.id, col, e.target.value)}
          className={inputClass}
        >
          {PRO_CRM_STATUS_OPTIONS.map((opt) => (
            <option key={opt || "empty"} value={opt}>
              {opt || "—"}
            </option>
          ))}
        </select>
      );
    }

    if (col === "Priority") {
      return (
        <select
          value={value}
          disabled={busy}
          onChange={(e) => updateCell(row.id, col, e.target.value)}
          className={inputClass}
        >
          {PRO_CRM_PRIORITY_OPTIONS.map((opt) => (
            <option key={opt || "empty"} value={opt}>
              {opt || "—"}
            </option>
          ))}
        </select>
      );
    }

    if (isProCrmDateColumn(col)) {
      return (
        <DateTimeField
          value={isoToDatetimeLocal(value) || value}
          onChange={(next) => {
            const stored = datetimeLocalToIso(next) ?? next;
            updateCell(row.id, col, stored);
          }}
          disabled={busy}
          dateOnly
          inputClassName={focusMode ? `${INPUT_CLASS} min-w-[9rem] py-2 text-sm` : inputClass}
        />
      );
    }

    if (col === "Notes") {
      return (
        <textarea
          value={value}
          disabled={busy}
          rows={focusMode ? 2 : 1}
          onChange={(e) => updateCell(row.id, col, e.target.value)}
          className={`${inputClass} min-w-[8rem] resize-y`}
          placeholder="Notes"
        />
      );
    }

    return (
      <input
        value={value}
        disabled={busy}
        inputMode={col === "Sales" ? "decimal" : undefined}
        placeholder={col === "Sales" ? "$0" : col}
        onChange={(e) => updateCell(row.id, col, e.target.value)}
        className={inputClass}
      />
    );
  }

  function renderHiddenColumnChips() {
    if (!hiddenList.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Hidden columns
        </span>
        {hiddenList.map((col) => (
          <button
            key={col}
            type="button"
            onClick={() => showColumn(col)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-slate-400 hover:bg-white"
          >
            <Plus className="h-3 w-3" />
            {col}
          </button>
        ))}
      </div>
    );
  }

  function renderTable(focusMode: boolean) {
    const textSize = focusMode ? "text-sm" : "text-xs";
    const cellPad = focusMode ? "px-3 py-2.5" : "px-2 py-2";
    const tableMinWidth = Math.max(visibleColumns.length * 128 + 96, 480);

    return (
      <div className={`overflow-x-auto ${focusMode ? "mx-auto w-full max-w-[90rem]" : ""}`}>
        <table
          className={`w-full text-left ${textSize}`}
          style={{ minWidth: tableMinWidth }}
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {visibleColumns.map((col) => (
                <th key={col} className={`${cellPad} font-semibold text-slate-600`}>
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    {canHideMoreCrmColumns(hiddenColumns) ? (
                      <button
                        type="button"
                        onClick={() => hideColumn(col)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        title={`Hide ${col} column`}
                        aria-label={`Hide ${col} column`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="w-24 px-2 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No clients or projects yet — add a row to start your CRM board.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = activeRowId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition ${
                      selected ? "bg-indigo-50/80" : "hover:bg-slate-50/80"
                    }`}
                  >
                    {visibleColumns.map((col) => (
                      <td key={col} className={cellPad}>
                        {renderCell(row, col, focusMode)}
                      </td>
                    ))}
                    <td className={`${cellPad} text-center`}>
                      <div className="flex items-center justify-center gap-1">
                        {onSelectRow ? (
                          <button
                            type="button"
                            title={`Focus ${crmRowLabel(row)}`}
                            onClick={() => onSelectRow(row)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              selected
                                ? "bg-[#1E293B] text-white"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            Focus
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          disabled={busy}
                          className="rounded p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const toolbarButtons = (
    <>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        {expanded ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
        {expanded ? "Minimize" : "Expand"}
      </button>
      <button
        type="button"
        onClick={addRow}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Add row
      </button>
    </>
  );

  const shell = (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#1E293B]" />
          <div>
            <h2 className="text-sm font-bold text-[#1E293B]">Clients & Projects</h2>
            <p className="text-[11px] text-slate-500">
              Track items, deadlines, and status. Use × on a column header to hide fields you
              do not need.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">{toolbarButtons}</div>
      </div>
      {renderHiddenColumnChips()}
      <div className="p-4">{renderTable(false)}</div>
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:p-5 md:p-6">
        <div className="flex h-[min(94vh,1100px)] w-[min(98vw,96rem)] max-w-[96rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-[#1E293B]">Clients & Projects — full view</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addRow}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1E293B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add row
              </button>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>
          {renderHiddenColumnChips()}
          <div className="flex-1 overflow-auto px-5 py-4">{renderTable(true)}</div>
        </div>
      </div>
    );
  }

  return shell;
}
