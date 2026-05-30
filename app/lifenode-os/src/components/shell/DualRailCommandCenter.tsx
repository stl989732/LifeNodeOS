"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, LogOut, PenLine, Plus, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import GlobalWhiteboardOverlay from "./GlobalWhiteboardOverlay";
import LifeNodeSettingsPanel from "@/src/components/settings/LifeNodeSettingsPanel";
import {
  HAT_SHELL_TO_ACTIVE,
  useLifeNodeContext,
} from "@/src/context/LifeNodeContext";
import { HAT_NAV_ITEMS, isHatNavActive, isTraderNodePath } from "./hat-routes";
import NodeGalleryModal from "./NodeGalleryModal";

const RAIL_GLASS =
  "border border-solid border-white/10 bg-white/[0.08] backdrop-blur-[12px] shadow-lg shadow-slate-900/10 dark:bg-[#0a0a0d]/75 dark:shadow-black/40";

const RAIL1_EASE =
  "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const RAIL2_WIDTH_EASE =
  "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]";

const ACTIVE_HAT =
  "shadow-[0_0_22px_rgba(45,212,191,0.35)] ring-2 ring-teal-400/50 bg-teal-500/15 text-teal-100";

const ACTIVE_FEATURE =
  "shadow-[0_0_18px_rgba(45,212,191,0.28)] ring-2 ring-teal-400/45 bg-teal-500/12 text-teal-950 dark:text-teal-50";

/** Per-hat label contrast on the far-left rail (see LifePulse dark vs Biz/Vital/Pro light). */
function hatLabelTone(hatId: string, active: boolean, darkRails: boolean): string {
  if (active) return "text-teal-100";
  if (hatId === "pulse") return "text-slate-900";
  if (hatId === "work" || hatId === "vital" || hatId === "pro") {
    return darkRails ? "text-slate-100" : "text-slate-800";
  }
  return darkRails ? "text-slate-200" : "text-slate-700";
}

function hatLinkSurface(hatId: string, active: boolean): string {
  if (active || hatId !== "pulse") return "";
  return "bg-emerald-50/90 ring-1 ring-emerald-200/50 dark:bg-emerald-50/90";
}

export type ShellFeatureItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type StageBackground = "none" | "va";

type Props = {
  children: React.ReactNode;
  /** Biz / Home / VA / Vital / Pro: true. Trader: false (hard hide). */
  showFeatureRail: boolean;
  featureNav?: ShellFeatureItem[];
  activeFeatureId?: string;
  onFeatureSelect?: (id: string) => void;
  workspaceTone?: "light" | "dark";
  stageBackground?: StageBackground;
  /** Collapsed rail header (defaults to “Modules”). */
  featureRailTitle?: string;
};

