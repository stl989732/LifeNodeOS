"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Camera,
  Download,
  FileText,
  Mic,
  Minimize2,
  Paperclip,
  History,
  MessageSquarePlus,
  Plus,
  SendHorizontal,
  SlidersHorizontal,
  X as XIcon,
} from "lucide-react";
import LinosSparkIcon from "@/src/components/linos/LinosSparkIcon";
import { linosChatStorageKey } from "@/src/lib/linos/linosChatStorage";
import { assistantPrefsStorageKey } from "@/src/lib/sessionClientIsolation";
import ReactMarkdown from "react-markdown";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { useLinoIntelligence } from "@/src/hooks/useLinoIntelligence";
import { LINOS_APP_KNOWLEDGE } from "@/src/data/linosAppKnowledge";
import { getNodeTheme } from "@/src/lib/nodeTheme";
import { LINOS_MARKDOWN_STYLE_SYSTEM } from "@/src/lib/linos/linosFormatting";
import {
  dataUrlToBase64,
  LINOS_ATTACHMENT_MAX_BYTES,
  LINOS_FILE_INPUT_ACCEPT,
  readFileAsDataUrl,
  readTextFileUtf8,
  sanitizeStorageFileName,
} from "@/src/lib/linos/linosAttachments";

const NODE_CONFIG = {
  VANode: {
    title: "Efficiency Mode",
    tone: "Ultra-efficient, concise, proactive",
    tools: "Screen Recorder · EOD Reporter · Client Timezones",
    cards: ["Draft EOD Report", "Record Proof of Work"],
  },
  VitalNode: {
    title: "Wellness Mode",
    tone: "Calm, encouraging, science-based",
    tools: "Apple/Samsung Health · Nutrition Logs · Recovery Scores",
    cards: ["Analyze Biomarkers", "Plan Recovery Session"],
  },
  ProNode: {
    title: "Executive Research Mode",
    tone: "Strategic and technical",
    tools: "Case docs · Knowledge sidecar · Citation graph",
    cards: ["Summarize Technical Brief", "Map Lead Flow Risks"],
  },
  BizNode: {
    title: "BizNode Mode",
    tone: "Focused operator clarity",
    tools: "Pipeline summaries · Tasks · Lead flow",
    cards: ["Generate Executive Summary", "Prioritize Lead Queue"],
  },
  TraderNode: {
    title: "TraderNode Mode",
    tone: "Disciplined and bias-aware",
    tools: "Market sentiment · Risk journal · Alert stream",
    cards: ["Check Sentiment", "Log Emotional Check-in"],
  },
  HomeNode: {
    title: "HomeNode Mode",
    tone: "Grounded and supportive",
    tools: "Family logistics · Calendar · Shopping flow",
    cards: ["Scan Kitchen", "Update Family Calendar"],
  },
};

const HAT_SHORT_LABEL = {
  BizNode: "Biz",
  HomeNode: "Home",
  VitalNode: "Vital",
  TraderNode: "Trader",
  VANode: "VA",
  ProNode: "Pro",
};

const ASSISTANT_MIN_KEY = "linos-assistant-minimized";
const LEGACY_MIN_KEY = "lino-assistant-minimized";
const ASSISTANT_PREFS_KEY = "linos-assistant-prefs-v1";
const LEGACY_LINOS_CHAT_ID_KEY = "linos-chat-id-v1";
const PAST_CHATS_LIMIT = 30;

const SILENCE_MS = 1800;
const MAX_HISTORY_TURNS = 10;

const LINOS_COOKING_PHRASES = [
  "Linos is thinking…",
  "Analyzing database context…",
  "Synthesizing operational response…",
  "Cross-referencing node telemetry…",
  "Mapping operational priorities…",
  "Running executive synthesis…",
];

const COOKING_PHRASE_MS = 2800;

function LinosCookingIndicator({ phrase }) {
  return (
    <>
      <style>{`
        @keyframes linos-cooking-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .linos-cooking-label {
          animation: linos-cooking-pulse 2.2s ease-in-out infinite;
        }
      `}</style>
      <div
        className="mr-4 rounded-lg border border-indigo-400/20 bg-gradient-to-br from-slate-900/70 to-indigo-950/40 px-2.5 py-2.5"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Linos</p>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/35" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-indigo-300 to-cyan-300" />
          </span>
          <p className="linos-cooking-label text-[13px] font-medium tracking-wide text-cyan-100/90">
            {phrase}
          </p>
        </div>
      </div>
    </>
  );
}

function AssemblyOverlay({ label }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B0F17]/95">
      <style>{`
        @keyframes lino-orbit-fast {
          from { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
        @keyframes lino-orbit-slow {
          from { transform: rotate(0deg) translateX(88px) rotate(0deg); }
          to { transform: rotate(-360deg) translateX(88px) rotate(360deg); }
        }
        .lino-orb-fast { animation: lino-orbit-fast 2s linear infinite; }
        .lino-orb-slow { animation: lino-orbit-slow 3.8s linear infinite; }
      `}</style>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-100 backdrop-blur-2xl">
        <div className="relative mx-auto mb-5 h-40 w-40">
          <div className="absolute left-1/2 top-1/2 h-[128px] w-[128px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
          <div className="absolute left-1/2 top-1/2 h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/20" />
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-300 to-cyan-300" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-300 lino-orb-fast" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-indigo-300 lino-orb-slow" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Assembling</p>
        <p className="mt-2 text-lg font-bold">Syncing integrations...</p>
        <p className="mt-1 text-sm text-slate-400">Routing to {label}</p>
      </div>
    </div>
  );
}

