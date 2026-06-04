"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Check,
  Download,
  Eye,
  Gauge,
  Globe2,
  Link2,
  Mic,
  Radio,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useActiveClient } from "./ActiveClientContext";
import { useLiveCapture } from "./LiveCaptureContext";
import { isTranscribableMeetingUrl } from "@/lib/vanode/meetingUrls";
import { countOverlapHours, overlapWorkHourFlags } from "@/lib/vanode/time-bridge";
import { userTimezone } from "@/lib/vanode/outsource";
import { toTitleCase } from "@/lib/vanode/title-case";
import type { ClientProfile, ValueMetrics, LiveTranscriptSession, VanodePersisted } from "@/lib/vanode/types";
import { COMMON_TIMEZONES } from "@/lib/vanode/constants";

function glassCard(className = "") {
  return `rounded-3xl border border-white/45 bg-white/50 shadow-xl shadow-slate-900/[0.04] backdrop-blur-xl ${className}`;
}

export function GlobalClientSwitcherBar({
  onOpenClientView,
  onAddClient,
  settings,
  onPatchSettings,
}: {
  onOpenClientView: () => void;
  onAddClient: (c: Omit<ClientProfile, "id">) => void;
  settings: VanodePersisted["settings"];
  onPatchSettings: (p: Partial<VanodePersisted["settings"]>) => void;
}) {
  const { activeClientId, setActiveClientId, clients } = useActiveClient();
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const modalGlass =
    "rounded-3xl border border-solid border-white/20 bg-white/75 p-6 shadow-2xl shadow-slate-900/20 backdrop-blur-[20px] dark:border-white/10 dark:bg-[#0c0c0f]/80 dark:text-zinc-100";

  return (
    <div className={`${glassCard("flex flex-col gap-3 p-4 md:p-5")}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4 text-teal-600" />
          Active workspace
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white/50 text-slate-700 shadow-sm transition hover:border-[#00ffc8]/45 hover:bg-[#00ffc8]/10 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200"
            aria-label="VANode settings"
            title="Settings"
          >
            <Settings className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onOpenClientView}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300/60 bg-teal-50/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-teal-900 hover:bg-teal-100/90"
          >
            <Eye className="h-3.5 w-3.5" />
            Client view
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveClientId(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            activeClientId === null
              ? "border-[#00ffc8]/60 bg-[#00ffc8]/15 text-slate-900 shadow-[0_0_14px_rgba(0,255,200,0.2)]"
              : "border-white/40 bg-white/40 text-slate-600 hover:border-[#00ffc8]/40"
          }`}
        >
          All clients
        </button>
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              setActiveClientId(activeClientId === c.id ? null : c.id)
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              activeClientId === c.id
                ? "border-[#00ffc8]/60 bg-[#00ffc8]/15 text-slate-900 shadow-[0_0_14px_rgba(0,255,200,0.2)]"
                : "border-white/40 bg-white/40 text-slate-600 hover:border-[#00ffc8]/40"
            }`}
          >
            {c.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setNewName("");
            setClientModalOpen(true);
          }}
          className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-dashed border-[#00ffc8]/50 bg-white/40 px-3 text-xs font-bold text-teal-900 shadow-[0_0_12px_rgba(0,255,200,0.12)] transition hover:bg-[#00ffc8]/15"
          title="Add client"
        >
          <span className="relative z-[1]">+</span>
        </button>
      </div>
      <p className="text-xs text-slate-600">
        Smart Vault, invoicing, and Waiting On filter to the selected pill.
      </p>

      {clientModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setClientModalOpen(false);
              }}
            >
              <div
                className={`w-full max-w-md ${modalGlass}`}
                role="dialog"
                aria-modal
                aria-labelledby="va-add-client-title"
              >
                <h3
                  id="va-add-client-title"
                  className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900 dark:text-white"
                >
                  Add client
                </h3>
                <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Client name
                  <input
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2.5 text-slate-900 shadow-inner outline-none ring-[#00ffc8]/25 focus:ring-2 dark:bg-white/10 dark:text-white"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Co."
                    autoFocus
                  />
                </label>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200/80 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-zinc-100"
                    onClick={() => setClientModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-teal-600"
                    onClick={() => {
                      const n = newName.trim();
                      if (!n) return;
                      onAddClient({
                        name: n,
                        industry: "General",
                        timezone: settings.defaultClientTimezone,
                      });
                      setClientModalOpen(false);
                      setNewName("");
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {settingsOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[6000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setSettingsOpen(false);
              }}
            >
              <div
                className={`max-h-[90vh] w-full max-w-md overflow-y-auto ${modalGlass}`}
                role="dialog"
                aria-modal
                aria-labelledby="va-settings-title"
              >
                <h3
                  id="va-settings-title"
                  className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-900 dark:text-white"
                >
                  VANode settings
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                  Notification channels and default timezone for new clients.
                </p>

                <div className="mt-5 space-y-4 rounded-2xl border border-white/15 bg-white/40 p-4 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                    Notifications (placeholders)
                  </p>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-800 dark:text-zinc-200">
                    <span>Email digests</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600"
                      checked={settings.vaEmailNotifications}
                      onChange={(e) =>
                        onPatchSettings({
                          vaEmailNotifications: e.target.checked,
                        })
                      }
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-800 dark:text-zinc-200">
                    <span>Slack / Teams pings</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600"
                      checked={settings.vaSlackNotifications}
                      onChange={(e) =>
                        onPatchSettings({
                          vaSlackNotifications: e.target.checked,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Default client timezone
                  <select
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2.5 text-sm text-slate-900 outline-none ring-[#00ffc8]/25 focus:ring-2 dark:bg-white/10 dark:text-white"
                    value={settings.defaultClientTimezone}
                    onChange={(e) =>
                      onPatchSettings({ defaultClientTimezone: e.target.value })
                    }
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                    onClick={() => setSettingsOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type RoiProps = {
  metrics: ValueMetrics;
  onPatchMetrics: (p: Partial<ValueMetrics>) => void;
};

function RoiMetricInput({
  value,
  onChange,
  step = 1,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <input
      type="number"
      min={0}
      step={step}
      className={`w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-2xl font-bold tabular-nums text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 ${className}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseInt(draft, 10);
        onChange(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function ClientRoiCard({ metrics, onPatchMetrics }: RoiProps) {
  const [copied, setCopied] = useState(false);
  const { activeClientId, clients } = useActiveClient();

  const clientViewUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    u.searchParams.set("clientView", "1");
    if (activeClientId) u.searchParams.set("cid", activeClientId);
    else u.searchParams.delete("cid");
    return u.toString();
  }, [activeClientId]);
  const clientName =
    clients.find((c) => c.id === activeClientId)?.name ?? "your client";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientViewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Gauge className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
            {toTitleCase("Client ROI · Value score")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            What was achieved — inbox streaks and time reclaimed (editable for
            demo until CRM sync lands).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
          <div className="text-[10px] font-bold uppercase text-slate-500">
            Triaged
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({
                  inboxTriaged: Math.max(0, metrics.inboxTriaged - 1),
                })
              }
            >
              −
            </button>
            <RoiMetricInput
              value={metrics.inboxTriaged}
              onChange={(n) => onPatchMetrics({ inboxTriaged: n })}
            />
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({ inboxTriaged: metrics.inboxTriaged + 1 })
              }
            >
              +
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Emails sorted / filed</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
          <div className="text-[10px] font-bold uppercase text-slate-500">
            Replied
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({
                  inboxReplied: Math.max(0, metrics.inboxReplied - 1),
                })
              }
            >
              −
            </button>
            <RoiMetricInput
              value={metrics.inboxReplied}
              onChange={(n) => onPatchMetrics({ inboxReplied: n })}
            />
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({ inboxReplied: metrics.inboxReplied + 1 })
              }
            >
              +
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Closed loops</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4">
          <div className="text-[10px] font-bold uppercase text-emerald-900/80">
            Time saved (mo.)
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-emerald-200 px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({
                  hoursSavedThisMonth: Math.max(
                    0,
                    metrics.hoursSavedThisMonth - 1,
                  ),
                })
              }
            >
              −
            </button>
            <RoiMetricInput
              value={metrics.hoursSavedThisMonth}
              onChange={(n) => onPatchMetrics({ hoursSavedThisMonth: n })}
              className="text-emerald-950"
            />
            <button
              type="button"
              className="rounded-lg border border-emerald-200 px-2 py-1 text-xs"
              onClick={() =>
                onPatchMetrics({
                  hoursSavedThisMonth: metrics.hoursSavedThisMonth + 1,
                })
              }
            >
              +
            </button>
          </div>
          <p className="mt-1 text-[11px] text-emerald-900/80">
            “This month, we saved {clientName}{" "}
            <strong>{metrics.hoursSavedThisMonth} hours</strong> of admin work.”
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-900/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Read-only client link
          </span>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <code className="mt-2 block truncate rounded-lg bg-white/70 px-2 py-2 text-[11px] text-slate-700">
          {clientViewUrl}
        </code>
        <p className="mt-2 text-[11px] text-slate-500">
          Send this URL to {clientName}. It opens a calm, read-only proof page
          (no vault edits).
        </p>
      </div>
    </section>
  );
}

