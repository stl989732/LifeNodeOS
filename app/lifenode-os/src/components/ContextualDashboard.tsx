"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HardHat,
  Hash,
  Mail,
  PlugZap,
  Sparkles,
  Workflow,
} from "lucide-react";

type ProjectStatus = "planning" | "in-progress" | "blocked" | "complete";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  progressPercent: number;
  pendingApprovals: number;
  updatedAt: string;
};

const STATUS_TONE: Record<ProjectStatus, { label: string; tone: string }> = {
  planning: {
    label: "Planning",
    tone: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  },
  "in-progress": {
    label: "In progress",
    tone: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  },
  blocked: {
    label: "Blocked",
    tone: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  },
  complete: {
    label: "Complete",
    tone: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  },
};

const INTEGRATION_PROMPTS = [
  {
    label: "Connect Gmail",
    sub: "Surface waiting approvals + flag urgent threads.",
    Icon: Mail,
  },
  {
    label: "Connect Slack",
    sub: "Watch high-priority client pings without opening Slack.",
    Icon: Hash,
  },
  {
    label: "Connect your toolchain",
    sub: "ClickUp, Notion, HubSpot, Stripe — any of your existing apps.",
    Icon: PlugZap,
  },
];

export default function ContextualDashboard({
  displayName,
  projects,
}: {
  displayName: string | null;
  projects: Project[];
}) {
  const hasProjects = projects.length > 0;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,41,59,0.65),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.18),transparent_45%)]" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        {hasProjects ? (
          <ConstructionPulseHeader
            displayName={displayName}
            projects={projects}
          />
        ) : (
          <EmptyStateHeader displayName={displayName} />
        )}
      </div>
    </div>
  );
}

function ConstructionPulseHeader({
  displayName,
  projects,
}: {
  displayName: string | null;
  projects: Project[];
}) {
  const totalApprovals = projects.reduce(
    (acc, p) => acc + p.pendingApprovals,
    0
  );
  const blocked = projects.filter((p) => p.status === "blocked").length;
  return (
    <>
      <header className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              <HardHat className="h-3.5 w-3.5" />
              Construction Pulse
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
              Welcome back, {displayName || "Operator"}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              {projects.length} project{projects.length === 1 ? "" : "s"} live ·{" "}
              {totalApprovals} pending approval{totalApprovals === 1 ? "" : "s"}{" "}
              · {blocked} blocked
            </p>
          </div>
          {totalApprovals > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {totalApprovals} need you
            </span>
          ) : null}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Active projects
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => {
            const meta = STATUS_TONE[p.status];
            return (
              <li
                key={p.id}
                className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-5 backdrop-blur-2xl"
              >
                <div className="absolute inset-x-0 top-0 h-1.5 overflow-hidden bg-white/[0.04] backdrop-blur-md">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-300/80 to-indigo-300/80 transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, p.progressPercent))}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-100">
                      {p.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(p.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.tone}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-slate-300">
                  <span>{p.progressPercent}% complete</span>
                  {p.pendingApprovals > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-amber-200">
                      <AlertTriangle className="h-3 w-3" />
                      {p.pendingApprovals} pending approval
                      {p.pendingApprovals === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      No approvals waiting
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function EmptyStateHeader({ displayName }: { displayName: string | null }) {
  const router = useRouter();
  return (
    <>
      <header className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-10">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
          <Sparkles className="h-3.5 w-3.5" />
          Calm Command Center
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
          Welcome, {displayName || "Operator"}.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Your dashboard is quiet right now. Connect the apps that already run
          your work and life — Lino will start surfacing what actually needs
          you.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/shell")}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#24364d]"
          >
            Pick your hats
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/shell/workflows")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            <Workflow className="h-4 w-4" />
            Build a workflow
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Get more out of LifeNode OS
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {INTEGRATION_PROMPTS.map(({ label, sub, Icon }) => (
            <li
              key={label}
              className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 backdrop-blur-md transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-[#1E293B] text-cyan-200">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-100">
                {label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {sub}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