function localFallbackReply(text, ctx) {
  const lower = text.toLowerCase();
  const hats = ctx.userHats ?? [];
  if (/how many hats|number of hats|hats am i|hats do i have/i.test(lower)) {
    if (!hats.length) {
      return "Your shell hasn’t synced **user hats** yet (empty list). Open **/shell**, log in, and pick your Nodes—then I can count them. If you just need the **active Node**, you’re on **" +
        ctx.activeNode +
        "**.";
    }
    return `You’re wearing **${hats.length}** hat(s): **${hats.join(", ")}**. Your active surface right now is **${ctx.activeNode}** (${ctx.pathname}).`;
  }
  if (/what is lifenode|what's lifenode|explain lifenode|what does this app/i.test(lower)) {
    return "LifeNode OS is an **AI orchestration OS**: modular **Nodes** (Biz, Home, VA, Vital, Pro, Trader) with logic bridges between them. Pick hats in the shell—each Node is a focused dashboard, not a generic chat.";
  }
  return (
    "I couldn’t reach the AI engine (check **GOOGLE_API_KEY**). In short: you’re on **" +
    ctx.activeNode +
    "** with **" +
    (hats.length ? hats.join(", ") : "no hats listed yet") +
    "**. Try again after configuring the API, or ask a specific in-app question."
  );
}

function shouldHideAssistantPath(p) {
  return p === "/" || p === "/dashboard" || p === "/shell" || p.startsWith("/auth");
}

