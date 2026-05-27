"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { EMPTY_DOC, SHARES_TABLE } from "@/src/components/pro/vault/pronodeVaultTypes";
import { getProVaultExtensions } from "@/src/components/pro/vault/vaultEditorExtensions";

export default function VaultSharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const editor = useEditor({
    extensions: getProVaultExtensions(),
    content: EMPTY_DOC,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "pro-vault-shared min-h-[40vh] px-4 py-4 text-sm text-slate-800 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg",
      },
    },
  });

  useEffect(() => {
    if (!editor || !token) return;
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from(SHARES_TABLE)
          .select("snapshot, expires_at")
          .eq("token", token)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setMessage("This link is invalid or has expired.");
          setStatus("error");
          return;
        }
        const exp = data.expires_at ? new Date(data.expires_at) : null;
        if (exp && exp.getTime() < Date.now()) {
          setMessage("This share link has expired.");
          setStatus("error");
          return;
        }
        const snap = (data.snapshot as JSONContent) ?? EMPTY_DOC;
        if (cancelled) return;
        editor.commands.setContent(snap, { emitUpdate: false });
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Could not load document.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editor, token]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 text-slate-800">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-[#1E293B]">Shared vault document</h1>
          <Link
            href="/pro"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to ProNode
          </Link>
        </div>

        {message ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {message}
          </p>
        ) : null}

        {status === "loading" && !message ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : null}

        {status === "ready" && editor ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <EditorContent editor={editor} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
