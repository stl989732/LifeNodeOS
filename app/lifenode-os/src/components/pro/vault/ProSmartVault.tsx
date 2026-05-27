"use client";

import { Database, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";
import type { PronodeVaultRow } from "@/src/components/pro/vault/pronodeVaultTypes";
import { getVaultNodeTypesForProRole } from "@/src/lib/proNode/workspaceContext";
import type { ProRoleId } from "@/src/lib/proNode/types";

type Props = {
  onLoadDocument: (row: PronodeVaultRow) => void;
  refreshKey?: number;
  proRole?: ProRoleId;
};

export default function ProSmartVault({
  onLoadDocument,
  refreshKey = 0,
  proRole = "legal",
}: Props) {
  const [rows, setRows] = useState<PronodeVaultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const vaultNodeTypes = useMemo(
    () => getVaultNodeTypesForProRole(proRole),
    [proRole],
  );
  const vaultFilterKey = useMemo(() => vaultNodeTypes.join(","), [vaultNodeTypes]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent && hasLoadedOnceRef.current;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        let query = supabase
          .from("pronode_vault")
          .select("id,title,node_type,content,updated_at")
          .order("updated_at", { ascending: false });

        if (vaultNodeTypes.length === 1) {
          query = query.eq("node_type", vaultNodeTypes[0]);
        } else if (vaultNodeTypes.length > 1) {
          query = query.in("node_type", vaultNodeTypes);
        }

        const { data, error: qErr } = await query;
        if (qErr) throw qErr;
        setRows((data as PronodeVaultRow[]) ?? []);
        hasLoadedOnceRef.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load vault.");
        if (!hasLoadedOnceRef.current) setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vaultNodeTypes],
  );

  useEffect(() => {
    void load({ silent: hasLoadedOnceRef.current });
  }, [load, refreshKey, vaultFilterKey]);

  const showInitialLoading = loading && rows.length === 0;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#1E293B]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Smart Vault
          </h2>
          {refreshing ? (
            <span className="text-[10px] font-medium text-slate-400">Refreshing…</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={loading && rows.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {showInitialLoading ? (
        <p className="text-xs text-slate-500" role="status" aria-live="polite">
          Loading vault…
        </p>
      ) : error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : showEmpty ? (
        <p className="text-xs text-slate-500">No saved documents yet.</p>
      ) : (
        <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {row.node_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onLoadDocument(row)}
                className="shrink-0 rounded-xl bg-[#1E293B] px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Load In Editor
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
