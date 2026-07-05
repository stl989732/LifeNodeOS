"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLnFeatureParam, scrollToLnFeature } from "@/src/hooks/useLnFeatureParam";
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
  BarChart3,
  Bitcoin,
  Camera,
  CandlestickChart,
  CheckCircle2,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Globe,
  LineChart,
  Lock,
  Microscope,
  MessageSquareWarning,
  Network,
  NotebookPen,
  Newspaper,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import ConnectAppDialog from "@/src/components/ConnectAppDialog";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";

const STORAGE_KEY = "lifenode.tradernode.v1";
const JOURNAL_KEY = "lifenode.tradernode.journal.v1";

const ECOSYSTEM = [
  {
    category: "Charting / Execution",
    items: [
      "TradingView",
      "MetaTrader",
      "Interactive Brokers",
      "ThinkOrSwim",
      "Robinhood",
      "Binance",
      "Coinbase",
      "Kraken",
      "Bybit",
    ],
  },
  {
    category: "Information / Social",
    items: [
      "X (Twitter)",
      "Discord",
      "Bloomberg Terminal",
      "Yahoo Finance",
      "Forex Factory",
      "TradingEconomics",
      "Benzinga",
    ],
  },
  {
    category: "Journaling & Research",
    items: ["Edgewonk", "Tradervue", "Notion", "Koyfin"],
  },
];

// Step 1: Watchlist Sync — market categories the user wants to master.
const MARKET_CATEGORIES = [
  {
    id: "Indices",
    label: "Indices",
    blurb: "SPX, NDX, DAX — broad index futures and ETFs.",
    Icon: BarChart3,
    accent: "#06B6D4",
    symbols: ["SPX", "NDX", "DAX", "RTY"],
  },
  {
    id: "Tech Stocks",
    label: "Tech Stocks",
    blurb: "Mega-cap U.S. tech. NVDA, TSLA, AAPL, META.",
    Icon: CandlestickChart,
    accent: "#A78BFA",
    symbols: ["NVDA", "TSLA", "AAPL", "META"],
  },
  {
    id: "Crypto",
    label: "Crypto",
    blurb: "BTC, ETH, SOL — 24/7 markets.",
    Icon: Bitcoin,
    accent: "#F59E0B",
    symbols: ["BTC", "ETH", "SOL"],
  },
  {
    id: "Forex",
    label: "Forex",
    blurb: "Majors: EURUSD, GBPUSD, USDJPY, DXY.",
    Icon: Globe,
    accent: "#10B981",
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "DXY"],
  },
];

// Full universe of tradable symbols with mock prices. Filtered by primary_watchlist.
const FULL_WATCHLIST = [
  { sym: "SPX", price: 5_487.21, chg: +0.42, cat: "Indices" },
  { sym: "NDX", price: 19_812.4, chg: +0.71, cat: "Indices" },
  { sym: "DAX", price: 18_341.2, chg: +0.18, cat: "Indices" },
  { sym: "RTY", price: 2_044.6, chg: -0.32, cat: "Indices" },
  { sym: "NVDA", price: 1_124.75, chg: -0.88, cat: "Tech Stocks" },
  { sym: "TSLA", price: 248.31, chg: +2.41, cat: "Tech Stocks" },
  { sym: "AAPL", price: 214.18, chg: +0.32, cat: "Tech Stocks" },
  { sym: "META", price: 487.11, chg: -0.41, cat: "Tech Stocks" },
  { sym: "BTC", price: 71_204.0, chg: -1.18, cat: "Crypto" },
  { sym: "ETH", price: 3_842.55, chg: -0.62, cat: "Crypto" },
  { sym: "SOL", price: 174.32, chg: +1.84, cat: "Crypto" },
  { sym: "EURUSD", price: 1.0823, chg: +0.09, cat: "Forex" },
  { sym: "GBPUSD", price: 1.2715, chg: -0.06, cat: "Forex" },
  { sym: "USDJPY", price: 156.41, chg: +0.21, cat: "Forex" },
  { sym: "DXY", price: 105.41, chg: -0.14, cat: "Forex" },
  { sym: "GOLD", price: 2_412.3, chg: +0.55, cat: "Indices" },
  { sym: "OIL", price: 78.92, chg: +1.04, cat: "Indices" },
];

// Step 2: Trading sessions (UTC window, label, blurb).
const TRADING_SESSIONS = [
  { id: "tokyo", label: "Tokyo", window: "00:00 – 06:00 UTC" },
  { id: "london", label: "London", window: "08:00 – 16:30 UTC" },
  { id: "newYork", label: "New York", window: "13:30 – 20:00 UTC" },
];

const LEVERAGE_OPTIONS = [1, 2, 5, 10, 20, 50, 100];

// Step 3: Journaling Ritual — emotional ledger seeds.
const EMOTION_LIBRARY = [
  { id: "FOMO", tone: "bad" },
  { id: "Revenge Trading", tone: "bad" },
  { id: "Greed", tone: "bad" },
  { id: "Boredom", tone: "warn" },
  { id: "Anxiety", tone: "warn" },
  { id: "Fear", tone: "warn" },
  { id: "Confidence", tone: "good" },
  { id: "Patience", tone: "good" },
  { id: "Setup Present", tone: "good" },
];

const MACRO_EVENTS = [
  { name: "US CPI (YoY)", impact: "HIGH", inHours: 6 },
  { name: "FOMC Statement", impact: "HIGH", inHours: 27 },
  { name: "Powell Press Conf.", impact: "HIGH", inHours: 28 },
  { name: "Initial Jobless Claims", impact: "MED", inHours: 51 },
  // Narrow window so Halt strip can demo “yellow” macro caution in-session.
  { name: "High-impact data (mock)", impact: "HIGH", inHours: 0.42 },
];

/** Mock account size for dollar-at-risk in the What-If widget (no live broker). */
const MOCK_ACCOUNT_BALANCE = 100_000;

/** SPY / QQQ / BTC mock basis for correlation strip (deterministic per asset + tick). */
const CORR_BENCH = [
  { sym: "SPY", base: 0.18 },
  { sym: "QQQ", base: 0.31 },
  { sym: "BTC", base: -0.12 },
];

// Static icon mapping used by the dashboard's emotional check-in modal.
const EMOTION_ICON = {
  FOMO: Flame,
  "Revenge Trading": AlertTriangle,
  Greed: Flame,
  Boredom: MessageSquareWarning,
  Anxiety: ShieldAlert,
  Fear: ShieldAlert,
  Confidence: ShieldCheck,
  Patience: Shield,
  "Setup Present": Target,
};

function defaultPersisted() {
  return {
    // Legacy fields kept for back-compat with older shells.
    setupDone: false,
    onboardingStep: 1,
    syncedApps: [],
    guards: { sentimentEngine: true, psychCheckin: true, sniperMode: true },

    // NEW — Trader Initialization fields.
    trader_onboarding_complete: false,
    primary_watchlist: [], // market categories (Crypto / Forex / Tech Stocks / Indices)
    max_daily_drawdown: 250,
    drawdown_unit: "USD", // "USD" | "PCT"
    preferred_leverage: 5,
    trading_hours: { tokyo: false, london: true, newYork: true, custom: null },
    tracked_emotions: ["FOMO", "Revenge Trading", "Greed"],
    lastEmotionalCheckinAt: null, // ISO timestamp — gates the Halt Light
  };
}

function loadPersisted(storageKey) {
  if (typeof window === "undefined") return defaultPersisted();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw);
    const defaults = defaultPersisted();
    return {
      ...defaults,
      setupDone: parsed.setupDone ?? defaults.setupDone,
      onboardingStep: parsed.onboardingStep ?? defaults.onboardingStep,
      syncedApps: Array.isArray(parsed.syncedApps) ? parsed.syncedApps : [],
      guards: {
        sentimentEngine: parsed.guards?.sentimentEngine ?? true,
        psychCheckin: parsed.guards?.psychCheckin ?? true,
        sniperMode: parsed.guards?.sniperMode ?? true,
      },
      trader_onboarding_complete:
        parsed.trader_onboarding_complete ?? defaults.trader_onboarding_complete,
      primary_watchlist: Array.isArray(parsed.primary_watchlist)
        ? parsed.primary_watchlist
        : defaults.primary_watchlist,
      max_daily_drawdown:
        typeof parsed.max_daily_drawdown === "number"
          ? parsed.max_daily_drawdown
          : defaults.max_daily_drawdown,
      drawdown_unit: parsed.drawdown_unit === "PCT" ? "PCT" : "USD",
      preferred_leverage:
        typeof parsed.preferred_leverage === "number"
          ? parsed.preferred_leverage
          : defaults.preferred_leverage,
      trading_hours: {
        tokyo: parsed.trading_hours?.tokyo ?? false,
        london: parsed.trading_hours?.london ?? true,
        newYork: parsed.trading_hours?.newYork ?? true,
        custom: parsed.trading_hours?.custom ?? null,
      },
      tracked_emotions: Array.isArray(parsed.tracked_emotions)
        ? parsed.tracked_emotions
        : defaults.tracked_emotions,
      lastEmotionalCheckinAt: parsed.lastEmotionalCheckinAt ?? null,
    };
  } catch {
    return defaultPersisted();
  }
}

