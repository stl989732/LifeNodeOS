"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";
import type { InboxSource } from "@/src/lib/orchestrator/types";
import InboxList from "@/src/components/inbox/InboxList";
import InboxMessageModal from "@/src/components/inbox/InboxMessageModal";
import IntegrationRail from "@/src/components/inbox/IntegrationRail";

/** Compact inbox for VANode Unified Feed — read, reply, archive without leaving /vanode. */
export function VanodeInboxEmbed() {
  const { status } = useSession();
  const [items, setItems] = useState<InboxClientItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<InboxSource | "all">("gmail");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load inbox",
        );
      }
      const data = (await res.json()) as { items?: InboxClientItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [status]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/inbox/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Sync failed",
        );
      }
      if (Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "sync_failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/inbox/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { item?: InboxClientItem };
      if (data.item) {
        setItems((prev) =>
          prev.map((row) => (row.id === id ? data.item! : row)),
        );
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId && modalOpen) void loadDetail(selectedId);
  }, [selectedId, modalOpen, loadDetail]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setModalOpen(true);
      void loadDetail(id);
    },
    [loadDetail],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleTransfer = useCallback(
    async (body: Record<string, unknown>) => {
      if (!selectedId) return;
      setTransferBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/inbox/${selectedId}/transfer`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Transfer failed",
          );
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "transfer_failed");
      } finally {
        setTransferBusy(false);
      }
    },
    [selectedId, load],
  );

  const handleArchive = useCallback(async () => {
    if (!selectedId) return;
    try {
      await fetch(`/api/inbox/${selectedId}/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      setSelectedId(null);
      setModalOpen(false);
      await load();
    } catch {
      setError("archive_failed");
    }
  }, [selectedId, load]);

  const handleReply = useCallback(async (text: string) => {
    if (!selectedId) return;
    const res = await fetch(`/api/inbox/${selectedId}/actions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reply", text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        typeof data.error === "string" ? data.error : "Reply failed",
      );
    }
  }, [selectedId]);

  if (status === "unauthenticated") {
    return (
      <p className="rounded-xl border border-dashed border-white/15 bg-white/10 px-4 py-8 text-center text-sm text-slate-600">
        Sign in to read and reply to email from VANode.
      </p>
    );
  }

  return (
    <div className="flex min-h-[min(52vh,28rem)] flex-1 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/20">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/15 px-3 py-2">
        <p className="text-[11px] text-slate-600">
          Gmail, Slack &amp; Calendar — stay on VANode
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <IntegrationRail variant="bar" className="lg:hidden" />
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-800 hover:bg-white disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </button>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-[11px] text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading inbox" />
          </div>
        ) : null}
        <InboxList
          items={items}
          selectedId={selectedId}
          onSelect={handleSelect}
          sourceFilter={sourceFilter}
          onSourceFilter={setSourceFilter}
        />
      </div>

      <InboxMessageModal
        item={selected}
        open={modalOpen && !!selected}
        loading={detailLoading}
        transferBusy={transferBusy}
        onClose={handleCloseModal}
        onArchive={handleArchive}
        onReply={handleReply}
        onTransfer={handleTransfer}
      />
    </div>
  );
}
