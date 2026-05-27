"use client";

import { Mail, MessageCircle, Tag } from "lucide-react";
import {
  getTableColumns,
  getTableRows,
  newTableRowId,
  type TrackerTableRow,
} from "@/src/lib/lifePulse/tableRows";
import type { LifePulseTracker } from "@/src/lib/lifePulse/types";
import { mergeRowsIntoContext } from "./TrackerEditableTable";
import TrackerEditableTable from "./TrackerEditableTable";
import { AURA_INPUT_CLASS, AURA_TEXT } from "./lifePulseAura";

const PM_LABELS = ["Urgent", "Client", "Internal", "Follow-up", "Blocked"];

type Props = {
  tracker: LifePulseTracker;
  onSaveContext: (context: Record<string, unknown>) => void;
  busy?: boolean;
};

export default function ProjectManagementTable({
  tracker,
  onSaveContext,
  busy,
}: Props) {
  const ctx = tracker.context_data ?? tracker.metrics ?? {};
  const rows = getTableRows(ctx);
  const columns = getTableColumns(tracker.category, ctx);

  function persistRows(nextRows: TrackerTableRow[]) {
    onSaveContext(mergeRowsIntoContext(tracker, nextRows, columns));
  }

  function shareEmail() {
    const body = rows
      .map((r) =>
        columns.map((c) => `${c}: ${r.cells[c] ?? ""}`).join(" | "),
      )
      .join("\n");
    const subject = encodeURIComponent(`Project: ${tracker.title}`);
    const text = encodeURIComponent(
      `LifePulse project tasks — ${tracker.title}\n\n${body}`,
    );
    window.open(`mailto:?subject=${subject}&body=${text}`, "_blank");
  }

  function shareWhatsApp() {
    const body = rows
      .map((r, i) => {
        const label = r.label ? `[${r.label}] ` : "";
        return `${i + 1}. ${label}${r.cells[columns[0]] ?? "Task"} — ${r.cells["Due"] ?? r.cells["Timeline"] ?? ""}`;
      })
      .join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`📋 ${tracker.title}\n\n${body}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function addTaggedRow(label: string) {
    const cells: Record<string, string> = {};
    for (const col of columns) cells[col] = "";
    persistRows([
      ...rows,
      { id: newTableRowId(), cells, label },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-bold uppercase ${AURA_TEXT.label}`}>
          Tags
        </span>
        {PM_LABELS.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={busy}
            onClick={() => addTaggedRow(tag)}
            className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-white/35"
          >
            <Tag className="h-3 w-3" />
            + {tag}
          </button>
        ))}
      </div>

      <TrackerEditableTable
        tracker={tracker}
        onSaveRows={persistRows}
        busy={busy}
        emptyStatusDefault
      />

      {rows.some((r) => r.label) ? (
        <div className="flex flex-wrap gap-1">
          {rows
            .filter((r) => r.label)
            .map((r) => (
              <span
                key={r.id}
                className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-900"
              >
                {r.label}
              </span>
            ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-white/15 pt-3">
        <button
          type="button"
          onClick={shareEmail}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/25 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-white/40"
        >
          <Mail className="h-3.5 w-3.5" />
          Send to email
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-500/25"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Share on WhatsApp
        </button>
      </div>
    </div>
  );
}
