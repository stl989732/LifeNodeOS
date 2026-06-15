"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { InboxClientItem } from "@/src/lib/orchestrator/inboxDb";
import type { InboxSource } from "@/src/lib/orchestrator/types";
import { readInboxDrag } from "@/src/lib/orchestrator/inboxDrag";
import InboxList from "./InboxList";
import InboxMessageModal from "./InboxMessageModal";
import IntegrationRail from "./IntegrationRail";

export default function InboxDashboard() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const feature = searchParams.get("ln-feature");
  const [items, setItems] = useState<InboxClientItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<InboxSource | "all">("all");
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
    if (feature === "gmail" || feature === "slack" || feature === "google_calendar") {
      setSourceFilter(feature);
    } else if (feature === "overview" || !feature) {
      setSourceFilter("all");
    }
  }, [feature]);

  useEffect(() => {
    if (selectedId && modalOpen) void loadDetail(selectedId);
  }, [selectedId, modalOpen, loadDetail]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setModalOpen(true);
    void loadDetail(id);
  }, [loadDetail]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleTransfer = useCallback(async (body: Record<string, unknown>) => {
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
  }, [selectedId, load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!modalOpen || !selectedId || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "z" || e.key === "Z") {
        void handleTransfer({ type: "backlog" });
      }
      if (e.key === "s" || e.key === "S") {
        void handleTransfer({ type: "today" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, selectedId, handleTransfer]);

  async function handleArchive() {
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
  }

  async function handleReply(text: string) {
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
  }

  function handleDropTransfer(e: React.DragEvent, body: Record<string, unknown>) {
    e.preventDefault();
    const drag = readInboxDrag(e);
    if (drag?.inboxItemId) {
      setSelectedId(drag.inboxItemId);
      setModalOpen(true);
      void handleTransfer(body);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-600">
        Sign in to open your unified inbox.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top,0px)-var(--ln-node-nav-chrome-block,0px)-2rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Inbox</h1>
          <p className="text-xs text-slate-500">
            Gmail, Slack, and Calendar in one feed
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync
        </button>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="relative w-full max-w-sm shrink-0">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading inbox items" />
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

        <div
          className="hidden min-w-0 flex-1 items-center justify-center bg-slate-50/50 lg:flex"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDropTransfer(e, { type: "today" })}
        >
          <p className="max-w-sm px-6 text-center text-sm text-slate-500">
            Select a message to open it in a full view. Drag items to schedule or
            transfer.
          </p>
        </div>

        <IntegrationRail />
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

      {!session?.user?.id ? null : (
        <p className="sr-only" aria-live="polite">
          {items.length} inbox items loaded
        </p>
      )}
    </div>
  );
}
