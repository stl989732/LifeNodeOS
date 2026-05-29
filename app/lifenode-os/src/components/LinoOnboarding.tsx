"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  HeartPulse,
  Home,
  MessageSquare,
  Plus,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  ACTIVE_TO_HAT_KEY,
  NODE_ONBOARDING_STEPS,
  NODE_ONBOARDING_STEP_LABEL,
  NODE_ROUTE,
  type ActiveNodeName,
  type NodeOnboardingStep,
} from "@/lib/node-mappings";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";

/**
 * Per-node onboarding content. Each node ships its own three-step copy:
 *   1. Stack Sync   — connect the apps that feed this node
 *   2. KPI Setup    — pick the signals you want to see
 *   3. First Workflow — name the first cross-node automation
 *
 * Copy stays warm and "calm chief of staff" — never robotic, never sales-y.
 */

type NodeContent = {
  Icon: typeof Briefcase;
  accent: string;
  intro: string;
  greeting: string;
  steps: {
    stackSync: { title: string; helper: string; suggestions: string[] };
    kpiSetup: { title: string; helper: string; suggestions: string[] };
    firstWorkflow: { title: string; helper: string; placeholder: string };
  };
};

const CONTENT: Record<ActiveNodeName, NodeContent> = {
  BizNode: {
    Icon: Briefcase,
    accent: "from-cyan-300/40 to-indigo-300/40",
    intro: "BizNode",
    greeting:
      "Welcome. I'm Lino. Let's set up your business command center together — three quiet steps, no fire hose.",
    steps: {
      stackSync: {
        title: "Sync your work stack",
        helper:
          "Pick the tools your operations actually live in. We'll route the signals so you only see what needs you.",
        suggestions: [
          "HubSpot",
          "GoHighLevel",
          "Gmail",
          "Slack",
          "Stripe",
          "Notion",
          "ClickUp",
          "QuickBooks",
        ],
      },
      kpiSetup: {
        title: "Choose the KPIs you trust",
        helper:
          "These are the numbers BizNode will keep an eye on for you. Three is a great place to start.",
        suggestions: [
          "Pipeline value",
          "Lead response time",
          "Pending approvals",
          "Closed-won (week)",
          "Cash runway",
          "Open invoices",
        ],
      },
      firstWorkflow: {
        title: "Name your first workflow",
        helper:
          "What's the one handoff you'd love to never forget again? I'll wire the bridge.",
        placeholder: "e.g. Lead overflow → VANode triage",
      },
    },
  },
  HomeNode: {
    Icon: Home,
    accent: "from-emerald-300/40 to-teal-300/40",
    intro: "HomeNode",
    greeting:
      "Welcome home. I'm Lino — your calm second brain for the household. Three light steps to set this up.",
    steps: {
      stackSync: {
        title: "Sync your household tools",
        helper:
          "Calendars, grocery apps, anything that helps the family move. We'll keep them quietly in sync.",
        suggestions: [
          "Apple Calendar",
          "Google Calendar",
          "Instacart",
          "Whoop",
          "Apple Health",
          "iCloud Reminders",
        ],
      },
      kpiSetup: {
        title: "Pick the household signals",
        helper:
          "What do you want to glance at every morning to know the home is calm? Three signals is plenty.",
        suggestions: [
          "Pantry resilience",
          "Family calendar conflicts",
          "Shared tasks",
          "Spending vs budget",
          "Sleep window",
        ],
      },
      firstWorkflow: {
        title: "Name your first household workflow",
        helper:
          "The one moment you'd love automated. Pickup reminders, fridge runs — anything.",
        placeholder: "e.g. Fridge low → Smart Cart",
      },
    },
  },
  VitalNode: {
    Icon: HeartPulse,
    accent: "from-rose-300/40 to-amber-300/40",
    intro: "VitalNode",
    greeting:
      "Hi. I'm Lino. We're going to set up your recovery dashboard — calm, private, just for you. Three steps.",
    steps: {
      stackSync: {
        title: "Sync your wellness stack",
        helper:
          "Wearables, sleep trackers, mindfulness apps. VitalNode never broadcasts — it just listens.",
        suggestions: [
          "Apple Health",
          "Whoop",
          "Oura",
          "Garmin",
          "Strava",
          "Calm",
          "Headspace",
        ],
      },
      kpiSetup: {
        title: "Choose the signals to surface",
        helper:
          "Which numbers actually mean something to you? VitalNode will quietly track them.",
        suggestions: [
          "Sleep score",
          "HRV trend",
          "Active minutes",
          "Hydration",
          "Resting HR",
          "Stress load",
        ],
      },
      firstWorkflow: {
        title: "Name your first recovery cue",
        helper:
          "What should trigger a gentle nudge from VitalNode?",
        placeholder: "e.g. HRV drop → cognitive break",
      },
    },
  },
  TraderNode: {
    Icon: TrendingUp,
    accent: "from-amber-300/40 to-rose-300/40",
    intro: "TraderNode",
    greeting:
      "Welcome. I'm Lino — your edge protector. Three steps and we're in. Sniper mode is one click away.",
    steps: {
      stackSync: {
        title: "Sync your trading stack",
        helper:
          "Brokerage, charting, journaling — everything stays on your machine. P&L blurs by default.",
        suggestions: [
          "TradingView",
          "MetaTrader",
          "ThinkOrSwim",
          "Edgewonk",
          "Tradervue",
          "IBKR",
        ],
      },
      kpiSetup: {
        title: "Choose the signals you watch",
        helper:
          "Daily P&L, win rate, drawdown — pick what keeps you honest, not what makes you anxious.",
        suggestions: [
          "Daily P&L (blurred)",
          "Win rate (week)",
          "Avg R:R",
          "Drawdown",
          "Setup quality",
          "Trades taken",
        ],
      },
      firstWorkflow: {
        title: "Name your first discipline rule",
        helper:
          "When should TraderNode protect you from yourself?",
        placeholder: "e.g. Stop-loss breached → HomeNode 10 min reset",
      },
    },
  },
  VANode: {
    Icon: MessageSquare,
    accent: "from-indigo-300/40 to-cyan-300/40",
    intro: "VANode",
    greeting:
      "Hi. I'm Lino. Let's make every client feel like they're your only one. Three steps, then we're live.",
    steps: {
      stackSync: {
        title: "Sync your client stack",
        helper:
          "Slack channels, time tracker, invoicing tool. We'll silo everything by client and never cross streams.",
        suggestions: [
          "Slack",
          "Loom",
          "Toggl",
          "Stripe",
          "Notion",
          "Google Drive",
          "QuickBooks",
        ],
      },
      kpiSetup: {
        title: "Choose your delivery signals",
        helper:
          "What do you want to glance at to know each client is healthy?",
        suggestions: [
          "Hours billed",
          "Open invoices",
          "Slack response time",
          "EOD reports sent",
          "Tasks in flight",
          "Scope risk",
        ],
      },
      firstWorkflow: {
        title: "Name your first client ritual",
        helper:
          "What's the one ritual that makes clients feel taken care of?",
        placeholder: "e.g. Daily EOD → record + send",
      },
    },
  },
  ProNode: {
    Icon: Scale,
    accent: "from-sky-300/40 to-indigo-300/40",
    intro: "ProNode",
    greeting:
      "Welcome. I'm Lino — your case-context co-pilot. We'll get you into deep work in three quiet steps.",
    steps: {
      stackSync: {
        title: "Sync your professional stack",
        helper:
          "Knowledge base, comms, specialty tools. ProNode keeps citations and case context one click away.",
        suggestions: [
          "Notion",
          "Google Drive",
          "Slack",
          "Gmail",
          "Clio (Legal)",
          "Epic (Medical)",
          "Jira",
        ],
      },
      kpiSetup: {
        title: "Choose your case signals",
        helper:
          "What keeps you protected and on top of the matter?",
        suggestions: [
          "Open matters",
          "Deadlines (7 days)",
          "Citations cached",
          "Billable hours",
          "Awaiting review",
          "Conflicts flagged",
        ],
      },
      firstWorkflow: {
        title: "Name your first focus rule",
        helper:
          "When should ProNode protect your deep work?",
        placeholder: "e.g. New matter → 90 min deep work block",
      },
    },
  },
};

