"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { savePendingShellHats } from "@/lib/pending-shell-hats";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  FileText,
  HeartPulse,
  CreditCard,
  CheckSquare,
  Video,
  Activity,
  Calendar,
  ShoppingCart,
  PenTool,
  Sparkles,
  Briefcase,
  Home,
  TrendingUp,
  Scale,
  Loader2,
} from "lucide-react";
/** Fonts come from root layout CSS variables (--font-outfit, --font-playfair). */
const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";
const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

const NODE_META = {
  work: {
    label: "BizNode",
    blurb: "Business, pipelines, and operations.",
    color: "#2563EB",
    Icon: Briefcase,
  },
  home: {
    label: "HomeNode",
    blurb: "Fridge vision, groceries, family hub.",
    color: "#F59E0B",
    Icon: Home,
  },
  va: {
    label: "VANode",
    blurb: "Client sandboxes & 1-click reports.",
    color: "#0D9488",
    Icon: MessageSquare,
  },
  trader: {
    label: "TraderNode",
    blurb: "Markets, journals, and sniper mode.",
    color: "#06B6D4",
    Icon: TrendingUp,
  },
  vital: {
    label: "VitalNode",
    blurb: "Sleep, health & AI scheduling.",
    color: "#84A59D",
    Icon: HeartPulse,
  },
  pro: {
    label: "ProNode",
    blurb: "Legal, Medical & Case management.",
    color: "#1E293B",
    Icon: Scale,
  },
};

const NODE_ROUTES = {
  work: "/work",
  home: "/home",
  va: "/vanode",
  trader: "/trader",
  vital: "/vital",
  pro: "/pro",
};

