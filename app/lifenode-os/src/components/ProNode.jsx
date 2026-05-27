"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  Database,
  Files,
  FolderOpen,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  NotepadText,
  RefreshCw,
  Search,
} from "lucide-react";
import { getNodeTheme } from "@/src/lib/nodeTheme";
import ConnectAppDialog from "@/src/components/ConnectAppDialog";
import ProAutoTimeline from "@/src/components/pro/ProAutoTimeline";
import ProClauseLibrary from "@/src/components/pro/ProClauseLibrary";
import ProCommandPalette from "@/src/components/pro/ProCommandPalette";
import ProRedlineEditor from "@/src/components/pro/ProRedlineEditor";
import ProRoleToolkit from "@/src/components/pro/ProRoleToolkit";
import ProTechCostBadge from "@/src/components/pro/ProTechCostBadge";
import ProVaultWorkspace from "@/src/components/pro/vault/ProVaultWorkspace";
import ProTimeTravelSlider from "@/src/components/pro/ProTimeTravelSlider";
import ProFocusDiscoveryCard from "@/src/components/pro/ProFocusDiscoveryCard";
import { ProDiscoveryCategoryTools } from "@/src/components/pro/ProDiscoveryCategoryTools";
import { filterDiscoveryCatalog, getDiscoveryCatalog } from "@/src/lib/proNode/discoveryCatalog";
import { clausesForRole } from "@/src/lib/proNode/clauses";
import { detectRedlines, getDraftForRole } from "@/src/lib/proNode/redlines";
import { getRoleConfig, PRO_ROLES } from "@/src/lib/proNode/roles";
import { getSmartChainSuggestions } from "@/src/lib/proNode/smartChain";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { useProTimeline } from "@/src/hooks/useProTimeline";
import { getNodeTypesForProRole } from "@/src/lib/proNode/workspaceContext";

const proTheme = getNodeTheme("ProNode");

const triageFeed = [];

