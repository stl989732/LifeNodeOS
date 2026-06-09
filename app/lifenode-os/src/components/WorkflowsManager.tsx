"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Briefcase,
  HeartPulse,
  Home,
  MessageSquare,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { DEV_FRESH_SESSION } from "@/lib/dev-flags";

type ActiveNodeName =
  | "BizNode"
  | "HomeNode"
  | "VitalNode"
  | "TraderNode"
  | "VANode"
  | "ProNode";

type WorkflowDefinition = {
  id: string;
  name: string;
  triggerNode: ActiveNodeName;
  triggerCondition: string;
  actionNode: ActiveNodeName;
  actionLabel: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const NODE_META: Record<
  ActiveNodeName,
  { label: string; Icon: typeof Briefcase; tone: string }
> = {
  BizNode: { label: "BizNode", Icon: Briefcase, tone: "text-cyan-200" },
  HomeNode: { label: "HomeNode", Icon: Home, tone: "text-emerald-200" },
  VitalNode: { label: "VitalNode", Icon: HeartPulse, tone: "text-rose-200" },
  TraderNode: { label: "TraderNode", Icon: TrendingUp, tone: "text-amber-200" },
  VANode: { label: "VANode", Icon: MessageSquare, tone: "text-indigo-200" },
  ProNode: { label: "ProNode", Icon: Scale, tone: "text-sky-200" },
};

const ACTIVE_NODES: ActiveNodeName[] = [
  "BizNode",
  "HomeNode",
  "VitalNode",
  "TraderNode",
  "VANode",
  "ProNode",
];

type DraftWorkflow = {
  name: string;
  triggerNode: ActiveNodeName;
  triggerCondition: string;
  actionNode: ActiveNodeName;
  actionLabel: string;
};

const EMPTY_DRAFT: DraftWorkflow = {
  name: "",
  triggerNode: "BizNode",
  triggerCondition: "",
  actionNode: "VANode",
  actionLabel: "",
};

export default function WorkflowsManager() {
  const router = useRouter();
  const { status } = useSession();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftWorkflow>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/shell/workflows");
    }
  }, [status, router]);

  const fetchWorkflows = useCallback(async () => {
    if (DEV_FRESH_SESSION) {
      setWorkflows((prev) => prev ?? []);
      setLoadError(null);
      return;
    }
    try {
      const res = await fetch("/api/user-state/workflows", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`LOAD_${res.status}`);
      const data = (await res.json()) as { workflows: WorkflowDefinition[] };
      setWorkflows(data.workflows ?? []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "LOAD_FAILED");
      setWorkflows([]);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchWorkflows();
  }, [status, fetchWorkflows]);

  const validation = useMemo(() => {
    if (!draft.name.trim()) return "Name is required.";
    if (!draft.triggerCondition.trim())
      return "Describe what should trigger this workflow.";
    if (!draft.actionLabel.trim())
      return "Give the downstream action a short label.";
    if (draft.triggerNode === draft.actionNode)
      return "Trigger and action must be different nodes.";
    return null;
  }, [draft]);

  const submitDraft = async () => {
    if (validation) {
      setCreateError(validation);
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      if (DEV_FRESH_SESSION) {
        const now = new Date().toISOString();
        const ephemeral: WorkflowDefinition = {
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: draft.name.trim(),
          triggerNode: draft.triggerNode,
          triggerCondition: draft.triggerCondition.trim(),
          actionNode: draft.actionNode,
          actionLabel: draft.actionLabel.trim(),
          enabled: true,
          createdAt: now,
          updatedAt: now,
        };
        setWorkflows((prev) => (prev ? [...prev, ephemeral] : [ephemeral]));
        setDraft(EMPTY_DRAFT);
        return;
      }

      const res = await fetch("/api/user-state/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: draft.name.trim(),
          triggerNode: draft.triggerNode,
          triggerCondition: draft.triggerCondition.trim(),
          actionNode: draft.actionNode,
          actionLabel: draft.actionLabel.trim(),
          enabled: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `CREATE_${res.status}`);
      }
      const { workflow } = (await res.json()) as {
        workflow: WorkflowDefinition;
      };
      setWorkflows((prev) => (prev ? [...prev, workflow] : [workflow]));
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "CREATE_FAILED");
    } finally {
      setCreating(false);
    }
  };

  const removeWorkflow = async (id: string) => {
    setDeletingId(id);
    try {
      if (DEV_FRESH_SESSION) {
        setWorkflows((prev) => (prev ? prev.filter((w) => w.id !== id) : []));
        return;
      }
      const res = await fetch(`/api/user-state/workflows/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`DELETE_${res.status}`);
      const data = (await res.json()) as { workflows: WorkflowDefinition[] };
      setWorkflows(data.workflows ?? []);
    } catch {
      // Re-fetch as a recovery so the UI stays accurate even on partial failure.
      await fetchWorkflows();
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || workflows === null) {
    return <div className="min-h-screen bg-[#0B0F17]" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.55),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.18),transparent_45%)]" />

      <div className="relative mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/shell")}
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Unified Hub
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
              Workflows
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Author cross-node automations that route signals between your
              hats. Each workflow is stored against your account and surfaces
              wherever its trigger node fires.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-wide text-slate-300">
            <Workflow className="h-3.5 w-3.5 text-cyan-200" />
            {workflows.length} configured
          </div>
        </header>

        {loadError ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Could not load workflows ({loadError}). Showing the empty list.
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl md:p-8">
          <h2 className="text-lg font-bold text-slate-100">Create workflow</h2>
          <p className="mt-1 text-sm text-slate-400">
            Trigger node observes a condition; action node receives the
            handoff.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Name
              </span>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Lead overflow → VA triage"
                maxLength={120}
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Action label
              </span>
              <input
                value={draft.actionLabel}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, actionLabel: e.target.value }))
                }
                placeholder="e.g. Open VANode triage"
                maxLength={120}
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Trigger node
              </span>
              <select
                value={draft.triggerNode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    triggerNode: e.target.value as ActiveNodeName,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              >
                {ACTIVE_NODES.map((n) => (
                  <option key={n} value={n}>
                    {NODE_META[n].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Action node
              </span>
              <select
                value={draft.actionNode}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    actionNode: e.target.value as ActiveNodeName,
                  }))
                }
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              >
                {ACTIVE_NODES.map((n) => (
                  <option key={n} value={n}>
                    {NODE_META[n].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Trigger condition
              </span>
              <textarea
                value={draft.triggerCondition}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    triggerCondition: e.target.value,
                  }))
                }
                rows={3}
                maxLength={500}
                placeholder="e.g. Unread leads exceed 5 and last follow-up is older than 2 hours."
                className="w-full resize-y rounded-xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-400 transition focus:ring-2"
              />
            </label>
          </div>

          {createError ? (
            <p className="mt-4 text-sm text-rose-300">{createError}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setCreateError(null);
              }}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.07]"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={submitDraft}
              disabled={creating || Boolean(validation)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1E293B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#24364d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {creating ? "Saving..." : "Add workflow"}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Saved workflows
          </h2>

          {workflows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center text-sm text-slate-400">
              No workflows yet. Use the form above to wire your first
              cross-node automation.
            </div>
          ) : (
            <ul className="space-y-3">
              {workflows.map((wf) => {
                const Trigger = NODE_META[wf.triggerNode];
                const Action = NODE_META[wf.actionNode];
                const TriggerIcon = Trigger.Icon;
                const ActionIcon = Action.Icon;
                return (
                  <li
                    key={wf.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-100">
                        {wf.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {wf.triggerCondition}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-300">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                          <TriggerIcon className={`h-3.5 w-3.5 ${Trigger.tone}`} />
                          Trigger · {Trigger.label}
                        </span>
                        <span className="text-slate-500">→</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                          <ActionIcon className={`h-3.5 w-3.5 ${Action.tone}`} />
                          {wf.actionLabel} · {Action.label}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 ${
                            wf.enabled
                              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                              : "border-slate-300/20 bg-slate-300/5 text-slate-400"
                          }`}
                        >
                          {wf.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWorkflow(wf.id)}
                      disabled={deletingId === wf.id}
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50 md:self-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === wf.id ? "Removing..." : "Remove"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