function isSameLocalDay(iso) {
  if (!iso) return false;
  const a = new Date(iso);
  const b = new Date();
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function loadJournal(journalKey) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(journalKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fmtCountdown(hours) {
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function fmtPrice(n) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toFixed(n < 10 ? 4 : 2);
}

function buildAutopsyParagraph(trade, thesisSnapshot, sentimentScore) {
  const pnl = Number(trade.pnl) || 0;
  const volNote =
    sentimentScore > 10
      ? "Sentiment was leaning bullish, which can invite late chasing."
      : sentimentScore < -10
        ? "Sentiment was leaning bearish — fading strength is easy to misread as exhaustion."
        : "Sentiment was neutral — the tape gave little directional edge.";
  const emotion = trade.tag || "Untagged";
  const outcome =
    pnl < 0
      ? `This ${trade.side} on ${trade.symbol} tagged '${emotion}' closed underwater (${pnl}).`
      : `This ${trade.side} on ${trade.symbol} tagged '${emotion}' printed green (${pnl >= 0 ? "+" : ""}${pnl}).`;
  return `${outcome} ${volNote} At entry, Lino read: ${thesisSnapshot.slice(0, 160)}${thesisSnapshot.length > 160 ? "…" : ""} Lessons: keep size aligned to your stop distance, and if '${emotion}' shows up again, wait for a clean session open before leaning in.`;
}

export default function TradeNode() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  useLnFeatureParam(useCallback((id) => scrollToLnFeature(id), []));

  const traderStorageKey = userScopedStorageKey(STORAGE_KEY, userId);
  const traderJournalKey = userScopedStorageKey(JOURNAL_KEY, userId);
  const firstName = useMemo(() => {
    const n = session?.user?.name?.trim();
    if (!n) return "Trader";
    return n.split(/\s+/)[0];
  }, [session?.user?.name]);

  const [state, setState] = useState(() => defaultPersisted());
  const [journal, setJournal] = useState([]);
  const [traderHydrated, setTraderHydrated] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const localState = loadPersisted(traderStorageKey);
    const localJournal = loadJournal(traderJournalKey);
    setState(localState);
    setJournal(localJournal);
    setTraderHydrated(true);

    void (async () => {
      const merged = await hydrateWidgetsFromServer(
        [NODE_WIDGET_KEYS.trader.settings, NODE_WIDGET_KEYS.trader.journal],
        {
          [NODE_WIDGET_KEYS.trader.settings]: localState,
          [NODE_WIDGET_KEYS.trader.journal]: localJournal,
        },
      );
      if (cancelled) return;
      const remoteState = merged[NODE_WIDGET_KEYS.trader.settings];
      if (remoteState && typeof remoteState === "object") {
        setState({ ...defaultPersisted(), ...remoteState });
      }
      const remoteJournal = merged[NODE_WIDGET_KEYS.trader.journal];
      if (Array.isArray(remoteJournal)) setJournal(remoteJournal);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, traderStorageKey, traderJournalKey]);

  // Three-step onboarding flow (welcome -> 1 -> 2 -> 3). Driven by spec.
  const [initStep, setInitStep] = useState(0); // 0 = welcome card
  const [loginPromptApp, setLoginPromptApp] = useState("");

  const [selectedAsset, setSelectedAsset] = useState("SPX");
  const [isPnlVisible, setIsPnlVisible] = useState(false);
  const [isWinRateVisible, setIsWinRateVisible] = useState(false);
  const [isSniperMode, setIsSniperMode] = useState(false);

  const [showCheckin, setShowCheckin] = useState(false);
  const [pendingTag, setPendingTag] = useState(null);
  const [draftTrade, setDraftTrade] = useState({
    symbol: "SPX",
    side: "LONG",
    entry: "",
    note: "",
  });
  const [showQuickLog, setShowQuickLog] = useState(false);

  // What-If risk planner (R:R gate for arming trades) + AI Autopsy modal
  const [riskEntry, setRiskEntry] = useState("");
  const [riskStop, setRiskStop] = useState("");
  const [riskTake, setRiskTake] = useState("");
  const [riskQty, setRiskQty] = useState("100");
  const [autopsyEntry, setAutopsyEntry] = useState(null);

  // Live ticking countdowns + ticker scroll feel
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !traderHydrated) return;
    window.localStorage.setItem(traderStorageKey, JSON.stringify(state));
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.trader.settings, state);
  }, [state, userId, traderStorageKey, traderHydrated]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId || !traderHydrated) return;
    window.localStorage.setItem(traderJournalKey, JSON.stringify(journal));
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.trader.journal, journal);
  }, [journal, userId, traderJournalKey, traderHydrated]);

  const toggleApp = (app) => {
    setState((s) => {
      const isAdding = !s.syncedApps.includes(app);
      const next = {
        ...s,
        syncedApps: isAdding
          ? [...s.syncedApps, app]
          : s.syncedApps.filter((a) => a !== app),
      };
      if (isAdding) setLoginPromptApp(app);
      return next;
    });
  };

  // Step 1: watchlist categories
  const toggleMarketCategory = (id) =>
    setState((s) => ({
      ...s,
      primary_watchlist: s.primary_watchlist.includes(id)
        ? s.primary_watchlist.filter((c) => c !== id)
        : [...s.primary_watchlist, id],
    }));

  // Step 2: risk profile fields
  const setRiskField = (patch) =>
    setState((s) => ({ ...s, ...patch }));
  const toggleSession = (id) =>
    setState((s) => ({
      ...s,
      trading_hours: { ...s.trading_hours, [id]: !s.trading_hours[id] },
    }));

  // Step 3: tracked emotions
  const toggleEmotion = (id) =>
    setState((s) => ({
      ...s,
      tracked_emotions: s.tracked_emotions.includes(id)
        ? s.tracked_emotions.filter((e) => e !== id)
        : [...s.tracked_emotions, id],
    }));

  const completeOnboarding = () =>
    setState((s) => ({
      ...s,
      setupDone: true,
      trader_onboarding_complete: true,
    }));

  const restartOnboarding = () => {
    setState((s) => ({
      ...s,
      setupDone: false,
      trader_onboarding_complete: false,
    }));
    setInitStep(0);
  };

  // ---------- DASHBOARD-ONLY DERIVATIONS ----------
  // Filtered watchlist driven by the user's onboarding choices. Falls back to
  // the full universe if nothing was picked (defensive — Trader Initialization
  // requires at least one category before completing).
  const watchlist = useMemo(() => {
    if (!state.primary_watchlist?.length) return FULL_WATCHLIST;
    return FULL_WATCHLIST.filter((t) =>
      state.primary_watchlist.includes(t.cat),
    );
  }, [state.primary_watchlist]);

  // When the filtered watchlist no longer contains the persisted symbol, derive
  // the active row from the list (avoids setState-in-effect per react-hooks).
  const activeAsset = useMemo(() => {
    if (!watchlist.length) return selectedAsset;
    return watchlist.some((t) => t.sym === selectedAsset)
      ? selectedAsset
      : watchlist[0].sym;
  }, [watchlist, selectedAsset]);

  // Emotional tags the dashboard's check-in modal will surface. We honor the
  // user's `tracked_emotions` from Step 3 if present, otherwise fall back to
  // the previous defaults so legacy users still get a working modal.
  const emotionalTags = useMemo(() => {
    const source =
      state.tracked_emotions?.length > 0
        ? state.tracked_emotions
        : ["Setup Present", "FOMO", "Boredom", "Revenge Trading"];
    return source.map((tag) => {
      const meta = EMOTION_LIBRARY.find((e) => e.id === tag);
      return {
        tag,
        tone: meta?.tone ?? "warn",
        Icon: EMOTION_ICON[tag] ?? MessageSquareWarning,
      };
    });
  }, [state.tracked_emotions]);

  // Sentiment derived from selected asset; deterministic so it doesn't jitter every render
  const sentiment = useMemo(() => {
    const seed = activeAsset
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = ((seed * 7) % 100) - 50; // -50..49
    return Math.max(-50, Math.min(50, score));
  }, [activeAsset]);

  const sentimentLabel =
    sentiment > 15 ? "BULLISH" : sentiment < -15 ? "BEARISH" : "NEUTRAL";
  const sentimentColor =
    sentiment > 15
      ? "text-[#10B981]"
      : sentiment < -15
        ? "text-[#EF4444]"
        : "text-zinc-400";

  // Intelligence: aggregate journal by tag to surface emotional patterns
  const intelligence = useMemo(() => {
    if (journal.length === 0) return null;
    const byTag = {};
    for (const t of journal) {
      const k = t.tag || "Untagged";
      if (!byTag[k]) byTag[k] = { count: 0, pnl: 0, wins: 0, losses: 0 };
      byTag[k].count += 1;
      byTag[k].pnl += Number(t.pnl) || 0;
      if ((Number(t.pnl) || 0) > 0) byTag[k].wins += 1;
      if ((Number(t.pnl) || 0) < 0) byTag[k].losses += 1;
    }
    let worstTag = null;
    let worstPnl = 0;
    for (const [k, v] of Object.entries(byTag)) {
      if (v.pnl < worstPnl) {
        worstPnl = v.pnl;
        worstTag = k;
      }
    }
    return { byTag, worstTag, worstPnl };
  }, [journal]);

  // Lino's Trade Thesis — must run every render (same hook order) even while
  // Trader Initialization is showing; dashboard reads this only after onboarding.
  const tradeThesis = useMemo(() => {
    const dir =
      sentiment > 15
        ? "Neutral-Bullish"
        : sentiment < -15
          ? "Neutral-Bearish"
          : "Neutral";
    const focusLine =
      activeAsset === "SPX"
        ? "SPX is approaching the 5,500 psychological barrier — watch for a bounce or rejection."
        : activeAsset === "NDX"
          ? "NDX leadership is concentrated in mega-cap tech; breadth still narrow."
          : activeAsset === "BTC"
            ? "BTC respecting the prior swing low. Funding still positive — fade the euphoria."
            : activeAsset === "ETH"
              ? "ETH/BTC trending lower — relative weakness persists into the FOMC window."
              : activeAsset === "EURUSD"
                ? "EURUSD pinned by DXY strength. Wait for an Asia-session sweep."
                : activeAsset === "NVDA"
                  ? "NVDA gamma-heavy near the round number — expect mean reversion intraday."
                  : `${activeAsset} is consolidating inside the prior session range. No edge yet.`;
    return `Market sentiment on ${activeAsset} is ${dir}. ${focusLine}`;
  }, [activeAsset, sentiment]);

  const macroCaution30m = useMemo(
    () =>
      MACRO_EVENTS.some((ev) => {
        if (ev.impact !== "HIGH") return false;
        const remH = ev.inHours - tick / 3600;
        return remH <= 0.5 && remH > 0;
      }),
    [tick],
  );

  const correlationRows = useMemo(() => {
    const seed =
      activeAsset.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
      tick * 0.01;
    return CORR_BENCH.map((row) => {
      const wobble = Math.sin(seed * 0.07 + row.sym.length) * 0.45;
      const pct = row.base + wobble + sentiment / 400;
      return { sym: row.sym, pct };
    });
  }, [activeAsset, tick, sentiment]);

  const riskMetrics = useMemo(() => {
    const E = Number(riskEntry);
    const S = Number(riskStop);
    const T = Number(riskTake);
    const qty = Math.max(0, Number(riskQty) || 0);
    const side = draftTrade.side;
    if (![E, S, T].every((n) => Number.isFinite(n)) || qty <= 0) {
      return { rr: null, dollarRisk: null, valid: false, linoEdgeWarn: false };
    }
    let reward;
    let riskDist;
    if (side === "LONG") {
      if (!(T > E && E > S)) {
        return { rr: null, dollarRisk: null, valid: false, linoEdgeWarn: false };
      }
      reward = T - E;
      riskDist = E - S;
    } else {
      if (!(S > E && E > T)) {
        return { rr: null, dollarRisk: null, valid: false, linoEdgeWarn: false };
      }
      reward = E - T;
      riskDist = S - E;
    }
    if (riskDist <= 0) {
      return { rr: null, dollarRisk: null, valid: false, linoEdgeWarn: false };
    }
    const rr = reward / riskDist;
    const dollarRisk = Math.round(riskDist * qty * 100) / 100;
    const valid = rr >= 1.5;
    const linoEdgeWarn = rr < 2;
    return {
      rr: Math.round(rr * 100) / 100,
      dollarRisk,
      valid,
      linoEdgeWarn,
    };
  }, [riskEntry, riskStop, riskTake, riskQty, draftTrade.side]);

  const vpvrLevels = useMemo(() => {
    const seed = activeAsset
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    const n = 18;
    return Array.from({ length: n }, (_, i) => {
      const phase = (i / n) * Math.PI * 2 + seed * 0.02 + tick * 0.01;
      const v = 15 + Math.round(55 * (0.5 + 0.5 * Math.sin(phase)));
      return { i, v };
    });
  }, [activeAsset, tick]);

  // ---------- TRADER INITIALIZATION (forced overlay) ----------
  if (!state.trader_onboarding_complete) {
    return (
      <TraderInitialization
        firstName={firstName}
        initStep={initStep}
        setInitStep={setInitStep}
        state={state}
        loginPromptApp={loginPromptApp}
        setLoginPromptApp={setLoginPromptApp}
        toggleApp={toggleApp}
        toggleMarketCategory={toggleMarketCategory}
        toggleSession={toggleSession}
        toggleEmotion={toggleEmotion}
        setRiskField={setRiskField}
        completeOnboarding={completeOnboarding}
      />
    );
  }

  // ---------- DASHBOARD ----------
  const totalPnl = journal.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const wins = journal.filter((t) => (Number(t.pnl) || 0) > 0).length;
  const winRate = journal.length > 0 ? Math.round((wins / journal.length) * 100) : 62;
  const pnlPositive = totalPnl >= 0;

  // Halt Light + capital protection.
  // Red unless the user has done a fresh emotional check-in AND hasn't blown
  // their daily drawdown. Either condition flips the light red and locks Log Trade.
  const checkinFreshToday = isSameLocalDay(state.lastEmotionalCheckinAt);
  const drawdownLimit = Number(state.max_daily_drawdown) || 0;
  const drawdownHit =
    drawdownLimit > 0 &&
    state.drawdown_unit === "USD" &&
    Math.min(0, totalPnl) <= -drawdownLimit;
  const haltReason = drawdownHit
    ? `Daily drawdown limit hit (-$${drawdownLimit}). Capital lock engaged.`
    : !checkinFreshToday
      ? "Emotional Check-in required before the next entry."
      : null;
  const isHalted = Boolean(haltReason);
  const riskCalcValid = riskMetrics.valid;
  const tradeArmBlocked = isHalted || !riskCalcValid;
  const riskGateHint =
    !riskCalcValid && !isHalted
      ? "Set Entry / Stop / Target so reward:risk is at least 1.5:1 for your planned side."
      : null;
  const stripMode = isHalted
    ? "red"
    : !riskCalcValid
      ? "amber"
      : macroCaution30m
        ? "yellow"
        : "green";

  const fillRiskFromWatchlist = () => {
    const row = watchlist.find((t) => t.sym === activeAsset);
    if (!row) return;
    const E = row.price;
    const w = Math.max(E * 0.0035, E * 0.0001);
    const side = draftTrade.side;
    const fmtNum = (n) =>
      n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(2) : n.toFixed(4);
    setRiskEntry(fmtNum(E));
    if (side === "LONG") {
      setRiskStop(fmtNum(E - w));
      setRiskTake(fmtNum(E + w * 2.5));
    } else {
      setRiskStop(fmtNum(E + w));
      setRiskTake(fmtNum(E - w * 2.5));
    }
  };

  const openCheckin = (forcedSide) => {
    if (isHalted && drawdownHit) {
      // Capital lock — even the check-in won't unlock the button until tomorrow.
      return;
    }
    if (tradeArmBlocked) return;
    if (forcedSide === "LONG" || forcedSide === "SHORT") {
      setDraftTrade((d) => ({ ...d, side: forcedSide }));
    }
    setPendingTag(null);
    setShowCheckin(true);
  };

  const submitTrade = () => {
    if (!pendingTag || !riskCalcValid) return;
    const entry = Number(draftTrade.entry);
    const isBadTag =
      pendingTag === "FOMO" ||
      pendingTag === "Revenge Trading" ||
      pendingTag === "Greed";
    const synthPnl = Number.isFinite(entry)
      ? Math.round((Math.random() - (isBadTag ? 0.65 : 0.35)) * 400)
      : Math.round((Math.random() - 0.5) * 200);
    const next = {
      id: crypto.randomUUID(),
      symbol: draftTrade.symbol || activeAsset,
      side: draftTrade.side,
      entry: draftTrade.entry || "—",
      note: draftTrade.note,
      tag: pendingTag,
      pnl: synthPnl,
      createdAt: new Date().toISOString(),
      thesisAtEntry: tradeThesis,
      autopsy: null,
    };
    setJournal((j) => [next, ...j]);
    setState((s) => ({ ...s, lastEmotionalCheckinAt: new Date().toISOString() }));
    setShowCheckin(false);
    setDraftTrade({ symbol: activeAsset, side: "LONG", entry: "", note: "" });
    setPendingTag(null);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-mono">
      <ConnectAppDialog
        app={loginPromptApp || null}
        nodeLabel="TraderNode"
        accent="#06B6D4"
        onLogin={() => setLoginPromptApp("")}
        onLater={() => setLoginPromptApp("")}
      />
      {/* COMMAND STRIP */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-[#09090B]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#06B6D4] shadow-[0_0_8px_#06B6D4]" />
            <h1 className="text-sm font-bold tracking-widest">
              TRADER<span className="font-light text-zinc-500">NODE</span>
            </h1>
            <span
              className="ml-2 hidden text-[10px] uppercase tracking-[0.2em] text-zinc-600 md:inline"
              suppressHydrationWarning
            >
              {new Date().toLocaleTimeString([], { hour12: false })} ·{" "}
              <span className="text-[#06B6D4]">LIVE</span>
            </span>
          </div>

          {/* Ticker */}
          <div className="relative flex-1 overflow-hidden border-x border-zinc-900 mx-2">
            <div
              className={`flex gap-6 whitespace-nowrap py-1.5 text-xs transition-opacity ${
                isSniperMode ? "opacity-10" : "opacity-100"
              }`}
              style={{
                transform: `translateX(${-((tick * 40) % 1600)}px)`,
                transition: "transform 1s linear",
              }}
            >
              {[...watchlist, ...watchlist].map((t, i) => {
                const up = t.chg >= 0;
                return (
                  <button
                    key={`${t.sym}-${i}`}
                    onClick={() => setSelectedAsset(t.sym)}
                    className="flex shrink-0 items-center gap-2 hover:text-[#06B6D4]"
                  >
                    <span
                      className={`font-bold tracking-wider ${activeAsset === t.sym ? "text-[#06B6D4]" : "text-zinc-300"}`}
                    >
                      {t.sym}
                    </span>
                    <span className="text-zinc-400">{fmtPrice(t.price)}</span>
                    <span
                      className={`text-[10px] ${up ? "text-[#10B981]" : "text-[#EF4444]"}`}
                    >
                      {up ? "▲" : "▼"} {Math.abs(t.chg).toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portfolio Health Widget — Blur on Default */}
          <div
            className={`hidden shrink-0 items-center gap-3 border border-zinc-800 bg-[#0c0c0f] px-3 py-1.5 text-[11px] md:flex transition-opacity ${
              isSniperMode ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                Win
              </span>
              <span
                className={`font-bold ${isWinRateVisible ? "blur-none" : "blur-sm select-none"}`}
              >
                {winRate}%
              </span>
              <button
                onClick={() => setIsWinRateVisible((v) => !v)}
                className="text-zinc-500 hover:text-[#06B6D4]"
                aria-label="Reveal win rate"
              >
                {isWinRateVisible ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                PnL
              </span>
              <span
                className={`font-bold ${pnlPositive ? "text-[#10B981]" : "text-[#EF4444]"} ${
                  isPnlVisible ? "blur-none" : "blur-sm select-none"
                }`}
              >
                {pnlPositive ? "+" : "−"}${Math.abs(totalPnl).toLocaleString()}
              </span>
              <button
                onClick={() => setIsPnlVisible((v) => !v)}
                className="text-zinc-500 hover:text-[#06B6D4]"
                aria-label="Reveal PnL"
              >
                {isPnlVisible ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>

          {/* Sniper Mode toggle */}
          <button
            onClick={() => setIsSniperMode((v) => !v)}
            className={`flex shrink-0 items-center gap-2 border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition ${
              isSniperMode
                ? "border-[#06B6D4] bg-[#06B6D4] text-black"
                : "border-zinc-800 bg-[#0c0c0f] text-[#06B6D4] hover:border-[#06B6D4]"
            }`}
            title="Toggle deep-focus Sniper Mode"
          >
            <Crosshair size={13} />
            {isSniperMode ? "Exit Sniper" : "Sniper"}
          </button>

          <Link
            href="/"
            className="hidden shrink-0 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-[#06B6D4] md:inline"
          >
            ↩ Home
          </Link>
        </div>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-12 gap-px bg-zinc-900 p-px">
        {/* LEFT — Macro & Sentiment */}
        <aside
          className={`col-span-12 lg:col-span-3 bg-[#09090B] transition-opacity ${
            isSniperMode ? "pointer-events-none opacity-10" : "opacity-100"
          }`}
        >
          <Panel
            title="AI Macro-Calendar"
            icon={<Newspaper size={12} />}
            accent="#06B6D4"
          >
            <ul className="divide-y divide-zinc-900">
              {MACRO_EVENTS.map((ev) => {
                const remaining = ev.inHours - tick / 3600;
                const high = ev.impact === "HIGH";
                return (
                  <li
                    key={ev.name}
                    className="flex items-center justify-between px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${high ? "bg-[#EF4444] shadow-[0_0_6px_#EF4444]" : "bg-amber-500"}`}
                      />
                      <span className="text-zinc-300">{ev.name}</span>
                    </div>
                    <span
                      className={`font-bold ${high ? "text-[#EF4444]" : "text-amber-400"}`}
                    >
                      {fmtCountdown(Math.max(0, remaining))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title={`Sentiment · ${activeAsset}`}
            icon={<Gauge size={12} />}
            accent="#06B6D4"
          >
            <div className="px-3 py-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    AI consensus
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold tracking-tight ${sentimentColor}`}
                  >
                    {sentimentLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Score
                  </p>
                  <p
                    className={`text-lg font-bold ${sentimentColor}`}
                  >
                    {sentiment > 0 ? "+" : ""}
                    {sentiment}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden border border-zinc-800 bg-[#09090B]">
                <div
                  className="h-full bg-gradient-to-r from-[#EF4444] via-zinc-700 to-[#10B981]"
                  style={{ width: "100%" }}
                />
                <div
                  className="-mt-2 h-2 w-0.5 bg-[#06B6D4] shadow-[0_0_6px_#06B6D4]"
                  style={{ marginLeft: `${((sentiment + 50) / 100) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] uppercase tracking-widest text-zinc-600">
                <span>Bear</span>
                <span>Bull</span>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
                Aggregated from X, Discord, Bloomberg headlines and Forex Factory
                in the last 24h.
              </p>
            </div>
          </Panel>

          {/* Lino's Trade Thesis — AI Insight tile that reacts to the
              selected asset. Sits directly under the Sentiment Score per spec. */}
          <Panel
            title="Lino's Trade Thesis"
            icon={<Sparkles size={12} />}
            accent="#06B6D4"
          >
            <div className="px-3 py-3">
              <p className="border-l-2 border-[#06B6D4] pl-3 text-[11px] leading-relaxed text-zinc-300">
                <span className="font-bold uppercase tracking-widest text-[#06B6D4]">
                  Linos here.{" "}
                </span>
                {tradeThesis}
              </p>
              <p className="mt-2 text-[9px] uppercase tracking-widest text-zinc-600">
                Auto-refreshed when you change asset · not financial advice
              </p>
            </div>
          </Panel>

          {intelligence?.worstTag ? (
            <Panel
              title="Intelligence Layer"
              icon={<Sparkles size={12} />}
              accent="#06B6D4"
            >
              <div className="px-3 py-3 text-[11px] leading-relaxed text-zinc-400">
                Your highest losses occurred on trades tagged as{" "}
                <span className="font-bold text-[#EF4444]">
                  {intelligence.worstTag}
                </span>{" "}
                ({" "}
                <span className="text-[#EF4444]">
                  −${Math.abs(intelligence.worstPnl).toLocaleString()}
                </span>{" "}
                ).
                <p className="mt-2 text-[10px] text-zinc-600">
                  Recommend: gate this tag behind a 2-minute cooldown next week.
                </p>
              </div>
            </Panel>
          ) : null}
        </aside>

        {/* CENTER — Execution & Charting */}
        <main className="col-span-12 lg:col-span-6 bg-[#09090B]">
          <Panel
            title={`${activeAsset} · 15m`}
            icon={<LineChart size={12} />}
            accent="#06B6D4"
            right={
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                <span className="text-[#10B981]">●</span> stream open
              </div>
            }
          >
            <div className="relative flex h-[420px] overflow-hidden border-t border-zinc-900 bg-[#0a0a0d]">
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                {/* Grid overlay */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <FauxChart asset={activeAsset} tick={tick} />

                <div className="absolute left-3 top-3 text-[10px] uppercase tracking-widest text-zinc-500">
                  TradingView Widget · placeholder
                </div>

                <button
                  onClick={() => setShowQuickLog(true)}
                  className="absolute bottom-3 right-4 flex items-center gap-1.5 border border-[#06B6D4] bg-[#06B6D4]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#06B6D4] hover:bg-[#06B6D4]/20 md:right-5"
                  title="Capture chart + log price levels"
                >
                  <Camera size={12} /> Quick Log
                </button>
              </div>

              {/* Whale Watch — VPVR-style volume-at-price (mock, visible range). */}
              <div
                className="flex w-[52px] shrink-0 flex-col border-l border-white/10 bg-gradient-to-b from-slate-900/80 via-[#0a1620]/90 to-slate-950/90 px-1 py-2 shadow-[-12px_0_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
                title="Volume profile (mock) — value zones vs noise"
              >
                <p className="mb-1 text-center text-[7px] font-bold uppercase leading-tight tracking-tight text-cyan-200/90">
                  Vol
                </p>
                <div className="flex min-h-0 flex-1 flex-col-reverse justify-stretch gap-px">
                  {vpvrLevels.map(({ i, v }) => (
                    <div
                      key={i}
                      className="flex min-h-[6px] flex-1 items-center justify-end"
                    >
                      <div
                        className="h-1 max-h-[5px] rounded-l bg-gradient-to-l from-cyan-400/85 to-cyan-600/40"
                        style={{ width: `${Math.max(8, v)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {isSniperMode ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                  <Crosshair
                    size={200}
                    className="animate-pulse text-[#06B6D4]/12"
                  />
                </div>
              ) : null}
            </div>

            {/* Inter-market correlation — hat awareness vs SPY / QQQ / BTC */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-900 bg-[#08080c] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                <Network className="h-3 w-3 text-[#06B6D4]" />
                Correlation
              </div>
              <div className="flex flex-wrap gap-3 text-[11px]">
                {correlationRows.map((r) => {
                  const up = r.pct >= 0;
                  return (
                    <span key={r.sym} className="font-mono text-zinc-300">
                      <span className="text-zinc-500">{r.sym}</span>{" "}
                      <span className={up ? "text-[#10B981]" : "text-[#EF4444]"}>
                        {up ? "+" : ""}
                        {r.pct.toFixed(2)}%
                      </span>
                      <span className="ml-1 text-[9px] text-zinc-600">vs tape</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* What-If risk engine — R:R + $ at risk (gates arming trades). */}
            <div id="ln-feature-risk" className="border-t border-zinc-900 bg-[#0a0a0d] px-3 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#06B6D4]">
                  What-If · Risk engine
                </p>
                <button
                  type="button"
                  onClick={fillRiskFromWatchlist}
                  className="rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:border-[#06B6D4] hover:text-[#06B6D4]"
                >
                  Sync {activeAsset}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <label className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Side
                  <select
                    value={draftTrade.side}
                    onChange={(e) =>
                      setDraftTrade((d) => ({ ...d, side: e.target.value }))
                    }
                    className="mt-1 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] font-bold text-zinc-200"
                  >
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </label>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Entry
                  <input
                    value={riskEntry}
                    onChange={(e) => setRiskEntry(e.target.value)}
                    className="mt-1 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] text-zinc-200"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Stop
                  <input
                    value={riskStop}
                    onChange={(e) => setRiskStop(e.target.value)}
                    className="mt-1 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] text-zinc-200"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Target
                  <input
                    value={riskTake}
                    onChange={(e) => setRiskTake(e.target.value)}
                    className="mt-1 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] text-zinc-200"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Qty
                  <input
                    value={riskQty}
                    onChange={(e) => setRiskQty(e.target.value)}
                    className="mt-1 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] text-zinc-200"
                    inputMode="numeric"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                <span>
                  R:R{" "}
                  <span className="font-bold text-zinc-100">
                    {riskMetrics.rr != null ? `${riskMetrics.rr}:1` : "—"}
                  </span>
                </span>
                <span className="h-3 w-px bg-zinc-800" />
                <span>
                  $ at risk{" "}
                  <span className="font-bold text-zinc-100">
                    {riskMetrics.dollarRisk != null
                      ? `$${riskMetrics.dollarRisk.toLocaleString()}`
                      : "—"}
                  </span>
                </span>
                <span className="h-3 w-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600">
                  Notional cap (mock) ${MOCK_ACCOUNT_BALANCE.toLocaleString()}
                </span>
              </div>
              {riskMetrics.linoEdgeWarn && riskMetrics.valid ? (
                <p className="mt-2 border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/95">
                  <span className="font-bold text-amber-100">Linos: </span>
                  Edge is thin below 2:1 — size down or wait for a cleaner
                  invalidation.
                </p>
              ) : null}
              {riskMetrics.linoEdgeWarn && !riskMetrics.valid ? (
                <p className="mt-2 border border-rose-500/35 bg-rose-950/40 px-2 py-1.5 text-[10px] leading-relaxed text-rose-100/95">
                  <span className="font-bold text-rose-200">Linos: </span>
                  Poor mathematical edge — reward:risk must clear 1.5:1 before
                  the pit arms Long/Short.
                </p>
              ) : null}
            </div>

            {/* Halt Light strip — red capital/check-in, amber R:R, yellow macro */}
            <div
              className={`flex flex-wrap items-center gap-2 border-t border-zinc-900 px-3 py-2 text-[10px] uppercase tracking-widest ${
                stripMode === "red"
                  ? "bg-[#1c0509]"
                  : stripMode === "amber"
                    ? "bg-[#2a1f08]"
                    : stripMode === "yellow"
                      ? "bg-[#2a2206]"
                      : "bg-[#062b1a]"
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  stripMode === "red"
                    ? "bg-[#EF4444] shadow-[0_0_10px_#EF4444]"
                    : stripMode === "amber"
                      ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                      : stripMode === "yellow"
                        ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]"
                        : "bg-[#10B981] shadow-[0_0_10px_#10B981]"
                }`}
                title={
                  stripMode === "red"
                    ? "HALT"
                    : stripMode === "amber"
                      ? "ARM BLOCKED"
                      : stripMode === "yellow"
                        ? "CAUTION"
                        : "CLEAR"
                }
              />
              <span
                className={`font-bold tracking-widest ${
                  stripMode === "red"
                    ? "text-[#EF4444]"
                    : stripMode === "amber"
                      ? "text-amber-200"
                      : stripMode === "yellow"
                        ? "text-amber-100"
                        : "text-[#10B981]"
                }`}
              >
                {stripMode === "red"
                  ? "HALT · Log Trade locked"
                  : stripMode === "amber"
                    ? "ARM BLOCKED · R:R plan"
                    : stripMode === "yellow"
                      ? "CAUTION · Macro window"
                      : "CLEAR · Log Trade open"}
              </span>
              {haltReason ? (
                <span className="ml-2 max-w-[min(520px,88vw)] truncate text-[10px] text-zinc-400 normal-case tracking-normal">
                  {haltReason}
                </span>
              ) : null}
              {riskGateHint ? (
                <span className="ml-2 max-w-[min(520px,88vw)] text-[10px] font-normal normal-case tracking-normal text-amber-100/90">
                  {riskGateHint}
                </span>
              ) : null}
              {macroCaution30m && stripMode !== "red" && stripMode !== "amber" ? (
                <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-amber-100/90">
                  High-impact event inside 30m — consider flattening or tightening
                  stops.
                </span>
              ) : null}
              {isHalted && drawdownHit ? (
                <Lock size={12} className="ml-auto text-[#EF4444]" />
              ) : stripMode === "red" ? (
                <Zap size={12} className="ml-auto text-[#EF4444]" />
              ) : stripMode === "amber" ? (
                <Gauge size={12} className="ml-auto text-amber-300" />
              ) : stripMode === "yellow" ? (
                <Clock size={12} className="ml-auto text-amber-200" />
              ) : (
                <ShieldCheck size={12} className="ml-auto text-[#10B981]" />
              )}
            </div>

            {/* Execution row */}
            <div className="grid grid-cols-2 gap-px border-t border-zinc-900 bg-zinc-900">
              <button
                type="button"
                onClick={() => openCheckin("LONG")}
                disabled={tradeArmBlocked}
                className={`flex items-center justify-center gap-2 bg-[#0a0a0d] py-3 text-xs font-bold uppercase tracking-widest text-[#10B981] transition ${
                  tradeArmBlocked
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-[#10B981]/10"
                }`}
              >
                <TrendingUp size={14} /> Long {activeAsset}
              </button>
              <button
                type="button"
                onClick={() => openCheckin("SHORT")}
                disabled={tradeArmBlocked}
                className={`flex items-center justify-center gap-2 bg-[#0a0a0d] py-3 text-xs font-bold uppercase tracking-widest text-[#EF4444] transition ${
                  tradeArmBlocked
                    ? "cursor-not-allowed opacity-30"
                    : "hover:bg-[#EF4444]/10"
                }`}
              >
                <TrendingDown size={14} /> Short {activeAsset}
              </button>
            </div>
          </Panel>

          {/* Watchlist as compact grid */}
          <div id="ln-feature-watchlist">
          <Panel
            title="Watchlist"
            icon={<BarChart3 size={12} />}
            accent="#06B6D4"
          >
            <div className="grid grid-cols-2 gap-px bg-zinc-900 md:grid-cols-5">
              {watchlist.map((t) => {
                const up = t.chg >= 0;
                const active = activeAsset === t.sym;
                return (
                  <button
                    key={t.sym}
                    onClick={() => setSelectedAsset(t.sym)}
                    className={`bg-[#0a0a0d] px-3 py-2 text-left transition ${
                      active ? "ring-1 ring-[#06B6D4]" : "hover:bg-[#0d0d11]"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-[#06B6D4]" : "text-zinc-400"}`}
                    >
                      {t.sym}
                    </p>
                    <p className="text-xs text-zinc-200">{fmtPrice(t.price)}</p>
                    <p
                      className={`text-[10px] ${up ? "text-[#10B981]" : "text-[#EF4444]"}`}
                    >
                      {up ? "+" : ""}
                      {t.chg.toFixed(2)}%
                    </p>
                  </button>
                );
              })}
            </div>
          </Panel>
          </div>
        </main>

        {/* RIGHT — Psychology & Journal */}
        <aside
          className={`col-span-12 lg:col-span-3 bg-[#09090B] transition-opacity ${
            isSniperMode ? "pointer-events-none opacity-10" : "opacity-100"
          }`}
        >
          <Panel
            title="Emotional Check-in"
            icon={<Zap size={12} />}
            accent="#06B6D4"
          >
            <div className="px-3 py-3">
              <p className="text-[10px] leading-relaxed text-zinc-500">
                A check-in is required before every trade entry. Tag the
                feeling. Build the ledger.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                    tradeArmBlocked ? "text-[#EF4444]" : "text-[#10B981]"
                  }`}
                  title={
                    haltReason ??
                    (riskGateHint ? "Risk plan incomplete" : "Clear to log a trade")
                  }
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      tradeArmBlocked
                        ? "bg-[#EF4444] shadow-[0_0_8px_#EF4444]"
                        : "bg-[#10B981] shadow-[0_0_8px_#10B981]"
                    }`}
                  />
                  {tradeArmBlocked ? "Blocked" : "Clear"}
                </span>
                <button
                  type="button"
                  onClick={() => openCheckin()}
                  disabled={tradeArmBlocked}
                  className={`flex-1 border border-zinc-800 bg-[#0c0c0f] py-2 text-[11px] font-bold uppercase tracking-widest transition ${
                    tradeArmBlocked
                      ? "cursor-not-allowed border-[#3a0a13] text-[#EF4444]/50"
                      : "text-[#06B6D4] hover:border-[#06B6D4]"
                  }`}
                >
                  {tradeArmBlocked ? "Locked" : "Log a trade →"}
                </button>
              </div>
              {haltReason ? (
                <p className="mt-2 text-[10px] leading-relaxed text-[#EF4444]/80">
                  Linos here. {haltReason}
                </p>
              ) : null}
              {riskGateHint ? (
                <p className="mt-2 text-[10px] leading-relaxed text-amber-200/90">
                  Linos here. {riskGateHint}
                </p>
              ) : null}
            </div>
          </Panel>

          <div id="ln-feature-journal">
          <Panel
            title={`Journal · ${journal.length} entries`}
            icon={<NotebookPen size={12} />}
            accent="#06B6D4"
          >
            <div className="max-h-[420px] overflow-auto">
              {journal.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-zinc-600">
                  No trades logged today.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-900">
                  {journal.map((t) => {
                    const tone = emotionalTags.find((e) => e.tag === t.tag)?.tone
                      ?? EMOTION_LIBRARY.find((e) => e.id === t.tag)?.tone;
                    const tagColor =
                      tone === "good"
                        ? "text-[#10B981] border-[#10B981]/40"
                        : tone === "warn"
                          ? "text-amber-400 border-amber-500/40"
                          : "text-[#EF4444] border-[#EF4444]/40";
                    const pnl = Number(t.pnl) || 0;
                    return (
                      <li key={t.id} className="px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-200">
                            {t.symbol}{" "}
                            <span
                              className={`text-[10px] ${t.side === "LONG" ? "text-[#10B981]" : "text-[#EF4444]"}`}
                            >
                              {t.side}
                            </span>
                          </span>
                          <span
                            className={`font-bold ${pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}
                          >
                            {pnl >= 0 ? "+" : "−"}${Math.abs(pnl)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${tagColor}`}
                          >
                            {t.tag}
                          </span>
                          <span
                            className="text-[9px] text-zinc-600"
                            suppressHydrationWarning
                          >
                            {new Date(t.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {t.note ? (
                          <p className="mt-1 text-[10px] text-zinc-500">{t.note}</p>
                        ) : null}
                        {t.autopsy ? (
                          <p className="mt-2 border-l-2 border-[#06B6D4]/50 pl-2 text-[10px] leading-relaxed text-zinc-500">
                            <span className="font-bold text-[#06B6D4]">
                              AI Autopsy ·{" "}
                            </span>
                            {t.autopsy}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            const thesisSnap = t.thesisAtEntry || tradeThesis;
                            const text =
                              t.autopsy ??
                              buildAutopsyParagraph(
                                t,
                                thesisSnap,
                                sentiment,
                              );
                            setJournal((j) =>
                              j.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      autopsy: text,
                                      thesisAtEntry:
                                        x.thesisAtEntry ?? thesisSnap,
                                    }
                                  : x,
                              ),
                            );
                            setAutopsyEntry({ ...t, autopsy: text });
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[#06B6D4] hover:border-[#06B6D4]"
                        >
                          <Microscope size={11} />
                          AI Autopsy
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>
          </div>
        </aside>
      </div>

      {/* Footer status bar */}
      <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 bg-[#0a0a0d] px-4 py-1.5 text-[10px] uppercase tracking-widest text-zinc-600">
        <div className="flex items-center gap-3">
          <span>
            <Activity className="mr-1 inline" size={10} /> stream
          </span>
          <span className="text-[#10B981]">● live</span>
          <span>·</span>
          <span>{state.syncedApps.length} channels</span>
          <span>·</span>
          <span title="Markets you elected to master during Trader Initialization">
            watchlist: {state.primary_watchlist?.join(" · ") || "—"}
          </span>
          <span>·</span>
          <span title="Daily drawdown limit set during Risk Profile Calibration">
            max DD:{" "}
            {state.drawdown_unit === "USD"
              ? `$${state.max_daily_drawdown}`
              : `${state.max_daily_drawdown}%`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isSniperMode ? (
            <span className="text-[#06B6D4]">● sniper engaged</span>
          ) : (
            <span>focus: open</span>
          )}
          <span>·</span>
          <button
            type="button"
            onClick={restartOnboarding}
            className="text-zinc-600 hover:text-[#06B6D4]"
            title="Re-run Trader Initialization"
          >
            re-init →
          </button>
          <span>·</span>
          <span suppressHydrationWarning>
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </footer>

      {/* EMOTIONAL CHECK-IN MODAL */}
      {showCheckin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md border border-zinc-800 bg-[#0c0c0f] p-5 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#06B6D4]" />
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  Why this trade?
                </h3>
              </div>
              <button
                onClick={() => setShowCheckin(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mt-3 text-[11px] text-zinc-500">
              Mandatory tag. Your emotional ledger trains the intelligence
              layer.
            </p>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-[10px] text-zinc-400">
              <span className="font-bold uppercase tracking-widest text-zinc-500">
                Risk plan ·{" "}
              </span>
              {draftTrade.side} · R:R{" "}
              <span className="text-zinc-100">
                {riskMetrics.rr != null ? `${riskMetrics.rr}:1` : "—"}
              </span>
              {riskMetrics.dollarRisk != null ? (
                <>
                  {" "}
                  · ${riskMetrics.dollarRisk.toLocaleString()} at risk (
                  {riskQty} u)
                </>
              ) : null}
            </div>
            {riskMetrics.linoEdgeWarn && riskMetrics.valid ? (
              <p className="mt-2 rounded border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-[10px] leading-relaxed text-rose-100">
                <span className="font-bold">Linos: </span>
                Poor mathematical edge — are you sure about this entry? Wait
                for a cleaner R:R above 2:1 when you can.
              </p>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              {emotionalTags.map(({ tag, tone, Icon }) => {
                const active = pendingTag === tag;
                const tint =
                  tone === "good"
                    ? "border-[#10B981] text-[#10B981]"
                    : tone === "warn"
                      ? "border-amber-500 text-amber-400"
                      : "border-[#EF4444] text-[#EF4444]";
                return (
                  <button
                    key={tag}
                    onClick={() => setPendingTag(tag)}
                    className={`flex items-center justify-between border px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition ${
                      active
                        ? `${tint} bg-white/[0.02]`
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    <span>{tag}</span>
                    <Icon size={12} />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <input
                value={draftTrade.symbol}
                onChange={(e) =>
                  setDraftTrade((d) => ({ ...d, symbol: e.target.value.toUpperCase() }))
                }
                className="border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] tracking-widest focus:border-[#06B6D4] focus:outline-none"
                placeholder="SYMBOL"
              />
              <select
                value={draftTrade.side}
                onChange={(e) =>
                  setDraftTrade((d) => ({ ...d, side: e.target.value }))
                }
                className="border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] tracking-widest focus:border-[#06B6D4] focus:outline-none"
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <input
              value={draftTrade.entry}
              onChange={(e) =>
                setDraftTrade((d) => ({ ...d, entry: e.target.value }))
              }
              className="mt-2 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] focus:border-[#06B6D4] focus:outline-none"
              placeholder="Entry price"
            />
            <textarea
              value={draftTrade.note}
              onChange={(e) =>
                setDraftTrade((d) => ({ ...d, note: e.target.value }))
              }
              rows={2}
              className="mt-2 w-full border border-zinc-800 bg-[#09090B] px-2 py-1.5 text-[11px] focus:border-[#06B6D4] focus:outline-none"
              placeholder="Setup / thesis (optional)"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                {pendingTag ? `tag: ${pendingTag}` : "select a tag"}
              </span>
              <button
                disabled={!pendingTag}
                onClick={submitTrade}
                className="border border-[#06B6D4] bg-[#06B6D4]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Confirm Entry
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI AUTOPSY — full readout */}
      {autopsyEntry ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
          <div className="max-h-[min(560px,86vh)] w-full max-w-lg overflow-auto border border-zinc-800 bg-[#0c0c0f] p-5 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Microscope size={16} className="text-[#06B6D4]" />
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  AI Autopsy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAutopsyEntry(null)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500">
              {autopsyEntry.symbol} · {autopsyEntry.side} · tag {autopsyEntry.tag}
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-zinc-300">
              {autopsyEntry.autopsy}
            </p>
            <p className="mt-4 text-[9px] uppercase tracking-widest text-zinc-600">
              Lessons learned · not financial advice
            </p>
          </div>
        </div>
      ) : null}

      {/* QUICK LOG MODAL */}
      {showQuickLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-zinc-800 bg-[#0c0c0f] p-5 font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={14} className="text-[#06B6D4]" />
                <h3 className="text-sm font-bold uppercase tracking-widest">
                  Quick Log · {activeAsset}
                </h3>
              </div>
              <button
                onClick={() => setShowQuickLog(false)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              Snapshot captured. Tag price levels for this chart.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-widest">
              {["Support", "Resistance", "Trigger"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setShowQuickLog(false)}
                  className="border border-zinc-800 bg-[#09090B] px-2 py-2 font-bold text-[#06B6D4] hover:border-[#06B6D4]"
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, icon, accent = "#06B6D4", right, children }) {
  return (
    <section className="border-b border-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-900 bg-[#0a0a0d] px-3 py-1.5">
        <div
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {icon}
          <span>{title}</span>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

// ============================================================================
// TRADER INITIALIZATION
// Forced overlay flow per spec. Renders only when
// `trader_onboarding_complete` is false. Shape:
//   0  Welcome ("Welcome to the Pit, [User]")
//   1  Watchlist Sync
//   2  Risk Profile Calibration
//   3  Journaling Ritual
// ============================================================================
function TraderInitialization({
  firstName,
  initStep,
  setInitStep,
  state,
  loginPromptApp,
  setLoginPromptApp,
  toggleApp,
  toggleMarketCategory,
  toggleSession,
  toggleEmotion,
  setRiskField,
  completeOnboarding,
}) {
  const step1Valid = state.primary_watchlist.length > 0;
  const step2Valid =
    Number(state.max_daily_drawdown) > 0 &&
    (state.trading_hours.tokyo ||
      state.trading_hours.london ||
      state.trading_hours.newYork);
  const step3Valid = state.tracked_emotions.length >= 2;

  const progress = Math.min(100, Math.round(((initStep || 0) / 3) * 100));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090B] font-mono text-zinc-100">
      <ConnectAppDialog
        app={loginPromptApp || null}
        nodeLabel="TraderNode"
        accent="#06B6D4"
        onLogin={() => setLoginPromptApp("")}
        onLater={() => setLoginPromptApp("")}
      />

      {/* Aurora backdrop for the welcome card. Subtle, doesn't fight the terminal aesthetic. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.18),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.08),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl p-6">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#06B6D4] shadow-[0_0_8px_#06B6D4]" />
            <h1 className="text-lg font-bold tracking-widest">
              TRADER<span className="font-light text-zinc-500">NODE</span>
            </h1>
            <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Trader Initialization
            </span>
          </div>
          <Link
            href="/shell"
            className="text-xs uppercase tracking-widest text-zinc-500 hover:text-[#06B6D4]"
          >
            ← LifeNode Dashboard
          </Link>
        </header>

        {/* Step progress bar (steps 1-3 only). */}
        {initStep > 0 ? (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <span>
                Step {initStep} / 3 ·{" "}
                {initStep === 1
                  ? "Watchlist Sync"
                  : initStep === 2
                    ? "Risk Profile Calibration"
                    : "Journaling Ritual"}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden border border-zinc-800 bg-[#09090B]">
              <div
                className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* WELCOME (step 0) */}
        {initStep === 0 ? (
          <section className="relative overflow-hidden border border-zinc-800 bg-[#0c0c0f] p-8 text-center">
            <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[#06B6D4]/15 blur-2xl" />
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#06B6D4]" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#06B6D4]">
              Linos — Edge Protector
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-bold leading-snug text-zinc-100 md:text-3xl">
              Welcome to the Pit, {firstName}.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Before we look at the charts, we need to calibrate your risk
              engine. A disciplined trader is a profitable trader. Let&apos;s
              set your rules.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setInitStep(1)}
                className="inline-flex items-center gap-2 border border-[#06B6D4] bg-[#06B6D4]/15 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#06B6D4] hover:bg-[#06B6D4]/25"
              >
                Begin Calibration →
              </button>
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-widest text-zinc-600">
              Three short steps. We do not store P&amp;L on our servers.
            </p>
          </section>
        ) : null}

        {/* STEP 1 — WATCHLIST SYNC */}
        {initStep === 1 ? (
          <section className="border border-zinc-800 bg-[#0c0c0f] p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#06B6D4]">
              Step 1 / 3 · Watchlist Sync
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Which markets are we mastering?
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick everything you trade actively. We&apos;ll mute the rest so the
              ticker stays quiet and your sentiment score stays focused.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {MARKET_CATEGORIES.map((cat) => {
                const active = state.primary_watchlist.includes(cat.id);
                const Icon = cat.Icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleMarketCategory(cat.id)}
                    className={`group flex w-full items-start justify-between gap-3 border p-4 text-left transition ${
                      active
                        ? "border-[#06B6D4] bg-[#06B6D4]/10"
                        : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center border border-zinc-800"
                        style={{
                          color: active ? cat.accent : "#a1a1aa",
                          borderColor: active ? cat.accent : undefined,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider">
                          {cat.label}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {cat.blurb}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cat.symbols.map((s) => (
                            <span
                              key={s}
                              className={`border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${
                                active
                                  ? "border-[#06B6D4]/40 text-[#06B6D4]"
                                  : "border-zinc-800 text-zinc-500"
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold tracking-widest ${active ? "text-[#06B6D4]" : "text-zinc-600"}`}
                    >
                      {active ? "● LINKED" : "○ SYNC"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional: also wire broker / data integrations here so the sync
                step feels complete. Mirrors the legacy ECOSYSTEM picker. */}
            <details className="mt-6 border border-zinc-800 bg-[#09090B] p-3">
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300">
                Optional · connect trading apps ({state.syncedApps.length} linked)
              </summary>
              <div className="mt-3 space-y-4">
                {ECOSYSTEM.map((group) => (
                  <div key={group.category}>
                    <h3 className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                      {group.category}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {group.items.map((app) => {
                        const active = state.syncedApps.includes(app);
                        return (
                          <button
                            key={app}
                            type="button"
                            onClick={() => toggleApp(app)}
                            className={`flex items-center justify-between border px-2.5 py-2 text-left text-[11px] transition ${
                              active
                                ? "border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4]"
                                : "border-zinc-800 bg-[#09090B] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                            }`}
                          >
                            <span className="font-semibold tracking-wide">
                              {app}
                            </span>
                            <span
                              className={`text-[9px] ${active ? "text-[#06B6D4]" : "text-zinc-600"}`}
                            >
                              {active ? "●" : "○"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <AppCategoryRequestFooter
                      category={group.category}
                      nodeLabel="TraderNode"
                      variant="inverted"
                    />
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setInitStep(0)}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setInitStep(2)}
                disabled={!step1Valid}
                className="border border-[#06B6D4] bg-[#06B6D4]/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {/* STEP 2 — RISK PROFILE CALIBRATION */}
        {initStep === 2 ? (
          <section className="border border-zinc-800 bg-[#0c0c0f] p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#06B6D4]">
              Step 2 / 3 · Risk Profile Calibration
            </p>
            <h2 className="mt-1 text-2xl font-bold">Define your guardrails.</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Linos enforces these. Hit the daily loss limit and the Log Trade
              button locks until tomorrow.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Max daily drawdown */}
              <div className="border border-zinc-800 bg-[#09090B] p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Max daily drawdown
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setRiskField({ drawdown_unit: "USD" })}
                      className={`px-3 py-2 text-[11px] font-bold tracking-widest ${
                        state.drawdown_unit === "USD"
                          ? "bg-[#06B6D4]/15 text-[#06B6D4]"
                          : "bg-[#09090B] text-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiskField({ drawdown_unit: "PCT" })}
                      className={`px-3 py-2 text-[11px] font-bold tracking-widest ${
                        state.drawdown_unit === "PCT"
                          ? "bg-[#06B6D4]/15 text-[#06B6D4]"
                          : "bg-[#09090B] text-zinc-500 hover:text-zinc-200"
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={state.max_daily_drawdown}
                    onChange={(e) =>
                      setRiskField({
                        max_daily_drawdown: Number(e.target.value || 0),
                      })
                    }
                    className="flex-1 border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm font-bold tracking-wider focus:border-[#06B6D4] focus:outline-none"
                  />
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  Example: $250 means Linos locks new entries the moment your
                  intraday P&amp;L hits -$250.
                </p>
              </div>

              {/* Preferred leverage */}
              <div className="border border-zinc-800 bg-[#09090B] p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Preferred leverage
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {LEVERAGE_OPTIONS.map((lev) => {
                    const active = state.preferred_leverage === lev;
                    return (
                      <button
                        key={lev}
                        type="button"
                        onClick={() =>
                          setRiskField({ preferred_leverage: lev })
                        }
                        className={`border px-3 py-2 text-[11px] font-bold tracking-widest transition ${
                          active
                            ? "border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4]"
                            : "border-zinc-800 bg-[#09090B] text-zinc-500 hover:text-zinc-200"
                        }`}
                      >
                        {lev}×
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  Linos keeps an eye on position size relative to this ceiling.
                </p>
              </div>

              {/* Trading sessions */}
              <div className="md:col-span-2 border border-zinc-800 bg-[#09090B] p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Trading session hours
                </h3>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Pick the sessions you actually take entries in. Linos mutes
                  alerts outside these windows.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {TRADING_SESSIONS.map((s) => {
                    const active = state.trading_hours[s.id];
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSession(s.id)}
                        className={`flex items-start justify-between gap-2 border p-3 text-left transition ${
                          active
                            ? "border-[#06B6D4] bg-[#06B6D4]/10"
                            : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock
                            size={14}
                            className={active ? "text-[#06B6D4]" : "text-zinc-500"}
                          />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest">
                              {s.label}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-500">
                              {s.window}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold ${active ? "text-[#06B6D4]" : "text-zinc-600"}`}
                        >
                          {active ? "●" : "○"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-300">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-bold uppercase tracking-widest text-amber-200">
                  Linos here.
                </span>{" "}
                Once you cross your daily loss limit, I&apos;m locking the
                &ldquo;Log Trade&rdquo; button to protect your capital. You can
                still review charts and journal — no new entries until tomorrow.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setInitStep(1)}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setInitStep(3)}
                disabled={!step2Valid}
                className="border border-[#06B6D4] bg-[#06B6D4]/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-[#06B6D4] hover:bg-[#06B6D4]/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue →
              </button>
            </div>
          </section>
        ) : null}

        {/* STEP 3 — JOURNALING RITUAL */}
        {initStep === 3 ? (
          <section className="border border-zinc-800 bg-[#0c0c0f] p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#06B6D4]">
              Step 3 / 3 · Journaling Ritual
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Setup your Emotional Ledger.
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick the feelings that actually show up at your desk. The
              Emotional Check-in modal uses these tags before every trade.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3">
              {EMOTION_LIBRARY.map((emo) => {
                const active = state.tracked_emotions.includes(emo.id);
                const tint =
                  emo.tone === "good"
                    ? "border-[#10B981] text-[#10B981]"
                    : emo.tone === "warn"
                      ? "border-amber-500 text-amber-300"
                      : "border-[#EF4444] text-[#EF4444]";
                const Icon = EMOTION_ICON[emo.id] ?? MessageSquareWarning;
                return (
                  <button
                    key={emo.id}
                    type="button"
                    onClick={() => toggleEmotion(emo.id)}
                    className={`flex items-center justify-between border px-3 py-2.5 text-left text-xs transition ${
                      active
                        ? `${tint} bg-white/[0.02]`
                        : "border-zinc-800 bg-[#09090B] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    <span className="font-bold uppercase tracking-widest">
                      {emo.id}
                    </span>
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[10px] text-zinc-500">
              {state.tracked_emotions.length} selected · pick at least 2.
            </p>

            <div className="mt-6 flex items-start gap-2 border border-[#06B6D4]/25 bg-[#06B6D4]/[0.04] p-3 text-[11px] text-zinc-300">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-[#06B6D4]" />
              <p>
                <span className="font-bold uppercase tracking-widest text-[#06B6D4]">
                  Linos here.
                </span>{" "}
                Every entry tags one of these. Over time I&apos;ll surface which
                emotion is bleeding your account dry — and gate that tag behind
                a cooldown.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setInitStep(2)}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={!step3Valid}
                className="inline-flex items-center gap-2 border border-[#10B981] bg-[#10B981]/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-[#10B981] hover:bg-[#10B981]/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <CheckCircle2 size={14} />
                Boot Terminal →
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function FauxChart({ asset, tick }) {
  // Deterministic sparkline-style "candles" so the chart feels live but stable
  const seed = asset.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bars = 64;
  const candles = Array.from({ length: bars }, (_, i) => {
    const x = (i + seed + Math.floor(tick / 4)) * 0.37;
    const base = 50 + Math.sin(x) * 18 + Math.cos(x * 0.7) * 10;
    const wig = Math.sin(x * 2.3) * 6;
    const open = base;
    const close = base + wig;
    const high = Math.max(open, close) + 3 + Math.abs(Math.sin(x * 3)) * 2;
    const low = Math.min(open, close) - 3 - Math.abs(Math.cos(x * 2)) * 2;
    return { open, close, high, low };
  });
  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const norm = (v) => 100 - ((v - min) / (max - min || 1)) * 100;
  const cw = 100 / bars;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const color = up ? "#10B981" : "#EF4444";
        const x = i * cw + cw / 2;
        const yHigh = norm(c.high);
        const yLow = norm(c.low);
        const yOpen = norm(c.open);
        const yClose = norm(c.close);
        const top = Math.min(yOpen, yClose);
        const h = Math.max(0.6, Math.abs(yOpen - yClose));
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth={0.2}
              opacity={0.7}
            />
            <rect
              x={x - cw * 0.35}
              y={top}
              width={cw * 0.7}
              height={h}
              fill={color}
              opacity={0.85}
            />
          </g>
        );
      })}
      <line
        x1={0}
        x2={100}
        y1={norm(candles[candles.length - 1].close)}
        y2={norm(candles[candles.length - 1].close)}
        stroke="#06B6D4"
        strokeWidth={0.15}
        strokeDasharray="0.6 0.6"
        opacity={0.7}
      />
    </svg>
  );
}