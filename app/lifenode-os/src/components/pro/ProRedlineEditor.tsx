"use client";

import { AlertTriangle, PenLine } from "lucide-react";
import type { RedlineIssue } from "@/src/lib/proNode/types";

type ProRedlineEditorProps = {
  draft: string;
  issues: RedlineIssue[];
  onDraftChange: (text: string) => void;
  onDropClause: (text: string, clauseId?: string) => void;
};

type Segment = { text: string; issue?: RedlineIssue };

function buildSegments(text: string, issues: RedlineIssue[]): Segment[] {
  if (issues.length === 0) return [{ text }];
  let parts: Segment[] = [{ text }];
  for (const issue of issues) {
    const next: Segment[] = [];
    for (const part of parts) {
      if (part.issue || !part.text.includes(issue.phrase)) {
        next.push(part);
        continue;
      }
      const idx = part.text.indexOf(issue.phrase);
      const before = part.text.slice(0, idx);
      const match = part.text.slice(idx, idx + issue.phrase.length);
      const after = part.text.slice(idx + issue.phrase.length);
      if (before) next.push({ text: before });
      next.push({ text: match, issue });
      if (after) next.push({ text: after });
    }
    parts = next;
  }
  return parts;
}

export default function ProRedlineEditor({
  draft,
  issues,
  onDraftChange,
  onDropClause,
}: ProRedlineEditorProps) {
  const segments = buildSegments(draft, issues);

  return (
    <div className="space-y-3">
      <div
        className="min-h-[120px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-800"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const text = e.dataTransfer.getData("text/plain");
          const clauseId = e.dataTransfer.getData("application/x-clause-id");
          if (text) onDropClause(text, clauseId || undefined);
        }}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Deep Focus Editor
        </p>
        <p className="mb-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Preview</span> — how your draft looks with
          Redline Ghost highlights (read-only).
        </p>
        <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-white p-3">
          {segments.map((seg, i) =>
            seg.issue ? (
              <mark
                key={`${seg.issue.id}-${i}`}
                className="rounded bg-rose-100 px-0.5 text-rose-900 underline decoration-rose-400 decoration-wavy"
                title={seg.issue.reason}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      </div>

      <div
        className="relative rounded-2xl border-2 border-indigo-200/80 bg-indigo-50/30 p-1 shadow-sm ring-indigo-400/20"
        data-pro-draft-root
      >
        <div className="flex items-start justify-between gap-2 rounded-t-xl bg-indigo-50/90 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <PenLine className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold text-indigo-950">Type your draft here</p>
              <p className="text-[11px] text-indigo-700/90">
                This box is your editor — click inside and start typing or paste text.
              </p>
            </div>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={5}
          aria-label="Draft editor — type or paste your working text here"
          placeholder="Click here to type or paste your draft. Redline Ghost compares this text to the Auto-Timeline as you work…"
          className="w-full resize-y rounded-b-xl border-0 border-t border-indigo-100 bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-400/40"
        />
      </div>

      {issues.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Redline Ghost
          </div>
          <ul className="space-y-1.5">
            {issues.map((issue) => (
              <li key={issue.id} className="text-xs text-rose-900">
                <span className="font-semibold">&ldquo;{issue.phrase}&rdquo;</span>
                <span className="text-rose-700"> — {issue.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-emerald-600">Redline Ghost: no contradictions detected.</p>
      )}
    </div>
  );
}