export default function LinoAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const {
    activeNode,
    userHats,
    configuredHats,
    pulseData,
    vitalStats,
    bridgeSignals,
    deepWorkModeEnabled,
    theme,
    isLinoInterrupting,
    assemblingNavigation,
    clearAssemblingNavigation,
    beginAssemblingToNode,
    openHatGallery,
  } = useLifeNodeContext();
  useLinoIntelligence();

  /**
   * Active `linos_chats.id` — only set after a row exists in Supabase (or restored from localStorage if still valid).
   */
  const [chatId, setChatId] = useState("");

  const persistChatIdForUser = useCallback((userId, id) => {
    if (typeof window === "undefined" || !userId || !id) return;
    try {
      window.localStorage.setItem(linosChatStorageKey(userId), id);
      window.localStorage.removeItem(LEGACY_LINOS_CHAT_ID_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearChatIdForUser = useCallback((userId) => {
    if (typeof window === "undefined" || !userId) return;
    try {
      window.localStorage.removeItem(linosChatStorageKey(userId));
      window.localStorage.removeItem(LEGACY_LINOS_CHAT_ID_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Restore the signed-in user's last chat (scoped storage + DB ownership). */
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      if (sessionStatus === "unauthenticated") {
        setChatId("");
        setThreadMessages([]);
      }
      return;
    }

    const userId = String(session.user.id);
    let cancelled = false;

    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const storageKey = linosChatStorageKey(userId);
        const stored = window.localStorage.getItem(storageKey);

        if (stored) {
          const { data: owned } = await supabase
            .from("linos_chats")
            .select("id")
            .eq("id", stored)
            .eq("user_id", userId)
            .maybeSingle();
          if (cancelled) return;
          if (owned?.id) {
            setChatId(owned.id);
            return;
          }
          clearChatIdForUser(userId);
        }

        const { data: latest } = await supabase
          .from("linos_chats")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (latest?.id) {
          setChatId(latest.id);
          persistChatIdForUser(userId, latest.id);
        }
      } catch {
        if (!cancelled) clearChatIdForUser(userId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, session?.user?.id, clearChatIdForUser, persistChatIdForUser]);

  /** @type {[Array<{ id: string; role: string; content: string; attachments?: unknown[]; created_at?: string }>, Function]} */
  const [threadMessages, setThreadMessages] = useState([]);
  const [chatHydrating, setChatHydrating] = useState(false);
  const [chatError, setChatError] = useState(null);

  /** Staged multimodal payloads before send */
  /** @type {[{ localId: string; name: string; mime: string; previewUrl?: string; file?: File | null }, ...]} */
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [splashBanner, setSplashBanner] = useState(null);

  const filePickRef = useRef(null);
  const transcriptBottomRef = useRef(null);
  const videoCamRef = useRef(null);
  const camStreamRef = useRef(null);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cookingPhraseIdx, setCookingPhraseIdx] = useState(0);
  const [pastChatsOpen, setPastChatsOpen] = useState(false);
  /** @type {[Array<{ id: string; node_type?: string; created_at?: string; preview?: string }>, Function]} */
  const [pastChats, setPastChats] = useState([]);
  const [pastChatsLoading, setPastChatsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [minimized, setMinimized] = useState(false);

  const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false);
  const [prefBriefReplies, setPrefBriefReplies] = useState(true);
  const [prefVoiceAutoSend, setPrefVoiceAutoSend] = useState(true);
  const isSendingRef = useRef(false);

  const recognitionRef = useRef(null);
  const voiceFinalRef = useRef("");
  const voiceInterimRef = useRef("");
  const voiceSessionRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const handlePromptRef = useRef(async () => {});

  const nodeMeta = NODE_CONFIG[activeNode] ?? NODE_CONFIG.BizNode;
  const nodeTheme = getNodeTheme(activeNode);

  const liveSessionPayload = useMemo(
    () => ({
      activeNode,
      userHats,
      pathname,
      theme,
      deepWorkModeEnabled,
      vitalStats,
      bridgeSignals: {
        bizUnreadLeadCount: bridgeSignals.bizUnreadLeadCount,
        homeNextEventMinutesUntil: bridgeSignals.homeNextEventMinutesUntil,
        proFocusMinutes: Math.floor(bridgeSignals.proFocusSecondsWhileOnPro / 60),
      },
      pulseSummary: pulseData[activeNode]?.summary ?? null,
      pulseAlerts: pulseData[activeNode]?.alerts ?? [],
    }),
    [
      activeNode,
      userHats,
      pathname,
      theme,
      deepWorkModeEnabled,
      vitalStats,
      bridgeSignals,
      pulseData,
    ]
  );

  const buildSystemPrompt = useCallback(() => {
    const brief = prefBriefReplies ? "Prefer **brief** answers unless depth is explicitly requested.\n\n" : "";
    return `${LINOS_MARKDOWN_STYLE_SYSTEM}\n\n${brief}${LINOS_APP_KNOWLEDGE}\n\n## Live session (JSON)\n\`\`\`json\n${JSON.stringify(
      liveSessionPayload,
      null,
      2
    )}\n\`\`\``;
  }, [liveSessionPayload, prefBriefReplies]);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window === "undefined") return;
      const userId = session?.user?.id;
      if (!userId) return;
      try {
        const raw =
          window.localStorage.getItem(assistantPrefsStorageKey(userId)) ??
          window.localStorage.getItem(ASSISTANT_PREFS_KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (typeof p.briefReplies === "boolean") setPrefBriefReplies(p.briefReplies);
        if (typeof p.voiceAutoSend === "boolean") setPrefVoiceAutoSend(p.voiceAutoSend);
        window.localStorage.setItem(assistantPrefsStorageKey(userId), raw);
        window.localStorage.removeItem(ASSISTANT_PREFS_KEY);
      } catch {
        /* ignore */
      }
    });
  }, [session?.user?.id]);

  const persistAssistantPrefs = useCallback(
    (next) => {
      if (typeof window === "undefined") return;
      const userId = session?.user?.id;
      if (!userId) return;
      window.localStorage.setItem(assistantPrefsStorageKey(userId), JSON.stringify(next));
      window.localStorage.removeItem(ASSISTANT_PREFS_KEY);
    },
    [session?.user?.id],
  );

  const loadThread = useCallback(async (forcedChatId) => {
    const effectiveId =
      typeof forcedChatId === "string" && forcedChatId.trim() ? forcedChatId : chatId;
    if (!effectiveId) return;
    setChatHydrating(true);
    setChatError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("linos_messages")
        .select("id,role,content,attachments,created_at")
        .eq("chat_id", effectiveId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setThreadMessages(
        (data ?? []).filter((r) => r.role === "user" || r.role === "assistant"),
      );
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Could not load chat history.");
    } finally {
      setChatHydrating(false);
    }
  }, [chatId]);

  const loadPastChats = useCallback(async () => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    setPastChatsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: chats, error: chatsErr } = await supabase
        .from("linos_chats")
        .select("id, node_type, created_at")
        .eq("user_id", String(session.user.id))
        .order("created_at", { ascending: false })
        .limit(PAST_CHATS_LIMIT);
      if (chatsErr) throw chatsErr;

      const withPreview = await Promise.all(
        (chats ?? []).map(async (c) => {
          const { data: msg } = await supabase
            .from("linos_messages")
            .select("content")
            .eq("chat_id", c.id)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const preview =
            typeof msg?.content === "string" && msg.content.trim()
              ? msg.content.trim().slice(0, 72)
              : "New conversation";
          return { ...c, preview };
        }),
      );
      setPastChats(withPreview);
    } catch {
      setPastChats([]);
    } finally {
      setPastChatsLoading(false);
    }
  }, [session?.user?.id, sessionStatus]);

  const startNewChat = useCallback(async () => {
    if (sessionStatus === "loading") {
      setChatError("Checking your session…");
      return;
    }
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setChatError("Sign in to start a new chat.");
      return;
    }
    setChatError(null);
    setSplashBanner(null);
    const supabase = getSupabaseBrowserClient();
    const { data: created, error: chatErr } = await supabase
      .from("linos_chats")
      .insert({
        user_id: String(session.user.id),
        node_type: activeNode,
      })
      .select("id")
      .single();
    if (chatErr || !created?.id) {
      setChatError(chatErr?.message ?? "Could not start a new chat.");
      return;
    }
    setChatId(created.id);
    setThreadMessages([]);
    persistChatIdForUser(String(session.user.id), created.id);
    setPastChatsOpen(false);
    void loadPastChats();
  }, [activeNode, loadPastChats, persistChatIdForUser, session?.user?.id, sessionStatus]);

  const switchToChat = useCallback(
    async (id) => {
      if (!id || id === chatId) {
        setPastChatsOpen(false);
        return;
      }
      if (sessionStatus !== "authenticated" || !session?.user?.id) {
        setChatError("Sign in to open previous chats.");
        return;
      }
      const userId = String(session.user.id);
      const supabase = getSupabaseBrowserClient();
      const { data: owned, error } = await supabase
        .from("linos_chats")
        .select("id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !owned?.id) {
        setChatError("That chat belongs to another account or no longer exists.");
        return;
      }
      setChatId(id);
      persistChatIdForUser(userId, id);
      setPastChatsOpen(false);
      setChatError(null);
      await loadThread(id);
    },
    [chatId, loadThread, persistChatIdForUser, session?.user?.id, sessionStatus],
  );

  useEffect(() => {
    if (!chatId || shouldHideAssistantPath(pathname)) return;
    void loadThread();
  }, [chatId, loadThread, pathname]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void loadPastChats();
    } else {
      setPastChats([]);
    }
  }, [loadPastChats, sessionStatus]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadMessages]);

  useEffect(() => {
    if (!isSending) {
      setCookingPhraseIdx(0);
      return undefined;
    }
    const id = window.setInterval(() => {
      setCookingPhraseIdx((i) => (i + 1) % LINOS_COOKING_PHRASES.length);
    }, COOKING_PHRASE_MS);
    return () => window.clearInterval(id);
  }, [isSending]);

  useEffect(() => {
    if (isSending) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isSending, cookingPhraseIdx]);

  useEffect(() => {
    return () => {
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
    };
  }, []);

  const addStagedFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList ?? []);
    const next = [];
    for (const f of incoming) {
      if (f.size > LINOS_ATTACHMENT_MAX_BYTES) continue;
      const previewUrl = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
      next.push({
        localId: crypto.randomUUID(),
        name: f.name,
        mime: f.type || "application/octet-stream",
        previewUrl,
        file: f,
      });
    }
    if (next.length) setStagedAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeStaged = useCallback((localId) => {
    setStagedAttachments((prev) => {
      const t = prev.find((x) => x.localId === localId);
      if (t?.previewUrl) URL.revokeObjectURL(t.previewUrl);
      return prev.filter((x) => x.localId !== localId);
    });
  }, []);

  const openCamera = useCallback(async () => {
    setCameraOpen(true);
    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      camStreamRef.current = stream;
      queueMicrotask(() => {
        const el = videoCamRef.current;
        if (el) {
          el.srcObject = stream;
          void el.play();
        }
      });
    } catch (e) {
      setSplashBanner(
        e instanceof Error ? e.message : "Camera permission denied or unavailable.",
      );
      setCameraOpen(false);
    } finally {
      setCameraBusy(false);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    if (videoCamRef.current) videoCamRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  const captureSnapshot = useCallback(() => {
    const video = videoCamRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `linos-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(file);
        setStagedAttachments((prev) => [
          ...prev,
          {
            localId: crypto.randomUUID(),
            name: file.name,
            mime: "image/jpeg",
            previewUrl,
            file,
          },
        ]);
        closeCamera();
      },
      "image/jpeg",
      0.88,
    );
  }, [closeCamera]);

  const downloadChatMarkdown = useCallback(() => {
    const safeId = chatId && chatId.length >= 8 ? chatId.slice(0, 8) : chatId || "session";
    const lines = threadMessages.map((m) => {
      const head = m.role === "user" ? "User" : "Linos";
      return `### ${head}\n\n${m.content}\n`;
    });
    const blob = new Blob([lines.join("\n---\n\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `linos-chat-${safeId}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [threadMessages, chatId]);

  const handleOpenHatPicker = useCallback(() => {
    const opened = typeof openHatGallery === "function" ? openHatGallery() : false;
    if (!opened) {
      router.push("/shell");
    }
    setSplashBanner(
      opened
        ? "Opening the hat grid — pin or swap Nodes from there."
        : "Opened the LifeNode shell so you can pick or pin Nodes."
    );
  }, [openHatGallery, router]);

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window === "undefined") return;
      const v = window.localStorage.getItem(ASSISTANT_MIN_KEY);
      const legacy = window.localStorage.getItem(LEGACY_MIN_KEY);
      setMinimized(v === "1" || (v == null && legacy === "1"));
    });
  }, []);

  const setAssistantMinimized = useCallback((next) => {
    setMinimized(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ASSISTANT_MIN_KEY, next ? "1" : "0");
    }
  }, []);

  useEffect(() => {
    if (!assemblingNavigation) return;
    const timer = window.setTimeout(() => {
      router.push(assemblingNavigation.route);
      clearAssemblingNavigation();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [router, assemblingNavigation, clearAssemblingNavigation]);

  const hideAssistant = shouldHideAssistantPath(pathname);

  const handlePrompt = useCallback(
    async (raw) => {
      const text = typeof raw === "string" ? raw.trim() : "";
      const lower = text.toLowerCase();
      const snap = stagedAttachments;

      if ((!text && snap.length === 0) || isSendingRef.current) return;

      if (lower.includes("i'm ready to trade") || lower.includes("ready to trade")) {
        setSplashBanner(
          "Copy. Switching to TraderNode with psychology guardrails and sentiment stream live.",
        );
        beginAssemblingToNode("TraderNode");
        return;
      }

      if (lower.includes("generate my invoice")) {
        window.dispatchEvent(new CustomEvent("lino:openInvoiceSuite"));
        setSplashBanner(
          "Invoice sequence initiated. Pulling proof-of-work context and opening the Invoice Suite.",
        );
        return;
      }

      if (activeNode === "VANode" && lower.includes("starting my shift")) {
        setSplashBanner(
          "Synchronizing with Slack and ClickUp. I’ll monitor for high-priority client pings. Ready to record your first EOD clip?",
        );
        return;
      }

      if (activeNode === "VitalNode" && lower.includes("how is my recovery")) {
        setSplashBanner(
          "Analyzing sleep data from Oura and Apple Health. Your resilience is high today; it’s a great day for that heavy lifting session you planned in Strava.",
        );
        return;
      }

      if (sessionStatus === "loading") {
        setChatError("Checking your session…");
        return;
      }

      if (sessionStatus !== "authenticated" || !session?.user?.id) {
        setChatError("Sign in to save Linos chats.");
        return;
      }

      isSendingRef.current = true;
      setIsSending(true);
      setSplashBanner(null);
      setChatError(null);

      const supabase = getSupabaseBrowserClient();

      /** @type {string} */
      let activeChatId = chatId;
      if (activeChatId) {
        const { data: existingChat } = await supabase
          .from("linos_chats")
          .select("id")
          .eq("id", activeChatId)
          .eq("user_id", String(session.user.id))
          .maybeSingle();
        if (!existingChat?.id) {
          clearChatIdForUser(String(session.user.id));
          activeChatId = "";
          setChatId("");
        }
      }

      if (!activeChatId) {
        const { data: created, error: chatErr } = await supabase
          .from("linos_chats")
          .insert({
            user_id: String(session.user.id),
            node_type: activeNode,
          })
          .select("id")
          .single();

        if (chatErr || !created?.id) {
          const raw = chatErr?.message ?? "Could not create chat session.";
          let msg = raw;
          if (/linos_chats_user_id_fkey|violates foreign key/i.test(raw)) {
            msg = `${raw} LifeNode signs in with NextAuth, so user IDs are not guaranteed to exist in Supabase auth.users. In the Supabase SQL editor, run migration 20260517150000_linos_chats_drop_auth_users_fkey.sql (drops that FK and stores user_id as text).`;
          }
          setChatError(msg);
          isSendingRef.current = false;
          setIsSending(false);
          return;
        }

        activeChatId = created.id;
        setChatId(activeChatId);
        persistChatIdForUser(String(session.user.id), activeChatId);
      }

      const geminiParts = [];
      let extraText = "";
      const attachmentRecords = [];

      for (let i = 0; i < snap.length; i += 1) {
        const s = snap[i];
        const f = s.file;
        if (!f) continue;
        if (f.size > LINOS_ATTACHMENT_MAX_BYTES) {
          setChatError(`${s.name} exceeds the 6 MB limit.`);
          isSendingRef.current = false;
          setIsSending(false);
          return;
        }
        const path = `${activeChatId}/${Date.now()}_${i}_${sanitizeStorageFileName(f.name)}`;
        const { error: upErr } = await supabase.storage.from("linos-attachments").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || "application/octet-stream",
        });
        if (upErr) {
          setChatError(upErr.message);
          isSendingRef.current = false;
          setIsSending(false);
          return;
        }
        const { data: pub } = supabase.storage.from("linos-attachments").getPublicUrl(path);
        attachmentRecords.push({
          bucket: "linos-attachments",
          path,
          publicUrl: pub.publicUrl,
          name: f.name,
          mime: f.type || "application/octet-stream",
        });

        const mime = f.type || "";
        if (mime.startsWith("text/plain")) {
          try {
            const t = await readTextFileUtf8(f);
            extraText += `\n\n**Attached text (${f.name})**\n\n${t}`;
          } catch {
            extraText += `\n\n_(Could not read text file: ${f.name})_`;
          }
        } else {
          try {
            const dataUrl = await readFileAsDataUrl(f);
            const parsed = dataUrlToBase64(dataUrl);
            if (parsed) {
              geminiParts.push({
                inline_data: { mime_type: parsed.mime, data: parsed.base64 },
              });
            }
          } catch {
            extraText += `\n\n_(Could not encode ${f.name} for the model.)_`;
          }
        }
      }

      let userContent = text;
      if (extraText) userContent = userContent ? `${userContent}${extraText}` : extraText.trim();
      if (!userContent.trim() && snap.length) {
        userContent = `Please review the attached file(s): ${snap.map((x) => x.name).join(", ")}`;
      }

      const { error: userInsErr } = await supabase.from("linos_messages").insert({
        chat_id: activeChatId,
        role: "user",
        content: userContent || "(attachment)",
        attachments: attachmentRecords,
      });
      if (userInsErr) {
        setChatError(userInsErr.message);
        isSendingRef.current = false;
        setIsSending(false);
        return;
      }

      snap.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setStagedAttachments([]);

      const { data: rows, error: reloadErr } = await supabase
        .from("linos_messages")
        .select("id,role,content,attachments,created_at")
        .eq("chat_id", activeChatId)
        .order("created_at", { ascending: true });

      if (reloadErr) {
        setChatError(reloadErr.message);
      } else {
        setThreadMessages(
          (rows ?? []).filter((r) => r.role === "user" || r.role === "assistant"),
        );
      }

      const system = buildSystemPrompt();
      const fromDb = (rows ?? []).filter((r) => r.role === "user" || r.role === "assistant");
      const linear =
        !reloadErr && fromDb.length > 0
          ? fromDb
          : [
              ...threadMessages.filter((r) => r.role === "user" || r.role === "assistant"),
              {
                id: "__pending-user__",
                role: "user",
                content: userContent || "(attachment)",
              },
            ];
      const tail = linear.slice(-MAX_HISTORY_TURNS * 2);
      const messagesPayload = [{ role: "system", content: system }];
      for (let i = 0; i < tail.length; i += 1) {
        const row = tail[i];
        if (row.role === "assistant") {
          messagesPayload.push({ role: "assistant", content: row.content });
        } else {
          const isLast = i === tail.length - 1;
          messagesPayload.push({
            role: "user",
            content: row.content,
            geminiParts: isLast && geminiParts.length > 0 ? geminiParts : undefined,
          });
        }
      }
      if (messagesPayload.length === 1) {
        messagesPayload.push({
          role: "user",
          content: userContent || "(attachment)",
          geminiParts: geminiParts.length > 0 ? geminiParts : undefined,
        });
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesPayload }),
        });
        const data = await res.json().catch(() => ({}));
        let reply =
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : "No reply from the model.";
        if (!res.ok) {
          if (data?.error === "AI_LIMIT_REACHED" && typeof data.message === "string") {
            reply = data.message;
          } else if (res.status === 401) {
            reply = "Please sign in to use Linos Assistant.";
          } else {
            reply = localFallbackReply(text || userContent, {
              activeNode,
              userHats,
              pathname,
            });
          }
        }

        const { error: asstErr } = await supabase.from("linos_messages").insert({
          chat_id: activeChatId,
          role: "assistant",
          content: reply,
          attachments: [],
        });
        if (asstErr) setChatError(asstErr.message);

        await loadThread(activeChatId);
      } catch {
        const reply = localFallbackReply(text || userContent, {
          activeNode,
          userHats,
          pathname,
        });
        await supabase.from("linos_messages").insert({
          chat_id: activeChatId,
          role: "assistant",
          content: reply,
          attachments: [],
        });
        await loadThread(activeChatId);
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
        void loadPastChats();
      }
    },
    [
      activeNode,
      beginAssemblingToNode,
      buildSystemPrompt,
      chatId,
      loadPastChats,
      loadThread,
      pathname,
      clearChatIdForUser,
      persistChatIdForUser,
      session?.user?.id,
      sessionStatus,
      stagedAttachments,
      threadMessages,
      userHats,
    ],
  );

  useEffect(() => {
    handlePromptRef.current = handlePrompt;
  }, [handlePrompt]);

  /** Web Speech API: one long-lived instance; handlers use refs so we don’t recreate on every render. */
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      queueMicrotask(() => setSpeechSupported(false));
      return undefined;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    const clearSilenceTimer = () => {
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    const scheduleSilenceEnd = () => {
      clearSilenceTimer();
      silenceTimerRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
      }, SILENCE_MS);
    };

    recognition.onstart = () => {
      voiceSessionRef.current = true;
      voiceFinalRef.current = "";
      voiceInterimRef.current = "";
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          voiceFinalRef.current = `${voiceFinalRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      voiceInterimRef.current = interim.trim();
      const live = `${voiceFinalRef.current} ${voiceInterimRef.current}`.trim();
      setInput(live);
      scheduleSilenceEnd();
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      const combined = `${voiceFinalRef.current} ${voiceInterimRef.current}`.trim();
      voiceInterimRef.current = "";
      if (voiceSessionRef.current && combined) {
        void handlePromptRef.current(combined);
        setInput("");
      }
      voiceSessionRef.current = false;
      voiceFinalRef.current = "";
    };

    recognition.onerror = (ev) => {
      clearSilenceTimer();
      setIsListening(false);
      if (ev.error === "not-allowed") {
        setSpeechSupported(false);
        setSplashBanner("Microphone access was blocked. Allow the mic for this site in your browser settings, then try again.");
      } else if (ev.error !== "aborted" && ev.error !== "no-speech") {
        setSplashBanner(`Voice capture paused (${ev.error}). Tap the mic to try again.`);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      clearSilenceTimer();
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!speechSupported || !recognition) return;
    if (isListening) {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
      return;
    }
    voiceFinalRef.current = "";
    voiceInterimRef.current = "";
    voiceSessionRef.current = true;
    try {
      recognition.start();
    } catch (e) {
      if (e instanceof Error && e.name === "InvalidStateError") {
        try {
          recognition.stop();
          window.setTimeout(() => recognition.start(), 120);
        } catch {
          setSplashBanner("Voice is busy—wait a second, then tap the mic again.");
        }
      }
    }
  }, [isListening, speechSupported]);

  if (hideAssistant) {
    return null;
  }

  const hatsForChips = configuredHats;

  if (minimized) {
    return (
      <>
        {assemblingNavigation && (
          <AssemblyOverlay label={assemblingNavigation.label} />
        )}
        <div className="pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 z-[65] md:bottom-6 md:left-auto md:right-6 md:z-[100]">
          <button
            type="button"
            onClick={() => setAssistantMinimized(false)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-[#0f172a]/92 p-2.5 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-xl md:rounded-2xl md:px-4 md:py-3"
            aria-label="Expand Linos"
          >
            <LinosSparkIcon
              size={22}
              className={`${nodeTheme.iconOnGlass} md:hidden`}
              title="Linos"
            />
            <LinosSparkIcon
              size={18}
              className={`hidden ${nodeTheme.iconOnGlass} md:block`}
              title="Linos"
            />
            <span className={`hidden md:inline ${nodeTheme.headingFont}`}>Linos</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {assemblingNavigation && (
        <AssemblyOverlay label={assemblingNavigation.label} />
      )}

      <div className="linos-assistant pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[65] w-[min(980px,calc(100vw-1rem))] -translate-x-1/2 md:bottom-6 md:z-[100] md:w-[min(980px,94vw)]">
        <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[#0B1220]/92 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1">
                <LinosSparkIcon size={16} className={`shrink-0 ${nodeTheme.iconOnGlass}`} />
                <span className={`truncate font-semibold ${nodeTheme.titleOnGlass} ${nodeTheme.headingFont}`}>
                  Linos
                </span>
                <span className={`hidden sm:inline ${nodeTheme.toneOnGlass}`}>· {nodeMeta.title}</span>
                <span className={`hidden sm:inline ${nodeTheme.toneOnGlass}`}>· {nodeMeta.tone}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span
                  className={`rounded border bg-slate-900/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${nodeTheme.chipActiveOnGlass}`}
                  title={`Currently wearing ${activeNode}`}
                >
                  Active: {activeNode}
                </span>
                <span
                  className={`rounded border border-white/15 bg-slate-900/70 px-2 py-0.5 font-semibold ${nodeTheme.toneOnGlass}`}
                  title={
                    hatsForChips.length
                      ? `Configured hats: ${hatsForChips.join(", ")}`
                      : "No hats pinned — use Add hat? on the left rail"
                  }
                >
                  Hats: {hatsForChips.length}
                </span>
              </div>
              {hatsForChips.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {hatsForChips.map((hat) => {
                    const hatTheme = getNodeTheme(hat);
                    const isActive = hat === activeNode;
                    return (
                      <span
                        key={hat}
                        className={`group relative cursor-default rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? hatTheme.chipActiveOnGlass : hatTheme.chipInactiveOnGlass
                        }`}
                        title={`${hat}${isActive ? " · currently active" : ""}`}
                        aria-label={hat}
                      >
                        {HAT_SHORT_LABEL[hat]}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-slate-950/95 px-2 py-1 text-[10px] font-semibold text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl group-hover:block group-focus-within:block"
                        >
                          {hat}
                          {isActive ? " · active" : ""}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">
                  Pin Nodes from the left rail (+) — chips mirror your hat rail.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void startNewChat()}
                disabled={sessionStatus !== "authenticated" || isSending}
                className="rounded-lg border border-white/15 bg-slate-900/70 p-2 text-slate-100 transition hover:bg-slate-900 disabled:opacity-40"
                title="New chat"
                aria-label="New chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPastChatsOpen((v) => !v)}
                disabled={sessionStatus !== "authenticated"}
                className={`rounded-lg border p-2 text-slate-100 transition disabled:opacity-40 ${
                  pastChatsOpen
                    ? nodeTheme.chipActiveOnGlass
                    : "border-white/15 bg-slate-900/70 hover:bg-slate-900"
                }`}
                title="Previous chats"
                aria-label="Previous chats"
                aria-expanded={pastChatsOpen}
              >
                <History className="h-4 w-4" />
              </button>
              <div
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  isLinoInterrupting
                    ? "border border-rose-400/40 bg-rose-500/30 text-rose-50"
                    : "border border-emerald-400/40 bg-emerald-500/30 text-emerald-50"
                }`}
                title={
                  isLinoInterrupting
                    ? "Cross-node alert ready — Linos detected something that needs your attention (expiring food, overdue tasks, bridge triggers)."
                    : "Calm State — Linos is quietly watching your nodes with no urgent alerts. Related to your LifePulse calm progress ring."
                }
                suppressHydrationWarning
              >
                {isLinoInterrupting ? "Alert Ready" : "Calm State"}
              </div>
              <button
                type="button"
                onClick={() => setAssistantMinimized(true)}
                className="rounded-lg border border-white/15 bg-slate-900/70 p-2 text-slate-100 transition hover:bg-slate-900"
                aria-label="Minimize Linos"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {pastChatsOpen ? (
            <div className="mb-2 max-h-36 overflow-y-auto rounded-xl border border-white/12 bg-slate-950/50 p-2">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Your previous chats
              </p>
              {pastChatsLoading ? (
                <p className="px-1 text-xs text-slate-500">Loading chats…</p>
              ) : pastChats.length === 0 ? (
                <p className="px-1 text-xs text-slate-500">
                  No saved chats yet — conversations you start are stored to your account only.
                </p>
              ) : (
                <ul className="space-y-1">
                  {pastChats.map((c) => {
                    const active = c.id === chatId;
                    const when = c.created_at
                      ? new Date(c.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "";
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => void switchToChat(c.id)}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                            active
                              ? nodeTheme.chipActiveOnGlass
                              : "border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                          }`}
                        >
                          <span className="block truncate text-xs font-semibold">
                            {c.preview || "Conversation"}
                          </span>
                          <span className="mt-0.5 block text-[10px] opacity-70">
                            {c.node_type ?? "Node"} · {when}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {splashBanner ? (
            <div className="mb-2 rounded-lg border border-teal-400/20 bg-teal-500/[0.08] px-3 py-2 text-xs leading-relaxed text-teal-50/95">
              {splashBanner}
            </div>
          ) : null}
          {chatError ? (
            <div className="mb-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {chatError}
            </div>
          ) : null}
          {chatHydrating ? (
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Syncing thread…
            </p>
          ) : null}

          <div
            className="mb-2 max-h-[min(240px,38vh)] space-y-2.5 overflow-y-auto rounded-xl border border-white/12 bg-slate-950/40 px-3 py-2.5"
            aria-label="Chat transcript"
          >
            {threadMessages.length === 0 ? (
              <p className="text-center text-xs text-slate-500">
                No messages yet — ask Linos anything, or attach a file or snapshot.
              </p>
            ) : (
              threadMessages.map((m) => (
                <div
                  key={m.id ?? `${m.role}-${m.created_at ?? m.content?.slice(0, 24)}`}
                  className={`rounded-lg px-2.5 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-4 border border-white/10 bg-slate-900/80 text-slate-100"
                      : "mr-4 border border-indigo-400/15 bg-slate-900/55 text-slate-100"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {m.role === "user" ? "You" : "Linos"}
                  </p>
                  {m.role === "assistant" ? (
                    <div
                      className={`text-[13px] leading-relaxed text-slate-100 [&_a]:text-cyan-300 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:last-child]:mb-0 [&_p]:mb-2 [&_strong]:font-semibold [&_strong]:text-slate-50 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5`}
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-200">
                      {m.content}
                    </pre>
                  )}
                </div>
              ))
            )}
            {isSending ? (
              <LinosCookingIndicator phrase={LINOS_COOKING_PHRASES[cookingPhraseIdx]} />
            ) : null}
            <div ref={transcriptBottomRef} aria-hidden />
          </div>

          <input
            ref={filePickRef}
            type="file"
            multiple
            accept={LINOS_FILE_INPUT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              addStagedFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {stagedAttachments.length > 0 ? (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {stagedAttachments.map((a) => (
                <div
                  key={a.localId}
                  className="group relative shrink-0 overflow-hidden rounded-xl border border-white/12 bg-slate-900/80"
                >
                  {a.previewUrl ? (
                    <img
                      src={a.previewUrl}
                      alt={a.name}
                      className="h-16 w-16 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 bg-slate-950/70 px-1 text-center">
                      <FileText className="h-5 w-5 text-slate-400" aria-hidden />
                      <span className="line-clamp-2 max-w-[4.25rem] break-all text-[9px] text-slate-500">
                        {a.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStaged(a.localId)}
                    className="absolute right-0.5 top-0.5 rounded-md bg-[#0B1220]/90 p-0.5 text-slate-200 opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100"
                    aria-label={`Remove ${a.name}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenHatPicker}
              className="rounded-lg border border-white/15 bg-slate-900/70 p-2.5 text-slate-100 transition hover:bg-slate-900"
              aria-label="Open hat grid or shell"
              title="Nodes & hats"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAssistantSettingsOpen(true)}
              className="rounded-lg border border-white/15 bg-slate-900/70 p-2.5 text-slate-100 transition hover:bg-slate-900"
              aria-label="Assistant settings"
              title="Settings"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => filePickRef.current?.click()}
              className="rounded-lg border border-white/15 bg-slate-900/70 p-2.5 text-slate-100 transition hover:bg-slate-900"
              aria-label="Attach file"
              title="Attach images, PDF, TXT, or DOCX"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void openCamera()}
              className="rounded-lg border border-white/15 bg-slate-900/70 p-2.5 text-slate-100 transition hover:bg-slate-900"
              aria-label="Open camera"
              title="Capture from webcam"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={downloadChatMarkdown}
              disabled={threadMessages.length === 0}
              className="rounded-lg border border-white/15 bg-slate-900/70 p-2.5 text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Export chat as Markdown"
              title="Download transcript (.md)"
            >
              <Download className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending && (input.trim() || stagedAttachments.length > 0)) {
                    void handlePrompt(input);
                    setInput("");
                  }
                }
              }}
              placeholder="Ask Linos anything…"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-900/70 px-4 text-sm text-slate-100 placeholder:text-slate-400 outline-none ring-indigo-300/50 focus:ring-2"
              disabled={isSending || sessionStatus === "loading"}
            />
            <button
              type="button"
              onClick={toggleListening}
              disabled={!speechSupported || isSending}
              className={`shrink-0 rounded-lg border p-2.5 transition ${
                isListening
                  ? nodeTheme.chipActiveOnGlass
                  : "border-white/15 bg-slate-900/70 text-slate-100 hover:bg-slate-900"
              } disabled:opacity-40`}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={
                isSending ||
                (!input.trim() && stagedAttachments.length === 0) ||
                sessionStatus !== "authenticated"
              }
              onClick={() => {
                void handlePrompt(input);
                setInput("");
              }}
              className="shrink-0 rounded-lg bg-[#1E293B] p-2.5 text-white transition hover:bg-[#24364d] disabled:opacity-50"
              aria-label="Send prompt"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {nodeMeta.cards.map((card) => (
              <button
                key={card}
                type="button"
                onClick={() => void handlePrompt(card)}
                className="rounded-lg border border-white/15 bg-slate-900/55 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-900/80"
              >
                {card}
              </button>
            ))}
            {activeNode === "VitalNode" && (
              <span className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-50">
                HR {vitalStats.heartRate} · Stress {vitalStats.stressLevel}% · Focus{" "}
                {vitalStats.focusTime}m
              </span>
            )}
          </div>
        </div>
      </div>

      {assistantSettingsOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setAssistantSettingsOpen(false);
              }}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-white/20 bg-[#0B1220]/92 p-6 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                role="dialog"
                aria-modal
                aria-labelledby="linos-settings-title"
              >
                <h3
                  id="linos-settings-title"
                  className={`text-lg font-bold ${nodeTheme.headingFont}`}
                >
                  Linos settings
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Local preferences only — wire to your workspace later.
                </p>
                <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    <span>Brief replies (fewer tokens)</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-500 text-teal-500"
                      checked={prefBriefReplies}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setPrefBriefReplies(v);
                        persistAssistantPrefs({
                          briefReplies: v,
                          voiceAutoSend: prefVoiceAutoSend,
                        });
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                    <span>Voice: auto-send after pause</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-500 text-teal-500"
                      checked={prefVoiceAutoSend}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setPrefVoiceAutoSend(v);
                        persistAssistantPrefs({
                          briefReplies: prefBriefReplies,
                          voiceAutoSend: v,
                        });
                      }}
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500"
                    onClick={() => setAssistantSettingsOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {cameraOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[5900] flex items-center justify-center bg-[#0B0F17]/92 p-4 backdrop-blur-md"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeCamera();
              }}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0B1220]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
                role="dialog"
                aria-modal
                aria-label="Camera capture"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${nodeTheme.headingFont} text-slate-100`}>
                    Webcam
                  </p>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-lg border border-white/12 bg-slate-900/80 p-2 text-slate-200 transition hover:bg-slate-800"
                    aria-label="Close camera"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <video
                    ref={videoCamRef}
                    className="aspect-video max-h-[50vh] w-full object-cover"
                    playsInline
                    muted
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  {cameraBusy ? "Starting camera…" : "Face the viewport, then capture a snapshot."}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => captureSnapshot()}
                    disabled={cameraBusy || isSending}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-40 ${nodeTheme.chipActiveOnGlass}`}
                  >
                    Capture snapshot
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-xl border border-white/15 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