function toClock(totalSeconds) {
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export default function ProNode() {
  const { proWorkspaceRole: role, setProWorkspaceRole } = useLifeNodeContext();
  const [setupStep, setSetupStep] = useState(1);
  const [query, setQuery] = useState("");
  const [connectedTools, setConnectedTools] = useState([]);
  const [loginPromptApp, setLoginPromptApp] = useState("");
  const [nativeToolkit, setNativeToolkit] = useState({
    sidecar: true,
    pulse: true,
    triage: true,
  });
  const [timeTravelDate, setTimeTravelDate] = useState("2026-05-15");
  const [isDeepWork, setIsDeepWork] = useState(false);
  const [timersByFile, setTimersByFile] = useState({});
  /** Billable Pulse timer on/off (independent of Auto-Timeline / Pulse toolkit). */
  const [billablePulseEnabled, setBillablePulseEnabled] = useState(true);
  const [briefing, setBriefing] = useState(
    "AI summary will appear here for a 10-second briefing."
  );

  const [commandOpen, setCommandOpen] = useState(false);
  const [smartChainSuggestions, setSmartChainSuggestions] = useState([]);
  const [focusDiscoveryMinimized, setFocusDiscoveryMinimized] = useState(false);
  const editorSurfaceRef = useRef(null);
  const timelineRef = useRef(null);

  const roleConfig = getRoleConfig(role);
  const [activeFile, setActiveFile] = useState(roleConfig.cases[0] ?? "");
  const [draft, setDraft] = useState(() => getDraftForRole("legal"));

  const RoleIcon = roleConfig.icon;

  const timelineAsOf = useMemo(
    () => new Date(`${timeTravelDate}T23:59:59`),
    [timeTravelDate],
  );
  const workspaceNodeTypes = useMemo(() => getNodeTypesForProRole(role), [role]);
  const { events: visibleTimeline, loading: timelineLoading } = useProTimeline(
    workspaceNodeTypes,
    timelineAsOf,
  );

  const redlineIssues = useMemo(
    () => detectRedlines(role, visibleTimeline, draft),
    [role, visibleTimeline, draft],
  );

  const clauseBlocks = useMemo(() => clausesForRole(role), [role]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (setupStep !== 3 || !nativeToolkit.pulse || !billablePulseEnabled) return;
    const timer = setInterval(() => {
      setTimersByFile((prev) => ({
        ...prev,
        [activeFile]: (prev[activeFile] || 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeFile, nativeToolkit.pulse, setupStep, billablePulseEnabled]);

  const visibleDiscoveryGroups = useMemo(() => {
    const base = getDiscoveryCatalog(role);
    return filterDiscoveryCatalog(base, query).groups;
  }, [role, query]);

  const handleResyncDiscovery = useCallback(() => {
    setFocusDiscoveryMinimized(false);
    requestAnimationFrame(() => {
      document.getElementById("pro-focus-discovery")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const toggleConnectedTool = (name) => {
    setConnectedTools((prev) => {
      const next = prev.includes(name)
        ? prev.filter((tool) => tool !== name)
        : [...prev, name];
      if (!prev.includes(name)) setLoginPromptApp(name);
      return next;
    });
  };

  const toggleNativeTool = (key) => {
    setNativeToolkit((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectRole = (nextRole) => {
    const cfg = getRoleConfig(nextRole);
    setProWorkspaceRole(nextRole);
    setActiveFile(cfg.cases[0]);
    setDraft(getDraftForRole(nextRole));
    setSmartChainSuggestions([]);
  };

  const openCaseFromPalette = useCallback(
    (caseTitle) => {
      setActiveFile(caseTitle);
      setSmartChainSuggestions([]);
    },
    [],
  );

  const insertClause = useCallback((clause) => {
    setDraft((prev) => `${prev}\n\n${clause.body}`);
    setSmartChainSuggestions(getSmartChainSuggestions(clause.id));
  }, []);

  const insertSmartChainClause = useCallback((clause) => {
    setDraft((prev) => `${prev}\n\n${clause.body}`);
    setSmartChainSuggestions(getSmartChainSuggestions(clause.id));
  }, []);

  const dismissSmartChain = useCallback(() => setSmartChainSuggestions([]), []);

  const handleDropClause = useCallback((text, clauseId) => {
    setDraft((prev) => `${prev}\n\n${text}`);
    setSmartChainSuggestions(clauseId ? getSmartChainSuggestions(clauseId) : []);
  }, []);

  const createBriefing = () => {
    const labels = {
      legal: "Legal brief:",
      medical: "Clinical brief:",
      engineering: "Technical brief:",
      teacher: "Instructional brief:",
      tech: "Systems brief:",
      coach: "Coaching brief:",
      designer: "Design brief:",
    };
    setBriefing(
      `${labels[role] ?? "Brief:"} ${activeFile} — critical risk, next decision, and one immediate action. Timeline snapshot: ${timeTravelDate}.`
    );
  };

  if (setupStep < 3) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 text-slate-800">
        <ConnectAppDialog
          app={loginPromptApp || null}
          nodeLabel="ProNode"
          onLogin={() => setLoginPromptApp("")}
          onLater={() => setLoginPromptApp("")}
        />
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <p className={`text-sm font-semibold uppercase tracking-wide ${proTheme.eyebrowOnLight}`}>
              ProNode · Agentic Workspace
            </p>
            <h1
              className={`mt-2 text-2xl font-bold md:text-3xl ${proTheme.headingOnLight} ${proTheme.headingFont}`}
            >
              Communication & logic manager — sync your stack, protect deep focus.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Supabase + pgvector · Auto-Timeline from Gmail/Slack · Redline Ghost · Clause Library
            </p>
          </div>

          {setupStep === 1 && (
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-bold text-[#1E293B]">Step 1: Professional stack</h2>
                <div className="relative max-w-md flex-1 md:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-indigo-400/40 transition focus:ring-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleDiscoveryGroups.length === 0 ? (
                  <p className="col-span-full text-sm text-slate-500">
                    No apps match your search. Clear the search box to see the full catalog for this
                    role.
                  </p>
                ) : (
                  visibleDiscoveryGroups.map((group) => (
                  <div
                    key={group.category}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                      {group.category}
                    </h3>
                    <ProDiscoveryCategoryTools
                      category={group.category}
                      tools={group.tools}
                      connectedTools={connectedTools}
                      onToggleTool={toggleConnectedTool}
                      nodeLabel="ProNode"
                    />
                  </div>
                  ))
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Professional node
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {PRO_ROLES.map((option) => {
                    const Icon = option.icon;
                    const selected = role === option.id;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => selectRole(option.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                          selected
                            ? "border-[#1E293B] bg-[#1E293B] text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>
                          {option.label}
                          <span className="mt-0.5 block text-[10px] font-normal opacity-75">
                            {option.nodeName}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSetupStep(2)}
                className="rounded-xl bg-[#1E293B] px-5 py-2.5 text-sm font-bold text-white"
              >
                Continue to native toolkit
              </button>
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1E293B]">Step 2: Universal genius features</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => toggleNativeTool("sidecar")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    nativeToolkit.sidecar
                      ? "border-[#1E293B] bg-[#1E293B] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <h3 className="font-bold">Redline Ghost + Sidecar</h3>
                  <p className="mt-1 text-xs opacity-85">Logic linking against timeline facts</p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleNativeTool("pulse")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    nativeToolkit.pulse
                      ? "border-[#1E293B] bg-[#1E293B] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <h3 className="font-bold">Auto-Timeline + Pulse</h3>
                  <p className="mt-1 text-xs opacity-85">Gmail/Slack ingest · billable tracking</p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleNativeTool("triage")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    nativeToolkit.triage
                      ? "border-[#1E293B] bg-[#1E293B] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <h3 className="font-bold">Clause Library + Triage</h3>
                  <p className="mt-1 text-xs opacity-85">Modular blocks · inbox AI</p>
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSetupStep(1)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setSetupStep(3)}
                  className="rounded-xl bg-[#1E293B] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Launch command center
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 text-slate-800 md:p-6">
      <ConnectAppDialog
        app={loginPromptApp || null}
        nodeLabel="ProNode"
        onLogin={() => setLoginPromptApp("")}
        onLater={() => setLoginPromptApp("")}
      />
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-white">
                <RoleIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#1E293B] md:text-2xl">
                  ProNode · {roleConfig.nodeName}
                </h1>
                <p className="text-sm text-slate-500">
                  Agentic Workspace · Logic Linking · {visibleTimeline.length} Timeline Events
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {role === "tech" && activeFile.toLowerCase().includes("api-gateway") ? (
                <ProTechCostBadge />
              ) : null}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                title="Universal Command Center"
              >
                <Command className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden rounded border border-slate-200 bg-white px-1 font-mono text-[10px] text-slate-500 sm:inline">
                  ⌘K
                </kbd>
              </button>
              <button
                type="button"
                onClick={handleResyncDiscovery}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                title="Open app discovery to connect another tool"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Re-sync Discovery</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeepWork(!isDeepWork)}
                className="rounded-xl bg-[#1E293B] px-4 py-2 text-sm font-bold text-white"
              >
                {isDeepWork ? "Exit Deep Work" : "Deep Work Mode"}
              </button>
            </div>
          </div>
          <div className="mt-4">
            <ProTimeTravelSlider value={timeTravelDate} onChange={setTimeTravelDate} />
          </div>
        </header>

        <ProFocusDiscoveryCard
          role={role}
          connectedTools={connectedTools}
          onToggleTool={toggleConnectedTool}
          minimized={focusDiscoveryMinimized}
          onToggleMinimize={() => setFocusDiscoveryMinimized((v) => !v)}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <aside
            className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 xl:col-span-2 ${
              isDeepWork ? "opacity-20 blur-[1px]" : ""
            }`}
          >
            <div className="mb-4 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#1E293B]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cases / Projects
              </h2>
            </div>
            <div className="space-y-2">
              {roleConfig.cases.map((file) => (
                <button
                  key={file}
                  type="button"
                  onClick={() => setActiveFile(file)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                    file === activeFile
                      ? "border-[#1E293B] bg-[#1E293B] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {file}
                </button>
              ))}
            </div>
            {nativeToolkit.sidecar && (
              <div className="mt-4">
                <ProClauseLibrary
                  clauses={clauseBlocks}
                  onInsert={insertClause}
                  smartChainSuggestions={smartChainSuggestions}
                  onDismissSmartChain={dismissSmartChain}
                  onInsertSmartChain={insertSmartChainClause}
                />
              </div>
            )}
          </aside>

          <section ref={editorSurfaceRef} className="flex flex-col gap-5 xl:col-span-6">
            <ProVaultWorkspace proRole={role} />

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-[#1E293B]" />
                  <h2 className="text-base font-bold text-[#1E293B]">Deep Focus Area</h2>
                </div>
                <button
                  type="button"
                  onClick={createBriefing}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  10-Second Briefing
                </button>
              </div>
              <div className="space-y-4 p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  {activeFile || "New matter"}
                </h3>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {briefing}
                </p>
                <ProRedlineEditor
                  draft={draft}
                  issues={redlineIssues}
                  onDraftChange={setDraft}
                  onDropClause={handleDropClause}
                />
              </div>
            </div>

            {nativeToolkit.sidecar && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#1E293B]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    AI Knowledge Sidecar
                  </h2>
                </div>
                <div className="space-y-2">
                  {roleConfig.knowledgeSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                    >
                      {signal}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside
            className={`flex flex-col gap-4 xl:col-span-4 ${
              isDeepWork ? "opacity-20 blur-[1px]" : ""
            }`}
          >
            <ProRoleToolkit config={roleConfig} />

            {nativeToolkit.pulse && (
              <div ref={timelineRef} id="pro-auto-timeline">
                <ProAutoTimeline events={visibleTimeline} loading={timelineLoading} />
              </div>
            )}

            {nativeToolkit.triage && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-[#1E293B]" />
                  <h3 className="text-sm font-bold text-[#1E293B]">Priority Triage</h3>
                </div>
                <div className="space-y-2">
                  {triageFeed.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                    >
                      <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                      <p
                        className={`text-[10px] font-bold uppercase ${
                          item.type === "Action Required" ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        {item.type}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nativeToolkit.pulse && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={billablePulseEnabled}
                      onChange={(e) => setBillablePulseEnabled(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#1E293B] accent-[#1E293B] focus:ring-2 focus:ring-slate-400 focus:ring-offset-0"
                    />
                    <span className="text-sm font-bold text-[#1E293B]">Billable Pulse</span>
                  </label>
                </div>
                <p
                  className={`font-mono text-xl font-bold ${
                    billablePulseEnabled ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {billablePulseEnabled ? toClock(timersByFile[activeFile] || 0) : "—:—:—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {billablePulseEnabled
                    ? "Tracking time on the active case."
                    : "Timer paused — turn on to resume billable tracking."}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
              <p className="mb-2 font-bold text-slate-800">Connected Stack</p>
              <div className="flex flex-wrap gap-2">
                {(connectedTools.length ? connectedTools : ["Gmail", "Slack"]).slice(0, 8).map((tool) => (
                  <span
                    key={tool}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500">
          <div className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1">
              <NotepadText className="h-3.5 w-3.5" /> Supabase · pgvector
            </span>
            <span className="inline-flex items-center gap-1">
              <MessagesSquare className="h-3.5 w-3.5" /> Slack webhooks
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Gmail edge functions
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" /> GitHub / GitLab
            </span>
            <span className="inline-flex items-center gap-1">
              <Files className="h-3.5 w-3.5" /> Knowledge Hub
            </span>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-400">
            Integration mapping: when Active_Project changes, fetch Event_Table rows whose tags contain
            Active_Project_ID; render Auto-Timeline by <code className="text-slate-500">created_at</code>{" "}
            DESC.
          </p>
        </footer>
      </div>
      <ProCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        workspaceRole={role}
        onOpenCase={openCaseFromPalette}
        onFocusEditor={() =>
          editorSurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        onFocusTimeline={() =>
          timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      />
    </div>
  );
}

