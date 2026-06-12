"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, LogIn, Sparkles } from "lucide-react";
import { WORKSPACE_TOOL_CATEGORIES } from "@/lib/vanode/constants";
import type { NativeToolKey } from "@/lib/vanode/types";
import ConnectAppDialog from "@/src/components/ConnectAppDialog";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";
import { resolveAppConnectProvider } from "@/src/lib/integrations/appProviderMap";
import { connectAppToNode, startOAuthConnect } from "@/src/lib/integrations";
import { useConnectedApps } from "@/src/lib/useConnectedApps";

const NATIVE_DEF: { key: NativeToolKey; title: string; description: string }[] =
  [
    {
      key: "aiTask",
      title: "AI Task Assistant",
      description: "Summarize threads and draft replies faster.",
    },
    {
      key: "eod",
      title: "EOD Reporter",
      description: "Proof-of-work logs with optional screen capture.",
    },
    {
      key: "chaosCalc",
      title: "Chaos Calculator",
      description: "Quick math without leaving the shell.",
    },
    {
      key: "smartNotes",
      title: "Smart Notes",
      description: "Vault notes linked to clients and labels.",
    },
  ];

type Props = {
  step: 1 | 2;
  syncedToolIds: string[];
  nativeTools: Record<NativeToolKey, boolean>;
  onToggleTool: (id: string) => void;
  onSetNative: (key: NativeToolKey, v: boolean) => void;
  onNextFromStep1: () => void;
  onComplete: () => void;
  onBack: () => void;
};

function cardStatusClass(status: "connected" | "syncing" | "disconnected") {
  if (status === "connected") {
    return "border-emerald-500/70 bg-emerald-50/30 text-emerald-900 shadow-lg shadow-emerald-900/10";
  }
  if (status === "syncing") {
    return "border-amber-400/80 bg-amber-50/40 text-amber-950 animate-pulse shadow-md";
  }
  return "border-white/40 bg-white/35 text-slate-800 hover:border-teal-200/80 hover:bg-white/50";
}

function vaCommCardClass(status: "connected" | "syncing" | "disconnected") {
  if (status === "syncing") {
    return "border-amber-400/80 bg-amber-50/40 animate-pulse cursor-wait";
  }
  if (status === "connected") {
    return "border-emerald-500/70 bg-emerald-50/20";
  }
  return "border-white/40 bg-white/35 hover:border-teal-200/80 hover:bg-white/50";
}

