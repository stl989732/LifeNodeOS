"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Command, FileText, Sparkles } from "lucide-react";
import type { ProRoleId } from "@/src/lib/proNode/types";
import { PRO_ROLES } from "@/src/lib/proNode/roles";

export type CommandPaletteItem =
  | {
      kind: "file";
      id: string;
      title: string;
      subtitle: string;
      roleId: ProRoleId;
    }
  | {
      kind: "action";
      id: string;
      title: string;
      subtitle: string;
      onSelect: () => void;
    };

type ProCommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  workspaceRole: ProRoleId;
  onOpenCase: (caseTitle: string) => void;
  onFocusEditor: () => void;
  onFocusTimeline: () => void;
};

function buildFileItems(roleId: ProRoleId): Extract<CommandPaletteItem, { kind: "file" }>[] {
  const r = PRO_ROLES.find((role) => role.id === roleId);
  if (!r) return [];
  return r.cases.map((c, i) => ({
    kind: "file" as const,
    id: `${r.id}-${i}-${c}`,
    title: c,
    subtitle: r.nodeName,
    roleId: r.id,
  }));
}

export default function ProCommandPalette({
  open,
  onClose,
  workspaceRole,
  onOpenCase,
  onFocusEditor,
  onFocusTimeline,
}: ProCommandPaletteProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const actionItems = useMemo<CommandPaletteItem[]>(
    () => [
      {
        kind: "action",
        id: "act-editor",
        title: "Focus deep editor",
        subtitle: "Jump to drafting surface",
        onSelect: () => {
          onFocusEditor();
          onClose();
        },
      },
      {
        kind: "action",
        id: "act-timeline",
        title: "Scroll to Auto-Timeline",
        subtitle: "Events & facts",
        onSelect: () => {
          onFocusTimeline();
          onClose();
        },
      },
    ],
    [onClose, onFocusEditor, onFocusTimeline],
  );

  const fileItems = useMemo(() => buildFileItems(workspaceRole), [workspaceRole]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const files = !n
      ? fileItems.slice(0, 8)
      : fileItems.filter(
          (f) =>
            f.title.toLowerCase().includes(n) ||
            f.subtitle.toLowerCase().includes(n) ||
            n.split(/\s+/).every((w) => f.title.toLowerCase().includes(w)),
        );
    const actions = !n
      ? actionItems
      : actionItems.filter(
          (a) =>
            a.title.toLowerCase().includes(n) || a.subtitle.toLowerCase().includes(n),
        );
    return { files, actions };
  }, [actionItems, fileItems, q]);

  const flatSelectable = useMemo(
    () => [...filtered.actions, ...filtered.files] as CommandPaletteItem[],
    [filtered.actions, filtered.files],
  );

  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  if (!open) return null;

  const runItem = (item: CommandPaletteItem) => {
    if (item.kind === "action") {
      item.onSelect();
      return;
    }
    onOpenCase(item.title);
    onClose();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(flatSelectable.length - 1, 0)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
    if (e.key === "Enter" && flatSelectable[highlight]) {
      e.preventDefault();
      runItem(flatSelectable[highlight]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
      role="dialog"
      aria-label="Universal Command Center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Command className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search cases… try "Miller"'
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {filtered.actions.length > 0 ? (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Actions
              </p>
              <ul className="space-y-0.5">
                {filtered.actions.map((item, idx) => {
                  const flatIdx = idx;
                  const active = highlight === flatIdx;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(flatIdx)}
                        onClick={() => runItem(item)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                          active ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Sparkles className="h-4 w-4 shrink-0 opacity-70" />
                        <span>
                          <span className="font-semibold">{item.title}</span>
                          <span
                            className={`mt-0.5 block text-xs ${active ? "text-white/70" : "text-slate-500"}`}
                          >
                            {item.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cases & files
            </p>
            <ul className="space-y-0.5">
              {filtered.files.map((item, idx) => {
                const flatIdx = filtered.actions.length + idx;
                const active = highlight === flatIdx;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(flatIdx)}
                      onClick={() => runItem(item)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        active ? "bg-[#1E293B] text-white" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{item.title}</span>
                        <span
                          className={`block truncate text-xs ${active ? "text-white/70" : "text-slate-500"}`}
                        >
                          {item.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filtered.files.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No matches.</p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400">
          Universal Command Center · ⌘K / Ctrl+K
        </div>
      </div>
    </div>
  );
}
