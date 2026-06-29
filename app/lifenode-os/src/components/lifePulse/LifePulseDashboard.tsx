"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CalmWheel from "./CalmWheel";
import LinosChatPanel from "./LinosChatPanel";
import LinosReminderStrip from "./LinosReminderStrip";
import TrackerCategoryCard from "./TrackerCategoryCard";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { computeLifePulseCommitmentSignals } from "@/src/lib/linos/commitmentSignals";
import {
  AURA_BTN_PRIMARY,
  AURA_CATEGORY_ACTIVE,
  AURA_CATEGORY_IDLE,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_SUNRISE_BG,
  AURA_TEXT,
} from "./lifePulseAura";
import {
  aggregateCalmCompletion,
  createLifePulseTracker,
  deleteLifePulseTracker,
  fetchLifePulseTrackers,
  updateLifePulseTracker,
} from "@/src/lib/lifePulse/trackers";
import { defaultTableColumns } from "@/src/lib/lifePulse/qualifyingQuestions";
import { createEmptyPmRows } from "./TrackerEditableTable";
import { rowsToContext } from "@/src/lib/lifePulse/tableRows";
import { parseQuickAddTracker } from "@/src/lib/lifePulse/quickAddNlp";
import {
  LIFE_PULSE_CATEGORIES,
  type LifePulseCategoryId,
  type LifePulseTracker,
} from "@/src/lib/lifePulse/types";
import { useLnFeatureParam, scrollToLnFeature } from "@/src/hooks/useLnFeatureParam";

const LINOS_GENERATING_PHRASES = [
  "Linos is calculating your milestones…",
  "Designing your custom fluency strategy…",
  "Calibrating your progress metrics…",
];

