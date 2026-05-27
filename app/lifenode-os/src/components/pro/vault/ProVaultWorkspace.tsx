"use client";

import type { JSONContent } from "@tiptap/core";
import { FilePlus2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ProFocusEditorShell from "@/src/components/pro/vault/ProFocusEditorShell";
import ProSmartVault from "@/src/components/pro/vault/ProSmartVault";
import {
  EMPTY_DOC,
  type PronodeVaultRow,
} from "@/src/components/pro/vault/pronodeVaultTypes";
import type { ProRoleId } from "@/src/lib/proNode/types";

const ROLE_NODE_TYPE: Record<string, string> = {
  legal: "Legal",
  medical: "Medical",
  engineering: "Engineering",
  teacher: "Teacher",
  tech: "Tech",
  coach: "Coach",
  designer: "Designer",
};

type Props = {
  /** ProNode role id — maps default vault node type */
  proRole?: ProRoleId;
};

export default function ProVaultWorkspace({ proRole = "legal" }: Props) {
  const [vaultRefresh, setVaultRefresh] = useState(0);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [vaultId, setVaultId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("Untitled note");
  const [nodeType, setNodeType] = useState(() => ROLE_NODE_TYPE[proRole] ?? "General");
  const [content, setContent] = useState<JSONContent>(EMPTY_DOC);

  const defaultNodeType = useMemo(
    () => ROLE_NODE_TYPE[proRole] ?? "General",
    [proRole],
  );

  const openNew = useCallback(() => {
    setVaultId(crypto.randomUUID());
    setTitle("Untitled note");
    setNodeType(defaultNodeType);
    setContent(EMPTY_DOC);
    setSessionOpen(true);
  }, [defaultNodeType]);

  const openRow = useCallback((row: PronodeVaultRow) => {
    setVaultId(row.id);
    setTitle(row.title);
    setNodeType(row.node_type || "General");
    setContent((row.content as JSONContent) ?? EMPTY_DOC);
    setSessionOpen(true);
  }, []);

  const onSaved = useCallback(() => {
    setVaultRefresh((n) => n + 1);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Advanced Focus
          </p>
          <h2 className="text-base font-bold text-[#1E293B]">Smart Vault & Rich Editor</h2>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
        >
          <FilePlus2 className="h-4 w-4" />
          New Vault Note
        </button>
      </div>

      <ProSmartVault onLoadDocument={openRow} refreshKey={vaultRefresh} proRole={proRole} />

      <ProFocusEditorShell
        sessionOpen={sessionOpen}
        onSessionClose={() => setSessionOpen(false)}
        vaultId={vaultId}
        title={title}
        onTitleChange={setTitle}
        nodeType={nodeType}
        onNodeTypeChange={setNodeType}
        content={content}
        onContentChange={setContent}
        onSaved={onSaved}
      />
    </div>
  );
}
