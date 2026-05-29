"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Brain,
  Calculator,
  CheckCircle2,
  Clock,
  Layers3,
  Link2,
  NotebookPen,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import AIWidget from "./AIWidget";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";
import DataIntegrationHub from "@/src/components/biz/DataIntegrationHub";
import DealTriageFeed from "@/src/components/biz/DealTriageFeed";
import FounderUtilitiesPanel from "@/src/components/biz/FounderUtilitiesPanel";
import ConnectedAppsPanel from "@/src/components/biz/ConnectedAppsPanel";
import { appLabelToProvider, providerToAppLabel, toConnectedAppId } from "@/src/lib/integrations/appProviderMap";
import { connectAppToNode } from "@/src/lib/integrations";
import { integrationRedirectPathSegment } from "@/src/lib/integrations/oauthProviders";
import {
  filterAppsForDataHub,
  readPrimaryDataTool,
  reconcileHubSelection,
  writePrimaryDataTool,
} from "@/src/lib/bizNode/dataIntegrationHub";
import {
  FLARE_MODE_CHANGED,
  readFlareMode,
  readFlareTaskFlags,
} from "@/src/lib/flareModeBridge";
import {
  readOnboardingSyncDraft,
  writeOnboardingSyncDraft,
} from "@/src/lib/bizNode/onboardingSyncStorage";

const BIZ_NODE_NAME = "BizNode";

const APP_GROUPS = {
  "Sales & CRM": [
    "HubSpot",
    "GoHighLevel",
    "Salesforce",
    "Pipedrive",
    "Zoho CRM",
    "Close",
  ],
  "Communication & Voice": [
    "Gmail",
    "Slack",
    "WhatsApp",
    "Discord",
    "Twilio",
    "RingCentral",
  ],
  Productivity: [
    "Google Calendar",
    "ClickUp",
    "Notion",
    "Asana",
    "Linear",
    "Smartsheet",
  ],
  "Marketing & Lifecycle": [
    "Mailchimp",
    "Klaviyo",
    "ActiveCampaign",
    "Customer.io",
  ],
  Finance: [
    "Stripe",
    "QuickBooks",
    "PayPal",
    "Xero",
    "Square",
  ],
  Ecommerce: ["Shopify", "WooCommerce", "BigCommerce"],
  "Automation & Storage": [
    "Zapier",
    "Make (Integromat)",
    "Google Drive",
    "Dropbox",
  ],
};

const APP_PRIMARY = [
  "HubSpot",
  "GoHighLevel",
  "Salesforce",
  "Pipedrive",
  "Gmail",
  "Slack",
  "WhatsApp",
  "Stripe",
];

const FOCUS_PRIMARY = [
  "Lead Flow",
  "Client Management",
  "Waiting Approvals",
  "Revenue Forecasting",
  "Pipeline Bottlenecks",
  "Task Delegation",
];

const FOCUS_MORE = [
  "Customer Retention",
  "Cash Flow Visibility",
  "Campaign Performance",
  "Team Productivity",
  "Risk & Compliance Alerts",
  "Fulfillment Delays",
];

const ALL_APPS = Object.values(APP_GROUPS).flat();

function isAppOAuthConnected(appLabel, integrations) {
  const provider = appLabelToProvider(appLabel);
  if (!provider) return false;
  return integrations.some((i) => i.provider === provider && i.connected);
}

