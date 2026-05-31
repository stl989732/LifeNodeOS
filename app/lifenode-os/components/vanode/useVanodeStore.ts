"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultVanodePersisted } from "@/lib/vanode/constants";
import { loadVanode, saveVanode } from "@/lib/vanode/storage";
import {
  NODE_WIDGET_KEYS,
  fetchNodeWidgets,
  scheduleNodeWidgetSave,
} from "@/src/lib/nodeWidgetSync";
import {
  clearPendingWhiteboardVault,
  readPendingWhiteboardVault,
} from "@/lib/vanode/whiteboard-vault-pending";
import { downloadVanodeJsonBackup } from "@/lib/vanode/export-backup";
import type {
  ClientProfile,
  EodLog,
  Invoice,
  LiveTranscriptSession,
  NativeToolKey,
  Note,
  ScratchPadState,
  ScratchPadTag,
  ValueMetrics,
  VanodePersisted,
  WaitingTask,
} from "@/lib/vanode/types";

function uid() {
  return crypto.randomUUID();
}

export function useVanodeStore() {
  const [data, setData] = useState<VanodePersisted>(() =>
    defaultVanodePersisted()
  );
  const persistReady = useRef(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const loaded = loadVanode();
      const pending = readPendingWhiteboardVault();
      const applyLoaded = (base: VanodePersisted) => {
        if (pending.length) {
          const additions: Note[] = pending.map((p) => ({
            id: uid(),
            title: p.title,
            body: p.body,
            clientId: p.clientId,
            labels: ["whiteboard", "visual-sop"],
            updatedAt: p.createdAt,
          }));
          clearPendingWhiteboardVault();
          return { ...base, notes: [...additions, ...base.notes] };
        }
        return base;
      };

      void (async () => {
        const remote = await fetchNodeWidgets([NODE_WIDGET_KEYS.vanode.dashboard]);
        const serverPayload = remote[NODE_WIDGET_KEYS.vanode.dashboard];
        let base = loaded;
        if (serverPayload && typeof serverPayload === "object") {
          base = { ...loaded, ...(serverPayload as Partial<VanodePersisted>) };
        }
        const merged = applyLoaded(base);
        if (serverPayload && typeof serverPayload === "object") {
          saveVanode(merged);
        } else {
          scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.dashboard, merged, 200);
        }
        setData(merged);
        persistReady.current = true;
        setBootstrapped(true);
      })();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!persistReady.current) return;
    saveVanode(data);
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.dashboard, data);
  }, [data]);

  const setDiscoveryComplete = useCallback((v: boolean) => {
    setData((d) => ({ ...d, discoveryComplete: v }));
  }, []);

  const toggleSyncedTool = useCallback((id: string) => {
    setData((d) => {
      const has = d.syncedToolIds.includes(id);
      return {
        ...d,
        syncedToolIds: has
          ? d.syncedToolIds.filter((x) => x !== id)
          : [...d.syncedToolIds, id],
      };
    });
  }, []);

  const setNativeTool = useCallback((key: NativeToolKey, v: boolean) => {
    setData((d) => ({
      ...d,
      nativeTools: { ...d.nativeTools, [key]: v },
    }));
  }, []);

  const setCloudSyncRecording = useCallback((v: boolean) => {
    setData((d) => ({
      ...d,
      settings: { ...d.settings, cloudSyncRecording: v },
    }));
  }, []);

  const patchVaSettings = useCallback(
    (patch: Partial<VanodePersisted["settings"]>) => {
      setData((d) => ({
        ...d,
        settings: { ...d.settings, ...patch },
      }));
    },
    [],
  );

  const updateScratchPad = useCallback((patch: Partial<ScratchPadState>) => {
    setData((d) => ({
      ...d,
      scratchPad: { ...d.scratchPad, ...patch },
    }));
  }, []);

  /** Persists draft + appends a snapshot to the saved list when text is non-empty. */
  const saveScratchPad = useCallback(
    (payload: { text: string; tags: ScratchPadTag[] }) => {
      const text = payload.text.trim();
      setData((d) => {
        const scratchPad = { ...d.scratchPad, ...payload };
        if (!text) {
          return { ...d, scratchPad };
        }
        const entry = {
          id: uid(),
          text,
          tags: payload.tags,
          savedAt: new Date().toISOString(),
        };
        return {
          ...d,
          scratchPad,
          scratchPadSaves: [entry, ...d.scratchPadSaves],
        };
      });
    },
    [],
  );

  const removeScratchPadSave = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      scratchPadSaves: d.scratchPadSaves.filter((s) => s.id !== id),
    }));
  }, []);

  const setActiveClientId = useCallback((id: string | null) => {
    setData((d) => ({ ...d, activeClientId: id }));
  }, []);

  const patchValueMetrics = useCallback((patch: Partial<ValueMetrics>) => {
    setData((d) => ({
      ...d,
      valueMetrics: { ...d.valueMetrics, ...patch },
    }));
  }, []);

  const addLiveTranscript = useCallback(
    (row: Omit<LiveTranscriptSession, "id">) => {
      const full: LiveTranscriptSession = { ...row, id: uid() };
      setData((d) => ({ ...d, liveTranscripts: [full, ...d.liveTranscripts] }));
      return full.id;
    },
    [],
  );

  const updateLiveTranscript = useCallback(
    (id: string, patch: Partial<LiveTranscriptSession>) => {
      setData((d) => ({
        ...d,
        liveTranscripts: d.liveTranscripts.map((x) =>
          x.id === id ? { ...x, ...patch } : x,
        ),
      }));
    },
    [],
  );

  const addClient = useCallback((c: Omit<ClientProfile, "id">) => {
    const row: ClientProfile = {
      ...c,
      id: uid(),
      credentials: c.credentials ?? [],
    };
    setData((d) => ({ ...d, clients: [...d.clients, row] }));
    return row.id;
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<ClientProfile>) => {
    setData((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeClient = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      activeClientId: d.activeClientId === id ? null : d.activeClientId,
      clients: d.clients.filter((c) => c.id !== id),
      notes: d.notes.map((n) =>
        n.clientId === id ? { ...n, clientId: null } : n
      ),
      waitingTasks: d.waitingTasks.map((w) =>
        w.clientId === id ? { ...w, clientId: null } : w
      ),
    }));
  }, []);

  const addNote = useCallback((n: Omit<Note, "id" | "updatedAt">) => {
    const row: Note = {
      ...n,
      id: uid(),
      updatedAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, notes: [row, ...d.notes] }));
    return row.id;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setData((d) => ({
      ...d,
      notes: d.notes.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n
      ),
    }));
  }, []);

  const removeNote = useCallback((id: string) => {
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }, []);

  const addEodLog = useCallback((log: Omit<EodLog, "id" | "createdAt">) => {
    const row: EodLog = {
      ...log,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, eodLogs: [row, ...d.eodLogs] }));
    return row;
  }, []);

  const addWaitingTask = useCallback(
    (t: Omit<WaitingTask, "id" | "createdAt">) => {
      const row: WaitingTask = {
        ...t,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      setData((d) => ({ ...d, waitingTasks: [...d.waitingTasks, row] }));
      return row.id;
    },
    [],
  );

  const removeWaitingTask = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      waitingTasks: d.waitingTasks.filter((w) => w.id !== id),
    }));
  }, []);

  const addInvoice = useCallback((inv: Omit<Invoice, "id" | "createdAt">) => {
    const row: Invoice = {
      ...inv,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, invoices: [row, ...d.invoices] }));
    return row;
  }, []);

  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    setData((d) => ({
      ...d,
      invoices: d.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const removeInvoice = useCallback((id: string) => {
    setData((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) }));
  }, []);

  const exportJson = useCallback(() => {
    downloadVanodeJsonBackup(data);
  }, [data]);

  const actions = useMemo(
    () => ({
      setDiscoveryComplete,
      toggleSyncedTool,
      setNativeTool,
      setCloudSyncRecording,
      patchVaSettings,
      updateScratchPad,
      saveScratchPad,
      removeScratchPadSave,
      setActiveClientId,
      patchValueMetrics,
      addLiveTranscript,
      updateLiveTranscript,
      addClient,
      updateClient,
      removeClient,
      addNote,
      updateNote,
      removeNote,
      addEodLog,
      addWaitingTask,
      removeWaitingTask,
      addInvoice,
      updateInvoice,
      removeInvoice,
      exportJson,
    }),
    [
      setDiscoveryComplete,
      toggleSyncedTool,
      setNativeTool,
      setCloudSyncRecording,
      patchVaSettings,
      updateScratchPad,
      saveScratchPad,
      removeScratchPadSave,
      setActiveClientId,
      patchValueMetrics,
      addLiveTranscript,
      updateLiveTranscript,
      addClient,
      updateClient,
      removeClient,
      addNote,
      updateNote,
      removeNote,
      addEodLog,
      addWaitingTask,
      removeWaitingTask,
      addInvoice,
      updateInvoice,
      removeInvoice,
      exportJson,
    ],
  );

  return { data, bootstrapped, ...actions };
}
