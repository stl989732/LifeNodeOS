"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bot,
  Calculator,
  Clock,
  FileText,
  Hourglass,
  Landmark,
  Link2,
  Plus,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  Users,
  Video,
  Cloud,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useActiveClient } from "./ActiveClientContext";
import { ScreenRecorder } from "./ScreenRecorder";
import { SavedScreenCaptures } from "./SavedScreenCaptures";
import { COMMON_TIMEZONES } from "@/lib/vanode/constants";
import { computeOutsourceInsight, userTimezone } from "@/lib/vanode/outsource";
import { openInvoicePrint } from "@/lib/vanode/invoice-print";
import {
  DEFAULT_WORK_END,
  DEFAULT_WORK_START,
  overlapFlagsWithSchedule,
} from "@/lib/vanode/clientWorkHours";
import { isTranscribableMeetingUrl } from "@/lib/vanode/meetingUrls";
import { VaultNoteBody } from "./VaultNoteBody";
import { ScreenRecordingRefreshContext } from "./ScreenRecordingRoot";
import {
  countsTowardInvoiceTotal,
  formatInvoiceLineAmount,
  lineUnitForDescription,
  type InvoiceLineUnit,
} from "@/lib/vanode/invoice-lines";
import { toTitleCase } from "@/lib/vanode/title-case";
import type {
  ClientProfile,
  ClientCredential,
  EodLog,
  Invoice,
  InvoiceStatus,
  Note,
  ScratchPadSavedEntry,
  ScratchPadTag,
  WaitingTask,
} from "@/lib/vanode/types";

function glassCard(className = "") {
  return `rounded-3xl border border-white/45 bg-white/50 shadow-xl shadow-slate-900/[0.04] backdrop-blur-xl ${className}`;
}

function safeCalc(expr: string): string {
  const t = expr.replace(/\s/g, "");
  if (!t || !/^[\d+\-*/().]+$/.test(t)) return "—";
  try {
    const v = Function(`"use strict";return (${t})`)() as number;
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return String(Math.round(v * 1e6) / 1e6);
  } catch {
    return "—";
  }
}

function buildSopMarkdownFromVideoUrl(url: string) {
  const u = url.trim();
  const label = u.includes("loom.com")
    ? "Loom"
    : u.includes("youtube.com") || u.includes("youtu.be")
      ? "YouTube"
      : "Video";
  return `## SOP (auto-draft) · ${label}\n\n### Objective\nExecute the workflow described in the linked recording.\n\n### Steps\n1. Watch the clip and list acceptance criteria in your own words.\n2. Confirm dependencies + deadline with the client in writing.\n3. Complete the checklist in your PM tool.\n4. Ship recap with screenshots or Loom back to the client.\n\n### Source\n${u}\n\n_(Generated locally — replace with your final SOP.)_`;
}

async function fetchVanodeAi(payload: Record<string, unknown>) {
  const res = await fetch("/api/vanode/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "VANode AI request failed.",
    );
  }
  return data;
}

type InvoiceLineRow = {
  description: string;
  amount: string;
  unit: InvoiceLineUnit;
};

const DEFAULT_MANUAL_INVOICE_LINES: InvoiceLineRow[] = [
  { description: "Professional services", amount: "500", unit: "currency" },
  { description: "Hours Billed", amount: "", unit: "hours" },
  { description: "Days Worked", amount: "", unit: "days" },
];

function unitForRow(row: InvoiceLineRow): InvoiceLineUnit {
  return row.unit ?? lineUnitForDescription(row.description);
}

function mockAiFromThread(thread: string) {
  const lines = thread
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const summary =
    lines.length === 0
      ? "Paste a long email thread on the left. LifeNode OS will condense decisions, owners, and deadlines."
      : lines.slice(0, 5).join(" ");
  const opener = lines[0]?.slice(0, 80) ?? "your latest note";
  const draft = `Hi — thanks for the context on "${opener}${opener.length >= 80 ? "…" : ""}"\n\nHere's the plan on my side:\n• Confirm open questions\n• Close the loop with a concise recap\n• Flag anything that needs your approval\n\nI'll send an update before your EOD unless I hear otherwise.`;
  return { summary, draft };
}

type EodProps = {
  clients: ClientProfile[];
  eodLogs: EodLog[];
  cloudSyncRecording: boolean;
  onSetCloudSync: (v: boolean) => void;
  onAddEod: (payload: Omit<EodLog, "id" | "createdAt">) => void;
};