export default function WorkNode() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const [syncStep, setSyncStep] = useState(2);
  const [selectedApps, setSelectedApps] = useState([]);
  const [deferredApps, setDeferredApps] = useState([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);
  const [isSynced, setIsSynced] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showMoreApps, setShowMoreApps] = useState(false);
  const [showMoreFocus, setShowMoreFocus] = useState(false);
  const [loginPromptApp, setLoginPromptApp] = useState("");
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showCalculatorPanel, setShowCalculatorPanel] = useState(false);
  const [founderNotes, setFounderNotes] = useState("");
  const [calcInput, setCalcInput] = useState("");
  const [flareActive, setFlareActive] = useState(false);
  const [flareTasks, setFlareTasks] = useState([]);
  const [primaryDataTool, setPrimaryDataTool] = useState(null);
  const [hubResyncing, setHubResyncing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [integrationToast, setIntegrationToast] = useState("");

  const refreshIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.integrations)) {
        setIntegrations(data.integrations);
      }
    } catch {
      // Non-fatal — UI falls back to connect prompts.
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    void refreshIntegrations();
  }, [hasHydrated, refreshIntegrations]);

  useEffect(() => {
    if (!hasHydrated || isSynced) return;
    writeOnboardingSyncDraft({
      selectedNode: BIZ_NODE_NAME,
      selectedApps,
      deferredApps,
      selectedFocusAreas,
      primaryDataTool,
      syncStep,
    });
  }, [
    hasHydrated,
    isSynced,
    selectedApps,
    deferredApps,
    selectedFocusAreas,
    primaryDataTool,
    syncStep,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const integration = params.get("integration");
    if (!status || !integration) return;

    if (status === "connected") {
      const label = providerToAppLabel(integration);
      setSelectedApps((prev) => (prev.includes(label) ? prev : [...prev, label]));
      setDeferredApps((prev) => prev.filter((a) => a !== label));
      setIntegrationToast(`${label} is now connected.`);
      void refreshIntegrations();
    } else if (status === "error") {
      const reason = params.get("reason") ?? "connection_failed";
      setIntegrationToast(`Could not connect: ${reason.replace(/_/g, " ")}`);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("status");
    url.searchParams.delete("integration");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [refreshIntegrations]);

  function startOAuthConnect(appLabel) {
    const provider = appLabelToProvider(appLabel);
    if (!provider) {
      setLoginPromptApp(appLabel);
      return;
    }
    setSelectedApps((prev) => (prev.includes(appLabel) ? prev : [...prev, appLabel]));
    setDeferredApps((prev) => prev.filter((a) => a !== appLabel));
    const segment = integrationRedirectPathSegment(provider);
    window.location.href = `/api/integrations/${segment}?node=BIZ`;
  }

  async function startMockConnect(appLabel) {
    if (!userId) {
      setLoginPromptApp(appLabel);
      return;
    }
    setSelectedApps((prev) => (prev.includes(appLabel) ? prev : [...prev, appLabel]));
    setDeferredApps((prev) => prev.filter((a) => a !== appLabel));
    const ok = await connectAppToNode(userId, "BIZ", toConnectedAppId(appLabel));
    if (ok) {
      setIntegrationToast(`Connecting ${appLabel}…`);
    }
  }

  function deferAppConnect(appLabel) {
    setSelectedApps((prev) => (prev.includes(appLabel) ? prev : [...prev, appLabel]));
    setDeferredApps((prev) => (prev.includes(appLabel) ? prev : [...prev, appLabel]));
    setLoginPromptApp("");
  }

  function getAppOnboardingVisual(app) {
    const oauthConnected = isAppOAuthConnected(app, integrations);
    const isDeferred = deferredApps.includes(app);
    const isSelected = selectedApps.includes(app);
    const isActive = oauthConnected || isDeferred || isSelected;

    if (oauthConnected) {
      return {
        isActive: true,
        className: "bg-slate-900 text-white shadow-lg ring-2 ring-emerald-400/50",
        subtitle: (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={12} />
            OAuth connected
          </span>
        ),
      };
    }
    if (isDeferred) {
      return {
        isActive: true,
        className: "bg-slate-900 text-white shadow-lg",
        subtitle: (
          <span className="mt-1 inline-flex items-center gap-1 text-xs opacity-90">
            <Clock size={12} />
            Configure later
          </span>
        ),
      };
    }
    if (isSelected) {
      return {
        isActive: true,
        className: "bg-slate-900 text-white shadow-lg",
        subtitle: <p className="text-xs opacity-80 mt-1">Connected data stream</p>,
      };
    }
    return {
      isActive: false,
      className: "bg-white/80 text-slate-600 hover:bg-white",
      subtitle: <p className="text-xs opacity-80 mt-1">Tap to add</p>,
    };
  }

  useEffect(() => {
    function syncFlare() {
      setFlareActive(readFlareMode().active);
      setFlareTasks(readFlareTaskFlags());
    }
    syncFlare();
    window.addEventListener(FLARE_MODE_CHANGED, syncFlare);
    return () => window.removeEventListener(FLARE_MODE_CHANGED, syncFlare);
  }, []);

  useEffect(() => {
    try {
      const draft = readOnboardingSyncDraft();
      if (!draft) {
        setHasHydrated(true);
        return;
      }
      if (Array.isArray(draft.selectedApps)) setSelectedApps(draft.selectedApps);
      if (Array.isArray(draft.deferredApps)) setDeferredApps(draft.deferredApps);
      if (draft.primaryDataTool) setPrimaryDataTool(draft.primaryDataTool);
      if (Array.isArray(draft.selectedFocusAreas)) {
        setSelectedFocusAreas(draft.selectedFocusAreas);
      }
      if (typeof draft.syncStep === "number") setSyncStep(draft.syncStep);
      if (draft.selectedFocusAreas?.length && draft.selectedApps?.length) {
        setIsSynced(true);
      }
    } catch {
      // Fallback to sync wizard if data is invalid.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    const stored = readPrimaryDataTool();
    if (stored) setPrimaryDataTool(stored);
  }, []);

  const visibleApps = useMemo(
    () => filterAppsForDataHub(selectedApps, primaryDataTool),
    [selectedApps, primaryDataTool],
  );

  const connectedOAuthApps = useMemo(
    () => visibleApps.filter((app) => isAppOAuthConnected(app, integrations)),
    [visibleApps, integrations],
  );

  function selectPrimaryDataTool(tool) {
    setPrimaryDataTool(tool);
    writePrimaryDataTool(tool);
    setSelectedApps((prev) => reconcileHubSelection(prev, tool));
  }

  const orchestrationIntensity = useMemo(() => {
    if (selectedApps.length >= 8) return "High";
    if (selectedApps.length >= 4) return "Medium";
    return "Low";
  }, [selectedApps.length]);

  const priorityFeed = useMemo(() => {
    const insights = [];

    if (selectedFocusAreas.includes("Lead Flow")) {
      insights.push(
        "Detecting a bottleneck in your sales pipeline between discovery and follow-up.",
      );
    }
    if (selectedFocusAreas.includes("Client Management")) {
      insights.push("Two client threads are waiting over 24h without owner assignment.");
    }
    if (selectedFocusAreas.includes("Waiting Approvals")) {
      insights.push("3 approvals are blocking downstream automations in your workspace.");
    }
    if (selectedFocusAreas.includes("Revenue Forecasting")) {
      insights.push("Projected monthly revenue is drifting 8% below target if close rate remains unchanged.");
    }
    if (selectedFocusAreas.includes("Pipeline Bottlenecks")) {
      insights.push("Most deal friction is concentrated in proposal-to-negotiation transitions.");
    }
    if (selectedFocusAreas.includes("Cash Flow Visibility")) {
      insights.push("Upcoming payment gaps detected around mid-month invoice cycles.");
    }
    if (selectedFocusAreas.length === 0) {
      insights.push("Context is warming up. Select focus areas to generate targeted intelligence.");
    }

    insights.push(
      `Orchestration confidence is ${orchestrationIntensity.toLowerCase()} across ${selectedApps.length || 0} connected apps.`,
    );
    return insights;
  }, [orchestrationIntensity, selectedApps.length, selectedFocusAreas]);

  function toggleApp(app) {
    const removing = selectedApps.includes(app);
    if (removing) {
      setSelectedApps((prev) => prev.filter((x) => x !== app));
      setDeferredApps((prev) => prev.filter((x) => x !== app));
      return;
    }
    setSelectedApps((prev) => [...prev, app]);
    const provider = appLabelToProvider(app);
    if (provider && !isAppOAuthConnected(app, integrations)) {
      setLoginPromptApp(app);
    }
  }

  function toggleFocusArea(area) {
    setSelectedFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((x) => x !== area) : [...prev, area],
    );
  }

  function finishSync() {
    if (selectedApps.length === 0 || selectedFocusAreas.length === 0) return;
    const reconciledApps = primaryDataTool
      ? reconcileHubSelection(selectedApps, primaryDataTool)
      : selectedApps;
    writeOnboardingSyncDraft({
      selectedNode: BIZ_NODE_NAME,
      selectedApps: reconciledApps,
      deferredApps,
      selectedFocusAreas,
      primaryDataTool,
      syncStep: 3,
    });
    setSelectedApps(reconciledApps);
    setIsSynced(true);
  }

  async function handleDiscoveryHubResync() {
    setHubResyncing(true);
    await new Promise((r) => setTimeout(r, 2400));
    setHubResyncing(false);
  }

  async function handleCrmSync() {
    setIsSyncing(true);
    setIntegrationToast("");
    try {
      const res = await fetch("/api/biznode/sync", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : `Sync failed (${res.status})`;
        setIntegrationToast(msg);
        return;
      }
      const count = typeof data?.count === "number" ? data.count : 0;
      setSyncCount(count);
      setIntegrationToast(
        count > 0
          ? `Synced ${count} CRM contact${count === 1 ? "" : "s"} from GoHighLevel.`
          : "Sync complete — no contacts returned from GoHighLevel.",
      );
      window.dispatchEvent(new CustomEvent("lifenode:biznode-sync-complete"));
    } catch {
      setIntegrationToast("Could not reach the sync service. Try again shortly.");
    } finally {
      setIsSyncing(false);
    }
  }

  function runCalculation() {
    try {
      // Input is constrained to calculator keys below.
      const result = Function(`"use strict"; return (${calcInput || "0"});`)();
      setCalcInput(String(result));
    } catch {
      setCalcInput("Error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3f7ff] via-[#f9fbff] to-[#f5f8ff] p-6 text-slate-800">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="rounded-3xl bg-white/55 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.06)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">
                LifeNode OS Master System
              </p>
              <h1 className="text-3xl font-bold text-slate-900">BizNode Orchestration</h1>
              <p className="text-sm text-slate-500 mt-1">
                Calm surface, contextual intelligence, and orchestration over your ecosystem.
              </p>
              <Link
                href="/onboarding/work"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
              >
                <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
                Choose apps &amp; onboarding
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-4 py-2 rounded-xl bg-white/70 text-slate-700 text-sm font-semibold shadow-sm">
                Active Node: {BIZ_NODE_NAME}
              </div>
              <Link
                href="/pulse"
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 shadow-sm hover:bg-indigo-100"
              >
                Open LifePulse
              </Link>
            </div>
          </div>
        </header>

        {hasHydrated && !isSynced ? (
          <section className="rounded-3xl bg-white/60 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,23,42,0.07)] p-6 md:p-8">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-500 font-semibold mb-2">
                Sync Your Ecosystem
              </p>
              <h2 className="text-2xl font-bold text-slate-900">Step {syncStep} of 3</h2>
            </div>

            {syncStep === 2 ? (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Connect Your Workspace</p>
                <p className="text-sm text-slate-500 mb-4">
                  Select the apps this node should orchestrate.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {APP_PRIMARY.map((app) => (
                    <button
                      key={app}
                      onClick={() => toggleApp(app)}
                      className={`rounded-2xl p-4 text-left transition-all ${
                        selectedApps.includes(app)
                          ? "bg-slate-900 text-white shadow-lg"
                          : "bg-white/80 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <p className="font-semibold">{app}</p>
                      <p className="text-xs opacity-80 mt-1">Connected data stream</p>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowMoreApps(true)}
                    className="rounded-2xl p-4 text-left bg-white/80 text-slate-600 hover:bg-white transition-all"
                  >
                    <p className="font-semibold inline-flex items-center gap-2">
                      <Plus size={14} />
                      More
                    </p>
                    <p className="text-xs opacity-80 mt-1">View all business apps</p>
                  </button>
                </div>
                <AppCategoryRequestFooter
                  category="Business apps"
                  nodeLabel="BizNode"
                  className="mt-4"
                />
                <div className="mt-4">
                  <DataIntegrationHub
                    primary={primaryDataTool}
                    onSelect={selectPrimaryDataTool}
                  />
                </div>
                <div className="mt-6 flex justify-between">
                  <div className="text-xs text-slate-500 self-center">
                    {selectedApps.length} app{selectedApps.length === 1 ? "" : "s"} selected
                  </div>
                  <button
                    onClick={() => setSyncStep(3)}
                    disabled={selectedApps.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-40"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}

            {syncStep === 3 ? (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  What should this Node focus on?
                </p>
                <p className="text-sm text-slate-500 mb-4">Focus Area (you can select multiple)</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {FOCUS_PRIMARY.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleFocusArea(opt)}
                      className={`rounded-2xl p-4 text-left transition-all ${
                        selectedFocusAreas.includes(opt)
                          ? "bg-slate-900 text-white shadow-lg"
                          : "bg-white/80 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <p className="font-semibold">{opt}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowMoreFocus(true)}
                    className="rounded-2xl p-4 text-left bg-white/80 text-slate-600 hover:bg-white transition-all"
                  >
                    <p className="font-semibold inline-flex items-center gap-2">
                      <Plus size={14} />
                      More
                    </p>
                    <p className="text-xs opacity-80 mt-1">Additional focus tracks</p>
                  </button>
                </div>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setSyncStep(2)}
                    className="px-4 py-2 rounded-xl bg-white/80 text-slate-600"
                  >
                    Back
                  </button>
                  <button
                    onClick={finishSync}
                    disabled={selectedFocusAreas.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-40"
                  >
                    <CheckCircle2 size={16} />
                    Enter Dashboard
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {isSynced ? (
          <div className="grid lg:grid-cols-12 gap-6">
            {flareActive && flareTasks.length > 0 ? (
              <section className="lg:col-span-12 rounded-3xl border border-rose-200/70 bg-rose-50/70 p-5 shadow-[0_12px_30px_rgba(244,63,94,0.08)] backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-800">Flare protocol · BizNode</p>
                <p className="mt-1 text-sm text-rose-950">
                  High-priority work flagged during recovery — consider rescheduling.
                </p>
                <ul className="mt-3 space-y-2">
                  {flareTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-white/80 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-slate-900">{task.title}</span>
                      <button
                        type="button"
                        className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-50"
                        onClick={() =>
                          window.alert(
                            `Reschedule “${task.title}”? In a full build this opens your calendar with a recovery block.`,
                          )
                        }
                      >
                        Reschedule?
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="lg:col-span-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  CRM pipeline
                </p>
                <button
                  type="button"
                  onClick={handleCrmSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing…" : "Sync Data"}
                </button>
              </div>
              {syncCount != null && !isSyncing ? (
                <p className="mb-3 text-xs text-emerald-700">
                  Last sync: {syncCount} record{syncCount === 1 ? "" : "s"} from GoHighLevel.
                </p>
              ) : null}
              <DealTriageFeed />
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Orchestration insights
                </p>
                <div className="space-y-2">
                  {priorityFeed.slice(0, 3).map((item) => (
                    <p key={item} className="text-xs leading-relaxed text-slate-400">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="lg:col-span-4 rounded-3xl bg-white/55 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers3 size={18} className="text-indigo-600" />
                  <h2 className="font-semibold text-slate-900">Orchestration Layer</h2>
                </div>
                <button
                  type="button"
                  onClick={handleDiscoveryHubResync}
                  disabled={hubResyncing}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900 shadow-sm transition hover:bg-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${hubResyncing ? "animate-spin" : ""}`} />
                  Resync Discovery Hub
                </button>
              </div>
              <div className="mb-4 rounded-2xl border border-white/60 bg-white/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Pipeline Velocity
                </p>
                {syncCount != null && syncCount > 0 ? (
                  <>
                    <div className="flex items-end justify-between gap-2 text-sm font-semibold text-slate-800">
                      <span className="text-emerald-700">Synced from CRM</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Live from {primaryDataTool || "CRM"} — {syncCount} record
                      {syncCount === 1 ? "" : "s"} loaded.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    No pipeline data yet. Connect apps and run Sync Data to pull
                    closed-won and stalled deals from your CRM.
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Active Node</p>
                  <p className="font-semibold text-slate-800">{BIZ_NODE_NAME}</p>
                </div>
                <DataIntegrationHub
                  primary={primaryDataTool}
                  onSelect={selectPrimaryDataTool}
                  compact
                />
                <ConnectedAppsPanel
                  apps={visibleApps}
                  integrations={integrations}
                  onConnect={startOAuthConnect}
                  onConnectMock={startMockConnect}
                  onConnectMore={() => setShowMoreApps(true)}
                />
                {integrationToast ? (
                  <p className="-mt-2 text-xs font-medium text-indigo-700">{integrationToast}</p>
                ) : null}
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Focus Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFocusAreas.map((area) => (
                      <span key={area} className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                        {area}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowMoreFocus(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    <Plus size={12} />
                    Add Focus Area
                  </button>
                </div>
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Automation Posture
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{orchestrationIntensity} Orchestration</p>
                  <p className="text-xs text-slate-500 mt-1">
                    LifeNode OS is coordinating data, triggers, and approvals across your tools.
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-6 rounded-3xl bg-white/55 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-semibold text-slate-900">Connected Apps Activity</h2>
                <span className="text-xs text-slate-500">Past • Ongoing • Upcoming</span>
              </div>
              <div className="space-y-3">
                {connectedOAuthApps.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/50 px-4 py-5 text-sm leading-relaxed text-slate-500">
                    {visibleApps.length > 0
                      ? "Apps are selected but not connected yet. Complete OAuth in the left rail to see live activity."
                      : "No connected apps yet. Connect tools in the discovery hub to see activity here."}
                  </div>
                ) : (
                  connectedOAuthApps.slice(0, 6).map((app) => (
                    <div key={app} className="rounded-2xl bg-white/80 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{app}</p>
                        <p className="text-xs text-slate-500">Connected · awaiting first sync</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="text-sm font-semibold text-emerald-800">Live</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

                        <section className="lg:col-span-6 rounded-3xl bg-white/55 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-6">
              <FounderUtilitiesPanel
                showNotesPanel={showNotesPanel}
                setShowNotesPanel={setShowNotesPanel}
                showCalculatorPanel={showCalculatorPanel}
                setShowCalculatorPanel={setShowCalculatorPanel}
                founderNotes={founderNotes}
                setFounderNotes={setFounderNotes}
                calcInput={calcInput}
                setCalcInput={setCalcInput}
                runCalculation={runCalculation}
                connectedApps={connectedOAuthApps}
              />
            </section>

            <section className="lg:col-span-12 rounded-3xl bg-white/55 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 size={18} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Unified Node Brain</h2>
              </div>
              <AIWidget
                nodeContext={`${BIZ_NODE_NAME} | Focus: ${selectedFocusAreas.join(", ")} | Orchestrating ${selectedApps.join(", ")}`}
              />
            </section>
          </div>
        ) : null}

        {!isSynced && hasHydrated ? (
          <div className="rounded-3xl bg-white/45 backdrop-blur-xl p-5 text-sm text-slate-500 inline-flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            Sync your ecosystem to unlock contextual intelligence.
          </div>
        ) : null}
      </div>

      {showMoreApps ? (
        <div className="fixed inset-0 z-[95] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">All Business Apps</h3>
              <button onClick={() => setShowMoreApps(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-6">
              {Object.entries(APP_GROUPS).map(([group, apps]) => (
                <div key={group}>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">{group}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {apps.map((app) => {
                      const visual = getAppOnboardingVisual(app);
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => toggleApp(app)}
                          className={`rounded-2xl p-3 text-left transition-all ${visual.className}`}
                        >
                          <p className="font-semibold text-sm inline-flex items-center gap-1">
                            {isAppOAuthConnected(app, integrations) ? (
                              <CheckCircle2 size={12} className="shrink-0 text-emerald-300" />
                            ) : null}
                            {app}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <AppCategoryRequestFooter category={group} nodeLabel="BizNode" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showMoreFocus ? (
        <div className="fixed inset-0 z-[95] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">More Focus Areas</h3>
              <button onClick={() => setShowMoreFocus(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {FOCUS_MORE.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFocusArea(area)}
                  className={`rounded-2xl p-3 text-left transition-all ${
                    selectedFocusAreas.includes(area)
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <p className="font-semibold text-sm">{area}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {loginPromptApp ? (
        <div className="fixed inset-0 z-[96] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Connect {loginPromptApp}</h3>
            <p className="text-sm text-slate-600 mb-5">
              Please log in to {loginPromptApp} so BizNode can access your information and orchestrate context-aware actions.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (loginPromptApp) deferAppConnect(loginPromptApp);
                  else setLoginPromptApp("");
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm"
              >
                Configure later
              </button>
              <button
                onClick={() => {
                  const app = loginPromptApp;
                  setLoginPromptApp("");
                  if (app) startOAuthConnect(app);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm"
              >
                Connect now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

