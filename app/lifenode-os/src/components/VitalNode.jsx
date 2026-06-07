"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLnFeatureParam, scrollToLnFeature } from "@/src/hooks/useLnFeatureParam";
import { useServerOnboardingComplete } from "@/src/hooks/useServerOnboardingComplete";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";
import {
  NODE_WIDGET_KEYS,
  hydrateWidgetsFromServer,
  scheduleNodeWidgetSave,
} from "@/src/lib/nodeWidgetSync";
import {
  Activity,
  AlertTriangle,
  Beaker,
  Brain,
  Camera,
  ClipboardList,
  Droplets,
  FileText,
  Flame,
  Heart,
  LayoutGrid,
  Moon,
  NotebookPen,
  Plus,
  Shield,
  Sparkles,
  Sunrise,
  Trash2,
  Upload,
  Watch,
  Waves,
  X,
} from "lucide-react";
import ConnectAppDialog from "@/src/components/ConnectAppDialog";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";
import ArchitectMarkdown from "@/src/components/vital/ArchitectMarkdown";
import RadialResilience from "@/src/components/vital/RadialResilience";
import VitalFlipCard from "@/src/components/vital/VitalFlipCard";
import VitalLandscapeTile from "@/src/components/vital/VitalLandscapeTile";
import WindDownSanctuary from "@/src/components/vital/WindDownSanctuary";
import VitalPulseMetricsPanel from "@/src/components/vitalPulse/VitalPulseMetricsPanel";
import { generateHealthArchitectGuidance } from "@/src/lib/healthArchitect";
import { extractTextFromLabFile } from "@/src/lib/labFileExtract";
import {
  activateFlareMode,
  clearFlareTaskFlags,
  deactivateFlareMode,
  FLARE_MODE_CHANGED,
  readFlareMode,
  seedFlareTaskFlags,
} from "@/src/lib/flareModeBridge";
import {
  analyzeCulinaryCorrelation,
  readKitchenContextForVital,
  suggestVitaminDGroceryIfNeeded,
} from "@/src/lib/vitalKitchenBridge";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

const STORAGE_KEY_V3 = "lifenode.vitalnode.v3";
const STORAGE_KEY_V2 = "lifenode.vitalnode.v2";
const NIGHT_CAPTURES_KEY = "lifenode.biznode.night-captures.v1";

const VITAL_APPS = [
  {
    category: "Wearables / Hubs",
    items: [
      "Apple Health",
      "Samsung Health",
      "Garmin Connect",
      "Oura",
      "Fitbit",
      "Polar",
    ],
  },
  {
    category: "Nutrition",
    items: [
      "MyFitnessPal",
      "Fitia (AI-Nutrition)",
      "Cronometer",
      "Lose It!",
      "Carb Manager",
    ],
  },
  {
    category: "Activity / Training",
    items: [
      "Strava",
      "Hevy (Gym)",
      "Nike Training Club",
      "Peloton",
      "MapMyRun",
    ],
  },
  {
    category: "Recovery & Mind",
    items: [
      "Sleep Cycle",
      "Calm",
      "Whoop",
      "Eight Sleep",
      "Headspace",
      "Insight Timer",
    ],
  },
  {
    category: "Biomarkers & Labs",
    items: ["InsideTracker", "Levels (CGM)", "Lumen"],
  },
];

const LABELS = ["#Injury", "#Nutrition", "#Biohack", "#Supplements"];

const DEFAULT_PROMPTS = [
  "Draft a 4-week hypertrophy plan",
  "Summarize my latest blood work results",
  "Research the benefits of Magnesium Threonate for sleep",
];

const SYMPTOM_QUICK = [
  { id: "energy", label: "Energy drop", emoji: "⚡" },
  { id: "bloat", label: "Bloating", emoji: "🤢" },
  { id: "fog", label: "Brain fog", emoji: "🧠" },
  { id: "head", label: "Headache", emoji: "🤕" },
];

const LIVE_SYNC_APPS = [
  "Apple Health",
  "Garmin Connect",
  "Oura",
  "Whoop",
  "Fitbit",
  "Samsung Health",
  "Eight Sleep",
];

const LANDSCAPE_DEFS = {
  bpm: "Resting BPM tracks how hard your heart works at rest. Spikes can reflect stress, dehydration, illness, or poor recovery.",
  spo2: "SpO₂ estimates oxygen saturation in your blood. Sustained dips warrant clinical attention — context matters for altitude and illness.",
  sleepScore: "Sleep score summarizes duration and quality signals from your wearable. It anchors readiness more than any single workout metric.",
  hrv: "HRV reflects autonomic nervous system balance. Higher variability often aligns with better recovery — compare trends, not one-off values.",
  steps: "Steps capture daily movement volume. On low-readiness days, quality movement beats forcing arbitrary step targets.",
};

function getVerifiedSource(syncedApps) {
  const hit = LIVE_SYNC_APPS.find((name) => syncedApps.includes(name));
  return hit || syncedApps[0] || "Apple Health";
}

const EMPTY_VITAL_DASH = {
  bpm: 0,
  spo2: 0,
  sleepScore: 0,
  hrv: 0,
  steps: 0,
  hydrationMl: 0,
  surfaceMode: "auto",
  timeline: [],
  symptomLogs: [],
  labResults: [],
  flareReports: [],
  sleep: { noMeals3h: false, lowLight: false, roomTemp: false },
  clinicName: "",
  lastMonthAvgRhr: 0,
  thisMonthAvgRhr: 0,
};

/** Legacy demo seed shipped in early builds — strip on load for blank slate. */
function isLegacyDemoVitalDash(d) {
  if (!d) return false;
  const demoMetrics =
    d.sleepScore === 78 &&
    d.hrv === 42 &&
    d.spo2 === 98 &&
    d.steps === 6200 &&
    d.hydrationMl === 840;
  const demoRhr = d.thisMonthAvgRhr === 64 && d.lastMonthAvgRhr === 68;
  const demoTimeline = Array.isArray(d.timeline)
    ? d.timeline.some(
        (ev) =>
          typeof ev?.title === "string" &&
          /baseline week|connected wearables/i.test(ev.title),
      )
    : false;
  return demoMetrics || demoRhr || demoTimeline;
}

