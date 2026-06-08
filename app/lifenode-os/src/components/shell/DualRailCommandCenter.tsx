"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, LogOut, PenLine, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import GlobalWhiteboardOverlay from "./GlobalWhiteboardOverlay";
import LifeNodeSettingsPanel from "@/src/components/settings/LifeNodeSettingsPanel";
import {
  HAT_SHELL_TO_ACTIVE,
  useLifeNodeContext,
} from "@/src/context/LifeNodeContext";
import { HAT_NAV_ITEMS, isHatNavActive } from "./hat-routes";
import NodeGalleryModal from "./NodeGalleryModal";
import { sortBySidebarHatOrder } from "./node-order";
import { catalogForHat, hatIdFromPath } from "./node-feature-catalog";

const RAIL1_EASE =
  "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const RAIL_BG = "bg-[#F8F8FF] border-r border-slate-200/90 text-black";

const ACTIVE_NODE =
  "bg-slate-200/90 text-black ring-1 ring-slate-300/80";

export type ShellFeatureItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type StageBackground = "none" | "va";

type Props = {
  children: React.ReactNode;
  /** @deprecated Rail 2 removed — features live in sidebar dropdowns. */
  showFeatureRail?: boolean;
  featureNav?: ShellFeatureItem[];
  activeFeatureId?: string;
  onFeatureSelect?: (id: string) => void;
  workspaceTone?: "light" | "dark";
  stageBackground?: StageBackground;
  featureRailTitle?: string;
};

function LinosWatermark() {
  return (
    <div
      className="pointer-events-none fixed bottom-28 right-5 z-[75] select-none text-right text-slate-500"
      aria-hidden
    >
      <p
        className="font-[family-name:var(--font-playfair)] text-lg italic tracking-tight"
        style={{ textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}
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
  featureNav = [],
  activeFeatureId,
  onFeatureSelect,
  stageBackground = "none",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { configuredHats, toggleConfiguredHat, registerHatGalleryLauncher } =
    useLifeNodeContext();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedHat, setExpandedHat] = useState<string | null>(null);

  useEffect(() => {
    registerHatGalleryLauncher(() => setGalleryOpen(true));
    return () => registerHatGalleryLauncher(null);
  }, [registerHatGalleryLauncher]);

  useEffect(() => {
    setExpandedHat(null);
  }, [pathname]);

  const currentHatId = hatIdFromPath(pathname);

  const filteredNodeItems = useMemo(() => {
    const items = HAT_NAV_ITEMS.filter((item) => {
      if (item.id === "shell") return false;
      if (item.id === "pulse" || item.id === "calendar") return true;
      const node = HAT_SHELL_TO_ACTIVE[item.id];
      return node ? configuredHats.includes(node) : false;
    });
    return sortBySidebarHatOrder(items);
  }, [configuredHats]);

  const liveFeatures = featureNav.length > 0 ? featureNav : [];

  function featuresForHat(hatId: string): ShellFeatureItem[] {
    if (hatId === currentHatId && liveFeatures.length > 0) return liveFeatures;
    return catalogForHat(hatId);
  }

  function selectFeature(hatId: string, featureId: string, route: string, pathPrefix: string) {
    setExpandedHat(null);
    const onCurrent = isHatNavActive(pathname, pathPrefix);
    if (onCurrent && onFeatureSelect) {
      onFeatureSelect(featureId);
      return;
    }
    const qs = featureId && featureId !== "overview"
      ? `?ln-feature=${encodeURIComponent(featureId)}`
      : "";
    router.push(`${route}${qs}`);
  }

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

      {/* Rail 1 — nodes + feature dropdowns */}
      <nav
        className={`group/rail1 sticky top-0 z-[60] flex h-[calc(100dvh-env(safe-area-inset-top,0px))] w-[60px] shrink-0 flex-col py-3 pl-2 pr-1 shadow-sm ${RAIL1_EASE} hover:w-[min(12.5vw,13.5rem)] ${RAIL_BG}`}
        data-va-rail="1"
        aria-label="Node navigation"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {filteredNodeItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-1.5 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-slate-500">
                Choose your first Node to begin orchestrating.
              </p>
            </div>
          ) : (
            filteredNodeItems.map(({ id, label, route, Icon, pathPrefix }) => {
              const active = isHatNavActive(pathname, pathPrefix);
              const expanded = expandedHat === id;
              const features = featuresForHat(id);
              const showFeatures = expanded && features.length > 0;

              return (
                <div key={id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedHat(expanded ? null : id)}
                    title={label}
                    aria-expanded={expanded}
                    aria-haspopup="menu"
                    className={`relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-2 transition-colors duration-200 group-hover/rail1:justify-start ${
                      active ? ACTIVE_NODE : "text-black hover:bg-slate-100"
                    } px-0 group-hover/rail1:px-2.5`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80">
                      <Icon className="h-5 w-5 text-black" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 max-w-0 overflow-hidden text-left text-xs font-bold uppercase tracking-wider text-black opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
                      {label}
                    </span>
                    <ChevronDown
                      className={`ml-auto h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 transition group-hover/rail1:opacity-100 ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>

                  {showFeatures ? (
                    <div
                      role="menu"
                      className="mx-0.5 mb-1 rounded-xl border border-slate-200/90 bg-white py-1 shadow-md group-hover/rail1:mx-1"
                    >
                      {features.map(({ id: fid, label: flabel, icon: FIcon }) => {
                        const featureActive =
                          active && (activeFeatureId === fid || (!activeFeatureId && fid === "overview"));
                        return (
                          <button
                            key={fid}
                            type="button"
                            role="menuitem"
                            onClick={() => selectFeature(id, fid, route, pathPrefix)}
                            className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] font-semibold transition hover:bg-slate-50 ${
                              featureActive ? "bg-slate-100 text-black" : "text-slate-700"
                            }`}
                          >
                            <FIcon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
                            <span className="min-w-0 truncate opacity-0 transition-opacity group-hover/rail1:opacity-100">
                              {flabel}
                            </span>
                          </button>
                        );
                      })}
                      {!active ? (
                        <Link
                          href={route}
                          role="menuitem"
                          onClick={() => setExpandedHat(null)}
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-teal-700 hover:bg-teal-50"
                        >
                          Open {label}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto shrink-0 space-y-1 border-t border-slate-200/90 pt-2">
          <button
            type="button"
            onClick={() => setWhiteboardOpen(true)}
            aria-label="Open global whiteboard"
            title="Whiteboard"
            className="group/wb flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-600/40 bg-gradient-to-br from-teal-600 to-cyan-700 py-2 text-white shadow-md transition hover:from-teal-500 hover:to-cyan-600 group-hover/rail1:justify-start"
          >
            <PenLine className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
              Whiteboard
            </span>
          </button>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
            aria-label="Sign out"
            title="Sign out"
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-black transition hover:bg-slate-100 group-hover/rail1:justify-start"
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
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-black transition hover:bg-slate-100 group-hover/rail1:justify-start"
          >
            <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider opacity-0 transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:max-w-[9rem] group-hover/rail1:opacity-100">
              Settings
            </span>
          </button>
        </div>
      </nav>

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

      <LinosWatermark />
    </div>
  );
}
