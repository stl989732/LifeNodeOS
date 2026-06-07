"use client";

import { X } from "lucide-react";

/**
 * Glassmorphism tab strip for concurrent Kitchen Node recipes (Linear / Notion style).
 */
export default function KitchenRecipeTabBar({
  tabs,
  activeTabId,
  onSelect,
  onCloseTab,
  className = "",
}) {
  if (!tabs?.length) return null;

  return (
    <nav
      aria-label="Open recipes"
      className={`rounded-2xl border border-white/55 bg-white/40 px-2 py-2 shadow-[0_8px_32px_rgba(15,23,42,0.07)] backdrop-blur-xl ${className}`}
    >
      <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const label = tab.recipe?.title?.trim() || "Recipe";
          return (
            <div
              key={tab.id}
              className={`flex shrink-0 items-stretch overflow-hidden rounded-xl transition-all duration-200 ${
                active
                  ? "bg-white/95 shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70"
                  : "bg-white/30 hover:bg-white/70"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                disabled={tab.loading}
                aria-selected={active}
                className={`min-w-0 px-3 py-2 text-left text-xs font-semibold transition-colors disabled:opacity-60 ${
                  active ? "text-[#1E293B]" : "text-[#64748B] hover:text-[#1E293B]"
                }`}
              >
                <span className="block max-w-[9rem] truncate">{label}</span>
                {tab.loading ? (
                  <span className="mt-0.5 block text-[10px] font-medium text-[#84A59D]">Loading…</span>
                ) : null}
              </button>
              {typeof onCloseTab === "function" ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="flex shrink-0 items-center border-l border-slate-200/60 px-2 text-[#94A3B8] transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`Close ${label}`}
                  title="Close tab"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
