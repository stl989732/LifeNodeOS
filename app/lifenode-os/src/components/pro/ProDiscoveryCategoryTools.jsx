"use client";

import { Maximize2, Minimize2, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";

export const DISCOVERY_APPS_PREVIEW_COUNT = 5;

function ToolToggleButton({ tool, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tool)}
      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-[#1E293B] bg-[#1E293B] text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {tool}
    </button>
  );
}

/** Category card body: first N apps visible, remainder behind “More”. */
export function ProDiscoveryCategoryTools({
  category,
  tools,
  connectedTools,
  onToggleTool,
  nodeLabel = "ProNode",
  chipClassName = "",
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreMinimized, setMoreMinimized] = useState(false);

  const preview = tools.slice(0, DISCOVERY_APPS_PREVIEW_COUNT);
  const overflow = tools.slice(DISCOVERY_APPS_PREVIEW_COUNT);

  return (
    <>
      <div className="space-y-2">
        {preview.map((tool) => (
          <ToolToggleButton
            key={tool}
            tool={tool}
            active={connectedTools.includes(tool)}
            onToggle={onToggleTool}
          />
        ))}
        {overflow.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setMoreMinimized(false);
              setMoreOpen(true);
            }}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#1E293B] transition hover:border-slate-400 hover:bg-slate-50 ${chipClassName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
            More ({overflow.length})
          </button>
        ) : null}
        <AppCategoryRequestFooter category={category} nodeLabel={nodeLabel} />
      </div>

      {moreOpen ? (
        <ProDiscoveryMoreFocusModal
          category={category}
          tools={overflow}
          connectedTools={connectedTools}
          onToggleTool={onToggleTool}
          nodeLabel={nodeLabel}
          minimized={moreMinimized}
          onToggleMinimize={() => setMoreMinimized((v) => !v)}
          onClose={() => {
            setMoreOpen(false);
            setMoreMinimized(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Full-screen focus picker for overflow apps in a category. */
export function ProDiscoveryMoreFocusModal({
  category,
  tools,
  connectedTools,
  onToggleTool,
  nodeLabel = "ProNode",
  minimized,
  onToggleMinimize,
  onClose,
}) {
  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 z-[110] w-[min(420px,92vw)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-slate-800">
            {category} · {tools.length} more apps
          </p>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-focus-title"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-4 pb-8 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Focus mode
            </p>
            <h2 id="discovery-focus-title" className="text-base font-bold text-[#1E293B]">
              {category}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {tools.length} additional app{tools.length === 1 ? "" : "s"} in this category
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              title="Minimize"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Minimize
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              title="Exit focus mode"
            >
              <X className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-[11px] text-slate-500">
            Tap to add or remove from your stack. You can log in when prompted.
          </p>
          <div className="space-y-2">
            {tools.map((tool) => (
              <ToolToggleButton
                key={tool}
                tool={tool}
                active={connectedTools.includes(tool)}
                onToggle={onToggleTool}
              />
            ))}
          </div>
          <AppCategoryRequestFooter category={category} nodeLabel={nodeLabel} />
        </div>
      </div>
    </div>
  );
}
