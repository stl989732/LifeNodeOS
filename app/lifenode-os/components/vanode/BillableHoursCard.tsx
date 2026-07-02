"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  Clock,
  Copy,
  Lock,
  Mail,
  Pause,
  Play,
  Square,
} from "lucide-react";
import type { ClientProfile, Note } from "@/lib/vanode/types";
import { toTitleCase } from "@/lib/vanode/title-case";

function glassCard(className = "") {
  return `rounded-3xl border border-white/40 bg-white/35 shadow-lg backdrop-blur-md ${className}`;
}
import { usePlanEntitlements } from "@/src/context/PlanEntitlementsContext";
import { planHasBillableHours } from "@/src/lib/billing/planFeatureCopy";
import {
  formatBillableDecimalHours,
  formatBillableHours,
  formatBillableCountdown,
  liveActiveMs,
  liveBreakRemainingMs,
  vaultNoteBodyForSession,
  type BillableBreakKind,
  type BillableSession,
} from "@/src/lib/vanode/billableHours";

function playBreakAlarm() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    const t = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.stop(t + 0.45);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.frequency.value = 988;
      g2.gain.value = 0.15;
      osc2.start();
      const t2 = ctx.currentTime;
      g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.5);
      osc2.stop(t2 + 0.55);
    }, 500);
  } catch {
    /* ignore */
  }
}

async function fetchSessions(date?: string): Promise<BillableSession[]> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/vanode/billable-sessions${q}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { sessions?: BillableSession[] };
  return data.sessions ?? [];
}

async function startSession(
  clientId: string,
  clientName: string,
): Promise<BillableSession | null> {
  const res = await fetch("/api/vanode/billable-sessions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", clientId, clientName }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { session?: BillableSession };
  return data.session ?? null;
}

