"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutWithClientCleanup } from "@/src/lib/sessionClientIsolation";
import {
  ArrowRight,
  Briefcase,
  HeartPulse,
  Home,
  LogOut,
  MessageSquare,
  Scale,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { useLifeNode } from "@/src/context/LifeNodeContext";
import NodeGalleryModal from "@/src/components/shell/NodeGalleryModal";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";
import { hydrateConfiguredHatKeys } from "@/lib/pending-shell-hats";
import NotificationsBell from "@/src/components/NotificationsBell";
import { ACTIVE_TO_HAT_KEY } from "@/lib/node-mappings";

const ONBOARDING_TOTAL_STEPS = 3;

const HATS = {
  work: {
    label: "BizNode",
    route: "/work",
    Icon: Briefcase,
    summary: "Connect your work stack and track priorities from one place.",
  },
  home: {
    label: "HomeNode",
    route: "/home",
    Icon: Home,
    summary: "Plan meals, chores, and family logistics in your home command center.",
  },
  vital: {
    label: "VitalNode",
    route: "/vital",
    Icon: HeartPulse,
    summary: "Log vitals, symptoms, and wellness habits on a blank slate.",
  },
  va: {
    label: "VANode",
    route: "/vanode",
    Icon: MessageSquare,
    summary: "Manage inbox tasks and assistant workflows when you're ready.",
  },
  trader: {
    label: "TraderNode",
    route: "/trader",
    Icon: TrendingUp,
    summary: "Set up watchlists and price alerts for your trading workflow.",
  },
  pro: {
    label: "ProNode",
    route: "/pro",
    Icon: Scale,
    summary: "Organize cases, citations, and research in your legal sidecar.",
  },
};

/** Gallery order: Biz → VA → Home → Vital → Pro → Trader */
const HAT_KEYS = ["work", "va", "home", "vital", "pro", "trader"];

const HAT_TO_NODE = {
  work: "BizNode",
  home: "HomeNode",
  vital: "VitalNode",
  trader: "TraderNode",
  va: "VANode",
  pro: "ProNode",
};

function OrreryAssembly({ targetLabel }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0F17] px-6 text-slate-100">
      <style>{`
        @keyframes ln-orbit {
          from { transform: rotate(0deg) translateX(74px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(74px) rotate(-360deg); }
        }
        @keyframes ln-orbit-slow {
          from { transform: rotate(0deg) translateX(122px) rotate(0deg); }
          to { transform: rotate(-360deg) translateX(122px) rotate(360deg); }
        }
        @keyframes ln-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(99,102,241,0.15), 0 0 30px rgba(99,102,241,0.35); }
          50% { box-shadow: 0 0 0 rgba(99,102,241,0.25), 0 0 52px rgba(99,102,241,0.65); }
        }
        .ln-orbit-1 { animation: ln-orbit 2.4s linear infinite; }
        .ln-orbit-2 { animation: ln-orbit-slow 4.2s linear infinite; }
        .ln-core { animation: ln-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(30,41,59,0.5),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(30,41,59,0.35),transparent_60%)]" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="relative mb-8 h-72 w-72">
          <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/20" />
          <div className="absolute left-1/2 top-1/2 h-[148px] w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />

          <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-300 to-cyan-300 ln-core" />

          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-300 ln-orbit-1" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-indigo-300 ln-orbit-2" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
          Assembling
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-100 md:text-3xl">
          Syncing integrations...
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Launching {targetLabel} with live context.
        </p>
      </div>
    </div>
  );
}

export default function LifeNodeShell() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    setActiveNode,
    setConfiguredHatsFromShellKeys,
    configuredHats,
    toggleConfiguredHat,
    registerHatGalleryLauncher,
  } = useLifeNode();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  const [persistedHats, setPersistedHats] = useState(null);
  const [displayName, setDisplayName] = useState("Operator");
  const [selectedHats, setSelectedHats] = useState(["work", "vital", "pro"]);
  const [switchHat, setSwitchHat] = useState("work");
  const [assemblingHat, setAssemblingHat] = useState(null);
  const [savingHats, setSavingHats] = useState(false);
  const [setupWarning, setSetupWarning] = useState("");
  const [onboardingByNode, setOnboardingByNode] = useState({});
  const lastSavedNodeRef = useRef(null);

  const isLoggedIn = Array.isArray(persistedHats) && persistedHats.length > 0;
  const userId = session?.user?.id;

  useEffect(() => {
    registerHatGalleryLauncher(() => setGalleryOpen(true));
    return () => registerHatGalleryLauncher(null);
  }, [registerHatGalleryLauncher]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/shell");
      return;
    }

    const sessionFallbackName =
      session?.user?.name ||
      (session?.user?.email
        ? session.user.email.split("@")[0]
        : "Operator");

    if (DEV_FRESH_SESSION) {
      setDisplayName(sessionFallbackName);
      setPersistedHats([]);
      setHydrated(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const userId = session?.user?.id?.trim();
        const hats = (await hydrateConfiguredHatKeys(userId)).filter((h) =>
          HAT_KEYS.includes(h),
        );
        if (cancelled) return;

        let displayName = sessionFallbackName;
        let lastActiveNode = null;
        try {
          const res = await fetch("/api/user-state", {
            cache: "no-store",
            credentials: "include",
          });
          if (res.ok) {
            const { state } = await res.json();
            displayName =
              (typeof state?.displayName === "string" && state.displayName) ||
              sessionFallbackName;
            if (
              typeof state?.lastActiveNode === "string" &&
              Object.values(HAT_TO_NODE).includes(state.lastActiveNode)
            ) {
              lastActiveNode = state.lastActiveNode;
            }
          }
        } catch {
          /* offline */
        }

        setDisplayName(displayName);
        if (hats.length) {
          setSelectedHats(hats);
          const activeNodes = hats
            .map((h) => HAT_TO_NODE[h])
            .filter(Boolean);
          const preferred =
            lastActiveNode && activeNodes.includes(lastActiveNode)
              ? Object.entries(HAT_TO_NODE).find(
                  ([, node]) => node === lastActiveNode,
                )?.[0]
              : hats[0];
          setSwitchHat(preferred ?? hats[0]);
          setConfiguredHatsFromShellKeys(hats);
          setPersistedHats(hats);
          if (lastActiveNode && activeNodes.includes(lastActiveNode)) {
            setActiveNode(lastActiveNode);
          }
        } else {
          setPersistedHats([]);
          setConfiguredHatsFromShellKeys([]);
        }
      } catch {
        if (cancelled) return;
        setDisplayName(sessionFallbackName);
        setPersistedHats([]);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session, router, setConfiguredHatsFromShellKeys]);

  useEffect(() => {
    if (!assemblingHat) return;
    const targetNode = HAT_TO_NODE[assemblingHat];
    queueMicrotask(() => setActiveNode(targetNode));

    if (
      !DEV_FRESH_SESSION &&
      userId &&
      targetNode &&
      lastSavedNodeRef.current !== targetNode
    ) {
      lastSavedNodeRef.current = targetNode;
      void fetch("/api/user-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lastActiveNode: targetNode }),
      }).catch(() => {
        lastSavedNodeRef.current = null;
      });
    }

    const timer = setTimeout(() => {
      router.push(HATS[assemblingHat].route);
    }, 2000);
    return () => clearTimeout(timer);
  }, [assemblingHat, router, setActiveNode, userId]);

  const galleryShellHats = useMemo(
    () =>
      configuredHats
        .map((node) => ACTIVE_TO_HAT_KEY[node])
        .filter((h) => HAT_KEYS.includes(h)),
    [configuredHats]
  );

  const activeCards = useMemo(() => {
    if (!isLoggedIn) return [];
    if (galleryShellHats.length) return galleryShellHats;
    return (persistedHats ?? []).filter((hat) => HATS[hat]);
  }, [galleryShellHats, isLoggedIn, persistedHats]);

  useEffect(() => {
    if (!isLoggedIn || !galleryShellHats.length) return;
    queueMicrotask(() => {
      setPersistedHats((prev) => {
        const same =
          Array.isArray(prev) &&
          prev.length === galleryShellHats.length &&
          prev.every((h, i) => h === galleryShellHats[i]);
        return same ? prev : galleryShellHats;
      });
      setSelectedHats(galleryShellHats);
      setSwitchHat((cur) =>
        galleryShellHats.includes(cur) ? cur : galleryShellHats[0]
      );
    });
  }, [galleryShellHats, isLoggedIn]);

  /**
   * Pull per-node onboarding completion so we can paint a glassmorphism
   * progress bar on each card. In DEV_FRESH_SESSION we skip the fetch and
   * render zero-progress bars (everything is "fresh" anyway).
   */
  useEffect(() => {
    if (!isLoggedIn || DEV_FRESH_SESSION) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user-state/onboarding", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setOnboardingByNode(data.statuses ?? {});
      } catch {
        /* leave map empty — bars render at 0% */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const submitLogin = useCallback(async () => {
    if (!selectedHats.length) return;
    setSetupWarning("");

    if (DEV_FRESH_SESSION) {
      const hats = selectedHats.filter((h) => HAT_KEYS.includes(h));
      if (!hats.length) return;
      setPersistedHats(hats);
      setSwitchHat(hats[0]);
      setConfiguredHatsFromShellKeys(hats);
      const initialNode = HAT_TO_NODE[hats[0]];
      if (initialNode) setActiveNode(initialNode);
      return;
    }

    setSavingHats(true);
    try {
      const res = await fetch("/api/user-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          configuredHats: selectedHats,
          displayName: displayName?.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          typeof body?.message === "string"
            ? body.message
            : `SAVE_${res.status}`;
        throw new Error(msg);
      }
      clearPendingShellHats();
      const { state } = await res.json();
      const hats = Array.isArray(state?.configuredHats)
        ? state.configuredHats.filter((h) => HAT_KEYS.includes(h))
        : [];
      if (!hats.length) return;
      setPersistedHats(hats);
      setSwitchHat(hats[0]);
      setConfiguredHatsFromShellKeys(hats);
      const initialNode = HAT_TO_NODE[hats[0]];
      if (initialNode) setActiveNode(initialNode);
    } catch {
      // Production fallback: still unlock Unified Hub even if persistence is down.
      const hats = selectedHats.filter((h) => HAT_KEYS.includes(h));
      if (!hats.length) return;
      setPersistedHats(hats);
      setSwitchHat(hats[0]);
      setConfiguredHatsFromShellKeys(hats);
      const initialNode = HAT_TO_NODE[hats[0]];
      if (initialNode) setActiveNode(initialNode);
      setSetupWarning(
        "We couldn't save your setup to the server yet. You're in the Unified Hub, but your hat selection may reset next login.",
      );
    } finally {
      setSavingHats(false);
    }
  }, [
    selectedHats,
    displayName,
    setConfiguredHatsFromShellKeys,
    setActiveNode,
  ]);

  const toggleHat = (key) => {
    setSelectedHats((prev) =>
      prev.includes(key) ? prev.filter((hat) => hat !== key) : [...prev, key]
    );
  };

  const logout = async () => {
    setPersistedHats([]);
    setAssemblingHat(null);
    setConfiguredHatsFromShellKeys([]);
    await signOutWithClientCleanup(session?.user?.id, { callbackUrl: "/" });
  };

  useEffect(() => {
    const currentNode = HAT_TO_NODE[switchHat];
    if (!currentNode) return;
    queueMicrotask(() => setActiveNode(currentNode));
  }, [setActiveNode, switchHat]);

  if (!hydrated || status === "loading") {
    return <div className="min-h-screen bg-[#0B0F17]" />;
  }

  if (assemblingHat) {
    return <OrreryAssembly targetLabel={HATS[assemblingHat].label} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 pb-10 pt-[calc(var(--ln-node-nav-chrome-block)+1.5rem)] text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.6),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.12),transparent_45%)]" />
        <div className="relative mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/[0.05] p-8 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
            LifeNode Setup
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-100 md:text-4xl">
            Calm Command Access
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Signed in as{" "}
            <span className="font-semibold text-slate-100">
              {session?.user?.email || session?.user?.name || "operator"}
            </span>
            . Select the hats you want active in your Unified Hub.
          </p>

          <div className="mt-8 space-y-6">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Display name
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Operator"
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              />
            </label>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
                Configured hats
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {HAT_KEYS.map((key) => {
                  const checked = selectedHats.includes(key);
                  const HatIcon = HATS[key].Icon;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => toggleHat(key)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${
                        checked
                          ? "border-indigo-300/50 bg-indigo-300/15 text-white"
                          : "border-white/15 bg-white/[0.03] text-slate-300"
                      }`}
                    >
                      <HatIcon className="h-4 w-4" />
                      {HATS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={submitLogin}
              disabled={!selectedHats.length || savingHats}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#24364d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingHats ? "Saving..." : "Enter Unified Hub"}
              <ArrowRight className="h-4 w-4" />
            </button>
            {setupWarning ? (
              <p className="text-xs text-amber-200">{setupWarning}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 pb-8 pt-[calc(var(--ln-node-nav-chrome-block)+1.5rem)] text-slate-100">
      <NodeGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        activeHats={configuredHats}
        onToggleHat={(node) => toggleConfiguredHat(node)}
      />
      <style>{`
        @keyframes ln-priority-blink {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); opacity: 0.85; }
          50% { box-shadow: 0 0 18px 3px rgba(56,189,248,0.65); opacity: 1; }
        }
        .ln-priority-blink { animation: ln-priority-blink 1.8s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,41,59,0.65),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.2),transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              LifeNode OS Shell
            </p>
            <h1 className="text-xl font-bold text-slate-100">
              Unified Hub · Welcome back, {displayName || "Operator"}
            </h1>
            {session?.user?.email ? (
              <p className="text-xs text-slate-500">{session.user.email}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={switchHat}
              onChange={(e) => setSwitchHat(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {activeCards.map((hat) => (
                <option key={hat} value={hat}>
                  {HATS[hat].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAssemblingHat(switchHat)}
              className="rounded-xl bg-[#1E293B] px-3 py-2 text-sm font-bold text-white"
            >
              Switch Hat
            </button>
            <button
              type="button"
              onClick={() => router.push("/shell/workflows")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.07]"
            >
              <Workflow className="h-4 w-4" />
              Workflows
            </button>
            <NotificationsBell />
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeCards.map((hat) => {
              const node = HATS[hat];
              const Icon = node.Icon;
              const nodeName = HAT_TO_NODE[hat];
              const status = onboardingByNode[nodeName];
              const completedSteps = Array.isArray(status?.completedSteps)
                ? status.completedSteps.length
                : 0;
              const isComplete = Boolean(status?.onboardingCompleted);
              const progressPct = isComplete
                ? 100
                : Math.min(
                    100,
                    Math.round((completedSteps / ONBOARDING_TOTAL_STEPS) * 100)
                  );
              const setupLabel = isComplete
                ? "Setup complete"
                : `${completedSteps}/${ONBOARDING_TOTAL_STEPS} steps`;
              return (
                <button
                  type="button"
                  key={hat}
                  onClick={() => setAssemblingHat(hat)}
                  className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] p-5 pt-6 text-left shadow-[0_14px_42px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-indigo-300/35"
                >
                  {/* Glassmorphism setup progress — top edge of the card. */}
                  <div className="absolute inset-x-0 top-0 h-1.5 overflow-hidden bg-white/[0.04] backdrop-blur-md">
                    <div
                      className={`h-full transition-[width] duration-700 ease-out ${
                        isComplete
                          ? "bg-gradient-to-r from-emerald-300/80 to-cyan-300/80"
                          : "bg-gradient-to-r from-cyan-300/70 to-indigo-300/70"
                      }`}
                      style={{ width: `${progressPct}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1E293B]">
                      <Icon className="h-5 w-5 text-cyan-200" />
                    </span>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                      Ready
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-100">{node.label}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {node.summary}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>{setupLabel}</span>
                    <span>{progressPct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