function normalizeVitalDash(vitalDash) {
  if (!vitalDash || isLegacyDemoVitalDash(vitalDash)) {
    return {
      ...EMPTY_VITAL_DASH,
      surfaceMode: vitalDash?.surfaceMode === "day" || vitalDash?.surfaceMode === "night"
        ? vitalDash.surfaceMode
        : "auto",
    };
  }
  return { ...EMPTY_VITAL_DASH, ...vitalDash };
}

function glassCard() {
  return "rounded-3xl border border-white/50 bg-white/40 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-[12px]";
}

function glassNight() {
  return "rounded-3xl border border-indigo-300/25 bg-slate-950/45 text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.45)] backdrop-blur-[14px]";
}

function loadPersistedState(storageKey) {
  const defaults = {
    setupDone: false,
    onboardingStep: 1,
    syncedApps: [],
    tools: { aiHealthArchitect: true, smartVitalNotes: true },
    notes: [],
    vitalDash: EMPTY_VITAL_DASH,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const isUserScoped = storageKey.includes("::");
    let raw = window.localStorage.getItem(storageKey);
    if (!raw && !isUserScoped) {
      raw = window.localStorage.getItem(STORAGE_KEY_V3);
      if (!raw) raw = window.localStorage.getItem(STORAGE_KEY_V2);
    }
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      setupDone: parsed.setupDone ?? false,
      onboardingStep: parsed.onboardingStep ?? 1,
      syncedApps: parsed.syncedApps ?? [],
      tools: {
        aiHealthArchitect: parsed.tools?.aiHealthArchitect ?? true,
        smartVitalNotes: parsed.tools?.smartVitalNotes ?? true,
      },
      notes: parsed.notes ?? [],
      vitalDash: normalizeVitalDash(parsed.vitalDash),
    };
  } catch {
    return defaults;
  }
}

function getIconForApp(name) {
  if (name.includes("Health") || name.includes("Garmin")) return Heart;
  if (name.includes("Oura") || name.includes("Whoop")) return Watch;
  if (name.includes("Calm") || name.includes("Sleep")) return Moon;
  if (name.includes("Strava") || name.includes("Hevy") || name.includes("Nike")) {
    return Activity;
  }
  return Waves;
}

function hasWearableData(d) {
  return d.bpm > 0 || d.sleepScore > 0 || d.hrv > 0 || d.steps > 0 || d.spo2 > 0;
}

function computeReadiness(d) {
  if (!hasWearableData(d)) return 0;
  const sleepW = d.sleepScore * 0.35;
  const hrvW = Math.min(100, d.hrv * 1.6) * 0.25;
  const rhrPenalty = d.bpm > 78 ? 12 : d.bpm < 60 ? 4 : 0;
  const base = sleepW + hrvW + (d.spo2 >= 97 ? 25 : 15) - rhrPenalty;
  return Math.max(0, Math.min(100, Math.round(base)));
}

function buildVitalInsight(d, kitchen) {
  const lines = [];
  const hasWearableData =
    d.bpm > 0 || d.sleepScore > 0 || d.hrv > 0 || d.steps > 0 || d.spo2 > 0;
  if (!hasWearableData) {
    lines.push(
      "Connect a wearable or health app during setup to populate vitals. Your dashboard stays empty until real data syncs in.",
    );
    return lines.join(" ");
  }
  if (d.hrv < 40 && d.sleepScore < 72) {
    lines.push(
      `HRV is soft (${d.hrv} ms) while sleep score is ${d.sleepScore}. That pattern often follows a hard training day or higher sodium from dinner — check Kitchen for late heavy meals.`,
    );
  } else if (d.sleepScore < 70) {
    lines.push(
      `Sleep score dipped (${d.sleepScore}). If you trained intensely yesterday, plan a light recovery walk and an earlier wind-down.`,
    );
  } else if (d.bpm > 95) {
    lines.push(
      `Resting BPM is elevated (${d.bpm}). Hydration and heat can move this — see Hydration OS. If it persists at rest, worth a clinician check-in.`,
    );
  } else {
    lines.push(
      `Signals look balanced: sleep ${d.sleepScore}, HRV ${d.hrv} ms, SpO₂ ${d.spo2}%. Keep the rhythm — consistency beats chasing peaks.`,
    );
  }
  if (kitchen.recentRecipeTitles.length) {
    lines.push(`Recent ChefNode saves: ${kitchen.recentRecipeTitles.slice(0, 2).join(" · ")}.`);
  }
  if (kitchen.mealPlanLines.length) {
    lines.push(`Meal plan lines in Kitchen: ${kitchen.mealPlanLines.length} active.`);
  }
  return lines.join(" ");
}

function interpretLabHeuristic(text, clinicName) {
  const t = text.trim();
  if (!t) return "";
  const disclaimer = `⚠️ Educational analysis only: I am an AI, not a doctor. This summary is for your information only. Please consult your physician at ${clinicName} to confirm these results and discuss medical remedies.\n\n`;
  const lower = t.toLowerCase();
  const bullets = [];
  if (/\bldl\b|low-density/i.test(lower)) {
    bullets.push(
      "LDL appears in your paste — often called “bad cholesterol.” Diet and genetics both matter; your clinician interprets targets for you.",
    );
  }
  if (/\bferritin\b/i.test(lower)) {
    bullets.push(
      "Ferritin relates to iron stores. Low values can track with fatigue; highs have other meanings — only your doctor ties this to symptoms.",
    );
  }
  if (/\b(vitamin\s*d|25-oh)\b/i.test(lower)) {
    bullets.push("Vitamin D markers: sun exposure + diet both play a role. Confirm supplementation with your care team.");
  }
  if (/\bglucose|hba1c|a1c\b/i.test(lower)) {
    bullets.push("Glucose / A1C language detected — these are long-term energy-regulation signals your clinician should contextualize.");
  }
  if (!bullets.length) {
    bullets.push(
      "We parsed your text but didn’t match common markers. Bring the full PDF to your clinician; you can still track values here over time.",
    );
  }
  return `${disclaimer}${bullets.map((b) => `• ${b}`).join("\n")}`;
}

function readNightCaptures() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NIGHT_CAPTURES_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function appendNightCapture(entry) {
  if (typeof window === "undefined") return;
  const prev = readNightCaptures();
  window.localStorage.setItem(NIGHT_CAPTURES_KEY, JSON.stringify([entry, ...prev]));
}

