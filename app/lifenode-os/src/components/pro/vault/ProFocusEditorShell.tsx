"use client";

import type { JSONContent } from "@tiptap/core";
import {
  Download,
  Expand,
  Minus,
  Printer,
  Save,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import ProTiptapSurface from "@/src/components/pro/vault/ProTiptapSurface";
import { exportVaultDocxFromHtml, exportVaultPdf } from "@/src/components/pro/vault/vaultExport";
import {
  EMPTY_DOC,
  SHARES_TABLE,
  type PronodeVaultRow,
} from "@/src/components/pro/vault/pronodeVaultTypes";
import { usePersistenceUserId } from "@/src/hooks/usePersistenceUserId";

type ShellMode = "open" | "fullscreen" | "minimized";

type Props = {
  sessionOpen: boolean;
  onSessionClose: () => void;
  vaultId: string;
  title: string;
  onTitleChange: (t: string) => void;
  nodeType: string;
  onNodeTypeChange: (t: string) => void;
  content: JSONContent;
  onContentChange: (j: JSONContent) => void;
  onSaved?: (row: PronodeVaultRow) => void;
};

const PANEL = "rounded-2xl border border-slate-200/90 bg-white shadow-sm";
const CTRL =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100";

export default function ProFocusEditorShell({
  sessionOpen,
  onSessionClose,
  vaultId,
  title,
  onTitleChange,
  nodeType,
  onNodeTypeChange,
  content,
  onContentChange,
  onSaved,
}: Props) {
  const editorRef = useRef<import("@tiptap/core").Editor | null>(null);
  const printRootRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ShellMode>("open");
  const [saving, setSaving] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const persistenceUserId = usePersistenceUserId();

  useEffect(() => {
    if (sessionOpen) {
      setMode("open");
      setMessage(null);
    }
  }, [sessionOpen]);

  const docKey = vaultId;

  const setMinimized = useCallback(() => setMode("minimized"), []);
  const restore = useCallback(() => setMode("open"), []);
  const toggleFullscreen = useCallback(() => {
    setMode((m) => (m === "fullscreen" ? "open" : "fullscreen"));
  }, []);

  const handleClose = useCallback(() => {
    onSessionClose();
  }, [onSessionClose]);

  const capturePrintClone = useCallback(() => {
    const inner = document.getElementById("pro-vault-editor-root");
    if (!inner) return;
    const host = document.getElementById("pro-vault-print-mount");
    if (!host) return;
    host.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.id = "pro-vault-print-root";
    wrap.className = "pro-vault-print-root text-slate-900";
    wrap.appendChild(inner.cloneNode(true));
    host.appendChild(wrap);
  }, []);

  const handlePrint = useCallback(() => {
    capturePrintClone();
    document.documentElement.dataset.lnPrint = "vault";
    const t = window.setTimeout(() => {
      window.print();
      window.clearTimeout(t);
      delete document.documentElement.dataset.lnPrint;
    }, 120);
  }, [capturePrintClone]);

  const handleDownload = useCallback(async (kind: "pdf" | "docx") => {
    try {
      if (mode === "minimized") {
        setMessage("Restore the editor from the dock to export PDF.");
        return;
      }
      const root = document.getElementById("pro-vault-editor-canvas");
      const html = editorRef.current?.getHTML() ?? "";
      if (kind === "pdf") {
        if (!root) return;
        await exportVaultPdf(root);
      } else {
        await exportVaultDocxFromHtml(html);
      }
      setMessage(kind === "pdf" ? "PDF saved." : "DOCX saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed.");
    }
  }, [mode]);

  const handleSave = useCallback(async () => {
    if (!persistenceUserId) {
      setMessage("Sign in to save to your vault.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        id: vaultId,
        user_id: persistenceUserId,
        title: title.trim() || "Untitled",
        node_type: nodeType || "General",
        content: editorRef.current?.getJSON() ?? content,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("pronode_vault")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      if (data) onSaved?.(data as PronodeVaultRow);
      setMessage("Saved to vault.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [content, nodeType, persistenceUserId, title, vaultId, onSaved]);

  const handleShare = useCallback(async () => {
    setShareBusy(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const expires = new Date(Date.now() + 86_400_000).toISOString();
      const snapshot = editorRef.current?.getJSON() ?? content;
      const { error } = await supabase.from(SHARES_TABLE).insert({
        vault_id: vaultId,
        token,
        snapshot,
        expires_at: expires,
      });
      if (error) throw error;
      const url = `${window.location.origin}/pro/vault/share/${token}`;
      await navigator.clipboard.writeText(url);
      setMessage("Share link copied (24h).");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Share failed.");
    } finally {
      setShareBusy(false);
    }
  }, [content, vaultId]);

  const shellClass = useMemo(() => {
    const base = `${PANEL} fixed z-[80] flex flex-col overflow-hidden border-slate-200`;
    if (!sessionOpen) {
      return `${base} hidden`;
    }
    if (mode === "minimized") {
      return `${base} pointer-events-none fixed bottom-0 right-6 h-[min(85vh,800px)] w-[min(920px,94vw)] max-w-full translate-y-[125%] opacity-0`;
    }
    if (mode === "fullscreen") {
      return `${base} inset-4 md:inset-6`;
    }
    return `${base} bottom-6 right-6 top-auto left-auto h-[min(85vh,800px)] w-[min(920px,94vw)] max-w-full`;
  }, [sessionOpen, mode]);

  return (
    <>
      {sessionOpen && mode === "minimized" ? (
        <button
          type="button"
          onClick={restore}
          className="fixed bottom-6 right-6 z-[90] flex max-w-sm items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50"
        >
          <span className="truncate">{title || "Untitled"}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
            Editor
          </span>
        </button>
      ) : null}

      {sessionOpen ? (
        <div
          className={shellClass}
          aria-hidden={mode === "minimized"}
        >
          <div
            className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2"
            data-pro-vault-chrome
          >
            <div className="flex gap-1">
              <button type="button" className={CTRL} title="Minimize" onClick={setMinimized}>
                <Minus className="h-4 w-4" />
              </button>
              <button type="button" className={CTRL} title="Fullscreen" onClick={toggleFullscreen}>
                <Expand className="h-4 w-4" />
              </button>
              <button type="button" className={CTRL} title="Close" onClick={handleClose}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none ring-slate-300 focus:ring-2"
              placeholder="Title"
            />
            <select
              value={nodeType}
              onChange={(e) => onNodeTypeChange(e.target.value)}
              className="max-w-[112px] shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 sm:max-w-none"
            >
              {[
                "Designer",
                "Legal",
                "Teacher",
                "Medical",
                "Engineering",
                "Coach",
                "Tech",
                "General",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => void handleDownload("pdf")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                type="button"
                onClick={() => void handleDownload("docx")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" /> DOCX
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button
                type="button"
                disabled={shareBusy}
                onClick={() => void handleShare()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-1 rounded-lg bg-[#1E293B] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>

          {message ? (
            <p className="border-b border-slate-100 bg-sky-50/90 px-3 py-1.5 text-[11px] text-sky-900">
              {message}
            </p>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            <ProTiptapSurface
              docKey={docKey}
              initialDoc={content ?? EMPTY_DOC}
              onChange={onContentChange}
              editorRef={editorRef}
            />
          </div>
        </div>
      ) : null}

      {/* Hidden print mount — clone editor HTML for @media print */}
      <div id="pro-vault-print-mount" ref={printRootRef} className="hidden" />

      {/* Single editor instance: hidden off-viewport when minimized to preserve doc state */}
    </>
  );
}