type Props = {
  node: ActiveNodeName;
};

export default function LinoOnboarding({ node }: Props) {
  const router = useRouter();
  const content = CONTENT[node];
  const Icon = content.Icon;

  const [stepIdx, setStepIdx] = useState(0);
  const [stackSelections, setStackSelections] = useState<string[]>([]);
  const [kpiSelections, setKpiSelections] = useState<string[]>([]);
  const [workflowName, setWorkflowName] = useState("");
  const [savingStep, setSavingStep] = useState<NodeOnboardingStep | null>(null);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const persistStep = useCallback(
    async (step: NodeOnboardingStep) => {
      if (DEV_FRESH_SESSION) return;
      setSavingStep(step);
      try {
        const res = await fetch("/api/user-state/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node, step }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            typeof body?.message === "string"
              ? body.message
              : `SAVE_${res.status}`;
          throw new Error(msg);
        }
      } catch (e) {
        setErrorMessage(
          e instanceof Error ? e.message : "Could not save this step."
        );
        throw e;
      } finally {
        setSavingStep(null);
      }
    },
    [node]
  );

  const advance = useCallback(async () => {
    const step = NODE_ONBOARDING_STEPS[stepIdx];
    setErrorMessage(null);
    try {
      await persistStep(step);
    } catch {
      return;
    }
    setStepIdx((i) => Math.min(i + 1, NODE_ONBOARDING_STEPS.length));
  }, [stepIdx, persistStep]);

  const finish = useCallback(async () => {
    setCompleting(true);
    setErrorMessage(null);
    try {
      if (!DEV_FRESH_SESSION) {
        const res = await fetch("/api/user-state/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node, completed: true }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            typeof body?.message === "string"
              ? body.message
              : `COMPLETE_${res.status}`;
          throw new Error(msg);
        }
      }

      // Optionally persist the named workflow as the first real automation.
      if (!DEV_FRESH_SESSION && workflowName.trim()) {
        await fetch("/api/user-state/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workflowName.trim(),
            triggerNode: node,
            triggerCondition: "Created during onboarding — refine in Workflows.",
            actionNode:
              node === "HomeNode" ? "VANode" : "HomeNode",
            actionLabel: "Open downstream node",
            enabled: true,
          }),
        }).catch(() => undefined);
      }

      router.replace(NODE_ROUTE[node]);
      window.dispatchEvent(new CustomEvent("lifenode:onboarding:changed"));
    } catch (e) {
      setErrorMessage(
        e instanceof Error
          ? e.message
          : "Could not finalize onboarding. Try again."
      );
    } finally {
      setCompleting(false);
    }
  }, [node, router, workflowName]);

  const toggleStack = (label: string) =>
    setStackSelections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  const toggleKpi = (label: string) =>
    setKpiSelections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );

  const progress = useMemo(() => {
    return Math.min(100, Math.round((stepIdx / NODE_ONBOARDING_STEPS.length) * 100));
  }, [stepIdx]);

  const stepNumberLabel = `Step ${Math.min(stepIdx + 1, NODE_ONBOARDING_STEPS.length)} of ${NODE_ONBOARDING_STEPS.length}`;
  const stepName =
    NODE_ONBOARDING_STEP_LABEL[
      NODE_ONBOARDING_STEPS[
        Math.min(stepIdx, NODE_ONBOARDING_STEPS.length - 1)
      ]
    ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 pb-12 pt-[calc(var(--ln-node-nav-chrome-block)+2rem)] text-slate-100">
      <style>{`
        @keyframes ln-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%      { transform: scale(1.06); opacity: 1; }
        }
        @keyframes ln-aurora {
          0%   { transform: translate3d(-10%, -8%, 0) scale(1); opacity: 0.55; }
          50%  { transform: translate3d(8%, 6%, 0) scale(1.08); opacity: 0.85; }
          100% { transform: translate3d(-10%, -8%, 0) scale(1); opacity: 0.55; }
        }
        .ln-breathe { animation: ln-breathe 5s ease-in-out infinite; }
        .ln-aurora  { animation: ln-aurora 14s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div
          className={`ln-aurora absolute -top-32 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-br ${content.accent} blur-3xl`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(56,189,248,0.08),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="ln-breathe relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-cyan-200" />
            <Icon className="h-9 w-9 text-slate-100" strokeWidth={1.6} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {content.intro} setup · {stepNumberLabel}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-50 md:text-4xl">
            {content.greeting}
          </h1>
        </header>

        {/* Glassmorphism progress bar */}
        <div className="mx-auto mb-10 w-full max-w-xl">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>{stepName}</span>
            <span>{progress}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300/80 to-indigo-300/80 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <main className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-9">
          {stepIdx === 0 && (
            <StepBlock
              title={content.steps.stackSync.title}
              helper={content.steps.stackSync.helper}
            >
              <SuggestionGrid
                options={content.steps.stackSync.suggestions}
                selected={stackSelections}
                onToggle={toggleStack}
              />
              <AppCategoryRequestFooter
                category="Your stack"
                nodeLabel={content.intro}
                variant="dark"
                className="mt-4"
              />
            </StepBlock>
          )}

          {stepIdx === 1 && (
            <StepBlock
              title={content.steps.kpiSetup.title}
              helper={content.steps.kpiSetup.helper}
            >
              <SuggestionGrid
                options={content.steps.kpiSetup.suggestions}
                selected={kpiSelections}
                onToggle={toggleKpi}
              />
            </StepBlock>
          )}

          {stepIdx === 2 && (
            <StepBlock
              title={content.steps.firstWorkflow.title}
              helper={content.steps.firstWorkflow.helper}
            >
              <input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder={content.steps.firstWorkflow.placeholder}
                maxLength={120}
                className="w-full rounded-2xl border border-white/15 bg-slate-900/60 px-5 py-4 text-base text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              />
              <p className="mt-3 text-xs text-slate-400">
                You can refine triggers and actions later in the Workflows hub.
              </p>
            </StepBlock>
          )}

          {errorMessage ? (
            <p className="mt-6 text-sm text-rose-300">{errorMessage}</p>
          ) : null}

          <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push(`/shell`)}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-200"
            >
              Skip back to Hub
            </button>
            {stepIdx < NODE_ONBOARDING_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={advance}
                disabled={
                  savingStep === NODE_ONBOARDING_STEPS[stepIdx] ||
                  (stepIdx === 0 && stackSelections.length === 0) ||
                  (stepIdx === 1 && kpiSelections.length === 0)
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#24364d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={completing}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 to-indigo-300 px-5 py-3 text-sm font-bold text-slate-900 shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {completing ? "Finalizing..." : "Enter " + content.intro}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>

        <p className="mt-8 text-center text-xs text-slate-500">
          Hat: {content.intro} · /onboarding/{ACTIVE_TO_HAT_KEY[node]}
        </p>
      </div>
    </div>
  );
}

function StepBlock({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function SuggestionGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition ${
              isOn
                ? "border-indigo-300/50 bg-indigo-300/15 text-white"
                : "border-white/12 bg-white/[0.03] text-slate-300 hover:border-white/25"
            }`}
          >
            <span className="truncate">{opt}</span>
            {isOn ? (
              <CheckCircle2 className="h-4 w-4 text-indigo-200" />
            ) : (
              <Plus className="h-4 w-4 text-slate-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
