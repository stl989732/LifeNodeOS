"use client";

/**
 * Glassmorphism tab strip for concurrent Kitchen Node recipes (Linear / Notion style).
 */
export default function KitchenRecipeTabBar({
  tabs,
  activeTabId,
  onSelect,
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
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              disabled={tab.loading}
              aria-selected={active}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-left text-xs font-semibold transition-all duration-200 disabled:opacity-60 ${
                active
                  ? "bg-white/95 text-[#1E293B] shadow-[0_2px_12px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70"
                  : "text-[#64748B] hover:bg-white/70 hover:text-[#1E293B]"
              }`}
            >
              <span className="block max-w-[11rem] truncate">{label}</span>
              {tab.loading ? (
                <span className="mt-0.5 block text-[10px] font-medium text-[#84A59D]">Loading…</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
