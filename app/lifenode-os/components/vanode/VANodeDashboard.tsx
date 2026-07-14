"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useLnFeatureParam } from "@/src/hooks/useLnFeatureParam";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Calculator,
  ClipboardList,
  Clock,
  FolderArchive,
  LayoutDashboard,
  LayoutGrid,
  Maximize2,
  Mic,
  Receipt,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import DualRailCommandCenter, {
  type ShellFeatureItem,
} from "@/src/components/shell/DualRailCommandCenter";
import {
  LIFENODE_CHROME_BACK,
} from "@/src/components/NodeNavChrome";
import { useWhiteboardVaultBridge } from "@/src/context/WhiteboardVaultBridgeContext";
import { toTitleCase } from "@/lib/vanode/title-case";
import { ActiveClientProvider } from "./ActiveClientContext";
import { ClientProofView } from "./ClientProofView";
import { VanodeDiscovery } from "./VanodeDiscovery";
import { useVanodeStore } from "./useVanodeStore";
import { useGatedVanodeActions } from "./useGatedVanodeActions";
import {
  AiTaskAssistantCard,
  ChaosCalculatorCard,
  ClientCommandCard,
  CredentialVaultCard,
  EodReporterCard,
  InvoicingSuiteCard,
  NoteScratchPadCard,
  SmartVaultCard,
  UnifiedFeedCard,
  WaitingTasksCard,
  VANODE_AI_PREFILL_KEY,
} from "./VanodePanels";
import {
  ClientRoiCard,
  GlobalClientSwitcherBar,
  LiveMeetingCaptureCard,
  TimezoneBridgeCard,
} from "./VanodeVaProPanels";
import BillableHoursCard from "./BillableHoursCard";
import { VanodeExportBackupMenu } from "./VanodeExportBackupMenu";
import { useServerOnboardingComplete } from "@/src/hooks/useServerOnboardingComplete";
import type { WaitingTask } from "@/lib/vanode/types";

type VaStageId =
  | "overview"
  | "eod"
  | "vault"
  | "ai"
  | "rhythm"
  | "meeting"
  | "waiting"
  | "clients"
  | "invoice";

function VaHero() {
  // Hydration-safe greeting:
  // - Avoid rendering `new Date()`-based text on the server (timezone can differ)
  // - Compute on the client after mount to prevent React hydration mismatches.
  const [greet, setGreet] = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const greetText = greet ?? "Hello";
  return (
    <div className="mb-6 rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.06)] p-6 shadow-lg backdrop-blur-[12px] dark:bg-white/[0.06]">
      <p className="font-[family-name:var(--font-playfair)] text-xl italic text-slate-800 md:text-2xl dark:text-slate-100">
        {greetText}, let&apos;s clear the queue.
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
        Today&apos;s command surface
      </h2>
    </div>
  );
}

function VaFocusShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [max, setMax] = useState(false);
  const titleLabel = toTitleCase(title);

  useEffect(() => {
    if (!max) return;
    const onChromeBack = (e: Event) => {
      e.preventDefault();
      setMax(false);
    };
    window.addEventListener(LIFENODE_CHROME_BACK, onChromeBack, true);
    return () =>
      window.removeEventListener(LIFENODE_CHROME_BACK, onChromeBack, true);
  }, [max]);

  if (max) {
    const overlay = (
      <div
        className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-900/55 p-4 pt-[max(5.5rem,100px)] backdrop-blur-md"
        role="presentation"
      >
        <div className="flex min-h-0 w-full max-w-5xl flex-1 flex-col px-1 md:px-3">
          <div className="relative flex max-h-[min(92dvh,calc(100dvh-6rem))] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border-2 border-solid border-white/25 bg-white/98 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:border-teal-500/20 dark:bg-slate-900/98">
            <div className="relative z-[2] mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-solid border-slate-200/90 pb-3 pt-1 dark:border-white/10">
              <h3 className="min-w-0 pr-2 text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {titleLabel}
              </h3>
              <button
                type="button"
                onClick={() => setMax(false)}
                className="relative z-[3] flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-teal-400/60 bg-white text-slate-800 shadow-[0_4px_20px_rgba(0,255,200,0.25)] transition hover:border-rose-400/70 hover:bg-rose-50 dark:border-teal-400/50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                aria-label="Minimize"
                title="Minimize"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    );
    if (typeof document !== "undefined") {
      return createPortal(overlay, document.body);
    }
    return overlay;
  }
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.06)] shadow-lg backdrop-blur-[12px] dark:bg-white/[0.06] md:aspect-square md:min-h-[260px]">
      <button
        type="button"
        aria-label={`Maximize ${titleLabel}`}
        onClick={() => setMax(true)}
        className="absolute right-2 top-2 z-10 rounded-lg border border-solid border-white/25 bg-white/60 p-1.5 text-slate-700 shadow-sm transition hover:border-[#00ffc8]/50 dark:border-white/20 dark:bg-slate-900/50 dark:text-white"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <div className="overflow-auto p-3 md:h-full md:p-1">{children}</div>
    </div>
  );
}

