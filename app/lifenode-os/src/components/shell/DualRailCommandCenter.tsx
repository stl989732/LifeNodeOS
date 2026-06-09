"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  LogOut,
  Menu,
  PenLine,
  Settings,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import GlobalWhiteboardOverlay from "./GlobalWhiteboardOverlay";
import LifeNodeSettingsPanel from "@/src/components/settings/LifeNodeSettingsPanel";
import {
  HAT_SHELL_TO_ACTIVE,
  useLifeNodeContext,
} from "@/src/context/LifeNodeContext";
import { HAT_NAV_ITEMS, isHatNavActive, type HatNavItem } from "./hat-routes";
import NodeGalleryModal from "./NodeGalleryModal";
import { sortBySidebarHatOrder } from "./node-order";
import { catalogForHat, hatIdFromPath } from "./node-feature-catalog";

const RAIL1_EASE =
  "transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const RAIL_BG = "bg-[#F8F8FF] border-r border-slate-200/90 text-black";

const ACTIVE_NODE =
  "bg-slate-200/90 text-black ring-1 ring-slate-300/80";

const MOBILE_NAV_HEIGHT =
  "calc(4.25rem + env(safe-area-inset-bottom, 0px))";

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
      className="pointer-events-none fixed bottom-28 right-5 z-[75] hidden select-none text-right text-slate-500 md:block"
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

function NodeIconBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80">
      <Icon className="h-5 w-5 text-black" strokeWidth={1.75} />
    </span>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFeatureHatId, setMobileFeatureHatId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    registerHatGalleryLauncher(() => setGalleryOpen(true));
    return () => registerHatGalleryLauncher(null);
  }, [registerHatGalleryLauncher]);

  useEffect(() => {
    setExpandedHat(null);
    setMobileFeatureHatId(null);
    setMobileMenuOpen(false);
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

  function selectFeature(
    hatId: string,
    featureId: string,
    route: string,
    pathPrefix: string,
  ) {
    setExpandedHat(null);
    setMobileFeatureHatId(null);
    setMobileMenuOpen(false);
    const onCurrent = isHatNavActive(pathname, pathPrefix);
    if (onCurrent && onFeatureSelect) {
      onFeatureSelect(featureId);
      return;
    }
    const qs =
      featureId && featureId !== "overview"
        ? `?ln-feature=${encodeURIComponent(featureId)}`
        : "";
    router.push(`${route}${qs}`);
  }

  function handleMobileNodeTap(item: HatNavItem) {
    const active = isHatNavActive(pathname, item.pathPrefix);
    const features = featuresForHat(item.id);

    if (active && features.length > 0) {
      setMobileFeatureHatId(
        mobileFeatureHatId === item.id ? null : item.id,
      );
      setMobileMenuOpen(false);
      return;
    }

    setMobileFeatureHatId(null);
    router.push(item.route);
  }

  const mobileFeatureHat = filteredNodeItems.find(
    (item) => item.id === mobileFeatureHatId,
  );
  const mobileFeatureList = mobileFeatureHat
    ? featuresForHat(mobileFeatureHat.id)
    : [];

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

      {/* Desktop rail — nodes + feature dropdowns */}
      <nav
        className={`group/rail1 sticky top-0 z-[60] hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] w-[60px] shrink-0 flex-col px-1.5 py-3 shadow-sm md:flex ${RAIL1_EASE} hover:w-[min(12.5vw,13.5rem)] ${RAIL_BG}`}
        data-va-rail="1"
        aria-label="Node navigation"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden">
          {filteredNodeItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-1 py-4 text-center">
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
                <div key={id} className="relative w-full shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedHat(expanded ? null : id)}
                    title={label}
                    aria-expanded={expanded}
                    aria-haspopup="menu"
                    className={`relative flex min-h-[44px] w-full items-center justify-center rounded-xl py-2 transition-colors duration-200 group-hover/rail1:justify-start group-hover/rail1:gap-2 ${
                      active ? ACTIVE_NODE : "text-black hover:bg-slate-100"
                    } px-0 group-hover/rail1:px-2`}
                  >
                    <NodeIconBadge Icon={Icon} />
                    <span className="hidden min-w-0 max-w-0 overflow-hidden text-left text-xs font-bold uppercase tracking-wider text-black transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:inline group-hover/rail1:max-w-[9rem]">
                      {label}
                    </span>
                    <ChevronDown
                      className={`hidden h-3.5 w-3.5 shrink-0 text-slate-500 group-hover/rail1:ml-auto group-hover/rail1:block ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>

                  {showFeatures ? (
                    <div
                      role="menu"
                      className="mx-0 mb-1 rounded-xl border border-slate-200/90 bg-white py-1 shadow-md group-hover/rail1:mx-0.5"
                    >
                      {features.map(({ id: fid, label: flabel, icon: FIcon }) => {
                        const featureActive =
                          active &&
                          (activeFeatureId === fid ||
                            (!activeFeatureId && fid === "overview"));
                        return (
                          <button
                            key={fid}
                            type="button"
                            role="menuitem"
                            onClick={() =>
                              selectFeature(id, fid, route, pathPrefix)
                            }
                            className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] font-semibold transition hover:bg-slate-50 ${
                              featureActive
                                ? "bg-slate-100 text-black"
                                : "text-slate-700"
                            }`}
                          >
                            <FIcon
                              className="h-3.5 w-3.5 shrink-0 opacity-80"
                              strokeWidth={1.75}
                            />
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

        <div className="mt-auto w-full shrink-0 space-y-1 border-t border-slate-200/90 pt-2">
          <button
            type="button"
            onClick={() => setWhiteboardOpen(true)}
            aria-label="Open global whiteboard"
            title="Whiteboard"
            className="group/wb flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-600/40 bg-gradient-to-br from-teal-600 to-cyan-700 py-2 text-white shadow-md transition hover:from-teal-500 hover:to-cyan-600 group-hover/rail1:justify-start"
          >
            <PenLine className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="hidden min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:inline group-hover/rail1:max-w-[9rem]">
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
            <span className="hidden min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:inline group-hover/rail1:max-w-[9rem]">
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
            <span className="hidden min-w-0 max-w-0 overflow-hidden text-left text-[10px] font-bold uppercase tracking-wider transition-[max-width,opacity] duration-300 ease-out group-hover/rail1:inline group-hover/rail1:max-w-[9rem]">
              Settings
            </span>
          </button>
        </div>
      </nav>

      <div
        className="ln-node-stage relative z-0 min-w-0 flex-1 overflow-x-hidden pb-[var(--mobile-nav-pad,0px)] md:pb-0"
        style={
          {
            "--mobile-nav-pad": MOBILE_NAV_HEIGHT,
          } as React.CSSProperties
        }
      >
        {children}
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/90 bg-[#F8F8FF]/95 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Mobile node navigation"
        data-mobile-nav="1"
      >
        <div className="flex items-stretch gap-0.5 px-1 pt-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filteredNodeItems.length === 0 ? (
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="mx-auto flex min-h-[44px] items-center rounded-xl px-4 text-[11px] font-bold uppercase tracking-wide text-teal-700"
              >
                Add your first Node
              </button>
            ) : (
              filteredNodeItems.map((item) => {
                const active = isHatNavActive(pathname, item.pathPrefix);
                const sheetOpen = mobileFeatureHatId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileNodeTap(item)}
                    aria-label={item.label}
                    aria-expanded={sheetOpen}
                    title={item.label}
                    className={`flex min-h-[44px] min-w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 transition ${
                      active || sheetOpen
                        ? "bg-slate-200/90 text-black ring-1 ring-slate-300/80"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <item.Icon
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="max-w-[3.5rem] truncate text-[9px] font-bold uppercase tracking-wide">
                      {item.label.replace(/Node$/, "").trim() || item.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileFeatureHatId(null);
              setMobileMenuOpen((open) => !open);
            }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className={`mb-1.5 flex min-h-[44px] min-w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-slate-200/90 px-1.5 transition ${
              mobileMenuOpen
                ? "bg-slate-200 text-black"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            )}
            <span className="text-[9px] font-bold uppercase tracking-wide">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile feature sheet (tap active node) */}
      {mobileFeatureHat && mobileFeatureList.length > 0 ? (
        <>
          <button
            type="button"
            aria-label="Close features"
            className="fixed inset-0 z-[68] bg-slate-900/30 md:hidden"
            onClick={() => setMobileFeatureHatId(null)}
          />
          <div
            role="dialog"
            aria-label={`${mobileFeatureHat.label} features`}
            className="fixed inset-x-0 z-[69] rounded-t-2xl border border-b-0 border-slate-200/90 bg-white shadow-2xl md:hidden"
            style={{
              bottom: MOBILE_NAV_HEIGHT,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">
                {mobileFeatureHat.label}
              </p>
              <button
                type="button"
                onClick={() => setMobileFeatureHatId(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[40dvh] overflow-y-auto py-1">
              {mobileFeatureList.map(({ id: fid, label: flabel, icon: FIcon }) => {
                const active = isHatNavActive(
                  pathname,
                  mobileFeatureHat.pathPrefix,
                );
                const featureActive =
                  active &&
                  (activeFeatureId === fid ||
                    (!activeFeatureId && fid === "overview"));
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() =>
                      selectFeature(
                        mobileFeatureHat.id,
                        fid,
                        mobileFeatureHat.route,
                        mobileFeatureHat.pathPrefix,
                      )
                    }
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition hover:bg-slate-50 ${
                      featureActive ? "bg-slate-100 text-black" : "text-slate-700"
                    }`}
                  >
                    <FIcon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
                    {flabel}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {/* Mobile menu drawer */}
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[68] bg-slate-900/35 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-label="App menu"
            className="fixed inset-x-0 z-[69] rounded-t-2xl border border-b-0 border-slate-200/90 bg-[#F8F8FF] shadow-2xl md:hidden"
            style={{
              bottom: MOBILE_NAV_HEIGHT,
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">LifeNode OS</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 p-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWhiteboardOpen(true);
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-teal-600/40 bg-gradient-to-br from-teal-600 to-cyan-700 px-4 py-3 text-left text-sm font-bold text-white shadow-md"
              >
                <PenLine className="h-5 w-5 shrink-0" strokeWidth={2} />
                Whiteboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-black hover:bg-slate-50"
              >
                <Settings className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setGalleryOpen(true);
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-black hover:bg-slate-50"
              >
                <Menu className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                Manage Nodes
              </button>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-black hover:bg-slate-50"
              >
                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </div>
        </>
      ) : null}

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
