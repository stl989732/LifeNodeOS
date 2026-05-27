"use client";

import { Minus, MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProRoleId } from "@/src/lib/proNode/types";
import {
  filterDiscoveryCatalog,
  flattenDiscoveryTools,
  getDiscoveryCatalog,
  type DiscoveryCatalog,
} from "@/src/lib/proNode/discoveryCatalog";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";

const PREVIEW_MAX_TOOLS = 12;

type Props = {
  role: ProRoleId;
  connectedTools: string[];
  onToggleTool: (name: string) => void;
  minimized: boolean;
  onToggleMinimize: () => void;
};

export default function ProFocusDiscoveryCard({
  role,
  connectedTools,
  onToggleTool,
  minimized,
  onToggleMinimize,
}: Props) {
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const catalog = useMemo(() => getDiscoveryCatalog(role), [role]);
  const filtered = useMemo(
    () => filterDiscoveryCatalog(catalog, query),
    [catalog, query],
  );

  const flatAll = useMemo(() => flattenDiscoveryTools(catalog), [catalog]);
  const flatFiltered = useMemo(() => flattenDiscoveryTools(filtered), [filtered]);
  const previewRows = useMemo(() => flatFiltered.slice(0, PREVIEW_MAX_TOOLS), [flatFiltered]);
  const hasMore = flatFiltered.length > PREVIEW_MAX_TOOLS;

  if (minimized) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">
            Focus Mode · App discovery
            <span className="ml-2 font-normal text-slate-500">
              ({flatAll.length} apps for this role)
            </span>
          </p>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
          >
            Expand
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id="pro-focus-discovery"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Focus Mode
            </p>
            <h3 className="text-sm font-bold text-[#1E293B]">App Discovery &amp; Connect</h3>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500">
              Pick apps for your professional stack. When you connect one, you can{" "}
              <span className="font-semibold text-slate-700">Log in</span> now or{" "}
              <span className="font-semibold text-slate-700">Log in later</span> from the prompt.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              title="Minimize this card"
            >
              <Minus className="h-3.5 w-3.5" />
              Minimize
            </button>
          </div>
        </div>

        <div className="border-b border-slate-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-800">{catalog.headline}</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps & categories…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none ring-indigo-400/30 focus:ring-2"
            />
          </div>
        </div>

        <div className="max-h-[min(220px,40vh)] space-y-3 overflow-y-auto p-4">
          {previewRows.length === 0 ? (
            <p className="text-xs text-slate-500">No matches — try another search.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {previewRows.map(({ category, tool }) => {
                const active = connectedTools.includes(tool);
                return (
                  <button
                    key={`${category}-${tool}`}
                    type="button"
                    title={category}
                    onClick={() => onToggleTool(tool)}
                    className={`max-w-full truncate rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition ${
                      active
                        ? "border-[#1E293B] bg-[#1E293B] text-white"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {tool}
                  </button>
                );
              })}
            </div>
          )}
          {hasMore ? (
            <p className="text-[10px] text-slate-500">
              Showing {previewRows.length} of {flatFiltered.length} matches in quick view.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#1E293B] shadow-sm hover:bg-slate-50"
          >
            <MoreHorizontal className="h-4 w-4" />
            More apps
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setMoreOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Open full library
          </button>
        </div>
      </div>

      {moreOpen ? (
        <DiscoveryMoreModal
          catalog={filtered}
          fullCatalog={catalog}
          query={query}
          onQueryChange={setQuery}
          connectedTools={connectedTools}
          onToggleTool={onToggleTool}
          onClose={() => setMoreOpen(false)}
        />
      ) : null}
    </>
  );
}

function DiscoveryMoreModal({
  catalog,
  fullCatalog,
  query,
  onQueryChange,
  connectedTools,
  onToggleTool,
  onClose,
}: {
  catalog: DiscoveryCatalog;
  fullCatalog: DiscoveryCatalog;
  query: string;
  onQueryChange: (q: string) => void;
  connectedTools: string[];
  onToggleTool: (name: string) => void;
  onClose: () => void;
}) {
  const display = query.trim() ? catalog : fullCatalog;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-more-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/45 p-4 pb-8 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
          <div>
            <h2 id="discovery-more-title" className="text-base font-bold text-[#1E293B]">
              Full app library
            </h2>
            <p className="text-xs text-slate-500">{fullCatalog.headline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="border-b border-slate-50 px-4 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Filter apps…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none ring-indigo-400/30 focus:ring-2"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-[11px] text-slate-500">
            Tap an app to add or remove it from your stack. You will be asked to{" "}
            <span className="font-semibold text-slate-700">Log in</span> or{" "}
            <span className="font-semibold text-slate-700">Log in later</span>.
          </p>
          {display.groups.length === 0 ? (
            <p className="text-sm text-slate-500">No apps match this filter.</p>
          ) : (
            <div className="space-y-5">
              {display.groups.map((g) => (
                <div key={g.category}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {g.category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {g.tools.map((tool) => {
                      const active = connectedTools.includes(tool);
                      return (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => onToggleTool(tool)}
                          className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                            active
                              ? "border-[#1E293B] bg-[#1E293B] text-white"
                              : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          {tool}
                        </button>
                      );
                    })}
                  </div>
                  <AppCategoryRequestFooter
                    category={g.category}
                    nodeLabel="ProNode"
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