function LinosWatermark({ dark }: { dark: boolean }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-28 right-5 z-[75] select-none text-right ${
        dark ? "text-zinc-600" : "text-slate-500/90"
      }`}
      aria-hidden
    >
      <p
        className="font-[family-name:var(--font-playfair)] text-lg italic tracking-tight"
        style={{
          textShadow: dark
            ? "0 0 24px rgba(6,182,212,0.15)"
            : "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        Linos
      </p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.28em] opacity-70">
        anchor
      </p>
    </div>
  );
}

export default function DualRailCommandCenter({
  children,
  showFeatureRail,
  featureNav = [],
  activeFeatureId,
  onFeatureSelect,
  workspaceTone = "light",
  stageBackground = "none",
  featureRailTitle = "Modules",
}: Props) {
  const pathname = usePathname();
  const traderPath = isTraderNodePath(pathname);
  const { configuredHats, toggleConfiguredHat, registerHatGalleryLauncher } =
    useLifeNodeContext();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    registerHatGalleryLauncher(() => setGalleryOpen(true));
    return () => registerHatGalleryLauncher(null);
  }, [registerHatGalleryLauncher]);

  const darkRails = traderPath || workspaceTone === "dark";
  const rail1Surface = darkRails
    ? "border-white/10 bg-[#09090b]/88 text-zinc-200"
    : "border-white/10 bg-white/40 text-slate-800";
  const rail2Surface = darkRails
    ? "border-white/10 bg-[#0c0c0f]/82 text-zinc-200"
    : "border-white/10 bg-white/35 text-slate-800";

  const showR2 = showFeatureRail && featureNav.length > 0 && !traderPath;

  const hubItem = useMemo(
    () => HAT_NAV_ITEMS.find((i) => i.id === "shell"),
    []
  );
  const HubIcon = hubItem?.Icon;

  const filteredNodeItems = useMemo(() => {
    return HAT_NAV_ITEMS.filter((item) => {
      if (item.id === "shell") return false;
      if (item.id === "pulse") return true;
      const node = HAT_SHELL_TO_ACTIVE[item.id];
      return node ? configuredHats.includes(node) : false;
    });
  }, [configuredHats]);

  return (
    <div
      className={`relative flex min-h-full w-full ${
        stageBackground === "va"
          ? "bg-gradient-to-br from-slate-100 via-teal-50/35 to-indigo-100/70 text-slate-900"
          : ""
      }`}
    >
      {stageBackground === "va" ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,_rgba(13,148,136,0.14),_transparent_50%),radial-gradient(ellipse_at_80%_100%,_rgba(99,102,241,0.12),_transparent_45%)]" />
      ) : null}

      <NodeGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        activeHats={configuredHats}
        onToggleHat={(node) => toggleConfiguredHat(node)}
      />

      {/* Rail 1 — hat switcher (Hub always; nodes filtered by active hats) */}
      <nav
        className={`group/rail1 sticky top-0 z-[60] flex h-[calc(100dvh-env(safe-area-inset-top,0px))] w-[60px] shrink-0 flex-col border-r border-solid border-white/10 py-3 pl-2 pr-1 ${RAIL1_EASE} hover:w-[min(12.5vw,13.5rem)] ${RAIL_GLASS} ${rail1Surface}`}
        data-va-rail="1"
        aria-label="Node hats"
      >
        {hubItem && HubIcon ? (
          <div className="shrink-0">
            <Link
              href={hubItem.route}
              title={hubItem.label}
              className={`relative flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl py-2 transition-colors duration-200 group-hover/rail1:justify-start ${
                isHatNavActive(pathname, hubItem.pathPrefix)
                  ? ACTIVE_HAT
                  : "text-inherit hover:bg-white/10 dark:hover:bg-white/5"
              } px-0 group-hover/rail1:px-2.5`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 dark:bg-white/5">
                <HubIcon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 max-w-0 overflow-hidden text-left text-xs font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[11rem] group-hover/rail1:opacity-100">
                {hubItem.label}
              </span>
            </Link>
          </div>
        ) : null}

        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {filteredNodeItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-1.5 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-slate-500 dark:text-zinc-500">
                Choose your first Node to begin orchestrating.
              </p>
            </div>
          ) : (
            filteredNodeItems.map(({ id, label, route, Icon, pathPrefix }) => {
              const active = isHatNavActive(pathname, pathPrefix);
              return (
                <Link
                  key={id}
                  href={route}
                  title={label}
                  className={`relative flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl py-2 transition-colors duration-200 group-hover/rail1:justify-start ${
                    active
                      ? ACTIVE_HAT
                      : `text-inherit hover:bg-white/10 dark:hover:bg-white/5 ${hatLinkSurface(id, active)}`
                  } px-0 group-hover/rail1:px-2.5`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 dark:bg-white/5">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span
                    className={`min-w-0 max-w-0 overflow-hidden text-left text-xs font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[11rem] group-hover/rail1:opacity-100 ${hatLabelTone(id, active, darkRails)}`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <div className="mt-auto shrink-0 space-y-1 border-t border-solid border-white/10 pt-2">
          <button
            type="button"
            onClick={() => setWhiteboardOpen(true)}
            aria-label="Open global whiteboard — sketch and diagram"
            title="Whiteboard — quick sketches & diagrams"
            className="group/wb flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-300/50 bg-gradient-to-br from-teal-600 to-cyan-700 py-2 text-white shadow-md shadow-teal-900/30 transition hover:from-teal-500 hover:to-cyan-600 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group-hover/rail1:justify-start"
          >
            <PenLine
              className="h-5 w-5 shrink-0 text-white"
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
              Whiteboard
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label="Add or remove hats — open Node gallery"
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.04] py-2 text-slate-500 transition hover:border-teal-400/40 hover:bg-teal-500/10 hover:text-teal-200 group-hover/rail1:justify-start dark:text-zinc-400 dark:hover:text-teal-100"
            title="Want to add more hats? Return to LifeNode Dashboard."
          >
            <Plus className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
              Add hat?
            </span>
          </button>
          {!showR2 ? (
            <>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                aria-label="Sign out"
                title="Sign out"
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-2 text-slate-600 transition hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-900 group-hover/rail1:justify-start dark:text-zinc-300 dark:hover:text-rose-100"
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
                  Sign out
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open LifeNode OS settings"
                title="Settings"
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-2 text-slate-600 transition hover:border-teal-400/35 hover:bg-teal-500/10 hover:text-teal-800 group-hover/rail1:justify-start dark:text-zinc-300 dark:hover:text-teal-100"
              >
                <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
                  Settings
                </span>
              </button>
            </>
          ) : null}
        </div>
      </nav>

      {/* Rail 2 — collapsed icon strip; spring expand on hover */}
      {showR2 ? (
        <aside
          className={`group/rail2 sticky top-0 z-[55] flex h-[calc(100dvh-env(safe-area-inset-top,0px))] w-[52px] shrink-0 flex-col overflow-hidden border-r border-solid border-white/10 py-3 ${RAIL2_WIDTH_EASE} hover:w-[220px] ${RAIL_GLASS} ${rail2Surface}`}
          aria-label="Node features"
          data-va-rail="2"
        >
          <div className="flex h-full w-[220px] min-w-[220px] flex-col px-1">
            <div className="mb-2 flex h-8 shrink-0 items-center gap-2 px-2">
              <LayoutGrid className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
              <p className="min-w-0 max-w-0 overflow-hidden text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/rail2:max-w-[12rem] group-hover/rail2:opacity-100">
                {featureRailTitle}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
              {featureNav.map(({ id, label, icon: Icon }) => {
                const active = activeFeatureId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onFeatureSelect?.(id)}
                    className={`flex w-full items-center gap-2 rounded-xl py-2.5 pl-2 pr-2 text-left text-xs font-semibold transition-colors duration-200 group-hover/rail2:justify-start ${
                      active
                        ? ACTIVE_FEATURE
                        : "justify-center text-inherit hover:bg-white/15 group-hover/rail2:justify-start dark:hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                    <span className="min-w-0 max-w-0 overflow-hidden truncate opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/rail2:max-w-[11rem] group-hover/rail2:opacity-100">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto shrink-0 space-y-1 border-t border-solid border-white/10 pt-2">
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                aria-label="Sign out"
                title="Sign out"
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] py-2.5 text-slate-600 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-900 group-hover/rail2:justify-start dark:text-zinc-300 dark:hover:text-rose-100"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/rail2:max-w-[9rem] group-hover/rail2:opacity-100">
                  Sign out
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open LifeNode OS settings"
                title="Settings — account, AI, notifications, appearance"
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-2.5 text-slate-600 transition hover:border-teal-400/40 hover:bg-teal-500/12 hover:text-teal-900 group-hover/rail2:justify-start dark:text-zinc-300 dark:hover:text-teal-100"
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/rail2:max-w-[9rem] group-hover/rail2:opacity-100">
                  Settings
                </span>
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <div className="relative z-0 min-w-0 flex-1 overflow-x-hidden">
        {children}
      </div>

      <GlobalWhiteboardOverlay
        open={whiteboardOpen}
        onClose={() => setWhiteboardOpen(false)}
      />

      <LifeNodeSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <LinosWatermark dark={darkRails} />
    </div>
  );
}