function VaCommunicationGrid({
  userId,
  getCardStatus,
  connectingId,
  onPromptConnect,
}: {
  userId: string;
  getCardStatus: (appId: string) => "connected" | "syncing" | "disconnected";
  connectingId: string | null;
  onPromptConnect: (appId: string, name: string) => void;
}) {
  const commApps = [
    { id: "slack", label: "# Slack", hint: "Live communication channel active." },
    {
      id: "teams",
      label: "Microsoft Teams",
      hint: "Click to connect internal systems.",
    },
    { id: "zoom", label: "Zoom", hint: "Link meeting capture and transcripts." },
  ] as const;

  return (
    <section className="mb-10 rounded-3xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-500">
        Communication · Quick connect
      </h2>
      <p className="mb-4 text-xs text-slate-600">
        Bind Slack, Teams, and Zoom so Linos can detect intake from your VA
        workspace logs.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {commApps.map((app) => {
          const status = getCardStatus(app.id);
          return (
            <div
              key={app.id}
              className={`relative flex h-36 flex-col justify-between rounded-2xl border p-5 text-left transition-all ${vaCommCardClass(status)}`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">{app.label}</span>
                {status === "connected" ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Linked
                  </span>
                ) : null}
                {status === "syncing" ? (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Syncing…
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-slate-500">
                {status === "connected"
                  ? app.hint
                  : userId
                    ? "Connect your account to sync this workspace."
                    : "Sign in to LifeNode OS, then connect."}
              </span>
              {status !== "connected" && status !== "syncing" ? (
                <button
                  type="button"
                  onClick={() => void onPromptConnect(app.id, app.label)}
                  disabled={connectingId === app.id}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-wait disabled:opacity-70"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {connectingId === app.id ? "Redirecting…" : "Connect account"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function VanodeDiscovery({
  step,
  syncedToolIds,
  nativeTools,
  onToggleTool,
  onSetNative,
  onNextFromStep1,
  onComplete,
  onBack,
}: Props) {
  const router = useRouter();
  const [pendingConnect, setPendingConnect] = useState<{
    id: string;
    name: string;
    mode: "oauth" | "mock";
  } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const { connectedApps, loading: appsLoading } = useConnectedApps(userId);

  const getVAAppStatus = (appId: string) => {
    const key = `va_${appId.toLowerCase()}`;
    return connectedApps[key] || "disconnected";
  };

  const getCardStatus = getVAAppStatus;

  const handleConnect = async (id: string, name: string) => {
    setConnectError(null);

    if (!userId) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/vanode")}`);
      return;
    }

    const status = getCardStatus(id);
    if (status === "connected" || status === "syncing") return;

    if (!syncedToolIds.includes(id)) onToggleTool(id);

    const provider = resolveAppConnectProvider(id);
    if (provider) {
      setConnectingId(id);
      try {
        const outcome = await startOAuthConnect("VA", id);
        if (outcome === "unauthorized") {
          router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/vanode")}`);
        } else if (outcome === "unsupported") {
          setConnectError(`${name} is not available for OAuth yet.`);
        }
      } catch (err) {
        setConnectError(
          err instanceof Error
            ? err.message
            : `Could not connect ${name}. Check provider credentials.`,
        );
      } finally {
        setConnectingId(null);
      }
      return;
    }

    setPendingConnect({ id, name, mode: "mock" });
  };

  const runMockConnect = async (id: string) => {
    if (!userId) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/vanode")}`);
      return;
    }
    setConnectingId(id);
    try {
      await connectAppToNode(userId, "VA", id);
    } finally {
      setConnectingId(null);
    }
  };

  const toggleToolSelection = (id: string) => {
    const status = getCardStatus(id);
    if (status === "syncing") return;
    onToggleTool(id);
  };

  if (step === 1) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-teal-50/40 to-indigo-100/80 px-4 py-16 text-slate-800">
        <ConnectAppDialog
          app={pendingConnect?.mode === "mock" ? pendingConnect.name : null}
          nodeLabel="VANode"
          accent="#0D9488"
          reason={
            !userId
              ? "Sign in to LifeNode OS first, then connect this app so VANode can sync your workspace."
              : "This app uses a preview connection flow until full OAuth is configured."
          }
          onLogin={() => {
            const target = pendingConnect;
            setPendingConnect(null);
            if (!target || target.mode !== "mock") return;
            if (!userId) {
              router.push(
                `/auth/signin?callbackUrl=${encodeURIComponent("/vanode")}`,
              );
              return;
            }
            void runMockConnect(target.id);
          }}
          onLater={() => {
            setPendingConnect(null);
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.12),_transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-teal-700/80">
            VANode · Step 1
          </p>
          <h1 className="mb-3 text-center text-3xl font-bold tracking-tight md:text-4xl">
            Sync workspace
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-center text-slate-600">
            Choose the tools your clients rely on. Categories stay visible so
            discovery feels organized, not overwhelming.
          </p>
          {appsLoading ? (
            <p className="mb-6 text-center text-xs font-medium text-teal-700/80">
              Loading connection states…
            </p>
          ) : null}
          {connectError ? (
            <p className="mb-6 text-center text-sm font-medium text-rose-700">
              {connectError}
            </p>
          ) : null}
          <VaCommunicationGrid
            userId={userId}
            getCardStatus={getVAAppStatus}
            connectingId={connectingId}
            onPromptConnect={handleConnect}
          />
          <div className="space-y-10">
            {WORKSPACE_TOOL_CATEGORIES.map((cat) => (
              <section key={cat.label}>
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
                  {cat.label}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {cat.tools.map((t) => {
                    const status = getCardStatus(t.id);
                    const on =
                      status === "connected" ||
                      status === "syncing" ||
                      syncedToolIds.includes(t.id);
                    const Icon = t.Icon;
                    return (
                      <div
                        key={t.id}
                        className={`group flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left transition backdrop-blur-md ${cardStatusClass(status)}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleToolSelection(t.id)}
                          disabled={status === "syncing"}
                          className="flex w-full flex-col items-start gap-2 text-left disabled:cursor-wait"
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                              status === "connected"
                                ? "bg-emerald-600 text-white"
                                : status === "syncing"
                                  ? "bg-amber-500 text-white"
                                  : on
                                    ? "bg-teal-600 text-white"
                                    : "bg-slate-200/80 text-slate-600"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                          <span className="text-sm font-semibold">{t.name}</span>
                          {status === "connected" ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <Check className="h-3.5 w-3.5" /> Connected
                            </span>
                          ) : status === "syncing" ? (
                            <span className="text-xs font-semibold text-amber-800">
                              Syncing…
                            </span>
                          ) : on ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-teal-700">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Tap to include in your stack
                            </span>
                          )}
                        </button>
                        {status !== "connected" && status !== "syncing" ? (
                          <button
                            type="button"
                            onClick={() => void handleConnect(t.id, t.name)}
                            disabled={connectingId === t.id}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-teal-600/30 bg-teal-600/10 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-teal-800 transition hover:bg-teal-600 hover:text-white disabled:cursor-wait disabled:opacity-70"
                          >
                            <LogIn className="h-3 w-3" />
                            {connectingId === t.id ? "Redirecting…" : "Connect"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <AppCategoryRequestFooter
                  category={cat.label}
                  nodeLabel="VANode"
                  variant="glass"
                />
              </section>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onNextFromStep1}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-100/90 via-white to-teal-50 px-4 py-16 text-slate-800">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(99,102,241,0.12),_transparent_45%)]" />
      <div className="relative mx-auto max-w-xl text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700/80">
          VANode · Step 2
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
          The VA toolkit
        </h1>
        <p className="mb-10 text-slate-600">
          Turn on the native LifeNode OS tools you want in this dashboard. You can
          change this anytime.
        </p>
        <div className="space-y-3 text-left">
          {NATIVE_DEF.map((n) => (
            <label
              key={n.key}
              className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/50 bg-white/45 p-4 shadow-sm backdrop-blur-md transition hover:bg-white/60"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                checked={nativeTools[n.key]}
                onChange={(e) => onSetNative(n.key, e.target.checked)}
              />
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-slate-600">{n.description}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/25 transition hover:bg-teal-500"
          >
            <Sparkles className="h-4 w-4" />
            Enter VANode
          </button>
        </div>
      </div>
    </div>
  );
}
