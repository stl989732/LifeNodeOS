"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DEMO_DEAL_TRIAGE,
  demoDealToCard,
  parseBizDealTriageCard,
  resolveTriageSourcePresentation,
  type BizDealTriageCard,
} from "@/src/lib/bizNode/dealTriage";

const URGENCY_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-500/20 text-rose-300",
  HIGH: "bg-emerald-500/20 text-emerald-400",
  MEDIUM: "bg-amber-500/20 text-amber-200",
  LOW: "bg-slate-500/20 text-slate-400",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DealTriageFeed() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState<BizDealTriageCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (status !== "authenticated" || !session?.user?.id) {
      setLoading(false);
      setDemoMode(true);
      setLoadError(null);
      setRows(
        DEMO_DEAL_TRIAGE.map((d, i) =>
          demoDealToCard(
            d,
            `demo-${i}`,
            "demo",
            new Date(Date.now() - i * 3600000).toISOString(),
          ),
        ),
      );
      hasLoadedOnce.current = true;
      return;
    }
    if (!background || !hasLoadedOnce.current) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const res = await fetch("/api/triage", {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          typeof body?.error === "string"
            ? body.error
            : "Could not load deal triage feed.";
        throw new Error(msg);
      }

      const cards = Array.isArray(body.records)
        ? body.records.map((row: Record<string, unknown>) =>
            parseBizDealTriageCard(row),
          )
        : [];

      setDemoMode(false);
      setRows(cards);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not load deal triage feed.";
      setLoadError(msg);
      if (!hasLoadedOnce.current) {
        setDemoMode(false);
        setRows([]);
      }
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [session?.user?.id, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onSynced = () => {
      void load();
    };
    window.addEventListener("lifenode:biznode-sync-complete", onSynced);
    return () => window.removeEventListener("lifenode:biznode-sync-complete", onSynced);
  }, [load]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  async function handleArchiveCard(id: string) {
    if (demoMode || status !== "authenticated") return;
    const previous = rows;
    setRows((prev) => prev.filter((row) => row.id !== id));
    setContextMenu(null);
    try {
      const res = await fetch(`/api/triage/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Could not archive card.",
        );
      }
    } catch (err) {
      setRows(previous);
      window.alert(
        err instanceof Error ? err.message : "Could not archive card.",
      );
    }
  }

  async function handleDeleteCard(id: string) {
    if (demoMode || status !== "authenticated") return;
    if (
      !window.confirm(
        "Permanently delete this lead card? This cannot be undone.",
      )
    ) {
      return;
    }
    const previous = rows;
    setRows((prev) => prev.filter((row) => row.id !== id));
    setContextMenu(null);
    try {
      const res = await fetch(`/api/triage/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Could not delete card.",
        );
      }
    } catch (err) {
      setRows(previous);
      window.alert(
        err instanceof Error ? err.message : "Could not delete card.",
      );
    }
  }

  async function handleResync() {
    if (status !== "authenticated") {
      window.alert("Sign in to sync CRM data.");
      return;
    }
    setResyncing(true);
    try {
      const res = await fetch("/api/biznode/sync", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : "CRM sync failed.";
        window.alert(msg);
        return;
      }
      await load();
    } catch {
      window.alert("Could not reach the sync service.");
    } finally {
      setResyncing(false);
    }
  }

  async function handleSimulatedLeadSubmit(name: string, intakeNotes: string) {
    console.log("Simulating dynamic intake event...", name);

    const response = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        leadName: name,
        rawNotes: intakeNotes,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("AI Triage complete! Row written:", result.record);
      return result.record as Record<string, unknown> | undefined;
    } else {
      const errBody = await response.json().catch(() => ({}));
      const msg =
        typeof errBody?.error === "string"
          ? errBody.error
          : "Failed to run pipeline simulation.";
      console.error("Failed to run pipeline simulation.", msg);
      throw new Error(msg);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim()) return;
    if (status !== "authenticated" || !session?.user?.id) {
      window.alert("Sign in to persist leads to your Deal-Triage feed.");
      return;
    }
    setSaving(true);
    try {
      const record = await handleSimulatedLeadSubmit(
        leadName.trim(),
        notes.trim() || "New lead — awaiting Linos intent scan.",
      );
      setLeadName("");
      setNotes("");
      setDemoMode(false);
      if (record) {
        const card = parseBizDealTriageCard(record);
        setRows((prev) => [card, ...prev.filter((row) => row.id !== card.id)]);
      }
      void load({ background: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save lead.";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="biz-deal-glass rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">AI Deal-Triage Feed</h2>
          <p className="text-xs text-slate-300">
            Linos scans intake notes and tags intent so you know who to call first.
            Archive completed leads or delete noise — right-click any card for both options.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResync}
            disabled={resyncing || loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
            Discovery Resync Hub
          </button>
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
            <Sparkles className="h-3 w-3" />
            Linos intent scoring
          </span>
        </div>
      </div>

      <form
        onSubmit={handleAddLead}
        className="mt-4 rounded-2xl border border-white/10 bg-slate-900/35 p-3 backdrop-blur-sm"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Simulate CRM intake
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            placeholder="Lead name"
            className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-cyan-400/30 focus:ring-2"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Intake notes (Meta form, funnel, etc.)"
            className="flex-[2] rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-cyan-400/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={saving || !leadName.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add lead
          </button>
        </div>
      </form>

      {demoMode && !loading ? (
        <p className="mt-3 text-[11px] text-slate-500">
          Showing sample pipeline cards — sign in to sync your live Supabase feed.
        </p>
      ) : null}

      {loadError && !loading ? (
        <p className="mt-3 text-[11px] text-rose-300">{loadError}</p>
      ) : null}

      {!loading && !demoMode && rows.length === 0 && !loadError ? (
        <p className="mt-3 text-[11px] text-slate-500">
          No leads yet — add one above to populate your Deal-Triage feed.
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading deal triage…
        </div>
      ) : (
        <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {rows.map((deal) => {
            const urgency = (
              deal.metadata?.urgency_score ?? "MEDIUM"
            ).toUpperCase();
            const source = resolveTriageSourcePresentation(
              deal.source_provider,
              deal.raw_notes_or_payload,
            );
            const actionHint =
              deal.metadata?.linos_action ?? source.actionHint;

            return (
              <li
                key={deal.id}
                className="group rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-sm transition hover:border-white/20"
                onContextMenu={(e) => {
                  if (demoMode) return;
                  e.preventDefault();
                  setContextMenu({ id: deal.id, x: e.clientX, y: e.clientY });
                }}
              >
                <div className="rounded-xl bg-slate-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-white">
                        {deal.metadata?.lead_name || "Unknown Lead"}
                      </h4>
                      <span
                        className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${source.badgeClass}`}
                      >
                        {source.badgeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                          URGENCY_STYLES[urgency] ?? URGENCY_STYLES.MEDIUM
                        }`}
                      >
                        {deal.metadata?.urgency_score || "MEDIUM"}
                      </span>
                      {!demoMode ? (
                        <>
                          <button
                            type="button"
                            title="Archive (keeps history for metrics)"
                            onClick={() => void handleArchiveCard(deal.id)}
                            className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete permanently"
                            onClick={() => void handleDeleteCard(deal.id)}
                            className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {deal.source_provider ?? "CRM"} ·{" "}
                    {deal.kanban_column ?? deal.status ?? "intake"} ·{" "}
                    {formatWhen(deal.created_at)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {deal.metadata?.ai_summary || deal.raw_notes_or_payload}
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-cyan-200/90">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                    {actionHint}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[180px] rounded-xl border border-white/15 bg-slate-950/95 py-1 shadow-xl backdrop-blur-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
            onClick={() => void handleArchiveCard(contextMenu.id)}
          >
            <Archive className="h-4 w-4 text-emerald-400" />
            Archive card
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
            onClick={() => void handleDeleteCard(contextMenu.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete forever
          </button>
        </div>
      ) : null}
    </div>
  );
}