const LOADING_LINES = [
  "Gathering your nodes…",
  "Syncing integrations…",
  "Weaving your LifeNode…",
  "Locking the core — your OS awakens.",
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [selectedNodes, setSelectedNodes] = useState({
    work: false,
    home: false,
    va: false,
    trader: false,
    vital: false,
    pro: false,
  });
  const [loadingStep, setLoadingStep] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [assemblyBurst, setAssemblyBurst] = useState(false);

  const demographics = [
    { role: "Parents", color: "text-[#F59E0B]", highlight: "Household Logistics" },
    { role: "Founders", color: "text-[#2563EB]", highlight: "Business Operations" },
    { role: "Traders", color: "text-[#06B6D4]", highlight: "Market Execution" },
    { role: "Freelancers", color: "text-[#0D9488]", highlight: "Client Management" },
    { role: "Your Entire Life", color: "text-[#6366F1]", highlight: "Everything" },
  ];

  const integrations = [
    { name: "Gmail", icon: <Mail size={16} /> },
    { name: "Slack", icon: <MessageSquare size={16} /> },
    { name: "Notion", icon: <FileText size={16} /> },
    { name: "Apple Health", icon: <HeartPulse size={16} /> },
    { name: "Stripe", icon: <CreditCard size={16} /> },
    { name: "Asana", icon: <CheckSquare size={16} /> },
    { name: "Zoom", icon: <Video size={16} /> },
    { name: "Oura", icon: <Activity size={16} /> },
    { name: "Google Calendar", icon: <Calendar size={16} /> },
    { name: "Shopify", icon: <ShoppingCart size={16} /> },
    { name: "Figma", icon: <PenTool size={16} /> },
  ];

  const selectedKeys = useMemo(
    () => Object.entries(selectedNodes).filter(([, v]) => v).map(([k]) => k),
    [selectedNodes]
  );

  const activeNodes = useMemo(
    () => selectedKeys.map((key) => ({ key, ...NODE_META[key] })),
    [selectedKeys]
  );

  useEffect(() => {
    if (step === 0) {
      const interval = setInterval(
        () => setHeroIndex((prev) => (prev + 1) % demographics.length),
        2500
      );
      return () => clearInterval(interval);
    }
  }, [step, demographics.length]);

  useEffect(() => {
    if (step !== 3) return;

    queueMicrotask(() => {
      setLoadingStep(0);
      setAssemblyBurst(false);
    });

    const burstAt = setTimeout(() => setAssemblyBurst(true), 4200);

    const t1 = setTimeout(() => setLoadingStep(1), 1500);
    const t2 = setTimeout(() => setLoadingStep(2), 3000);
    const t3 = setTimeout(() => setLoadingStep(3), 4500);
    const t4 = setTimeout(() => setStep(4), 6500);

    return () => {
      clearTimeout(burstAt);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [step]);

  const toggleNode = (key) =>
    setSelectedNodes((prev) => ({ ...prev, [key]: !prev[key] }));

  const isQuizValid = Object.values(selectedNodes).some(Boolean);

  return (
    <div
      className={`${FONT_OUTFIT} grainy-dawn-bg min-h-screen text-[#1E293B] flex flex-col relative overflow-hidden transition-colors duration-700`}
    >
      <style>{`
        .fade-in { animation: ln-fadeIn 0.8s ease-out forwards; }
        @keyframes ln-fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ln-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ln-marquee {
          display: flex;
          width: max-content;
          animation: ln-marquee 35s linear infinite;
        }
        @keyframes ln-ripple {
          0% { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ln-core-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.35); }
          50% { transform: scale(1.06); box-shadow: 0 0 40px 12px rgba(99, 102, 241, 0.35); }
        }
        @keyframes ln-node-orbit {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.25);
            filter: blur(4px);
          }
          70% {
            opacity: 1;
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            filter: blur(0);
          }
        }
        @keyframes ln-snap {
          0% { transform: scale(1); filter: brightness(1); }
          40% { transform: scale(1.04); filter: brightness(1.35); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .ln-assembly-snap {
          animation: ln-snap 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .ln-orbit-node {
          animation: ln-node-orbit 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
          transform: translate(-50%, -50%);
        }
        .ln-ripple-ring {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 120px;
          height: 120px;
          border-radius: 9999px;
          border: 2px solid rgba(99, 102, 241, 0.35);
          animation: ln-ripple 2.2s ease-out infinite;
        }
        .ln-ripple-ring:nth-child(2) { animation-delay: 0.6s; }
        .ln-ripple-ring:nth-child(3) { animation-delay: 1.2s; }
      `}</style>

      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-900" />
          <span className="font-bold text-slate-900 tracking-wide text-xl">
            LifeNode <span className="font-light text-slate-400">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link
            href="/auth/signin"
            className="text-slate-600 transition hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-md transition hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </nav>

      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 fade-in mt-16">
          <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-slate-200 shadow-sm">
            Meet LifeNode OS
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-[#0F172A] max-w-4xl tracking-tight mb-6 leading-[1.1] transition-all duration-500">
            The Operating System for <br />
            <span
              className={`${FONT_PLAYFAIR} italic text-[#1E293B] transition-colors duration-500 ${demographics[heroIndex].color}`}
            >
              {demographics[heroIndex].role}.
            </span>
          </h1>
          <p className="text-lg text-[#475569] max-w-2xl mb-10 leading-relaxed min-h-[4.5rem] md:min-h-[4rem]">
            Stop toggling between 15 different apps. Unify your{" "}
            <span className="font-bold text-[#1E293B]">
              {demographics[heroIndex].highlight}
            </span>
            , physical recovery, and daily tasks into one intelligent dashboard.
          </p>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 shadow-xl"
          >
            Build Your Dashboard <ArrowRight size={20} />
          </button>

          <div className="mt-16 w-full max-w-6xl overflow-hidden relative opacity-40 grayscale before:absolute before:left-0 before:top-0 before:w-32 before:h-full before:bg-gradient-to-r before:from-[#FDFDFD] before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:w-32 after:h-full after:bg-gradient-to-l after:from-[#FDFDFD] after:to-transparent after:z-10">
            <div className="animate-ln-marquee flex items-center">
              {[...integrations, ...integrations].map((app, i) => (
                <div
                  key={`${app.name}-${i}`}
                  className="flex items-center gap-2 font-bold text-sm whitespace-nowrap mx-6 text-slate-600"
                >
                  {app.icon} <span>{app.name}</span>{" "}
                  <span className="text-slate-300 ml-6 text-[10px]">♦</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full fade-in z-10 mt-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Which hats are you wearing?
          </h2>
          <p className="text-sm md:text-base text-slate-500 text-center max-w-2xl mb-8 leading-relaxed">
            Pick whichever hats match your day - maybe BizNode and HomeNode, then
            VitalNode. Mix and match as needed; your LifeNode will assemble around
            you.
          </p>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {Object.entries(NODE_META).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleNode(key)}
                className={`text-left p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedNodes[key]
                    ? "shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                style={
                  selectedNodes[key]
                    ? {
                        borderColor: meta.color,
                        backgroundColor: `${meta.color}14`,
                      }
                    : undefined
                }
              >
                <h3 className="font-bold text-md mb-2">{meta.label}</h3>
                <p className="text-xs text-slate-500">{meta.blurb}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!isQuizValid}
            className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full fade-in z-10 mt-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
            Your stack
          </p>
          <h2
            className={`${FONT_PLAYFAIR} text-3xl md:text-4xl font-semibold text-slate-900 mb-6 italic`}
          >
            Ready to assemble your LifeNode?
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            We&apos;ll connect the nodes you chose into one living hub — the moment
            everything clicks into place.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {activeNodes.map(({ key, label, color }) => (
              <span
                key={key}
                className="px-4 py-2 rounded-full text-sm font-bold text-white shadow-md"
                style={{ backgroundColor: color }}
              >
                {label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              savePendingShellHats(selectedKeys);
              setStep(3);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-full font-bold text-lg inline-flex items-center gap-2 shadow-xl transition-transform hover:scale-[1.02]"
          >
            <Sparkles size={20} />
            Assemble my LifeNode
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 text-sm text-slate-500 hover:text-slate-800 underline-offset-4 hover:underline"
          >
            Back to quiz
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-[#0f172a] to-slate-950 text-white fade-in px-4">
          <div
            className={`relative w-[min(92vw,440px)] aspect-square flex items-center justify-center mb-10 ${
              assemblyBurst ? "ln-assembly-snap" : ""
            }`}
          >
            <div className="ln-ripple-ring" />
            <div className="ln-ripple-ring" />
            <div className="ln-ripple-ring" />

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
              viewBox="0 0 400 400"
              aria-hidden
            >
              {activeNodes.map((node, i) => {
                const n = activeNodes.length || 1;
                const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                const r = loadingStep >= 2 ? 148 : 120;
                const x = 200 + Math.cos(angle) * r;
                const y = 200 + Math.sin(angle) * r;
                return (
                  <line
                    key={node.key}
                    x1="200"
                    y1="200"
                    x2={x}
                    y2={y}
                    stroke={node.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="8 6"
                    opacity={loadingStep >= 1 ? 0.9 : 0.15}
                    style={{
                      transition: "opacity 0.8s ease, stroke 0.6s ease",
                    }}
                  />
                );
              })}
            </svg>

            <div
              className="relative z-10 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-slate-900 shadow-[0_0_60px_rgba(99,102,241,0.55)]"
              style={{ animation: "ln-core-pulse 2.4s ease-in-out infinite" }}
            >
              <Sparkles className="text-white" size={40} strokeWidth={1.5} />
            </div>

            {activeNodes.map((node, i) => {
              const n = activeNodes.length || 1;
              const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
              const dist = 150;
              const left = `calc(50% + ${Math.cos(angle) * dist}px)`;
              const top = `calc(50% + ${Math.sin(angle) * dist}px)`;
              const Icon = node.Icon;
              return (
                <div
                  key={node.key}
                  className="ln-orbit-node absolute z-20 w-[100px] rounded-2xl border border-white/15 bg-white/10 p-3 text-center shadow-lg backdrop-blur-md"
                  style={{
                    left,
                    top,
                    animationDelay: `${i * 110}ms`,
                    boxShadow: `0 12px 40px ${node.color}33`,
                  }}
                >
                  <Icon
                    className="mx-auto mb-1"
                    size={22}
                    style={{ color: node.color }}
                  />
                  <div className="text-[10px] font-bold leading-tight text-white/90">
                    {node.label.replace("Node", "")}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3 text-center max-w-md">
            <div className="flex items-center gap-2 text-indigo-200/90">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm font-semibold tracking-wide uppercase">
                Assembling
              </span>
            </div>
            <p
              key={loadingStep}
              className="text-lg md:text-xl font-medium text-white/95 min-h-[3.5rem] fade-in"
            >
              {LOADING_LINES[loadingStep]}
            </p>
            <div className="mt-2 flex gap-1.5">
              {LOADING_LINES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                    i <= loadingStep ? "bg-indigo-400" : "bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fixed inset-0 bg-[#E8E6E6] z-[70] flex flex-col p-6 items-center justify-center fade-in">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-gradient-to-b from-indigo-200/40 to-transparent blur-2xl" />
          </div>
          <div className="relative bg-white/95 p-8 md:p-10 rounded-[2rem] border-l-8 border-[#0D9488] shadow-2xl max-w-4xl w-full text-center md:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0D9488]">
              <Sparkles size={14} />
              Assembly complete
            </div>
            <h3
              className={`${FONT_PLAYFAIR} font-bold text-2xl md:text-3xl mb-2 italic text-[#0D9488]`}
            >
              Your LifeNode is live.
            </h3>
            <p className="text-slate-600 text-lg mb-6">
              {activeNodes.length} active{" "}
              {activeNodes.length === 1 ? "node" : "nodes"} — wired into one OS.
              Your dashboard is tuned to how you actually work and live.
            </p>
            <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
              {activeNodes.map(({ key, label, color }) => (
                <span
                  key={key}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
                  style={{ borderColor: `${color}55` }}
                >
                  <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(
                activeNodes.length > 1
                  ? "/dashboard"
                  : NODE_ROUTES[activeNodes[0]?.key] ?? "/dashboard"
              )}`}
              className="inline-flex bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
              Launch Dashboard
            </Link>
          </div>
        </div>
      )}

      <footer className="w-full border-t border-slate-200 bg-white px-8 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div>&copy; {new Date().getFullYear()} LifeNodeOS. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-slate-800">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-slate-800">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
