"use client";

import { Blocks, Link2 } from "lucide-react";
import type { ClauseBlock } from "@/src/lib/proNode/types";

type ProClauseLibraryProps = {
  clauses: ClauseBlock[];
  onInsert: (clause: ClauseBlock) => void;
  smartChainSuggestions: ClauseBlock[];
  onDismissSmartChain: () => void;
  onInsertSmartChain: (clause: ClauseBlock) => void;
};

export default function ProClauseLibrary({
  clauses,
  onInsert,
  smartChainSuggestions,
  onDismissSmartChain,
  onInsertSmartChain,
}: ProClauseLibraryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Blocks className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-[#1E293B]">Clause Library</h3>
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Modular blocks — drag or click to insert. Smart-Chain suggests matching follow-ups.
      </p>
      <ul className="max-h-52 space-y-2 overflow-y-auto">
        {clauses.map((clause) => (
          <li key={clause.id}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", clause.body);
                e.dataTransfer.setData("application/x-clause-id", clause.id);
              }}
              onClick={() => onInsert(clause)}
              className="w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <p className="text-xs font-bold text-slate-800">{clause.title}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{clause.category}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{clause.body}</p>
            </button>
          </li>
        ))}
      </ul>

      {smartChainSuggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/90 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              <Link2 className="h-3 w-3" />
              Smart-Chain Templates
            </span>
            <button
              type="button"
              onClick={onDismissSmartChain}
              className="text-[10px] font-semibold text-violet-600 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-2">
            {smartChainSuggestions.map((clause) => (
              <li key={clause.id}>
                <button
                  type="button"
                  onClick={() => onInsertSmartChain(clause)}
                  className="w-full rounded-lg border border-violet-200 bg-white px-2.5 py-2 text-left text-xs font-semibold text-violet-950 transition hover:border-violet-400"
                >
                  + {clause.title}
                  <span className="mt-0.5 block font-normal text-[11px] text-slate-600 line-clamp-2">
                    {clause.body}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