export default function LifePulseDashboard() {
  const { data: session, status } = useSession();
  const { patchBridgeSignals } = useLifeNodeContext();
  const userId = session?.user?.id ? String(session.user.id) : null;
  const hasLoadedTrackers = useRef(false);
  const [category, setCategory] = useState<LifePulseCategoryId>("travel");
  const [trackers, setTrackers] = useState<LifePulseTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingPhraseIndex, setGeneratingPhraseIndex] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<LifePulseCategoryId>("travel");
  const [listening, setListening] = useState(false);
  const [showLinosChat, setShowLinosChat] = useState(false);
  const [pmWorkspaceBooting, setPmWorkspaceBooting] = useState(false);
  const pmBootstrapAttempted = useRef(false);

  useLnFeatureParam(
    useCallback((id) => {
      if (id === "linos-chat") {
        setShowLinosChat(true);
        return;
      }
      scrollToLnFeature(id);
    }, []),
  );

  useEffect(() => {
    patchBridgeSignals(computeLifePulseCommitmentSignals(trackers));
  }, [trackers, patchBridgeSignals]);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !userId) {
      setTrackers([]);
      setLoading(false);
      hasLoadedTrackers.current = false;
      return;
    }
    if (!hasLoadedTrackers.current) setLoading(true);
    try {
      const data = await fetchLifePulseTrackers(userId);
      setTrackers(data);
      hasLoadedTrackers.current = true;
    } catch {
      if (!hasLoadedTrackers.current) setTrackers([]);
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateLifePulseTrackerDue(id: string, dateStr: string) {
    const iso = new Date(`${dateStr}T23:59:59`).toISOString();
    try {
      const next = await updateLifePulseTracker(id, { due_date: iso });
      setTrackers((prev) => prev.map((x) => (x.id === id ? next : x)));
    } catch {
      window.alert("Could not update due date.");
    }
  }

  /** Ensure Project Mgmt always has an editable plan table workspace. */
  useEffect(() => {
    if (
      status !== "authenticated" ||
      loading ||
      category !== "project_management" ||
      pmWorkspaceBooting
    ) {
      return;
    }
    const pmTrackers = trackers.filter((t) => t.category === "project_management");
    if (pmTrackers.length > 0 || pmBootstrapAttempted.current) return;

    pmBootstrapAttempted.current = true;
    let cancelled = false;
    (async () => {
      setPmWorkspaceBooting(true);
      try {
        const cols = defaultTableColumns("project_management");
        const rows = createEmptyPmRows(6);
        const created = await createLifePulseTracker({
          category: "project_management",
          title: "My project tasks",
          status: "Active",
          context_data: {
            ...rowsToContext(cols, rows),
            pm_workspace: true,
          },
        });
        if (!cancelled) setTrackers((prev) => [created, ...prev]);
      } catch (e) {
        console.error("PM workspace bootstrap:", e);
      } finally {
        if (!cancelled) setPmWorkspaceBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, loading, category, trackers, pmWorkspaceBooting]);

  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(() => {
      setGeneratingPhraseIndex((i) => (i + 1) % LINOS_GENERATING_PHRASES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [generating]);

  const filtered = useMemo(
    () => trackers.filter((t) => t.category === category),
    [trackers, category],
  );

  const calmPercent = useMemo(() => aggregateCalmCompletion(trackers), [trackers]);

  const quickAddPreview = useMemo(
    () => parseQuickAddTracker(newTitle),
    [newTitle],
  );

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (status !== "authenticated" || !session?.user?.id) {
      window.alert("Sign in to save LifePulse trackers.");
      return;
    }
    setShowLinosChat(true);
  }

  function handleChatTrackerCreated(
    tracker: LifePulseTracker,
    domain: LifePulseCategoryId,
  ) {
    setTrackers((prev) => [tracker, ...prev]);
    setCategory(domain);
    setNewCategory(domain);
    setNewTitle("");
    setShowLinosChat(false);
    setGenerating(false);
  }

  function startVoiceInput() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((ev: { results: Iterable<{ 0: { transcript: string } }> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const Win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = Win.SpeechRecognition ?? Win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join("")
        .trim();
      if (text) setNewTitle(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Permanently remove this tracker?")) return;
    const previous = trackers;
    setTrackers((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteLifePulseTracker(id);
    } catch {
      setTrackers(previous);
      window.alert("Could not delete tracker.");
    }
  }

  return (
    <div className={`${AURA_SUNRISE_BG} relative text-slate-900`}>
      <div className="relative mx-auto max-w-6xl space-y-6 p-6">
        <header className={`p-6 ${AURA_GLASS_CLASS}`} style={AURA_GLASS_STYLE}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${AURA_TEXT.muted}`}>
                LifePulse · AI-Enhanced Planner
              </p>
              <h1 className={`mt-1 text-3xl font-bold tracking-tight ${AURA_TEXT.title}`}>
                Master Goal & Tracker Matrix
              </h1>
              <p className={`mt-2 max-w-xl text-sm leading-relaxed ${AURA_TEXT.body}`}>
                Adaptive goal bars with priority, days remaining, and calm-state rings — every plan
                lives in an editable table you can maximize for focused editing.
              </p>
            </div>
            <div id="ln-feature-calm-wheel">
              <CalmWheel percent={calmPercent} />
            </div>
          </div>
        </header>

        {status === "authenticated" && trackers.length > 0 ? (
          <LinosReminderStrip
            trackers={trackers}
            onOpenTracker={(id) => {
              const t = trackers.find((x) => x.id === id);
              if (t) {
                setCategory(t.category);
                window.setTimeout(() => {
                  document
                    .getElementById(`tracker-${id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 80);
              }
            }}
            onReschedule={(id) => {
              const t = trackers.find((x) => x.id === id);
              if (!t) return;
              const next = window.prompt(
                "New due date (YYYY-MM-DD):",
                t.due_date?.slice(0, 10) ?? "",
              );
              if (!next) return;
              void updateLifePulseTrackerDue(id, next);
            }}
          />
        ) : null}

        <form
          onSubmit={handleQuickAdd}
          className={`p-4 ${AURA_GLASS_CLASS}`}
          style={AURA_GLASS_STYLE}
        >
          <p
            className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${AURA_TEXT.label}`}
          >
            <Plus className="h-3.5 w-3.5 text-slate-700" strokeWidth={2.5} />
            Quick Add Tracker
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Share a thought with Linos — e.g. I want to learn English or attend an event…"
              className={`flex-1 ${AURA_INPUT_CLASS}`}
              disabled={generating}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as LifePulseCategoryId)}
              className={AURA_INPUT_CLASS}
              disabled={generating}
            >
              {LIFE_PULSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-900">
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={listening || generating}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm font-semibold text-slate-800 backdrop-blur-md transition hover:bg-white/25 ${listening ? "ring-2 ring-rose-400/60" : ""}`}
              title={listening ? "Listening…" : "Speak your tracker"}
              aria-label="Voice input"
            >
              {listening ? (
                <MicOff className="h-4 w-4 text-rose-600" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <button
              type="submit"
              disabled={generating || !newTitle.trim()}
              className={AURA_BTN_PRIMARY}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "With Linos…" : "Start with Linos"}
            </button>
          </div>
          {generating ? (
            <p
              className={`mt-3 rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-md ${AURA_TEXT.body}`}
              role="status"
            >
              {LINOS_GENERATING_PHRASES[generatingPhraseIndex]}
            </p>
          ) : null}
          {!generating && quickAddPreview.due_label ? (
            <p className={`mt-2 text-xs ${AURA_TEXT.body}`}>
              Detected due date: <span className="font-semibold">{quickAddPreview.due_label}</span>
              {" "}(Linos will weave this into your plan)
            </p>
          ) : null}
        </form>

        {showLinosChat ? (
          <LinosChatPanel
            rawPrompt={newTitle.trim()}
            categoryHint={newCategory}
            dueDateHint={quickAddPreview.due_date}
            onCancel={() => setShowLinosChat(false)}
            onTrackerCreated={handleChatTrackerCreated}
          />
        ) : null}

        <nav className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {LIFE_PULSE_CATEGORIES.map((c) => {
            const active = category === c.id;
            const count = trackers.filter((t) => t.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold backdrop-blur-[16px] backdrop-saturate-[1.2] transition ${
                  active ? AURA_CATEGORY_ACTIVE : AURA_CATEGORY_IDLE
                }`}
                style={AURA_GLASS_STYLE}
              >
                <span className="block text-lg drop-shadow-sm">{c.emoji}</span>
                <span className={AURA_TEXT.accent}>{c.label}</span>
                {count > 0 ? (
                  <span className={`mt-1 block text-[10px] ${AURA_TEXT.label}`}>{count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <section className={`p-5 ${AURA_GLASS_CLASS}`} style={AURA_GLASS_STYLE}>
          <h2 className={`mb-4 text-lg font-bold ${AURA_TEXT.title}`}>
            {LIFE_PULSE_CATEGORIES.find((c) => c.id === category)?.emoji}{" "}
            {LIFE_PULSE_CATEGORIES.find((c) => c.id === category)?.label}
          </h2>

          {status !== "authenticated" ? (
            <p className={`text-sm ${AURA_TEXT.body}`}>
              <Link href="/auth/signin" className={AURA_TEXT.link}>
                Sign in
              </Link>{" "}
              to sync trackers to Supabase.
            </p>
          ) : null}

          {loading ? (
            <div className={`flex items-center gap-2 py-12 text-sm ${AURA_TEXT.muted}`}>
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
              Loading trackers…
            </div>
          ) : filtered.length === 0 && category === "project_management" && pmWorkspaceBooting ? (
            <div className={`flex items-center justify-center gap-2 py-12 text-sm ${AURA_TEXT.muted}`}>
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening your project plan table…
            </div>
          ) : filtered.length === 0 ? (
            <p className={`py-8 text-center text-sm ${AURA_TEXT.muted}`}>
              No trackers in this bucket yet — use Quick Add above.
            </p>
          ) : (
            <div id="ln-feature-trackers" className="space-y-4">
              {filtered.map((t) => (
                <TrackerCategoryCard
                  key={t.id}
                  tracker={t}
                  onUpdated={(next) =>
                    setTrackers((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                  }
                  onDelete={handleDelete}
                  savingId={savingId}
                  setSavingId={setSavingId}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