async function patchSession(
  id: string,
  body: Record<string, unknown>,
): Promise<BillableSession | null> {
  const res = await fetch(`/api/vanode/billable-sessions/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { session?: BillableSession };
  return data.session ?? null;
}

type Props = {
  clients: ClientProfile[];
  activeClientId: string | null;
  onSaveVaultNote: (n: Omit<Note, "id" | "updatedAt">) => void;
};

export default function BillableHoursCard({
  clients,
  activeClientId,
  onSaveVaultNote,
}: Props) {
  const { plan, promptUpgradeMessage } = usePlanEntitlements();
  const unlocked = planHasBillableHours(plan);
  const [sessions, setSessions] = useState<BillableSession[]>([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const alarmedRef = useRef<Set<string>>(new Set());

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reload = useCallback(async () => {
    if (!unlocked) return;
    const list = await fetchSessions(today);
    setSessions(list);
  }, [today, unlocked]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!unlocked) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    const hasActive = sessions.some((s) =>
      ["active", "break_15", "break_30", "break_60"].includes(s.status),
    );
    if (!hasActive) return;
    const id = setInterval(() => void reload(), 30_000);
    return () => clearInterval(id);
  }, [sessions, reload, unlocked]);

  useEffect(() => {
    void tick;
    for (const s of sessions) {
      if (!["break_15", "break_30", "break_60"].includes(s.status)) continue;
      const remaining = liveBreakRemainingMs(s);
      if (remaining <= 0 && !alarmedRef.current.has(s.id)) {
        alarmedRef.current.add(s.id);
        playBreakAlarm();
      }
    }
  }, [tick, sessions]);

  const focusClient = clients.find((c) => c.id === activeClientId) ?? null;
  const focusSession = focusClient
    ? sessions.find(
        (s) =>
          s.clientId === focusClient.id &&
          s.workDate === today &&
          s.status !== "ended",
      )
    : null;

  const activeSessions = sessions.filter((s) =>
    ["active", "break_15", "break_30", "break_60"].includes(s.status),
  );

  const endedToday = sessions.filter(
    (s) => s.status === "ended" && s.workDate === today,
  );

  const shareUrlFor = (token: string) => {
    if (typeof window === "undefined") return `/vanode/time/${token}`;
    return `${window.location.origin}/vanode/time/${token}`;
  };

  const copyShare = async (session: BillableSession) => {
    let token = session.shareToken;
    if (!token) {
      const next = await patchSession(session.id, { action: "share_link" });
      if (!next?.shareToken) return;
      token = next.shareToken;
      setSessions((prev) =>
        prev.map((x) => (x.id === next.id ? next : x)),
      );
    }
    const url = shareUrlFor(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(session.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const mailClientLink = (session: BillableSession) => {
    void copyShare(session).then(() => {
      const url = session.shareToken
        ? shareUrlFor(session.shareToken)
        : "";
      const subject = encodeURIComponent(
        `Billable hours · ${session.clientName} · ${session.workDate}`,
      );
      const body = encodeURIComponent(
        `Hi,\n\nHere is today's billable time summary:\n${url}\n\n— sent via LifeNode VANode`,
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    });
  };

  const runBreak = async (kind: BillableBreakKind) => {
    if (!focusSession) return;
    setBusy(true);
    const next = await patchSession(focusSession.id, {
      action: "break",
      minutes: kind,
    });
    setBusy(false);
    if (next) {
      alarmedRef.current.delete(next.id);
      setSessions((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    }
  };

  const runResume = async () => {
    if (!focusSession) return;
    setBusy(true);
    const next = await patchSession(focusSession.id, { action: "resume" });
    setBusy(false);
    if (next) {
      alarmedRef.current.delete(next.id);
      setSessions((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    }
  };

  const runEnd = async () => {
    if (!focusSession) return;
    setBusy(true);
    const next = await patchSession(focusSession.id, { action: "end" });
    setBusy(false);
    if (next) {
      onSaveVaultNote({
        title: `Billable hours · ${next.clientName} · ${next.workDate}`,
        body: vaultNoteBodyForSession(next),
        clientId: next.clientId,
        labels: ["billable", "timetracker"],
      });
      setSessions((prev) => prev.map((x) => (x.id === next.id ? next : x)));
    }
  };

  const runStart = async () => {
    if (!focusClient) return;
    setBusy(true);
    const next = await startSession(focusClient.id, focusClient.name);
    setBusy(false);
    if (next) setSessions((prev) => [next, ...prev.filter((x) => x.id !== next.id)]);
    else await reload();
  };

  const lockedOverlay = !unlocked ? (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-slate-900/75 p-6 text-center backdrop-blur-sm">
      <Lock className="mb-2 h-8 w-8 text-amber-300" />
      <p className="text-sm font-semibold text-white">
        Billable hours timetracker
      </p>
      <p className="mt-1 max-w-xs text-xs text-slate-300">
        Available on <span className="font-bold text-teal-300">Sync</span> and
        Nexus. Start/pause breaks, share read-only links, and feed EOD invoices.
      </p>
      <button
        type="button"
        className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
        onClick={() =>
          promptUpgradeMessage({
            title: "Unlock billable hours",
            message:
              "Sync adds multi-client timetracking with break alarms, client share links, and EOD invoice hooks.",
          })
        }
      >
        View Sync plan
      </button>
    </div>
  ) : null;

  const displayMs = focusSession ? liveActiveMs(focusSession) : 0;
  const onBreak = focusSession
    ? ["break_15", "break_30", "break_60"].includes(focusSession.status)
    : false;
  const breakLeft = focusSession ? liveBreakRemainingMs(focusSession) : 0;

  return (
    <section className={`relative ${glassCard("p-6 md:p-7")}`}>
      {lockedOverlay}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Clock className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
            {toTitleCase("Billable hours · timetracker")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Start your workday manually — 15m break, 30m or 1h lunch with alarm.
            Logs are immutable and sync to Smart Vault + EOD invoices.
          </p>
          {!unlocked ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              <Lock className="h-3 w-3" /> Sync plan
            </p>
          ) : null}
        </div>
      </div>

      {focusClient ? (
        <div className="mb-4 rounded-2xl border border-teal-200/60 bg-teal-50/40 p-4">
          <div className="text-xs font-bold uppercase text-teal-800">
            {focusClient.name}
          </div>
          <div className="mt-2 font-[family-name:var(--font-outfit)] text-3xl font-bold tabular-nums text-slate-900">
            {formatBillableHours(displayMs)}
          </div>
          {onBreak ? (
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-amber-800">
              <AlarmClock className="h-4 w-4" />
              Break — back in {formatBillableCountdown(breakLeft)}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {!focusSession ? (
              <button
                type="button"
                disabled={busy || !unlocked}
                onClick={() => void runStart()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start workday
              </button>
            ) : focusSession.status === "active" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBreak("15")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  15m break
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBreak("30")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  30m lunch
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBreak("60")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  1h lunch
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runEnd()}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                >
                  <Square className="h-3.5 w-3.5" />
                  End day
                </button>
              </>
            ) : onBreak ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runResume()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              >
                <Play className="h-4 w-4" />
                Resume work
              </button>
            ) : null}

            {focusSession ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void copyShare(focusSession)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === focusSession.id ? "Copied!" : "Copy client link"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mailClientLink(focusSession)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email link
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-slate-600">
          Select a client in the bar above to start billable time for their focus
          card.
        </p>
      )}

      {activeSessions.length > 1 ? (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">
            All active today ({activeSessions.length})
          </h3>
          <ul className="space-y-2">
            {activeSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{s.clientName}</span>
                <span className="tabular-nums text-slate-600">
                  {formatBillableHours(liveActiveMs(s))}
                  {["break_15", "break_30", "break_60"].includes(s.status) ? (
                    <Pause className="ml-1 inline h-3.5 w-3.5 text-amber-600" />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {endedToday.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">
            Closed today
          </h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {endedToday.map((s) => (
              <li key={s.id}>
                {s.clientName}: {formatBillableDecimalHours(s.accumulatedActiveMs)}{" "}
                hrs
                {s.shareToken ? (
                  <Link
                    href={`/vanode/time/${s.shareToken}`}
                    className="ml-2 text-teal-700 underline"
                    target="_blank"
                  >
                    Share view
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}