export function EodReporterCard({
  clients,
  eodLogs,
  cloudSyncRecording,
  onSetCloudSync,
  onAddEod,
}: EodProps) {
  const { activeClientId } = useActiveClient();
  const globalCaptureRefresh = useContext(ScreenRecordingRefreshContext);
  const [clientId, setClientId] = useState<string>("");
  const [accomplishments, setAccomplishments] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [blockers, setBlockers] = useState("");
  const [attach, setAttach] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingName, setRecordingName] = useState<string | null>(null);
  const [capturesRefresh, setCapturesRefresh] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linosDraft, setLinosDraft] = useState("");
  const [scratchpad, setScratchpad] = useState("");
  const [includeCompletedTasks, setIncludeCompletedTasks] = useState(true);

  const shareBase =
    typeof window !== "undefined" ? window.location.origin : "";

  const submit = () => {
    const token = attach ? crypto.randomUUID() : null;
    const shareUrl =
      attach && token ? `${shareBase}/share/eod/${token}` : null;
    onAddEod({
      clientId: activeClientId ?? (clientId || null),
      accomplishments: [scratchpad, accomplishments].filter(Boolean).join("\n\n"),
      timeSpent,
      blockers,
      recordingBlobUrl: attach ? recordingUrl : null,
      recordingFilename: attach ? recordingName : null,
      attachRecording: attach,
      shareToken: token,
    });
    setAccomplishments("");
    setScratchpad("");
    setTimeSpent("");
    setBlockers("");
    setAttach(false);
    setRecordingUrl(null);
    setRecordingName(null);
    if (shareUrl) {
      setLastShareUrl(shareUrl);
      setToast("EOD saved with share link.");
    } else {
      setLastShareUrl(null);
      setToast("EOD saved locally.");
    }
    setCopied(false);
    setTimeout(() => setToast(null), 3200);
  };

  const copyShare = async () => {
    if (!lastShareUrl) return;
    try {
      await navigator.clipboard.writeText(lastShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Could not copy — select the link manually.");
    }
  };

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Video className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
            {toTitleCase("EOD proof of work")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Local-first logs. Screen captures save as video on this device (MP4 or
            WebM) with optional mic narration; cloud sync is optional.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/60 bg-white/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Capture
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-teal-600"
              checked={cloudSyncRecording}
              onChange={(e) => onSetCloudSync(e.target.checked)}
            />
            <Cloud className="h-4 w-4 text-slate-500" />
            Cloud sync (opt-in)
          </label>
        </div>
        <ScreenRecorder
          onError={(m) => {
            setToast(m);
            setTimeout(() => setToast(null), 5000);
          }}
        />
        <div className="mt-3 border-t border-white/50 pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Saved on this device
          </p>
          <SavedScreenCaptures
            refreshKey={capturesRefresh + globalCaptureRefresh}
            onToast={(m) => {
              setToast(m);
              setTimeout(() => setToast(null), 3200);
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Client link
          <select
            className="mt-1.5 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm disabled:opacity-60"
            value={activeClientId ?? clientId}
            disabled={Boolean(activeClientId)}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">General / no client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-end gap-2 pb-1 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-teal-600"
            checked={includeCompletedTasks}
            onChange={(e) => setIncludeCompletedTasks(e.target.checked)}
          />
          Include completed tasks in weekly digest
        </label>
        <label className="flex cursor-pointer items-end gap-2 pb-1 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-teal-600"
            checked={attach}
            onChange={(e) => setAttach(e.target.checked)}
          />
          Attach auto-recordings to report
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Scratchpad (EOD compiler)
          <textarea
            className="mt-1.5 min-h-[100px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm"
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="Rough bullets, call notes, paste Slack threads… merged into exports."
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Accomplishments
          <textarea
            className="mt-1.5 min-h-[100px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm"
            value={accomplishments}
            onChange={(e) => setAccomplishments(e.target.value)}
            placeholder="Shipped assets, cleared inbox, updated CRM…"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Time spent
          <textarea
            className="mt-1.5 min-h-[64px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm"
            value={timeSpent}
            onChange={(e) => setTimeSpent(e.target.value)}
            placeholder="e.g. 2h deep work, 1h client calls"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Blockers
          <textarea
            className="mt-1.5 min-h-[64px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            const body = [
              "Subject: EOD recap — quick wins",
              "",
              accomplishments || "(add accomplishments)",
              scratchpad ? `\n\nScratchpad:\n${scratchpad}` : "",
              "",
              "Time on desk:",
              timeSpent || "—",
              "",
              "Blockers / asks:",
              blockers || "None.",
              "",
              "— Linos (drafted from your EOD form)",
            ].join("\n");
            setLinosDraft(body);
            setToast("Linos drafted a client-ready recap.");
            setTimeout(() => setToast(null), 2800);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-900 hover:bg-violet-100/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate EOD (client email)
        </button>
        <button
          type="button"
          onClick={() => {
            const since = Date.now() - 7 * 24 * 3600 * 1000;
            const slice = eodLogs.filter((l) => {
              const t = new Date(l.createdAt).getTime();
              if (t < since) return false;
              if (activeClientId && l.clientId !== activeClientId) return false;
              if (!includeCompletedTasks && !l.accomplishments.trim()) return false;
              return true;
            });
            const recap = slice
              .map(
                (l, i) =>
                  `${i + 1}. ${l.accomplishments.slice(0, 120)}${l.accomplishments.length > 120 ? "…" : ""}`,
              )
              .join("\n");
            const weekly = [
              "Weekly digest (Linos)",
              "",
              recap || "No logs in the last 7 days for this filter.",
              "",
              "Highlights pulled from Accomplishments + Time spent cards.",
            ].join("\n");
            setLinosDraft(weekly);
            setToast("Weekly digest generated.");
            setTimeout(() => setToast(null), 2800);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-teal-900 hover:bg-teal-100/90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Weekly EOD (Linos)
        </button>
      </div>

      {linosDraft && (
        <div className="mt-4 rounded-2xl border border-violet-200/60 bg-violet-50/40 p-4">
          <div className="mb-2 text-xs font-bold uppercase text-violet-900">
            Linos draft · copy into email or Slack
          </div>
          <textarea
            readOnly
            className="min-h-[120px] w-full rounded-xl border border-violet-100 bg-white/80 p-3 text-sm text-slate-800"
            value={linosDraft}
          />
        </div>
      )}

      {(attach || lastShareUrl) && (
        <div className="mt-4 rounded-2xl border border-teal-200/60 bg-teal-50/50 p-4 text-sm text-teal-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <Link2 className="h-4 w-4" />
            Client share link
          </div>
          <p className="mb-2 text-teal-800/90">
            {lastShareUrl
              ? "Copy this embed-friendly URL into your recap or CRM."
              : "When you save with “Attach recording” on, LifeNode OS issues a tokenized preview URL for the client."}
          </p>
          {lastShareUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="block max-w-full flex-1 truncate rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-700">
                {lastShareUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyShare()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-teal-800/80">
              Save the report to mint the link (local-first; wire to your host
              when you deploy).
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
        >
          Save EOD log
        </button>
        {toast && (
          <span className="self-center text-sm text-slate-600">{toast}</span>
        )}
      </div>
    </section>
  );
}

type VaultProps = {
  notes: Note[];
  clients: ClientProfile[];
  onAdd: (n: Omit<Note, "id" | "updatedAt">) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onRemove: (id: string) => void;
};

export function SmartVaultCard({
  notes,
  clients,
  onAdd,
  onUpdate,
  onRemove,
}: VaultProps) {
  const { activeClientId } = useActiveClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState("");
  const [labelsRaw, setLabelsRaw] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const allLabels = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => n.labels.forEach((l) => s.add(l)));
    return [...s].sort();
  }, [notes]);

  const byClient = useMemo(
    () =>
      activeClientId
        ? notes.filter((n) => n.clientId === activeClientId)
        : notes,
    [notes, activeClientId],
  );

  const filtered = filterLabel
    ? byClient.filter((n) => n.labels.includes(filterLabel))
    : byClient;

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditingTitle(n.title);
    setTitle(n.title);
    setBody(n.body);
    setClientId(n.clientId ?? "");
    setLabelsRaw(n.labels.join(", "));
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const labels = labelsRaw
      .split(/[,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    onUpdate(editingId, {
      title,
      body,
      clientId: clientId || null,
      labels,
    });
    setEditingId(null);
    setEditingTitle("");
    setTitle("");
    setBody("");
    setClientId("");
    setLabelsRaw("");
  };

  const create = () => {
    const labels = labelsRaw
      .split(/[,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    onAdd({
      title: title || "Untitled note",
      body,
      clientId: activeClientId ?? (clientId || null),
      labels,
    });
    setTitle("");
    setBody("");
    setClientId("");
    setLabelsRaw("");
  };

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <FileText className="h-5 w-5 text-indigo-600" strokeWidth={1.75} />
        {toTitleCase("Smart vault")}
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Notes with labels, linked to client profiles. Stored locally in this
        browser.
        {activeClientId ? (
          <span className="ml-1 font-semibold text-teal-800">
            Showing vault for the active client only.
          </span>
        ) : null}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value)}
        >
          <option value="">All labels</option>
          {allLabels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {editingId ? (
        <div className="mb-4 rounded-xl border border-teal-300/80 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          <strong>Editing:</strong> {editingTitle || "Note"} — update fields below,
          then click <strong>Update note</strong>.
        </div>
      ) : null}

      <div
        ref={formRef}
        id="smart-vault-edit-form"
        className="grid gap-4 md:grid-cols-2"
      >
        <label className="text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Client
          <select
            className="mt-1.5 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
            value={editingId ? clientId : (activeClientId ?? clientId)}
            disabled={Boolean(activeClientId) && !editingId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Unlinked</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2 text-sm font-medium text-slate-700">
          Labels (comma-separated)
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            placeholder="Client A, Standard Operating Procedures"
            value={labelsRaw}
            onChange={(e) => setLabelsRaw(e.target.value)}
          />
        </label>
        <label className="md:col-span-2 text-sm font-medium text-slate-700">
          Body
          <textarea
            className="mt-1.5 min-h-[100px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {editingId ? (
          <>
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Update note
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditingTitle("");
                setTitle("");
                setBody("");
                setClientId("");
                setLabelsRaw("");
              }}
              className="rounded-xl border border-slate-200 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={create}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create note
          </button>
        )}
      </div>

      <ul className="mt-8 space-y-3">
        {filtered.map((n) => (
          <li
            key={n.id}
            className="rounded-2xl border border-white/60 bg-white/45 p-4 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{n.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(n.updatedAt).toLocaleString()}
                  {n.clientId && (
                    <>
                      {" · "}
                      {clients.find((c) => c.id === n.clientId)?.name ??
                        "Client"}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(n)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(n.id)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {n.labels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {n.labels.map((l) => (
                  <span
                    key={l}
                    className="rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            <VaultNoteBody body={n.body} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-slate-500">No notes match this filter.</li>
        )}
      </ul>
    </section>
  );
}

const SCRATCH_TAG_META: {
  id: ScratchPadTag;
  label: string;
  pillClass: string;
}[] = [
  {
    id: "URGENT",
    label: "URGENT",
    pillClass: "border-red-500/50 bg-red-600 text-white shadow-sm",
  },
  {
    id: "GENERAL",
    label: "GENERAL",
    pillClass: "border-slate-400/50 bg-slate-500 text-white shadow-sm",
  },
  {
    id: "HIGH_PRIORITY",
    label: "HIGH PRIORITY",
    pillClass: "border-sky-500/50 bg-sky-600 text-white shadow-sm",
  },
  {
    id: "RANDOM",
    label: "RANDOM",
    pillClass: "border-teal-500/50 bg-teal-600 text-white shadow-sm",
  },
];

export function NoteScratchPadCard({
  text,
  tags,
  saved,
  onSave,
  onClearDraft,
  onRemoveSaved,
}: {
  text: string;
  tags: ScratchPadTag[];
  saved: ScratchPadSavedEntry[];
  onSave: (payload: { text: string; tags: ScratchPadTag[] }) => void;
  onClearDraft: () => void;
  onRemoveSaved: (id: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  const [draftTags, setDraftTags] = useState<ScratchPadTag[]>(tags);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    setDraft(text);
    setDraftTags(tags);
  }, [text, tags]);

  const addTag = (id: ScratchPadTag) => {
    setDraftTags((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setTagMenuOpen(false);
  };

  const removeTag = (id: ScratchPadTag) => {
    setDraftTags((prev) => prev.filter((t) => t !== id));
  };

  const pillClass = (id: ScratchPadTag) =>
    SCRATCH_TAG_META.find((m) => m.id === id)?.pillClass ??
    "border-white/30 bg-slate-600 text-white";

  return (
    <section className={glassCard("flex h-full min-h-[220px] flex-col p-5 md:p-6")}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <StickyNote className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
        {toTitleCase("Note scratch pad")}
      </h2>
      <textarea
        className="min-h-[140px] w-full flex-1 resize-y rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none ring-[#00ffc8]/30 focus:ring-2"
        placeholder="Type quick notes, paste snippets, draft replies…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTagMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#00ffc8]/50 bg-[#00ffc8]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-900 transition hover:bg-[#00ffc8]/20"
          >
            <Tag className="h-3.5 w-3.5" />
            Add tag
          </button>
          {tagMenuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[12rem] rounded-xl border border-white/20 bg-white/95 p-2 shadow-xl backdrop-blur-md">
              {SCRATCH_TAG_META.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={draftTags.includes(m.id)}
                  onClick={() => addTag(m.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${m.pillClass}`}
                  />
                  {m.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            onSave({ text: draft, tags: draftTags });
            setSaveFlash(true);
            window.setTimeout(() => setSaveFlash(false), 2000);
          }}
          className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-teal-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            onClearDraft();
            setDraft("");
            setDraftTags([]);
          }}
          className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-900 transition hover:bg-rose-100"
        >
          Clear pad
        </button>
      </div>
      {saveFlash ? (
        <p className="mt-2 text-xs font-semibold text-teal-800">
          Saved to this device — see list below.
        </p>
      ) : null}
      {draftTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {draftTags.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${pillClass(t)}`}
            >
              {SCRATCH_TAG_META.find((m) => m.id === t)?.label ?? t}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                aria-label={`Remove ${t}`}
                onClick={() => removeTag(t)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {saved.length > 0 ? (
        <div className="mt-5 border-t border-slate-200/80 pt-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Saved notes ({saved.length})
          </h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {saved.map((s) => (
              <li
                key={s.id}
                className="flex gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2 text-xs text-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 whitespace-pre-wrap break-words">
                    {s.text}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${pillClass(t)}`}
                      >
                        {SCRATCH_TAG_META.find((m) => m.id === t)?.label ?? t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {new Date(s.savedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete saved note"
                  onClick={() => onRemoveSaved(s.id)}
                  className="shrink-0 self-start rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          Saved notes will appear here so you can review or delete them later.
        </p>
      )}
    </section>
  );
}

type AiAssistProps = {
  onAddVaultNote: (n: Omit<Note, "id" | "updatedAt">) => void;
};

export function AiTaskAssistantCard({ onAddVaultNote }: AiAssistProps) {
  const { activeClientId } = useActiveClient();
  const [thread, setThread] = useState("");
  const [summary, setSummary] = useState("");
  const [draft, setDraft] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sopPreview, setSopPreview] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingSop, setLoadingSop] = useState(false);

  const clearThread = () => {
    setThread("");
    setSummary("");
    setDraft("");
  };

  const clearVideo = () => {
    setVideoUrl("");
    setSopPreview("");
    setSopTitle("");
  };

  const run = async () => {
    const t = thread.trim();
    if (!t) return;
    setLoadingEmail(true);
    try {
      const data = await fetchVanodeAi({ mode: "email_assist", thread: t });
      setSummary(String(data.summary ?? ""));
      setDraft(String(data.draft ?? ""));
    } catch {
      const out = mockAiFromThread(t);
      setSummary(out.summary);
      setDraft(out.draft);
      setToastLocal("Used offline draft — add GOOGLE_API_KEY for full AI.");
    } finally {
      setLoadingEmail(false);
    }
  };

  const runVideoSop = async () => {
    const url = videoUrl.trim();
    if (!url) return;
    setLoadingSop(true);
    try {
      const data = await fetchVanodeAi({ mode: "video_sop", videoUrl: url });
      const md =
        typeof data.markdown === "string"
          ? data.markdown
          : buildSopMarkdownFromVideoUrl(url);
      setSopPreview(md);
      setSopTitle(typeof data.title === "string" ? data.title : "");
    } catch {
      setSopPreview(buildSopMarkdownFromVideoUrl(url));
      setSopTitle("");
      setToastLocal("Used template SOP — add GOOGLE_API_KEY for AI outline.");
    } finally {
      setLoadingSop(false);
    }
  };

  const saveSopToVault = () => {
    if (!sopPreview.trim()) return;
    onAddVaultNote({
      title: sopTitle.trim() ? `SOP · ${sopTitle.trim()}` : `SOP · ${videoUrl.includes("loom") ? "Loom" : "Video"}`,
      body: sopPreview,
      clientId: activeClientId,
      labels: ["sop", "ai-loom"],
    });
    setToastLocal("Saved to Smart Vault.");
  };

  const [toastLocal, setToastLocal] = useState<string | null>(null);
  useEffect(() => {
    if (!toastLocal) return;
    const t = setTimeout(() => setToastLocal(null), 2400);
    return () => clearTimeout(t);
  }, [toastLocal]);

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Bot className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
        {toTitleCase("AI task assistant")}
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        Paste an email thread for a real summary and draft reply. Video links
        get an AI-generated SOP outline (title, objective, steps).
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          <span className="flex items-center justify-between gap-2">
            Thread
            <span className="flex gap-1">
              <button
                type="button"
                onClick={clearThread}
                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
              >
                New thread
              </button>
            </span>
          </span>
          <textarea
            className="mt-1.5 min-h-[200px] w-full rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            placeholder="Paste emails here…"
          />
        </label>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700">Summary</div>
            <p className="mt-1.5 min-h-[88px] rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm text-slate-800">
              {summary || "—"}
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">Draft reply</div>
            <p className="mt-1.5 min-h-[88px] whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm text-slate-800">
              {draft || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loadingEmail || !thread.trim()}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-violet-500 disabled:opacity-50"
          >
            {loadingEmail ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200/80 pt-6">
        <h3 className="text-sm font-bold text-slate-900">
          {toTitleCase("AI Loom · video → SOP")}
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Paste a Loom, YouTube, Zoom, or Kommodo link — LifeNode builds a
          markdown SOP with title, objective, and steps (uses video metadata when
          available).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
            placeholder="https://www.loom.com/share/…"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={runVideoSop}
            disabled={loadingSop || !videoUrl.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loadingSop ? "Outlining…" : "Transcribe & outline SOP"}
          </button>
          <button
            type="button"
            onClick={clearVideo}
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700"
          >
            New link
          </button>
          <button
            type="button"
            onClick={saveSopToVault}
            disabled={!sopPreview}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40"
          >
            Save SOP to vault
          </button>
        </div>
        {sopPreview && (
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-slate-800">
            {sopPreview}
          </pre>
        )}
        {toastLocal && (
          <p className="mt-2 text-sm text-teal-800">{toastLocal}</p>
        )}
      </div>
    </section>
  );
}

export function ChaosCalculatorCard() {
  const [expr, setExpr] = useState("");
  const resultLine = safeCalc(expr || "0");

  const append = (ch: string) => {
    setExpr((prev) => prev + ch);
  };

  const keys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "%", "+"],
  ];

  return (
    <section className="rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.05)] p-5 shadow-xl shadow-slate-900/[0.04] backdrop-blur-[12px] md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <Calculator className="h-5 w-5 text-amber-600" strokeWidth={1.75} />
        {toTitleCase("Chaos calculator")}
      </h2>
      <div className="mb-3 rounded-xl border border-white/10 bg-slate-900/[0.04] px-3 py-2.5 font-mono text-lg font-semibold tabular-nums text-slate-900">
        {expr || "0"}
      </div>
      <div
        className="mb-3 rounded-2xl border-2 border-teal-400/40 bg-gradient-to-b from-teal-50/95 to-emerald-50/80 px-4 py-3 shadow-inner dark:border-teal-500/30 dark:from-teal-950/50 dark:to-slate-900/60"
        aria-live="polite"
      >
        <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-teal-900/90 dark:text-teal-200">
          Total
        </div>
        <div className="mt-0.5 font-mono text-3xl font-bold tabular-nums leading-tight tracking-tight text-teal-950 dark:text-teal-100">
          {resultLine}
        </div>
      </div>
      <div
        className="mb-3 grid gap-1.5"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {keys.flat().map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => append(k)}
            className="rounded-xl border border-white/10 bg-slate-900/[0.06] py-3 text-center text-sm font-bold text-slate-800 shadow-sm transition hover:border-[#00ffc8]/40 hover:bg-white/20 hover:shadow-[0_0_14px_rgba(0,255,200,0.12)] active:scale-[0.98]"
          >
            {k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setExpr((e) => (e ? e.slice(0, -1) : ""))}
          className="rounded-xl border border-white/10 bg-white/10 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition hover:border-[#00ffc8]/35 hover:text-slate-900"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setExpr("")}
          className="rounded-xl border border-white/10 bg-white/10 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition hover:border-[#00ffc8]/35 hover:text-slate-900"
        >
          All clear
        </button>
        <button
          type="button"
          className="col-span-2 rounded-xl bg-slate-900 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800 hover:shadow-[0_0_18px_rgba(0,255,200,0.15)]"
          onClick={() => {
            /* no-op — result already live */
          }}
        >
          Calculate
        </button>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Local-only keypad · use * and / · % applies to last value pattern in your
        head (treat as character for now)
      </p>
    </section>
  );
}

type WaitProps = {
  tasks: WaitingTask[];
  clients: ClientProfile[];
  onAdd: (t: { label: string; clientId: string | null }) => void;
  onRemove: (id: string) => void;
};

type UnifiedFeedItem = {
  id: string;
  from: string;
  subj: string;
  snippet: string;
};

function buildAutoDraftReply(it: UnifiedFeedItem): string {
  return [
    "Hi,",
    "",
    `Thanks for your message on "${it.subj}" (${it.from}).`,
    "",
    `Context: ${it.snippet}`,
    "",
    "I'll review and follow up shortly. Let me know if you need anything else on this thread.",
    "",
    "Best,",
  ].join("\n");
}

export function UnifiedFeedCard({
  onSaveDraftToVault,
}: {
  onSaveDraftToVault?: (n: Omit<Note, "id" | "updatedAt">) => void;
} = {}) {
  const items = useMemo<UnifiedFeedItem[]>(() => [], []);

  const [active, setActive] = useState<UnifiedFeedItem | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const openDraft = (it: UnifiedFeedItem) => {
    setActive(it);
    setDraft(buildAutoDraftReply(it));
    setCopied(false);
  };

  const closeDraft = () => {
    setActive(null);
    setDraft("");
    setCopied(false);
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="relative flex h-full flex-col rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.05)] p-5 shadow-xl shadow-slate-900/[0.04] backdrop-blur-[12px] md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <FileText className="h-5 w-5 text-sky-600" strokeWidth={1.75} />
        {toTitleCase("Unified feed")}
      </h2>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/15 bg-white/10 px-4 py-8 text-center text-sm text-slate-600">
            No messages in your feed yet. Connect email or calendar tools in VANode
            settings when integrations are available.
          </li>
        ) : null}
        {items.map((it) => (
          <li
            key={it.id}
            className="relative z-0 rounded-xl border border-white/10 bg-white/30 px-3 py-2.5 text-sm transition hover:border-[#00ffc8]/35 hover:shadow-[0_0_12px_rgba(0,255,200,0.08)]"
          >
            <div className="font-semibold text-slate-900">{it.subj}</div>
            <div className="text-xs text-slate-500">{it.from}</div>
            <p className="mt-1 line-clamp-2 text-slate-600">{it.snippet}</p>
            <button
              type="button"
              onClick={() => openDraft(it)}
              className="relative z-10 mt-2 w-full cursor-pointer rounded-lg border border-[#00ffc8]/35 bg-[#00ffc8]/15 py-2 text-[10px] font-bold uppercase tracking-wider text-teal-950 shadow-sm transition hover:bg-[#00ffc8]/25 active:scale-[0.99]"
            >
              Auto-draft reply
            </button>
          </li>
        ))}
      </ul>

      {active && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[7000] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-6"
              role="dialog"
              aria-modal
              aria-labelledby="unified-feed-draft-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeDraft();
              }}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <h3
                    id="unified-feed-draft-title"
                    className="min-w-0 truncate text-sm font-bold text-slate-900"
                  >
                    Draft · {active.subj}
                  </h3>
                  <button
                    type="button"
                    onClick={closeDraft}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  className="min-h-[200px] flex-1 resize-none border-0 px-4 py-3 text-sm text-slate-800 outline-none focus:ring-0"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void copyDraft()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 sm:flex-none"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  {onSaveDraftToVault ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSaveDraftToVault({
                          title: `Draft: ${active.subj}`,
                          body: draft,
                          clientId: null,
                          labels: ["unified-feed", "draft-reply"],
                        });
                        closeDraft();
                      }}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 sm:flex-none"
                    >
                      Save to vault
                    </button>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

export function CredentialVaultCard({
  clients,
}: {
  clients: ClientProfile[];
}) {
  const { activeClientId } = useActiveClient();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const rows = clients.flatMap((c) =>
    (c.credentials ?? []).map((cred) => ({
      key: `${c.id}:${cred.id}`,
      clientId: c.id,
      clientName: c.name,
      label: cred.label,
      secret: cred.secret,
    })),
  );

  const visible =
    activeClientId === null
      ? rows
      : rows.filter((r) => r.clientId === activeClientId);

  return (
    <section className="group relative flex h-full flex-col rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.05)] p-5 shadow-xl shadow-slate-900/[0.04] backdrop-blur-[12px] md:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <Landmark className="h-5 w-5 text-emerald-700" strokeWidth={1.75} />
        {toTitleCase("2FA & credential vault")}
      </h2>
      <p className="mb-3 text-xs text-slate-600">
        Zero-knowledge style UI: secrets stay blurred until you hover the row
        (local demo only).
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {visible.map((r) => (
          <li
            key={r.key}
            className="group/row rounded-xl border border-white/10 bg-slate-900/[0.04] px-3 py-2"
            onMouseEnter={() => setHoveredRow(r.key)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {r.clientName} · {r.label}
            </div>
            <div
              className="mt-1 select-none transition duration-200"
              style={{
                filter: hoveredRow === r.key ? "none" : "blur(8px)",
              }}
            >
              <span className="font-mono text-sm text-slate-900">{r.secret}</span>
            </div>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="text-sm text-slate-500">
            No credentials on file. Add secrets from Client Command (per client).
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function hoursSinceCreated(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function WaitingTasksCard({ tasks, clients, onAdd, onRemove }: WaitProps) {
  const { activeClientId } = useActiveClient();
  const [label, setLabel] = useState("");
  const [clientId, setClientId] = useState("");

  const visible = useMemo(
    () =>
      activeClientId
        ? tasks.filter((t) => t.clientId === activeClientId)
        : tasks,
    [tasks, activeClientId],
  );

  const anyStuck = useMemo(
    () => visible.some((t) => hoursSinceCreated(t.createdAt) >= 24),
    [visible],
  );

  const firstStuck = visible.find((t) => hoursSinceCreated(t.createdAt) >= 24);

  return (
    <section
      className={`${glassCard("p-6")} ${anyStuck ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-white/50 animate-pulse" : ""}`}
    >
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
        <Hourglass className="h-5 w-5 text-sky-600" strokeWidth={1.75} />
        {toTitleCase("Waiting on · blocker radar")}
      </h2>
      {activeClientId ? (
        <p className="mb-3 text-xs font-medium text-teal-800">
          Filtered to the active client. Switch hats in the bar above to change
          context.
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm"
          placeholder="Waiting for approval, asset, reply…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select
          className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm disabled:opacity-60"
          value={activeClientId ?? clientId}
          disabled={Boolean(activeClientId)}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Client (optional)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            if (!label.trim()) return;
            onAdd({
              label: label.trim(),
              clientId: activeClientId ?? (clientId || null),
            });
            setLabel("");
            if (!activeClientId) setClientId("");
          }}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {visible.map((t) => {
          const ageH = hoursSinceCreated(t.createdAt);
          const stuck = ageH >= 24;
          const cname = clients.find((c) => c.id === t.clientId)?.name ?? "Client";
          return (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                stuck
                  ? "border-amber-300/80 bg-amber-50/70"
                  : "border-white/50 bg-white/40"
              }`}
            >
              <span>
                {t.label}
                {t.clientId && (
                  <span className="text-slate-500">
                    {" "}
                    · {cname}
                  </span>
                )}
                <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                  {ageH < 1
                    ? "just now"
                    : `${Math.floor(ageH)}h in queue`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(t.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="text-sm text-slate-500">Nothing in the queue.</li>
        )}
      </ul>
      {firstStuck ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950">
          <span className="font-bold">Linos · nudge engine: </span>
          {cnameForTask(firstStuck, clients)} hasn&apos;t moved on &quot;
          {firstStuck.label.slice(0, 80)}
          {firstStuck.label.length > 80 ? "…" : ""}&quot; in over 24h. Want a
          polite follow-up drafted?
        </div>
      ) : null}
    </section>
  );
}

function cnameForTask(
  t: { clientId: string | null },
  clients: ClientProfile[],
) {
  if (!t.clientId) return "The client";
  return clients.find((c) => c.id === t.clientId)?.name ?? "The client";
}

type ClientProps = {
  clients: ClientProfile[];
  waiting: WaitingTask[];
  eodLogs: EodLog[];
  onAdd: (c: Omit<ClientProfile, "id">) => void;
  onUpdateClient: (id: string, patch: Partial<ClientProfile>) => void;
  onRemove: (id: string) => void;
};

function newCredentialId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cred_${Math.random().toString(36).slice(2, 11)}`;
}

const clientCommandInputClass =
  "rounded-xl border border-slate-300/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25";

function ClientCredentialRow({
  label,
  secret,
}: {
  label: string;
  secret: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1.5">
      <span className="font-medium text-slate-800">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate font-mono text-slate-700">
          {visible ? secret : "••••••••"}
        </span>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </li>
  );
}

function ClientCredentialMiniForm({
  onAdd,
}: {
  onAdd: (label: string, secret: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-teal-200/60 bg-white/40 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-teal-900/80">
        Add credential (vault)
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className={`min-w-[8rem] flex-1 text-xs ${clientCommandInputClass}`}
          placeholder="Label (e.g. Portal 2FA)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          type="password"
          className={`min-w-[8rem] flex-1 text-xs ${clientCommandInputClass}`}
          placeholder="Secret / code"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white"
          onClick={() => {
            const l = label.trim();
            const s = secret.trim();
            if (!l || !s) return;
            onAdd(l, s);
            setLabel("");
            setSecret("");
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function ClientCommandCard({
  clients,
  waiting,
  eodLogs,
  onAdd,
  onUpdateClient,
  onRemove,
}: ClientProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [timezone, setTimezone] = useState(COMMON_TIMEZONES[0] ?? "UTC");
  const [newWorkStart, setNewWorkStart] = useState(DEFAULT_WORK_START);
  const [newWorkEnd, setNewWorkEnd] = useState(DEFAULT_WORK_END);

  const utz = userTimezone();
  const insight = useMemo(
    () => computeOutsourceInsight(clients, waiting, eodLogs),
    [clients, waiting, eodLogs]
  );

  const formatClock = (tz: string) =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Users className="h-5 w-5 text-teal-600" strokeWidth={1.75} />
        {toTitleCase("Client command center")}
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Profiles anchor notes, EOD, and invoicing. Clocks stay in sync with your
        local shell time.
      </p>

      <div
        className={`mb-6 rounded-2xl border p-4 ${
          insight.shouldSuggest
            ? "border-amber-200/80 bg-amber-50/60"
            : "border-emerald-200/70 bg-emerald-50/50"
        }`}
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Outsource assistant
        </div>
        <div className="mt-1 font-semibold text-slate-900">{insight.headline}</div>
        <p className="mt-1 text-sm text-slate-700">{insight.detail}</p>
        <div className="mt-2 text-xs text-slate-500">
          Load score: {insight.score}/100
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <input
          className={clientCommandInputClass}
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={clientCommandInputClass}
          placeholder="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
        <select
          className={clientCommandInputClass}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <label className="text-xs font-medium text-slate-600">
          Client work hours (their timezone)
          <div className="mt-1 flex items-center gap-2">
            <input
              type="time"
              className={`flex-1 ${clientCommandInputClass}`}
              value={newWorkStart}
              onChange={(e) => setNewWorkStart(e.target.value)}
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              className={`flex-1 ${clientCommandInputClass}`}
              value={newWorkEnd}
              onChange={(e) => setNewWorkEnd(e.target.value)}
            />
          </div>
        </label>
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            onAdd({
              name: name.trim(),
              industry: industry.trim(),
              timezone,
              workStart: newWorkStart || DEFAULT_WORK_START,
              workEnd: newWorkEnd || DEFAULT_WORK_END,
            });
            setName("");
            setIndustry("");
          }}
          className="md:col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Add client profile
        </button>
      </div>

      <ul className="space-y-3">
        {clients.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-white/55 bg-white/40 p-4 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-sm text-slate-600">{c.industry}</div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-xl bg-slate-900/[0.03] px-3 py-2">
                <Clock className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Your time ({utz})
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatClock(utz)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Your schedule: {DEFAULT_WORK_START} – {DEFAULT_WORK_END}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-teal-900/[0.04] px-3 py-2">
                <Clock className="mt-0.5 h-4 w-4 text-teal-600" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-teal-800/80">
                    Client ({c.timezone})
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatClock(c.timezone)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-teal-200/50 bg-teal-50/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-teal-900/80">
                Client work schedule
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  className={clientCommandInputClass}
                  value={c.workStart ?? DEFAULT_WORK_START}
                  onChange={(e) =>
                    onUpdateClient(c.id, { workStart: e.target.value })
                  }
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="time"
                  className={clientCommandInputClass}
                  value={c.workEnd ?? DEFAULT_WORK_END}
                  onChange={(e) =>
                    onUpdateClient(c.id, { workEnd: e.target.value })
                  }
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-600">
                Overlap with you (next 24h):{" "}
                <strong>
                  {overlapFlagsWithSchedule(
                    utz,
                    c.timezone,
                    DEFAULT_WORK_START,
                    DEFAULT_WORK_END,
                    c.workStart ?? DEFAULT_WORK_START,
                    c.workEnd ?? DEFAULT_WORK_END,
                  ).filter(Boolean).length}
                  h
                </strong>{" "}
                in both work windows
              </p>
            </div>
            <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Stored credentials ({(c.credentials ?? []).length})
            </div>
            <ul className="mt-1 space-y-1 text-xs text-slate-600">
              {(c.credentials ?? []).map((cr) => (
                <ClientCredentialRow
                  key={cr.id}
                  label={cr.label}
                  secret={cr.secret}
                />
              ))}
              {(c.credentials ?? []).length === 0 ? (
                <li className="text-slate-500">None yet — add below.</li>
              ) : null}
            </ul>
            <ClientCredentialMiniForm
              onAdd={(label, secret) => {
                const row: ClientCredential = {
                  id: newCredentialId(),
                  label,
                  secret,
                };
                onUpdateClient(c.id, {
                  credentials: [...(c.credentials ?? []), row],
                });
              }}
            />
          </li>
        ))}
        {clients.length === 0 && (
          <li className="text-sm text-slate-500">Add a client to begin.</li>
        )}
      </ul>
    </section>
  );
}

type InvProps = {
  invoices: Invoice[];
  eodLogs: EodLog[];
  clients: ClientProfile[];
  onAdd: (inv: Omit<Invoice, "id" | "createdAt">) => void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => void;
  onRemove: (id: string) => void;
};

export function InvoicingSuiteCard({
  invoices,
  eodLogs,
  clients,
  onAdd,
  onUpdateStatus,
  onRemove,
}: InvProps) {
  const { activeClientId } = useActiveClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "eod">("manual");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [due, setDue] = useState("");
  const [lineRows, setLineRows] = useState<InvoiceLineRow[]>(() => [
    ...DEFAULT_MANUAL_INVOICE_LINES,
  ]);
  const [amount, setAmount] = useState("500");
  const [pickedEod, setPickedEod] = useState<string[]>([]);
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [businessAgencyName, setBusinessAgencyName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [sigMode, setSigMode] = useState<"type" | "upload">("type");
  const [sigTypedName, setSigTypedName] = useState("");
  const [sigDesignation, setSigDesignation] = useState("");
  const [sigImageDataUrl, setSigImageDataUrl] = useState<string | null>(null);
  const [confirmPrintOpen, setConfirmPrintOpen] = useState(false);

  const visibleInvoices = useMemo(
    () =>
      activeClientId
        ? invoices.filter((i) => i.clientId === activeClientId)
        : invoices,
    [invoices, activeClientId],
  );

  const eodPickerLogs = useMemo(
    () =>
      activeClientId
        ? eodLogs.filter((l) => l.clientId === activeClientId)
        : eodLogs,
    [eodLogs, activeClientId],
  );

  const stats = useMemo(() => {
    const paid = visibleInvoices.filter((i) => i.status === "paid");
    const upcoming = visibleInvoices.filter((i) =>
      ["sent", "draft"].includes(i.status),
    );
    const overdue = visibleInvoices.filter((i) => i.status === "overdue");
    const earned = paid.reduce(
      (s, i) => s + i.lineItems.reduce((a, l) => a + l.amount, 0),
      0,
    );
    const upcomingAmt = upcoming.reduce(
      (s, i) => s + i.lineItems.reduce((a, l) => a + l.amount, 0),
      0,
    );
    const overdueAmt = overdue.reduce(
      (s, i) => s + i.lineItems.reduce((a, l) => a + l.amount, 0),
      0,
    );
    return { earned, upcomingAmt, overdueAmt, overdueCount: overdue.length };
  }, [visibleInvoices]);

  const submitInvoice = () => {
    let lineItems: {
      description: string;
      amount: number;
      unit?: InvoiceLineUnit;
    }[];
    let cName = clientName;
    let cid = clientId || null;
    let eodIds: string[] = [];

    if (mode === "eod") {
      const logs = eodLogs.filter((l) => pickedEod.includes(l.id));
      eodIds = logs.map((l) => l.id);
      const text = logs
        .map(
          (l) =>
            `${l.accomplishments.slice(0, 200)}${l.accomplishments.length > 200 ? "…" : ""}`
        )
        .join("\n—\n");
      lineItems = [
        {
          description: `EOD bundle (${logs.length} logs)\n${text}`,
          amount: parseFloat(amount) || logs.length * 150,
          unit: "currency",
        },
      ];
      const extra = lineRows
        .filter((r) => r.description.trim())
        .filter((r) => unitForRow(r) !== "currency");
      for (const r of extra) {
        const amt = parseFloat(r.amount);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        lineItems.push({
          description: r.description.trim(),
          amount: amt,
          unit: unitForRow(r),
        });
      }
      const first = logs[0];
      if (first?.clientId) {
        cid = first.clientId;
        cName = clients.find((x) => x.id === first.clientId)?.name ?? cName;
      }
    } else {
      lineItems = lineRows
        .filter((r) => r.description.trim())
        .map((r) => ({
          description: r.description.trim(),
          amount: parseFloat(r.amount) || 0,
          unit: unitForRow(r),
        }));
      if (!lineItems.length) {
        lineItems = [{ description: "Line item", amount: 0 }];
      }
    }

    if (!cName.trim()) {
      cName = businessAgencyName.trim() || "Client";
    }

    onAdd({
      clientId: cid,
      clientName: cName.trim(),
      lineItems,
      dueDate: due || new Date().toISOString().slice(0, 10),
      status,
      eodLogIds: eodIds,
      businessAgencyName: businessAgencyName.trim() || undefined,
      ownerFullName: ownerFullName.trim() || undefined,
      signatureMode: sigMode,
      signatureTypedName:
        sigMode === "type" ? sigTypedName.trim() || undefined : undefined,
      signatureImageDataUrl:
        sigMode === "upload" && sigImageDataUrl ? sigImageDataUrl : undefined,
      signatureDesignation: sigDesignation.trim() || undefined,
    });
    setOpen(false);
    setPickedEod([]);
    setLineRows([...DEFAULT_MANUAL_INVOICE_LINES]);
  };

  const previewLines = useMemo(() => {
    if (mode === "eod") {
      const logs = eodLogs.filter((l) => pickedEod.includes(l.id));
      const rows: { description: string; amount: number; unit?: InvoiceLineUnit }[] =
        [];
      if (!logs.length) {
        rows.push({ description: "Select EOD logs…", amount: 0, unit: "currency" });
      } else {
        const text = logs
          .map(
            (l) =>
              `${l.accomplishments.slice(0, 120)}${l.accomplishments.length > 120 ? "…" : ""}`
          )
          .join(" · ");
        rows.push({
          description: `EOD bundle (${logs.length})\n${text}`,
          amount: parseFloat(amount) || logs.length * 150,
          unit: "currency",
        });
      }
      for (const r of lineRows) {
        if (!r.description.trim() || unitForRow(r) === "currency") continue;
        rows.push({
          description: r.description.trim(),
          amount: parseFloat(r.amount) || 0,
          unit: unitForRow(r),
        });
      }
      return rows;
    }
    return lineRows
      .filter((r) => r.description.trim())
      .map((r) => ({
        description: r.description.trim(),
        amount: parseFloat(r.amount) || 0,
        unit: unitForRow(r),
      }));
  }, [mode, eodLogs, pickedEod, amount, lineRows]);

  const previewClientLabel = useMemo(() => {
    if (clientName.trim()) return clientName.trim();
    return "Client";
  }, [clientName]);

  const previewTotal = useMemo(
    () =>
      previewLines.reduce((s, l) => {
        const u = l.unit ?? lineUnitForDescription(l.description);
        return countsTowardInvoiceTotal(u) ? s + l.amount : s;
      }, 0),
    [previewLines],
  );

  const openPrintReview = () => setConfirmPrintOpen(true);

  const runSystemPrint = () => {
    const draftInv: Invoice = {
      id: "print-preview",
      clientId: clientId || null,
      clientName: previewClientLabel,
      lineItems: previewLines,
      dueDate: due || new Date().toISOString().slice(0, 10),
      status,
      createdAt: new Date().toISOString(),
      eodLogIds: mode === "eod" ? pickedEod : [],
      businessAgencyName: businessAgencyName.trim() || undefined,
      ownerFullName: ownerFullName.trim() || undefined,
      signatureMode: sigMode,
      signatureTypedName:
        sigMode === "type" ? sigTypedName.trim() || undefined : undefined,
      signatureImageDataUrl:
        sigMode === "upload" && sigImageDataUrl ? sigImageDataUrl : undefined,
      signatureDesignation: sigDesignation.trim() || undefined,
    };
    openInvoicePrint(draftInv);
    setConfirmPrintOpen(false);
  };

  return (
    <section className={glassCard("p-6 md:p-7")}>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Landmark className="h-5 w-5 text-emerald-700" strokeWidth={1.75} />
        {toTitleCase("Native invoicing")}
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Local-first ledger. PDF via your browser print dialog — optional cloud
        sync can layer on later.
        {activeClientId ? (
          <span className="ml-1 font-semibold text-teal-800">
            Showing invoices for the active client only.
          </span>
        ) : null}
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/45 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Total earned
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            ${stats.earned.toFixed(0)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/45 p-4">
          <div className="text-xs font-bold uppercase text-slate-500">
            Upcoming
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            ${stats.upcomingAmt.toFixed(0)}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-4">
          <div className="text-xs font-bold uppercase text-rose-800/80">
            Missed / overdue
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-rose-900">
            ${stats.overdueAmt.toFixed(0)}
            <span className="ml-2 text-sm font-semibold">
              ({stats.overdueCount})
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-600"
      >
        <Plus className="h-4 w-4" />
        New invoice
      </button>

      <ul className="space-y-2">
        {visibleInvoices.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/55 bg-white/40 px-4 py-3 text-sm"
          >
            <div>
              <div className="font-semibold text-slate-900">{inv.clientName}</div>
              <div className="text-xs text-slate-500">
                Due {inv.dueDate} ·{" "}
                {inv.lineItems.reduce((s, l) => s + l.amount, 0).toFixed(2)} USD
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-xs font-semibold capitalize"
                value={inv.status}
                onChange={(e) =>
                  onUpdateStatus(inv.id, e.target.value as InvoiceStatus)
                }
              >
                {(["draft", "sent", "paid", "overdue"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openInvoicePrint(inv)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
              >
                PDF / print
              </button>
              <button
                type="button"
                onClick={() => onRemove(inv.id)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {visibleInvoices.length === 0 && (
          <li className="text-sm text-slate-500">No invoices in this view.</li>
        )}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-stretch justify-center bg-slate-950/70 p-2 backdrop-blur-md sm:p-4">
          <div
            className="input-section flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-solid border-white/10 bg-[rgba(255,255,255,0.06)] shadow-2xl backdrop-blur-[12px] md:flex-row"
            role="dialog"
            aria-modal
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-b border-white/10 p-5 md:w-1/2 md:border-b-0 md:border-r md:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="font-[family-name:var(--font-outfit)] text-lg font-bold text-slate-100">
                  Invoice builder
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="mb-4 flex gap-2 rounded-xl bg-slate-900/40 p-1 text-xs font-semibold text-slate-200">
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 ${mode === "manual" ? "bg-white/15 shadow" : ""}`}
                  onClick={() => setMode("manual")}
                >
                  Manual
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 ${mode === "eod" ? "bg-white/15 shadow" : ""}`}
                  onClick={() => setMode("eod")}
                >
                  From EOD logs
                </button>
              </div>

              {mode === "manual" ? (
                <div className="grid flex-1 gap-3 text-sm">
                  <label className="font-medium text-slate-200">
                    Client
                    <select
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                      value={clientId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setClientId(id);
                        const c = clients.find((x) => x.id === id);
                        if (c) {
                          setBusinessAgencyName(c.name);
                          setClientName("");
                        }
                      }}
                    >
                      <option value="">Custom name below</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    placeholder="Bill to (contact or company name)"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    placeholder="Business / agency name"
                    value={businessAgencyName}
                    onChange={(e) => setBusinessAgencyName(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    placeholder="Your full name (owner)"
                    value={ownerFullName}
                    onChange={(e) => setOwnerFullName(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                      <span>Line items</span>
                      <button
                        type="button"
                        onClick={() =>
                          setLineRows((rows) => [
                            ...rows,
                            { description: "", amount: "", unit: "currency" },
                          ])
                        }
                        className="rounded-lg border border-[#00ffc8]/40 px-2 py-1 text-[10px] text-[#00ffc8] hover:bg-[#00ffc8]/10"
                      >
                        + Row
                      </button>
                    </div>
                    {lineRows.map((row, idx) => {
                      const unit = unitForRow(row);
                      const qty = unit !== "currency";
                      return (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900/40 px-2 py-2 text-slate-100"
                          placeholder="Description"
                          value={row.description}
                          onChange={(e) => {
                            const description = e.target.value;
                            setLineRows((rows) =>
                              rows.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      description,
                                      unit: lineUnitForDescription(description),
                                    }
                                  : r
                              )
                            );
                          }}
                        />
                        <input
                          type="number"
                          min={0}
                          step={qty ? 1 : 0.01}
                          className="w-24 shrink-0 rounded-xl border border-white/10 bg-slate-900/40 px-2 py-2 text-right text-slate-100"
                          placeholder={qty ? "#" : "$"}
                          value={row.amount}
                          onChange={(e) =>
                            setLineRows((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, amount: e.target.value } : r
                              )
                            )
                          }
                        />
                        {lineRows.length > 1 ? (
                          <button
                            type="button"
                            className="shrink-0 text-slate-500 hover:text-rose-400"
                            aria-label="Remove line"
                            onClick={() =>
                              setLineRows((rows) =>
                                rows.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3 text-sm text-slate-200">
                  <p className="text-slate-400">
                    Pull accomplishments from saved EOD logs into one invoice line.
                    Add hours and days below (same as manual).
                  </p>
                  <ul className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/30 p-2">
                    {eodPickerLogs.map((l) => (
                      <li key={l.id}>
                        <label className="flex cursor-pointer gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={pickedEod.includes(l.id)}
                            onChange={(e) => {
                              setPickedEod((prev) =>
                                e.target.checked
                                  ? [...prev, l.id]
                                  : prev.filter((x) => x !== l.id)
                              );
                            }}
                          />
                          <span className="line-clamp-2 text-slate-100">
                            {l.accomplishments.slice(0, 120) || "Empty log"}
                          </span>
                        </label>
                      </li>
                    ))}
                    {eodPickerLogs.length === 0 && (
                      <li className="text-slate-500">No EOD logs in this view.</li>
                    )}
                  </ul>
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    placeholder="Bundle amount (default: 150 × logs)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Hours &amp; days
                    </div>
                    {lineRows
                      .filter((r) => unitForRow(r) !== "currency")
                      .map((row) => {
                        const idx = lineRows.indexOf(row);
                        const unit = unitForRow(row);
                        return (
                          <div key={idx} className="flex gap-2">
                            <span className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-slate-900/30 px-2 py-2 text-xs text-slate-300">
                              {row.description}
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="w-24 shrink-0 rounded-xl border border-white/10 bg-slate-900/40 px-2 py-2 text-right text-slate-100"
                              placeholder="#"
                              value={row.amount}
                              onChange={(e) =>
                                setLineRows((rows) =>
                                  rows.map((r, i) =>
                                    i === idx
                                      ? { ...r, amount: e.target.value }
                                      : r
                                  )
                                )
                              }
                            />
                            <span className="self-center text-[10px] uppercase text-slate-500">
                              {unit === "hours" ? "hrs" : "days"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/30 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Signature
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSigMode("type")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      sigMode === "type"
                        ? "bg-[#00ffc8]/25 text-[#00ffc8] ring-1 ring-[#00ffc8]/50"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    Type signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode("upload")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      sigMode === "upload"
                        ? "bg-[#00ffc8]/25 text-[#00ffc8] ring-1 ring-[#00ffc8]/50"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    Upload signature
                  </button>
                </div>
                {sigMode === "type" ? (
                  <>
                    <input
                      className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                      placeholder="Sign as typed name"
                      value={sigTypedName}
                      onChange={(e) => setSigTypedName(e.target.value)}
                    />
                  </>
                ) : (
                  <input
                    type="file"
                    accept="image/png"
                    className="mt-2 w-full text-xs text-slate-200"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () =>
                        setSigImageDataUrl(String(r.result ?? ""));
                      r.readAsDataURL(f);
                    }}
                  />
                )}
                <input
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
                  placeholder="Designation (e.g. Automation Specialist, VA, Accountant)"
                  value={sigDesignation}
                  onChange={(e) => setSigDesignation(e.target.value)}
                />
              </div>

              <label className="mt-4 block text-xs font-medium text-slate-300">
                Status
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm capitalize text-slate-100"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                >
                  {(["draft", "sent", "paid", "overdue"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={openPrintReview}
                  className="rounded-xl border border-[#00ffc8]/50 bg-[#00ffc8]/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#00ffc8] hover:bg-[#00ffc8]/25"
                >
                  Print preview
                </button>
                <button
                  type="button"
                  onClick={submitInvoice}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-white"
                >
                  Save locally
                </button>
              </div>
            </div>

            <div className="invoice-preview-card flex min-h-[280px] flex-1 flex-col bg-slate-50 p-6 md:w-1/2">
              <div
                id={confirmPrintOpen ? undefined : "printable-invoice"}
                className="invoice-preview-card flex h-full flex-col rounded-2xl border border-teal-200/60 bg-white p-6 shadow-inner"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
                  Preview
                </p>
                <h4 className="mt-2 font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">
                  Invoice
                </h4>
                {businessAgencyName.trim() ? (
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {businessAgencyName.trim()}
                  </p>
                ) : null}
                {ownerFullName.trim() ? (
                  <p className="text-sm text-slate-600">{ownerFullName.trim()}</p>
                ) : null}
                {sigDesignation.trim() ? (
                  <p className="text-sm font-semibold text-slate-600">
                    {sigDesignation.trim()}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-slate-600">
                  <strong>Bill to:</strong> {previewClientLabel}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Due:</strong>{" "}
                  {due || new Date().toISOString().slice(0, 10)}
                </p>
                <table className="mt-6 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewLines.map((l, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="whitespace-pre-wrap py-2 text-slate-800">
                          {l.description}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-900">
                          {formatInvoiceLineAmount(
                            l.description,
                            l.amount,
                            l.unit,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-8 border-t border-slate-200 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Signature
                  </p>
                  {sigMode === "type" && sigTypedName.trim() ? (
                    <p
                      className="mt-2 text-3xl text-slate-900"
                      style={{
                        fontFamily:
                          '"Brush Script MT", "Segoe Script", "Apple Chancery", cursive',
                      }}
                    >
                      {sigTypedName.trim()}
                    </p>
                  ) : null}
                  {sigDesignation.trim() ? (
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {sigDesignation.trim()}
                    </p>
                  ) : null}
                  {sigMode === "upload" && sigImageDataUrl ? (
                    <img
                      src={sigImageDataUrl}
                      alt="Signature"
                      className="mt-2 max-h-20 object-contain"
                    />
                  ) : null}
                  {!sigTypedName.trim() && !sigImageDataUrl ? (
                    <p className="mt-2 text-xs text-slate-400">No signature provided.</p>
                  ) : null}
                </div>
                <div className="mt-auto border-t border-teal-100 pt-4 text-right text-lg font-bold text-teal-900">
                  Total ${previewTotal.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmPrintOpen ? (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-50 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Print review</h3>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
                onClick={() => setConfirmPrintOpen(false)}
              >
                Close
              </button>
            </div>
            <div
              id="printable-invoice"
              className="invoice-preview-card flex flex-col rounded-2xl border border-teal-200/60 bg-white p-6 shadow-inner"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">
                Preview
              </p>
              <h4 className="mt-2 font-[family-name:var(--font-outfit)] text-2xl font-bold text-slate-900">
                Invoice
              </h4>
              {businessAgencyName.trim() ? (
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {businessAgencyName.trim()}
                </p>
              ) : null}
              {ownerFullName.trim() ? (
                <p className="text-sm text-slate-600">{ownerFullName.trim()}</p>
              ) : null}
              {sigDesignation.trim() ? (
                <p className="text-sm font-semibold text-slate-600">
                  {sigDesignation.trim()}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                <strong>Bill to:</strong> {previewClientLabel}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Due:</strong>{" "}
                {due || new Date().toISOString().slice(0, 10)}
              </p>
              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLines.map((l, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="whitespace-pre-wrap py-2 text-slate-800">
                        {l.description}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-slate-900">
                        {formatInvoiceLineAmount(
                          l.description,
                          l.amount,
                          l.unit,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 border-t border-slate-200 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Signature
                </p>
                {sigMode === "type" && sigTypedName.trim() ? (
                  <p
                    className="mt-2 text-3xl text-slate-900"
                    style={{
                      fontFamily:
                        '"Brush Script MT", "Segoe Script", "Apple Chancery", cursive',
                    }}
                  >
                    {sigTypedName.trim()}
                  </p>
                ) : null}
                {sigDesignation.trim() ? (
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {sigDesignation.trim()}
                  </p>
                ) : null}
                {sigMode === "upload" && sigImageDataUrl ? (
                  <img
                    src={sigImageDataUrl}
                    alt="Signature"
                    className="mt-2 max-h-20 object-contain"
                  />
                ) : null}
                {!sigTypedName.trim() && !sigImageDataUrl ? (
                  <p className="mt-2 text-xs text-slate-400">No signature provided.</p>
                ) : null}
              </div>
              <div className="mt-6 border-t border-teal-100 pt-4 text-right text-lg font-bold text-teal-900">
                Total ${previewTotal.toFixed(2)}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800"
                onClick={() => setConfirmPrintOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                onClick={runSystemPrint}
              >
                Confirm &amp; print
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