export function TimezoneBridgeCard({ client }: { client: ClientProfile | null }) {
  const vaTz = userTimezone();
  const clientTz = client?.timezone ?? "America/New_York";
  const overlap = useMemo(
    () => countOverlapHours(vaTz, clientTz),
    [vaTz, clientTz],
  );
  const hourFlags = useMemo(
    () => overlapWorkHourFlags(vaTz, clientTz),
    [vaTz, clientTz],
  );

  return (
    <section className={glassCard("p-6")}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <Globe2 className="h-5 w-5 text-sky-600" strokeWidth={1.75} />
        {toTitleCase("Timezone bridge")}
      </h2>
      <p className="mb-3 text-xs text-slate-600">
        Next 24h — teal blocks are recommended work overlap (9–17 local each).
      </p>
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between rounded-xl bg-white/60 px-3 py-2">
          <span className="text-slate-500">You (VA)</span>
          <span className="font-mono font-semibold text-slate-900">{vaTz}</span>
        </div>
        <div className="flex justify-between rounded-xl bg-teal-50/60 px-3 py-2">
          <span className="text-teal-900/80">Client</span>
          <span className="font-mono font-semibold text-slate-900">
            {client?.name ?? "Pick a client"} · {clientTz}
          </span>
        </div>
        <div
          className="mt-2 grid gap-0.5"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {hourFlags.map((on, i) => (
            <div
              key={i}
              title={`+${i}h`}
              className={`h-9 rounded-sm ${
                on
                  ? "bg-teal-500/85 shadow-[0_0_10px_rgba(0,255,200,0.35)]"
                  : "bg-slate-200/60"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-center">
          <div className="text-[10px] font-bold uppercase text-sky-800">
            Overlap hours
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-sky-950">
            {overlap}h
          </div>
          <p className="mt-1 text-[11px] text-sky-900/85">
            Stack urgent pings in highlighted windows.
          </p>
        </div>
      </div>
    </section>
  );
}

type LiveProps = {
  onAddVaultNote: (n: {
    title: string;
    body: string;
    clientId: string | null;
    labels: string[];
  }) => void;
  onAddSession: (row: Omit<LiveTranscriptSession, "id">) => string;
  onUpdateSession: (
    id: string,
    patch: Partial<
      Pick<
        LiveTranscriptSession,
        | "endedAt"
        | "transcript"
        | "aiSummary"
        | "cloudQueued"
        | "meetingUrl"
      >
    >,
  ) => void;
};

export function LiveMeetingCaptureCard({
  onAddVaultNote,
  onAddSession,
  onUpdateSession,
}: LiveProps) {
  const { activeClientId } = useActiveClient();
  const live = useLiveCapture();
  const [title, setTitle] = useState("Client sync");
  const [kind, setKind] = useState<"meeting" | "webinar" | "interview" | "other">(
    "meeting",
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedTranscript, setSavedTranscript] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [vaultNotice, setVaultNotice] = useState<string | null>(null);
  const [cloud, setCloud] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const displayTranscript = live.isCapturing
    ? live.transcriptText
    : savedTranscript;

  const startLive = () => {
    const id = onAddSession({
      title,
      kind,
      startedAt: new Date().toISOString(),
      endedAt: null,
      transcript: "",
      aiSummary: null,
      cloudQueued: cloud,
      meetingUrl: meetingUrl.trim() || null,
    });
    setActiveId(id);
    setSavedTranscript("");
    setSummary(null);
    setVaultNotice(null);
    live.setTitle(title);
    live.startCapture(title);
  };

  const stopLive = async () => {
    const sessionId = activeId;
    const transcript = live.transcriptText.trim();
    live.stopCapture();
    setSavedTranscript(transcript);
    setSummarizing(true);
    let ai =
      transcript.length > 0
        ? `Key decisions:\n• ${transcript.slice(0, 280)}${transcript.length > 280 ? "…" : ""}\n\nAction items:\n• Confirm follow-ups in CRM\n• Archive recording under ${title}.`
        : "No transcript captured — try again with mic permission or use demo mode (no browser STT).";
    if (transcript.length > 0) {
      try {
        const res = await fetch("/api/vanode/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "live_summary",
            transcript,
            sessionTitle: title,
          }),
        });
        const data = (await res.json()) as { summary?: string };
        if (res.ok && typeof data.summary === "string" && data.summary.trim()) {
          ai = data.summary.trim();
        }
      } catch {
        /* keep offline recap */
      }
    }
    setSummary(ai);
    setSummarizing(false);
    if (sessionId) {
      onUpdateSession(sessionId, {
        endedAt: new Date().toISOString(),
        transcript,
        aiSummary: ai,
        cloudQueued: cloud,
      });
    }
    setActiveId(null);
  };

  const downloadTxt = () => {
    const body = `${title}\n\n--- Transcript ---\n${displayTranscript}\n\n--- AI recap ---\n${summary ?? ""}`;
    const blob = new Blob([body], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vanode-live-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveVault = () => {
    const transcript = displayTranscript.trim();
    if (!transcript && !summary) return;
    onAddVaultNote({
      title: `Live capture · ${title}`,
      body: `## Transcript\n${transcript || "_(empty)_"}\n\n## AI recap\n${summary ?? "_(none yet — stop capture to generate)_"}`,
      clientId: activeClientId,
      labels: ["live-transcript", kind],
    });
    setVaultNotice("Saved to Smart Vault");
    window.setTimeout(() => setVaultNotice(null), 4000);
  };

  const clearCapture = () => {
    live.clearAll();
    setActiveId(null);
    setSavedTranscript("");
    setSummary(null);
    setVaultNotice(null);
  };

  const transcribeExternalMock = async () => {
    const url = meetingUrl.trim();
    if (!isTranscribableMeetingUrl(url)) return;
    let body = [
      "## Source URL",
      url,
      "",
      "### Purpose",
      "- Capture decisions and owners from the session.",
      "",
      "### Steps",
      "1. Review recording at the URL above.",
      "2. Extract action items → assign in CRM.",
      "3. Archive proof in Smart Vault / EOD.",
    ].join("\n");
    let noteTitle = "SOP Draft · External meeting";
    try {
      const res = await fetch("/api/vanode/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "video_sop", videoUrl: url }),
      });
      const data = (await res.json()) as { markdown?: string; title?: string };
      if (res.ok && typeof data.markdown === "string") {
        body = data.markdown;
        if (typeof data.title === "string" && data.title.trim()) {
          noteTitle = `SOP · ${data.title.trim()}`;
        }
      }
    } catch {
      /* keep template */
    }
    onAddVaultNote({
      title: noteTitle,
      body,
      clientId: activeClientId,
      labels: ["sop", "transcription-mock"],
    });
    setVaultNotice("Saved outline to Smart Vault");
    window.setTimeout(() => setVaultNotice(null), 4000);
  };

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Mic className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
        {toTitleCase("Live meeting · webinar · interview")}
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        Activate when the session starts. The floating Live capture card stays on
        top while you switch VANode tabs, LifeNode nodes, or use Zoom / Google Meet
        (allow mic + tab audio when sharing). AI recap + download + vault save.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Session title
          <input
            className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Type
          <select
            className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "meeting" | "webinar" | "interview" | "other")
            }
          >
            <option value="meeting">Video meeting</option>
            <option value="webinar">Webinar</option>
            <option value="interview">Interview</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-violet-600"
          checked={cloud}
          onChange={(e) => setCloud(e.target.checked)}
        />
        Queue for cloud backup (opt-in flag on session)
      </label>

      <label className="mt-3 block text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-violet-600" />
          Meeting URL (Loom, Zoom, YouTube)
        </span>
        <input
          className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
          placeholder="https://…"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!isTranscribableMeetingUrl(meetingUrl)}
          onClick={() => void transcribeExternalMock()}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Transcribe &amp; summarize (mock)
        </button>
        {!meetingUrl.trim() ? (
          <p className="self-center text-[11px] text-slate-500">
            Paste a supported link to enable the mock engine.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startLive}
          disabled={live.isCapturing}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          <Radio className="h-4 w-4" />
          Start live capture
        </button>
        <button
          type="button"
          onClick={() => void stopLive()}
          disabled={!live.isCapturing || summarizing}
          className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-800"
        >
          {summarizing ? "Summarizing…" : "Stop & summarize"}
        </button>
        <button
          type="button"
          onClick={downloadTxt}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <Download className="h-4 w-4" />
          Download .txt
        </button>
        <button
          type="button"
          onClick={saveVault}
          disabled={!displayTranscript.trim() && !summary}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Save to Smart Vault
        </button>
        <button
          type="button"
          onClick={clearCapture}
          disabled={!displayTranscript.trim() && !summary && !live.isCapturing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      {vaultNotice ? (
        <p className="mt-3 text-center text-xs font-semibold text-emerald-700">
          {vaultNotice}
        </p>
      ) : null}

      <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm leading-relaxed text-slate-800">
        {displayTranscript.trim() ? (
          <p className="whitespace-pre-wrap">{displayTranscript}</p>
        ) : live.isCapturing ? (
          <span className="text-slate-500">Listening… (also shown in the floating card)</span>
        ) : (
          <span className="text-slate-500">Transcript appears here as you speak…</span>
        )}
      </div>

      {summary && (
        <div className="mt-4 rounded-xl border border-violet-200/70 bg-violet-50/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-violet-900">
            <Sparkles className="h-3.5 w-3.5" />
            AI recap
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-violet-950">{summary}</p>
        </div>
      )}
    </section>
  );
}