function VaSyncedStatusBar({
  toolCount,
  nativeLabel,
}: {
  toolCount: number;
  nativeLabel: string;
}) {
  return (
    <div className="main-workspace mt-4 flex h-7 items-center justify-center rounded-md border border-solid border-white/10 bg-slate-900/[0.04] px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/[0.04] dark:text-slate-400">
      Synced workspace · {toolCount} tools · {nativeLabel}
    </div>
  );
}

export function VANodeDashboard() {
  const store = useVanodeStore();
  const {
    gatedAddClient,
    gatedAddEod,
    gatedAddInvoice,
    gatedAddTranscript,
  } = useGatedVanodeActions(store);

  useServerOnboardingComplete(
    "VANode",
    useCallback(() => store.setDiscoveryComplete(true), [store.setDiscoveryComplete]),
  );

  useEffect(() => {
    const onOnboardingDone = () => store.setDiscoveryComplete(true);
    window.addEventListener("lifenode:onboarding:changed", onOnboardingDone);
    return () =>
      window.removeEventListener("lifenode:onboarding:changed", onOnboardingDone);
  }, [store.setDiscoveryComplete]);
  const { registerVaultCapture } = useWhiteboardVaultBridge();

  useEffect(() => {
    registerVaultCapture((note) => {
      store.addNote(note);
    });
    return () => registerVaultCapture(null);
  }, [registerVaultCapture, store.addNote]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [discStep, setDiscStep] = useState<1 | 2>(1);
  const [stage, setStage] = useState<VaStageId>("overview");

  const handleDraftFollowUp = useCallback(
    (task: WaitingTask) => {
      const clientName =
        store.data.clients.find((c) => c.id === task.clientId)?.name ??
        "the client";
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          VANODE_AI_PREFILL_KEY,
          `Draft a polite follow-up email to ${clientName} about: ${task.label}`,
        );
      }
      setStage("ai");
    },
    [store.data.clients],
  );

  const handleOpenUnifiedFeed = useCallback(() => {
    router.push("/inbox");
  }, [router]);

  useLnFeatureParam(
    useCallback((id) => setStage(id as VaStageId), []),
  );

  useEffect(() => {
    const onChromeBack = (e: Event) => {
      if (stage !== "overview") {
        e.preventDefault();
        setStage("overview");
      }
    };
    window.addEventListener(LIFENODE_CHROME_BACK, onChromeBack);
    return () => window.removeEventListener(LIFENODE_CHROME_BACK, onChromeBack);
  }, [stage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const integration = params.get("integration");
    if (!status || !integration) return;

    if (status === "connected") {
      const appId = integration.toLowerCase();
      if (!store.data.syncedToolIds.includes(appId)) {
        store.toggleSyncedTool(appId);
      }
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    url.searchParams.delete("integration");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [store.data.syncedToolIds, store.toggleSyncedTool]);

  const clientProofMode = searchParams.get("clientView") === "1";
  const proofClientId = searchParams.get("cid");

  const proofClient = useMemo(
    () => store.data.clients.find((c) => c.id === proofClientId) ?? null,
    [store.data.clients, proofClientId],
  );

  const proofEod = useMemo(() => {
    if (!proofClientId) return store.data.eodLogs.slice(0, 8);
    return store.data.eodLogs
      .filter((l) => l.clientId === proofClientId)
      .slice(0, 8);
  }, [store.data.eodLogs, proofClientId]);

  const nt = store.data.nativeTools;
  const [bridgeClientId, setBridgeClientId] = useState<string | null>(null);

  useEffect(() => {
    const fallback =
      store.data.activeClientId ?? store.data.clients[0]?.id ?? null;
    if (!fallback) {
      setBridgeClientId(null);
      return;
    }
    setBridgeClientId((current) => {
      if (current && store.data.clients.some((c) => c.id === current)) {
        return current;
      }
      return fallback;
    });
  }, [store.data.activeClientId, store.data.clients]);

  const featureNav = useMemo((): ShellFeatureItem[] => {
    const items: ShellFeatureItem[] = [
      { id: "overview", label: toTitleCase("Overview"), icon: LayoutGrid },
    ];
    if (nt.eod) {
      items.push({ id: "eod", label: toTitleCase("EOD log"), icon: ClipboardList });
    }
    if (nt.smartNotes) {
      items.push({ id: "vault", label: toTitleCase("Smart vault"), icon: FolderArchive });
    }
    if (nt.aiTask) {
      items.push({ id: "ai", label: toTitleCase("AI assistant"), icon: Bot });
    }
    items.push({
      id: "rhythm",
      label: toTitleCase("Chaos & timezones"),
      icon: Calculator,
    });
    items.push({ id: "meeting", label: toTitleCase("Meeting recorder"), icon: Mic });
    items.push({ id: "waiting", label: toTitleCase("Waiting on"), icon: Clock });
    items.push({ id: "clients", label: toTitleCase("Clients"), icon: Users });
    items.push({ id: "invoice", label: toTitleCase("Invoicing"), icon: Receipt });
    return items;
  }, [nt.eod, nt.smartNotes, nt.aiTask]);

  const activeStage = useMemo((): VaStageId => {
    if (featureNav.some((f) => f.id === stage)) return stage;
    return "overview";
  }, [featureNav, stage]);

  if (!store.bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-teal-50 text-slate-600">
        <div className="flex items-center gap-3 rounded-2xl border border-solid border-white/10 bg-white/70 px-6 py-4 shadow-lg backdrop-blur-[12px]">
          <Sparkles className="h-5 w-5 animate-pulse text-teal-600" />
          Loading VANode…
        </div>
      </div>
    );
  }

  if (!store.data.discoveryComplete) {
    return (
      <VanodeDiscovery
        step={discStep}
        syncedToolIds={store.data.syncedToolIds}
        nativeTools={store.data.nativeTools}
        onToggleTool={store.toggleSyncedTool}
        onSetNative={store.setNativeTool}
        onNextFromStep1={() => setDiscStep(2)}
        onComplete={() => store.setDiscoveryComplete(true)}
        onBack={() => setDiscStep(1)}
      />
    );
  }

  if (clientProofMode) {
    return (
      <ClientProofView
        client={proofClient}
        metrics={store.data.valueMetrics}
        recentEod={proofEod}
      />
    );
  }

  const nativeModulesLabel =
    [
      nt.aiTask && "AI assistant",
      nt.eod && "EOD",
      nt.chaosCalc && "Calculator",
      nt.smartNotes && "Notes",
    ]
      .filter(Boolean)
      .join(" · ") || "none";

  const overview = (
    <>
      <header className="relative z-30 overflow-visible border-b border-solid border-white/10 bg-white/35 backdrop-blur-[12px]">
        <div className="flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-900/20">
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                VANode
              </h1>
              <p className="text-xs text-slate-600 md:text-sm">
                Professional VA command deck · multi-client aware
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => store.setDiscoveryComplete(false)}
              className="rounded-xl border border-solid border-white/10 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-[12px] transition hover:bg-white/70"
            >
              Re-run discovery
            </button>
            <VanodeExportBackupMenu data={store.data} />
          </div>
        </div>
      </header>

      <div
        className={`main-workspace relative z-0 mx-auto max-w-6xl space-y-4 px-4 py-6 md:space-y-6 md:px-8 md:py-8 ${
          store.data.activeClientId
            ? "rounded-[2rem] ring-2 ring-[#00ffc8]/50 shadow-[0_0_40px_rgba(0,255,200,0.12)]"
            : ""
        }`}
      >
        {store.data.activeClientId ? (
          <div className="rounded-xl border border-solid border-[#00ffc8]/40 bg-[#00ffc8]/10 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-teal-950 dark:text-teal-100">
            Client lock mode — workspace filtered to active client.
          </div>
        ) : null}

        <VaHero />

        <GlobalClientSwitcherBar
          onOpenClientView={() => {
            if (typeof window === "undefined") return;
            const u = new URL(window.location.href);
            u.searchParams.set("clientView", "1");
            if (store.data.activeClientId) {
              u.searchParams.set("cid", store.data.activeClientId);
            } else {
              u.searchParams.delete("cid");
            }
            window.open(u.toString(), "_blank", "noopener,noreferrer");
          }}
          onAddClient={(c) => gatedAddClient(c)}
          settings={store.data.settings}
          onPatchSettings={store.patchVaSettings}
        />

        <ClientRoiCard
          metrics={store.data.valueMetrics}
          onPatchMetrics={store.patchValueMetrics}
        />

        {(nt.billableHours ?? true) ? (
          <BillableHoursCard
            clients={store.data.clients}
            activeClientId={store.data.activeClientId}
            onSaveVaultNote={store.addNote}
          />
        ) : null}

        <div className="grid gap-4 md:auto-rows-fr md:grid-cols-2">
          {nt.eod && (
            <VaFocusShell title="EOD reporter">
              <EodReporterCard
                clients={store.data.clients}
                eodLogs={store.data.eodLogs}
                cloudSyncRecording={store.data.settings.cloudSyncRecording}
                onSetCloudSync={store.setCloudSyncRecording}
                onAddEod={(payload) => void gatedAddEod(payload)}
              />
            </VaFocusShell>
          )}

          {nt.smartNotes && (
            <VaFocusShell title="Smart vault">
              <SmartVaultCard
                notes={store.data.notes}
                clients={store.data.clients}
                onAdd={store.addNote}
                onUpdate={store.updateNote}
                onRemove={store.removeNote}
              />
            </VaFocusShell>
          )}

          <VaFocusShell title="Note scratch pad">
            <NoteScratchPadCard
              text={store.data.scratchPad.text}
              tags={store.data.scratchPad.tags}
              saved={store.data.scratchPadSaves}
              onSave={store.saveScratchPad}
              onClearDraft={() =>
                store.updateScratchPad({ text: "", tags: [] })
              }
              onRemoveSaved={store.removeScratchPadSave}
            />
          </VaFocusShell>

          {nt.chaosCalc && (
            <VaFocusShell title="Chaos calculator">
              <ChaosCalculatorCard />
            </VaFocusShell>
          )}

          <VaFocusShell title="Timezone bridge">
            <TimezoneBridgeCard
              clients={store.data.clients}
              selectedClientId={bridgeClientId}
              onSelectClientId={setBridgeClientId}
            />
          </VaFocusShell>

          <VaFocusShell title="Unified feed">
            <UnifiedFeedCard onSaveDraftToVault={(n) => store.addNote(n)} />
          </VaFocusShell>

          <VaFocusShell title="Credential vault">
            <CredentialVaultCard
              clients={store.data.clients}
              onUpdateClient={(id, patch) => store.updateClient(id, patch)}
            />
          </VaFocusShell>

          <VaFocusShell title="Waiting on">
            <WaitingTasksCard
              tasks={store.data.waitingTasks}
              clients={store.data.clients}
              onAdd={({ label, clientId }) =>
                store.addWaitingTask({ label, clientId })
              }
              onRemove={store.removeWaitingTask}
              onDraftFollowUp={handleDraftFollowUp}
              onOpenUnifiedFeed={handleOpenUnifiedFeed}
            />
          </VaFocusShell>

          <div
            className={
              nt.aiTask
                ? "md:col-span-2 grid gap-4 md:grid-cols-2"
                : "md:col-span-2"
            }
          >
            <VaFocusShell title="Client command">
              <ClientCommandCard
                clients={store.data.clients}
                waiting={store.data.waitingTasks}
                eodLogs={store.data.eodLogs}
                onAdd={(c) => gatedAddClient(c)}
                onUpdateClient={(id, patch) => store.updateClient(id, patch)}
                onRemove={store.removeClient}
              />
            </VaFocusShell>
            {nt.aiTask ? (
              <VaFocusShell title="AI task assistant">
                <AiTaskAssistantCard onAddVaultNote={store.addNote} />
              </VaFocusShell>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <LiveMeetingCaptureCard
              onAddVaultNote={store.addNote}
              onAddSession={(row) => gatedAddTranscript(row)}
              onUpdateSession={(id, patch) =>
                store.updateLiveTranscript(id, patch)
              }
            />
          </div>

          <div className="md:col-span-2">
            <InvoicingSuiteCard
              invoices={store.data.invoices}
              eodLogs={store.data.eodLogs}
              clients={store.data.clients}
              onAdd={(inv) => void gatedAddInvoice(inv)}
              onUpdateStatus={(id, status) =>
                store.updateInvoice(id, { status })
              }
              onRemove={store.removeInvoice}
            />
          </div>
        </div>

        <VaSyncedStatusBar
          toolCount={store.data.syncedToolIds.length}
          nativeLabel={nativeModulesLabel}
        />
      </div>
    </>
  );

  const stageHeader = (title: string, subtitle?: string) => (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-solid border-white/10 pb-4">
      <div>
        <button
          type="button"
          onClick={() => setStage("overview")}
          className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-700 hover:underline"
        >
          ← Overview
        </button>
        <h2 className="text-xl font-bold text-slate-900">{toTitleCase(title)}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );

  const focusedWorkspace =
    activeStage === "overview" ? (
      overview
    ) : activeStage === "eod" && nt.eod ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("EOD log", "Client-linked proof of work.")}
        <EodReporterCard
          clients={store.data.clients}
          eodLogs={store.data.eodLogs}
          cloudSyncRecording={store.data.settings.cloudSyncRecording}
          onSetCloudSync={store.setCloudSyncRecording}
          onAddEod={(payload) => void gatedAddEod(payload)}
        />
      </div>
    ) : activeStage === "vault" && nt.smartNotes ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Smart vault")}
        <SmartVaultCard
          notes={store.data.notes}
          clients={store.data.clients}
          onAdd={store.addNote}
          onUpdate={store.updateNote}
          onRemove={store.removeNote}
        />
      </div>
    ) : activeStage === "ai" && nt.aiTask ? (
      <div className="flex min-h-[calc(100dvh-6rem)] flex-col px-4 py-6 md:px-8">
        {stageHeader(
          "AI task assistant",
          "Focused workspace — threads, Loom → SOP, vault saves.",
        )}
        <div className="min-h-0 flex-1">
          <AiTaskAssistantCard onAddVaultNote={store.addNote} />
        </div>
      </div>
    ) : activeStage === "rhythm" ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Chaos calculator & timezone bridge")}
        <div className="grid gap-8 lg:grid-cols-2">
          {nt.chaosCalc ? <ChaosCalculatorCard /> : (
            <p className="rounded-2xl border border-dashed border-white/20 bg-white/30 p-6 text-sm text-slate-600 backdrop-blur-[12px]">
              Enable the chaos calculator in discovery to unlock this card.
            </p>
          )}
          <TimezoneBridgeCard
            clients={store.data.clients}
            selectedClientId={bridgeClientId}
            onSelectClientId={setBridgeClientId}
          />
        </div>
      </div>
    ) : activeStage === "meeting" ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Meeting recorder")}
        <LiveMeetingCaptureCard
          onAddVaultNote={store.addNote}
          onAddSession={(row) => gatedAddTranscript(row)}
          onUpdateSession={(id, patch) =>
            store.updateLiveTranscript(id, patch)
          }
        />
      </div>
    ) : activeStage === "waiting" ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Waiting on")}
        <WaitingTasksCard
          tasks={store.data.waitingTasks}
          clients={store.data.clients}
          onAdd={({ label, clientId }) =>
            store.addWaitingTask({ label, clientId })
          }
          onRemove={store.removeWaitingTask}
          onDraftFollowUp={handleDraftFollowUp}
          onOpenUnifiedFeed={handleOpenUnifiedFeed}
        />
      </div>
    ) : activeStage === "clients" ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Client command")}
        <ClientCommandCard
          clients={store.data.clients}
          waiting={store.data.waitingTasks}
          eodLogs={store.data.eodLogs}
          onAdd={(c) => gatedAddClient(c)}
          onUpdateClient={(id, patch) => store.updateClient(id, patch)}
          onRemove={store.removeClient}
        />
      </div>
    ) : activeStage === "invoice" ? (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {stageHeader("Invoicing")}
        <InvoicingSuiteCard
          invoices={store.data.invoices}
          eodLogs={store.data.eodLogs}
          clients={store.data.clients}
          onAdd={(inv) => void gatedAddInvoice(inv)}
          onUpdateStatus={(id, status) =>
            store.updateInvoice(id, { status })
          }
          onRemove={store.removeInvoice}
        />
      </div>
    ) : (
      overview
    );

  return (
    <ActiveClientProvider
      activeClientId={store.data.activeClientId}
      setActiveClientId={store.setActiveClientId}
      clients={store.data.clients}
    >
      <DualRailCommandCenter
        showFeatureRail
        featureNav={featureNav}
        activeFeatureId={activeStage}
        onFeatureSelect={(id) => setStage(id as VaStageId)}
        workspaceTone="light"
        stageBackground="va"
      >
        {focusedWorkspace}
      </DualRailCommandCenter>
    </ActiveClientProvider>
  );
}