export default function VitalNode() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const storageKey = userScopedStorageKey(STORAGE_KEY_V3, userId);

  useLnFeatureParam(useCallback((id) => scrollToLnFeature(id), []));

  const [storageHydrated, setStorageHydrated] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [syncedApps, setSyncedApps] = useState([]);
  const [tools, setTools] = useState({
    aiHealthArchitect: true,
    smartVitalNotes: true,
  });
  const [notes, setNotes] = useState([]);
  const [vitalDash, setVitalDash] = useState(EMPTY_VITAL_DASH);

  const markSetupComplete = useCallback(() => {
    setSetupDone(true);
    setOnboardingStep(2);
  }, []);

  useServerOnboardingComplete("VitalNode", markSetupComplete);

  useEffect(() => {
    const onOnboardingDone = () => markSetupComplete();
    window.addEventListener("lifenode:onboarding:changed", onOnboardingDone);
    return () =>
      window.removeEventListener("lifenode:onboarding:changed", onOnboardingDone);
  }, [markSetupComplete]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const state = loadPersistedState(storageKey);
    setSetupDone(state.setupDone);
    setOnboardingStep(state.onboardingStep);
    setSyncedApps(state.syncedApps);
    setTools(state.tools);
    setNotes(state.notes);
    setVitalDash(state.vitalDash);
    setStorageHydrated(true);

    void (async () => {
      const merged = await hydrateWidgetsFromServer(
        [NODE_WIDGET_KEYS.vital.dashboard],
        { [NODE_WIDGET_KEYS.vital.dashboard]: state },
      );
      if (cancelled) return;
      const remote = merged[NODE_WIDGET_KEYS.vital.dashboard];
      if (remote && typeof remote === "object") {
        const r = remote;
        if (typeof r.setupDone === "boolean") setSetupDone(r.setupDone);
        if (typeof r.onboardingStep === "number") setOnboardingStep(r.onboardingStep);
        if (Array.isArray(r.syncedApps)) setSyncedApps(r.syncedApps);
        if (r.tools && typeof r.tools === "object") setTools(r.tools);
        if (Array.isArray(r.notes)) setNotes(r.notes);
        if (r.vitalDash) setVitalDash(normalizeVitalDash(r.vitalDash));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, storageKey]);

  const [isWindDown, setIsWindDown] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [architectOutput, setArchitectOutput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [selectedLabel, setSelectedLabel] = useState(LABELS[0]);
  const [loginPromptApp, setLoginPromptApp] = useState("");

  const [symptomNote, setSymptomNote] = useState("");
  const [symptomInsight, setSymptomInsight] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [flareOpen, setFlareOpen] = useState(false);
  const [flareNote, setFlareNote] = useState("");
  const [restlessText, setRestlessText] = useState("");
  const [restlessFocus, setRestlessFocus] = useState(false);
  const [restlessConfirm, setRestlessConfirm] = useState(null);
  const [labPaste, setLabPaste] = useState("");
  const [labFile, setLabFile] = useState(null);
  const [groceryHint, setGroceryHint] = useState("");
  const [flareActive, setFlareActive] = useState(() =>
    typeof window !== "undefined" ? readFlareMode().active : false,
  );
  const [recoveryPromptOpen, setRecoveryPromptOpen] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");

  const cameraInputRef = React.useRef(null);
  const uploadInputRef = React.useRef(null);

  const [clockHour, setClockHour] = useState(() => new Date().getHours());
  const verifiedSync = syncedApps.length > 0;
  const verifiedSource = getVerifiedSource(syncedApps);

  useEffect(() => {
    const id = window.setInterval(() => setClockHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function syncFlare() {
      setFlareActive(readFlareMode().active);
    }
    syncFlare();
    window.addEventListener(FLARE_MODE_CHANGED, syncFlare);
    return () => window.removeEventListener(FLARE_MODE_CHANGED, syncFlare);
  }, []);

  const effectiveSurface = useMemo(() => {
    if (vitalDash.surfaceMode === "day") return "day";
    if (vitalDash.surfaceMode === "night") return "night";
    return clockHour >= 20 || clockHour < 6 ? "night" : "day";
  }, [vitalDash.surfaceMode, clockHour]);

  const readiness = useMemo(() => computeReadiness(vitalDash), [vitalDash]);
  const kitchenCtx = useMemo(() => readKitchenContextForVital(), [vitalDash, clockHour]);
  const vitalInsight = useMemo(() => buildVitalInsight(vitalDash, kitchenCtx), [vitalDash, kitchenCtx]);

  const morningWindow = clockHour >= 6 && clockHour < 10;
  const hydrationGoal = 2500;
  const hydrationPct = Math.min(100, Math.round((vitalDash.hydrationMl / hydrationGoal) * 100));
  const stressHydrationGlow = vitalDash.bpm > 100 && vitalDash.hydrationMl < 1200;

  const digestionOverlap =
    effectiveSurface === "night" &&
    (kitchenCtx.mealPlanLines.length > 0 || kitchenCtx.recentRecipeTitles.length > 0);

  const sleepRecoveryScore = useMemo(() => {
    if (!hasWearableData(vitalDash)) return 0;
    let s = readiness;
    if (!vitalDash.sleep.noMeals3h) s -= 12;
    if (!vitalDash.sleep.lowLight) s -= 6;
    if (!vitalDash.sleep.roomTemp) s -= 4;
    if (digestionOverlap) s -= 10;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [readiness, vitalDash, digestionOverlap]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !storageHydrated) return;
    const payload = {
      setupDone,
      onboardingStep,
      syncedApps,
      tools,
      notes,
      vitalDash,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vital.dashboard, payload);
  }, [
    userId,
    storageKey,
    storageHydrated,
    setupDone,
    onboardingStep,
    syncedApps,
    tools,
    notes,
    vitalDash,
  ]);

  const toggleSync = (name) => {
    const isAdding = !syncedApps.includes(name);
    const nextApps = isAdding
      ? [...syncedApps, name]
      : syncedApps.filter((item) => item !== name);
    setSyncedApps(nextApps);
    if (isAdding) setLoginPromptApp(name);
  };

  const setTool = (key, value) => {
    setTools((t) => ({ ...t, [key]: value }));
  };

  const completeSetup = () => {
    setSetupDone(true);
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    setNotes((prev) => [
      {
        id: crypto.randomUUID(),
        text: noteInput.trim(),
        label: selectedLabel,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNoteInput("");
  };

  const removeNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const hasUserVitalActivity =
    syncedApps.length > 0 ||
    notes.length > 0 ||
    vitalDash.symptomLogs.length > 0 ||
    hasWearableData(vitalDash);
  const resilience = hasUserVitalActivity
    ? Math.min(
        100,
        Math.round(
          syncedApps.length * 4 +
            notes.length * 2.5 +
            vitalDash.symptomLogs.length * 1.5 +
            (readiness > 0 ? readiness * 0.35 : 0),
        ),
      )
    : 0;
  const resilienceTone =
    resilience >= 75 ? "bg-emerald-500" : resilience >= 55 ? "bg-amber-500" : "bg-rose-500";

  const runArchitect = () => {
    const out = generateHealthArchitectGuidance({
      resilience,
      readiness,
      recentSymptoms: vitalDash.symptomLogs,
      prompt,
      flareActive,
    });
    setArchitectOutput(out);
  };

  const resetArchitect = () => {
    setArchitectOutput("");
    setPrompt("");
  };

  async function onLabFileSelected(file) {
    if (!file) return;
    setLabFile(file);
    const extracted = await extractTextFromLabFile(file);
    setLabPaste((prev) => (prev.trim() ? `${prev}\n\n${extracted}` : extracted));
  }

  function activateFlareProtocol() {
    activateFlareMode(flareNote);
    seedFlareTaskFlags([
      "Construction bid review",
      "Client negotiation block",
      "Site logistics sweep",
      "Marketing blueprint session",
    ]);
    recordFlare();
    setFlareActive(true);
  }

  function requestDeactivateFlare() {
    setRecoveryPromptOpen(true);
  }

  function finishDeactivateFlare() {
    const insight = recoveryAnswer.trim();
    deactivateFlareMode(insight || undefined);
    clearFlareTaskFlags();
    if (insight) {
      const id = crypto.randomUUID();
      const summary = `Post-flare reflection (${new Date().toLocaleDateString()}): ${insight}`;
      setVitalDash((d) => ({
        ...d,
        labResults: [
          {
            id,
            title: "Flare trigger insight",
            summary,
            createdAt: new Date().toISOString(),
          },
          ...d.labResults,
        ].slice(0, 20),
        timeline: [
          {
            id,
            type: "flare",
            title: "Recovery insight",
            date: new Date().toISOString().slice(0, 10),
            subtitle: insight.slice(0, 48),
          },
          ...d.timeline,
        ].slice(0, 60),
      }));
    }
    setRecoveryAnswer("");
    setRecoveryPromptOpen(false);
    setFlareActive(false);
  }

  const pulseBreatheClass =
    resilience >= 80
      ? "vital-pulse-breathe vital-pulse-breathe--high"
      : resilience >= 50
        ? "vital-pulse-breathe vital-pulse-breathe--mid"
        : "vital-pulse-breathe vital-pulse-breathe--low";

  function logSymptom(label) {
    const k = readKitchenContextForVital();
    const insight = analyzeCulinaryCorrelation(label, k);
    setSymptomInsight(insight);
    const entry = {
      id: crypto.randomUUID(),
      label,
      note: symptomNote.trim() || null,
      insight,
      at: new Date().toISOString(),
    };
    setVitalDash((d) => ({
      ...d,
      symptomLogs: [entry, ...d.symptomLogs].slice(0, 40),
      timeline: [
        {
          id: entry.id,
          type: "symptom",
          title: label,
          date: entry.at.slice(0, 10),
          subtitle: "Symptom log",
        },
        ...d.timeline,
      ].slice(0, 60),
    }));
    setSymptomNote("");
  }

  function deleteTimelineEvent(id) {
    setVitalDash((d) => ({
      ...d,
      timeline: d.timeline.filter((ev) => ev.id !== id),
      symptomLogs: d.symptomLogs.filter((s) => s.id !== id),
    }));
  }

  function ingestLab() {
    const combined = [labPaste.trim(), labFile ? `Attached: ${labFile.name}` : ""].filter(Boolean).join("\n\n");
    if (!combined) return;
    const summary = interpretLabHeuristic(combined, vitalDash.clinicName);
    if (!summary) return;
    const added = suggestVitaminDGroceryIfNeeded(summary);
    setGroceryHint(
      added ? "Added a Vitamin D–rich grocery hint to your Native List (Kitchen bridge)." : "",
    );
    const id = crypto.randomUUID();
    setVitalDash((d) => ({
      ...d,
      labResults: [{ id, title: "Lab / document summary", summary, createdAt: new Date().toISOString() }, ...d.labResults].slice(
        0,
        20,
      ),
      timeline: [
        {
          id,
          type: "lab",
          title: "Lab interpretation saved",
          date: new Date().toISOString().slice(0, 10),
          subtitle: "Vault",
        },
        ...d.timeline,
      ].slice(0, 60),
    }));
    setLabPaste("");
    setLabFile(null);
  }

  function recordFlare() {
    const k = readKitchenContextForVital();
    const block = [
      `Flare report — ${new Date().toLocaleString()}`,
      `Vitals snapshot: BPM ${vitalDash.bpm}, SpO₂ ${vitalDash.spo2}%, sleep score ${vitalDash.sleepScore}, HRV ${vitalDash.hrv} ms, steps ${vitalDash.steps}.`,
      `Hydration today: ${vitalDash.hydrationMl} ml / ${hydrationGoal} ml goal.`,
      `Weather context (demo): mild conditions — log your local weather in notes if relevant.`,
      `Kitchen (last 24–48h bridge): meals: ${k.mealPlanLines.slice(0, 5).join("; ") || "—"} | recipes: ${k.recentRecipeTitles.slice(0, 4).join("; ") || "—"}.`,
      flareNote ? `Notes: ${flareNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const id = crypto.randomUUID();
    setVitalDash((d) => ({
      ...d,
      flareReports: [{ id, text: block, at: new Date().toISOString() }, ...d.flareReports].slice(0, 12),
      timeline: [
        {
          id,
          type: "flare",
          title: "Flare mode capture",
          date: new Date().toISOString().slice(0, 10),
          subtitle: "Export-ready",
        },
        ...d.timeline,
      ].slice(0, 60),
    }));
    setFlareNote("");
    setFlareOpen(false);
    try {
      void navigator.clipboard?.writeText(block);
    } catch {
      /* ignore */
    }
  }

  function submitRestless(textOverride) {
    const raw = (textOverride ?? restlessText).trim();
    if (!raw) return;
    const firstLine = raw.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "Captured thought";
    const projectGuess = raw.toLowerCase().includes("bid") || raw.toLowerCase().includes("site")
      ? "Residential project"
      : "General ops";
    const entry = {
      id: crypto.randomUUID(),
      title: firstLine.slice(0, 120),
      project: projectGuess,
      body: raw.slice(0, 2000),
      capturedAt: new Date().toISOString(),
      source: "vital-restless",
    };
    appendNightCapture(entry);
    setRestlessConfirm("Task captured for BizNode review. Your mind is clear for rest.");
    setRestlessText("");
    setRestlessFocus(false);
    setVitalDash((d) => ({
      ...d,
      timeline: [
        {
          id: entry.id,
          type: "mind",
          title: "Restless mind → capture",
          date: entry.capturedAt.slice(0, 10),
          subtitle: firstLine.slice(0, 40),
        },
        ...d.timeline,
      ].slice(0, 60),
    }));
  }

  const momentumMode = !hasWearableData(vitalDash)
    ? "Awaiting first sync"
    : flareActive
      ? "Sustainability mode"
      : readiness >= 80
        ? "Power mode"
        : readiness < 52
          ? "Sustainability mode"
          : "Steady cadence";
  const momentumTasks = !hasWearableData(vitalDash)
    ? ["Connect a wearable or health app", "Log how you feel today", "Set your hydration goal"]
    : flareActive || readiness < 52
      ? ["Light admin + inbox", "Review last night's captured thoughts", "15-min walk + hydration"]
      : readiness >= 80
        ? ["Deep-work priority block", "Client or project focus", "Recovery micro-break"]
        : ["One priority task", "One health micro-win", "One relationship touchpoint"];
  if (!setupDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-[#eef3f2] to-[#e5efee] p-6 text-slate-800">
        <ConnectAppDialog
          app={loginPromptApp || null}
          nodeLabel="VitalNode"
          accent="#0F766E"
          onLogin={() => setLoginPromptApp("")}
          onLater={() => setLoginPromptApp("")}
        />
        <div className="mx-auto max-w-6xl">
          <header className="mb-10 flex items-center justify-between">
            <h1 className="text-xl font-bold">VitalNode</h1>
            <Link href="/" className="rounded-xl bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm">
              LifeNode home
            </Link>
          </header>

          <div className={`${glassCard()} mx-auto mb-8 max-w-4xl p-8 text-center`}>
            <h2 className={`${FONT_PLAYFAIR} text-3xl italic leading-tight text-slate-900`}>
              Your body is the ultimate operating system. Let&apos;s synchronize your ecosystem-no app,
              no problem; our native tools have you covered.
            </h2>
          </div>

          {onboardingStep === 1 ? (
            <section className={`${glassCard()} p-6 md:p-8`}>
              <h3 className="mb-2 text-xl font-bold">Step 1: The Vital Ecosystem</h3>
              <p className="mb-6 text-sm text-slate-600">Sync your stack from wearables to recovery apps.</p>
              <div className="space-y-7">
                {VITAL_APPS.map((group) => (
                  <div key={group.category}>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                      {group.category}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {group.items.map((app) => {
                        const Icon = getIconForApp(app);
                        const active = syncedApps.includes(app);
                        return (
                          <button
                            key={app}
                            type="button"
                            onClick={() => toggleSync(app)}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? "border-emerald-300 bg-emerald-50/80 shadow"
                                : "border-white/60 bg-white/40 hover:bg-white/60"
                            }`}
                          >
                            <Icon className="mb-2 h-4 w-4 text-slate-700" />
                            <p className="text-sm font-semibold leading-tight">{app}</p>
                          </button>
                        );
                      })}
                    </div>
                    <AppCategoryRequestFooter
                      category={group.category}
                      nodeLabel="VitalNode"
                      variant="glass"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
                >
                  Continue
                </button>
              </div>
            </section>
          ) : (
            <section className={`${glassCard()} p-6 md:p-8`}>
              <h3 className="mb-2 text-xl font-bold">Step 2: The Vital Toolkit</h3>
              <p className="mb-6 text-sm text-slate-600">
                Which native LifeNode enhancements would you like to activate?
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/45 p-4">
                  <input
                    type="checkbox"
                    checked={tools.aiHealthArchitect}
                    onChange={(e) => setTool("aiHealthArchitect", e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">AI Health Architect</p>
                    <p className="text-sm text-slate-600">Research & planning command center.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/45 p-4">
                  <input
                    type="checkbox"
                    checked={tools.smartVitalNotes}
                    onChange={(e) => setTool("smartVitalNotes", e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold">Smart Vital Notes</p>
                    <p className="text-sm text-slate-600">Biomarker and feeling log with labels.</p>
                  </div>
                </label>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={completeSetup}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"
                >
                  Launch VitalNode
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen bg-gradient-to-br from-[#eef1f0] via-[#e9eeee] to-[#e6ecec] p-4 text-slate-800 sm:p-6 ${
        restlessFocus ? "ring-2 ring-indigo-300/60" : ""
      } ${flareActive ? "vital-flare-dashboard" : ""}`}
    >
      {restlessFocus ? (
        <button
          type="button"
          aria-label="Exit focus"
          className="fixed inset-0 z-[38] bg-slate-900/35 backdrop-blur-[2px]"
          onClick={() => setRestlessFocus(false)}
        />
      ) : null}

      <ConnectAppDialog
        app={loginPromptApp || null}
        nodeLabel="VitalNode"
        accent="#0F766E"
        onLogin={() => setLoginPromptApp("")}
        onLater={() => setLoginPromptApp("")}
      />

      <div className="relative z-[40] mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={`${FONT_PLAYFAIR} text-4xl font-bold italic text-slate-900`}>VitalNode</h1>
            <p className="text-sm text-slate-600">
              Life OS vitals — fuel vs. feeling, labs, hydration, and recovery in one glass surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex rounded-2xl border border-white/60 bg-white/50 p-1 text-xs font-bold`}>
              {["auto", "day", "night"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVitalDash((d) => ({ ...d, surfaceMode: m }))}
                  className={`rounded-xl px-3 py-1.5 capitalize ${
                    vitalDash.surfaceMode === m ? "bg-slate-900 text-white shadow" : "text-slate-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (flareActive ? requestDeactivateFlare() : setFlareOpen(true))}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm ${
                flareActive
                  ? "border-rose-400 bg-rose-600 text-white animate-pulse"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              <Flame className="h-4 w-4" />
              {flareActive ? "Flare mode ON" : "Flare mode"}
            </button>
            <button
              type="button"
              onClick={() => setIsWindDown(true)}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white sm:text-sm"
            >
              Wind down
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupDone(false);
                setOnboardingStep(1);
              }}
              className="rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm sm:text-sm"
            >
              Re-sync apps
            </button>
          </div>
        </header>

        {morningWindow ? (
          <section
            id="ln-feature-momentum"
            className={`${glassCard()} mb-5 border-amber-200/50 bg-gradient-to-r from-amber-50/90 via-white/40 to-white/35 p-5 shadow-[0_12px_40px_rgba(251,191,36,0.12)]`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-800/80">
                  <Sunrise className="h-4 w-4" />
                  Morning momentum
                </p>
                <h2 className="text-lg font-bold text-slate-900">{momentumMode}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Readiness {readiness}/100 · {readNightCaptures().length} night captures on file (🌙 in BizNode when
                  wired). Start with what matches your battery.
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md sm:text-sm"
                onClick={() => document.getElementById("vital-architect")?.scrollIntoView({ behavior: "smooth" })}
              >
                Start momentum
              </button>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {momentumTasks.map((t) => (
                <li
                  key={t}
                  className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  {t}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <VitalFlipCard
            title="AI Vital Insight"
            backDefinition="AI Vital Insight correlates sleep, HRV, and activity with Kitchen meal context. It turns raw numbers into one actionable sentence—not more charts."
            className="lg:col-span-7"
            verified={verifiedSync}
            verifiedSource={verifiedSource}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-teal-600" />
              <p className="text-sm leading-relaxed text-slate-700">{vitalInsight}</p>
            </div>
          </VitalFlipCard>

          <VitalFlipCard
            title="Body Battery & Readiness"
            backDefinition="Body Battery & Readiness is an aggregate score of physical recovery versus exertion. It flexes daily goals so you don't push through when your system is already taxed."
            className="lg:col-span-5"
            verified={verifiedSync}
            verifiedSource={verifiedSource}
          >
            <p className="mb-3 text-xs text-slate-600">
              Goals flex with vitals. Low readiness favors recovery over max steps.
            </p>
            <div className="flex items-center gap-4">
              <RadialResilience value={readiness} size={96} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">Readiness index</p>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">This Mo. RHR</p>
                <p className="text-lg font-bold text-slate-900">
                  {vitalDash.thisMonthAvgRhr > 0 ? vitalDash.thisMonthAvgRhr : "—"}
                </p>
              </div>
              <div className="flex-1 rounded-2xl bg-white/55 p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-500">Last Mo.</p>
                <p className="text-lg font-bold text-slate-700">
                  {vitalDash.lastMonthAvgRhr > 0 ? vitalDash.lastMonthAvgRhr : "—"}
                </p>
              </div>
            </div>
          </VitalFlipCard>
        </div>

        <div className="mb-4">
          <VitalPulseMetricsPanel />
        </div>

        <VitalFlipCard
          title="Vitals Landscape"
          backDefinition="Vitals Landscape is a compact control deck for BPM, oxygen, sleep, HRV, and steps. Tap any tile to see what the metric means before you adjust sliders."
          className="mb-5"
          flipDisabled
          verified={verifiedSync}
          verifiedSource={verifiedSource}
        >
          <div className="mb-2 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-600" />
            <p className="text-xs text-slate-500">
              {hasWearableData(vitalDash)
                ? "Tap a metric for its definition"
                : "No vitals yet — connect a wearable or adjust sliders when you have readings."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { key: "bpm", label: "Resting BPM", min: 48, max: 120, unit: "" },
              { key: "spo2", label: "SpO₂", min: 90, max: 100, unit: "%" },
              { key: "sleepScore", label: "Sleep score", min: 40, max: 100, unit: "" },
              { key: "hrv", label: "HRV", min: 20, max: 80, unit: " ms" },
              { key: "steps", label: "Steps", min: 0, max: 16000, unit: "" },
            ].map((row) => (
              <VitalLandscapeTile
                key={row.key}
                label={row.label}
                value={vitalDash[row.key]}
                unit={row.unit}
                min={row.min}
                max={row.max}
                backDefinition={LANDSCAPE_DEFS[row.key]}
                verified={verifiedSync}
                verifiedSource={verifiedSource}
                onChange={(n) => setVitalDash((d) => ({ ...d, [row.key]: n }))}
              />
            ))}
          </div>
        </VitalFlipCard>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <VitalFlipCard
            title="Hydration OS"
            backDefinition="Hydration OS tracks daily fluid intake against your goal and highlights when elevated heart rate meets low intake—your body asking for water before you feel thirsty."
            className={`lg:col-span-4 transition-shadow ${
              stressHydrationGlow ? "shadow-[0_0_0_3px_rgba(59,130,246,0.35)] ring-1 ring-sky-300/60" : ""
            }`}
          >
            <p className="mb-3 text-xs text-slate-600">
              Linked to vitals: elevated BPM + low intake highlights this card (demo weather: mild).
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-100/80 to-white/90 p-4">
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-sky-400/25 transition-all duration-500"
                style={{ height: `${hydrationPct}%` }}
              />
              <div className="relative">
                <p className="text-2xl font-bold text-slate-900">{vitalDash.hydrationMl} ml</p>
                <p className="text-xs text-slate-600">Goal {hydrationGoal} ml · {hydrationPct}%</p>
                <input
                  type="range"
                  min={0}
                  max={hydrationGoal}
                  step={50}
                  value={vitalDash.hydrationMl}
                  onChange={(e) => setVitalDash((d) => ({ ...d, hydrationMl: Number(e.target.value) }))}
                  className="mt-4 w-full accent-sky-600"
                />
              </div>
            </div>
          </VitalFlipCard>

          <VitalFlipCard
            title="Symptom Log · Kitchen Bridge"
            backDefinition="Symptom Log ties how you feel to what you ate recently via the Kitchen bridge. One tap logs a symptom and surfaces a culinary correlation insight."
            className="lg:col-span-4"
          >
            <p className="mb-3 text-xs text-slate-600">Quick log cross-references recent ChefNode / meal plan context.</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {SYMPTOM_QUICK.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => logSymptom(`${s.emoji} ${s.label}`)}
                  className="rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white"
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            <input
              value={symptomNote}
              onChange={(e) => setSymptomNote(e.target.value)}
              placeholder="Optional detail…"
              className="mb-2 w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="w-full rounded-xl border border-slate-200 bg-white/70 py-2 text-xs font-bold text-slate-800 hover:bg-white"
            >
              View correlation map
            </button>
            {symptomInsight ? (
              <p className="mt-3 rounded-xl border border-teal-100 bg-teal-50/80 p-3 text-xs leading-relaxed text-teal-950">
                {symptomInsight}
              </p>
            ) : null}
          </VitalFlipCard>

          <VitalFlipCard
            title="Vital Timeline"
            backDefinition="Vital Timeline is a horizontal scroll of labs, flares, symptoms, and mind captures—your health story in chronological cards, not buried in settings."
            className="lg:col-span-4"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {vitalDash.timeline.length === 0 ? (
                <p className="text-xs text-slate-500">No events yet.</p>
              ) : (
                vitalDash.timeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="relative min-w-[200px] shrink-0 rounded-2xl border border-white/60 bg-white/55 p-3 pr-9 shadow-sm"
                  >
                    {ev.type === "symptom" ? (
                      <button
                        type="button"
                        onClick={() => deleteTimelineEvent(ev.id)}
                        className="absolute right-2 top-2 rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${ev.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <p className="text-[10px] font-bold uppercase text-slate-500">{ev.type}</p>
                    <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                    <p className="text-xs text-slate-500">{ev.date}</p>
                    {ev.subtitle ? <p className="mt-1 text-[11px] text-slate-600">{ev.subtitle}</p> : null}
                  </div>
                ))
              )}
            </div>
          </VitalFlipCard>

          {effectiveSurface === "night" ? (
            <section id="ln-feature-sleep" className={`${glassNight()} p-5 lg:col-span-6`}>
              <div className="mb-2 flex items-center gap-2 text-indigo-100">
                <Moon className="h-5 w-5" />
                <h2 className="text-base font-bold">Sleep hygiene · Chrononutrition</h2>
              </div>
              {digestionOverlap ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-50">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Digestion overlap: Kitchen still shows planned meals — aim to finish heavier plates 3h before target
                    bedtime.
                  </span>
                </div>
              ) : (
                <p className="mb-3 text-xs text-slate-300">Kitchen looks clear for late fuel — nice wind-down runway.</p>
              )}
              <div className="mb-3 flex gap-3">
                <div className="flex flex-1 flex-col items-center justify-end rounded-xl bg-slate-900/40 p-2">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-sky-400"
                    style={{ height: `${sleepRecoveryScore}px`, maxHeight: "120px" }}
                  />
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Recovery</p>
                  <p className="text-sm font-bold text-white">{sleepRecoveryScore}%</p>
                </div>
                <div className="flex flex-1 flex-col justify-center gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={vitalDash.sleep.noMeals3h}
                      onChange={(e) =>
                        setVitalDash((d) => ({ ...d, sleep: { ...d.sleep, noMeals3h: e.target.checked } }))
                      }
                    />
                    No meals within 3h of bed
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={vitalDash.sleep.lowLight}
                      onChange={(e) =>
                        setVitalDash((d) => ({ ...d, sleep: { ...d.sleep, lowLight: e.target.checked } }))
                      }
                    />
                    Low-light mode
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={vitalDash.sleep.roomTemp}
                      onChange={(e) =>
                        setVitalDash((d) => ({ ...d, sleep: { ...d.sleep, roomTemp: e.target.checked } }))
                      }
                    />
                    Room ~18°C / 65°F
                  </label>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Nightcap hint: magnesium-forward snacks (e.g. pumpkin seeds, walnuts) beat heavy leftovers for HRV.
              </p>
            </section>
          ) : null}

          {effectiveSurface === "night" ? (
            <section className={`${glassNight()} relative z-[45] p-5 lg:col-span-6`}>
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-200" />
                <h2 className="text-base font-bold">Restless mind → BizNode capture</h2>
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Dump the thought — we store under <code className="text-indigo-200">{NIGHT_CAPTURES_KEY}</code> for
                BizNode flows.
              </p>
              <textarea
                value={restlessText}
                onChange={(e) => setRestlessText(e.target.value)}
                onFocus={() => setRestlessFocus(true)}
                rows={4}
                placeholder="e.g. Call GC about footing schedule tomorrow…"
                className="w-full rounded-xl border border-white/15 bg-slate-900/50 p-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-indigo-400/60"
              />
              <button
                type="button"
                onClick={submitRestless}
                className="mt-2 w-full rounded-xl bg-indigo-400/90 py-2.5 text-sm font-bold text-slate-950"
              >
                Capture & clear
              </button>
              {restlessConfirm ? (
                <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3 text-xs text-emerald-50">
                  {restlessConfirm}
                </p>
              ) : null}
            </section>
          ) : null}

          <VitalFlipCard
            title="Vitals Vault · Lab Interpreter"
            backDefinition="Vitals Vault stores lab interpretations in plain English with a mandatory medical disclaimer. Upload PDFs or photos and add pasted values for trend tracking over time."
            className="lg:col-span-6"
            flipDisabled
          >
            <label className="mb-1 block text-xs font-semibold text-slate-600">Clinic name (disclaimer)</label>
            <input
              value={vitalDash.clinicName}
              onChange={(e) => setVitalDash((d) => ({ ...d, clinicName: e.target.value }))}
              className="mb-3 w-full rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-sm"
            />
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white/80 py-2.5 text-xs font-bold text-violet-900 hover:bg-violet-50"
              >
                <Camera className="h-4 w-4" />
                Scan
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white/80 py-2.5 text-xs font-bold text-violet-900 hover:bg-violet-50"
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onLabFileSelected(f);
                e.target.value = "";
              }}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onLabFileSelected(f);
                e.target.value = "";
              }}
            />
            {labFile ? (
              <p className="mb-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">
                File attached: {labFile.name}
              </p>
            ) : null}
            <textarea
              value={labPaste}
              onChange={(e) => setLabPaste(e.target.value)}
              rows={4}
              placeholder="Optional: paste lab lines or reference ranges here…"
              className="mb-2 w-full rounded-xl border border-white/60 bg-white/60 p-3 text-sm"
            />
            <button
              type="button"
              onClick={ingestLab}
              disabled={!labPaste.trim() && !labFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Analyze & save to vault
            </button>
            {groceryHint ? <p className="mt-2 text-xs font-semibold text-emerald-800">{groceryHint}</p> : null}
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {vitalDash.labResults.map((lab) => (
                <div key={lab.id} className="rounded-xl border border-white/60 bg-white/55 p-3 text-xs text-slate-800">
                  <p className="font-bold text-slate-900">{lab.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed">{lab.summary}</p>
                </div>
              ))}
            </div>
          </VitalFlipCard>

          {tools.aiHealthArchitect && (
            <div id="vital-architect" className="lg:col-span-6">
              <VitalFlipCard
                title="AI Health Architect"
                backDefinition="AI Health Architect is your health concierge—not a generic chatbot. It reads resilience, symptoms, and your prompt to tailor plans in human, expert language."
                flipDisabled
              >
              <p className="mb-3 text-xs text-slate-600">
                Concierge guidance grounded in Biological Pulse ({resilience}% resilience) and recent symptom logs.
              </p>
              <div className="mb-2 flex flex-wrap gap-2">
                {DEFAULT_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPrompt(item)}
                    className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-24 w-full rounded-2xl border border-white/60 bg-white/60 p-3 pr-10 text-sm"
                />
                {prompt ? (
                  <button
                    type="button"
                    aria-label="Clear prompt"
                    onClick={() => setPrompt("")}
                    className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runArchitect}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Generate guidance
                </button>
                <button
                  type="button"
                  onClick={resetArchitect}
                  className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  New plan
                </button>
              </div>
              <div className="mt-3 rounded-2xl border border-white/60 bg-white/55 p-3">
                <ArchitectMarkdown text={architectOutput} />
              </div>
              </VitalFlipCard>
            </div>
          )}

          <VitalFlipCard
            title="Biological Pulse"
            backDefinition="Biological Pulse is your resilience anchor—how recovered you are based on synced wearables, notes, and symptom cadence. It drives readiness across HomeNode and BizNode."
            className={`lg:col-span-6 ${pulseBreatheClass}`}
            verified={verifiedSync}
            verifiedSource={verifiedSource}
          >
            <p className="text-xs text-slate-600">Resilience blends apps, notes, and symptom cadence.</p>
            {flareActive ? (
              <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
                Recovery focus: emergency protocol active — prioritize rest, hydration, and anti-inflammatory meals.
              </p>
            ) : null}
            <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl bg-white/60 p-4 sm:flex-row sm:items-center">
              <RadialResilience value={resilience} size={120} />
              <ul className="space-y-1 text-xs text-slate-600 sm:flex-1">
                <li>Synced apps: {syncedApps.length}</li>
                <li>Feeling logs: {notes.length}</li>
                <li>Surface: {effectiveSurface}</li>
                {verifiedSync ? <li>Live stream: {verifiedSource}</li> : null}
              </ul>
            </div>
          </VitalFlipCard>

          {tools.smartVitalNotes && (
            <section className={`${glassCard()} p-5 lg:col-span-12`}>
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
                <NotebookPen className="h-5 w-5 text-emerald-700" />
                Smart Vital Notes · Feeling log
              </h2>
              <p className="mb-3 text-xs text-slate-600">Qualitative signals — digestion, pain, energy, training.</p>
              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm"
                >
                  {LABELS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Felt bloated after high-carb meal..."
                  className="rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm md:col-span-2"
                />
                <button
                  type="button"
                  onClick={addNote}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add note
                </button>
              </div>
              <div className="space-y-2">
                {notes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/60 bg-white/55 p-3"
                  >
                    <div>
                      <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <ClipboardList className="h-3 w-3" />
                        {item.label}
                      </div>
                      <p className="text-sm text-slate-700">{item.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeNote(item.id)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
              </div>
            </section>
          )}
        </div>
      </div>

      {mapOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-md sm:items-center">
          <div className={`${glassCard()} max-h-[85vh] w-full max-w-lg overflow-y-auto p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Correlation map</h3>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-white" onClick={() => setMapOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-600">What you logged vs. fuel context (Kitchen bridge).</p>
            <ul className="space-y-2 text-sm">
              {vitalDash.symptomLogs.slice(0, 12).map((s) => (
                <li key={s.id} className="rounded-xl border border-white/60 bg-white/55 p-3">
                  <p className="font-semibold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500">{new Date(s.at).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-teal-900">{s.insight}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-sm font-bold text-white"
              onClick={() => setMapOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {flareOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-md sm:items-center">
          <div className={`${glassCard()} w-full max-w-md p-6`}>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Chronic companion · Flare mode</h3>
            <p className="mb-3 text-xs text-slate-600">
              Captures vitals, hydration, and Kitchen context into an export-ready block (clipboard when supported).
            </p>
            <textarea
              value={flareNote}
              onChange={(e) => setFlareNote(e.target.value)}
              rows={3}
              placeholder="Optional flare notes for your clinician…"
              className="mb-3 w-full rounded-xl border border-white/60 bg-white/60 p-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white"
                onClick={activateFlareProtocol}
              >
                Activate flare protocol
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
                onClick={() => setFlareOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {recoveryPromptOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-md sm:items-center">
          <div className={`${glassCard()} w-full max-w-md p-6`}>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Post-recovery insight</h3>
            <p className="mb-3 text-xs text-slate-600">
              What do you think triggered this flare? We will save this to your Vitals Vault for future patterns.
            </p>
            <textarea
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              rows={3}
              placeholder="e.g. poor sleep, stress, specific meal…"
              className="mb-3 w-full rounded-xl border border-white/60 bg-white/60 p-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white"
                onClick={finishDeactivateFlare}
              >
                Save & deactivate
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  deactivateFlareMode();
                  clearFlareTaskFlags();
                  setRecoveryPromptOpen(false);
                  setRecoveryAnswer("");
                  setFlareActive(false);
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <WindDownSanctuary
        open={isWindDown}
        onExit={() => setIsWindDown(false)}
        flareActive={flareActive}
        resilience={resilience}
        readiness={readiness}
        recentSymptoms={vitalDash.symptomLogs}
        momentumMode={momentumMode}
        onLogRestless={submitRestless}
      />
    </div>
  );
}
