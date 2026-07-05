"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { defaultVanodePersisted } from "@/lib/vanode/constants";
import { VANODE_STORAGE_KEY } from "@/lib/vanode/constants";
import { syncActiveClientSession } from "@/lib/vanode/activeClientSession";
import { resolveClientIdForWrite } from "@/lib/vanode/clientScope";
import { loadVanode, saveVanode } from "@/lib/vanode/storage";
import {
  hasMeaningfulVanodeData,
  parseVanodePersisted,
} from "@/lib/vanode/parseVanodePersisted";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";
import { hydrateScreenCaptureManifestFromServer } from "@/lib/vanode/screenCaptureSync";
import {
  NODE_WIDGET_KEYS,
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
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
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;
  const storageKey = userScopedStorageKey(VANODE_STORAGE_KEY, userId);

  const [data, setData] = useState<VanodePersisted>(() =>
    defaultVanodePersisted()
  );
  const persistReady = useRef(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    persistReady.current = false;
    setBootstrapped(false);

    const id = requestAnimationFrame(() => {
      const loaded = loadVanode(storageKey);
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
        if (sessionStatus !== "authenticated" || !userId) {
          setData(applyLoaded(loaded));
          syncActiveClientSession(loaded.activeClientId);
          persistReady.current = true;
          setBootstrapped(true);
          return;
        }

        const remote = await fetchNodeWidgetsWithMeta([
          NODE_WIDGET_KEYS.vanode.dashboard,
        ]);
        const { value: base, pushLocal } = resolveWidgetBootstrap({
          local: loaded,
          localUpdatedAt: readLocalWidgetUpdatedAt(storageKey),
          remote: remote[NODE_WIDGET_KEYS.vanode.dashboard],
          parseRemote: (payload) =>
            parseVanodePersisted(payload as Partial<VanodePersisted>),
          hasMeaningfulLocal: hasMeaningfulVanodeData,
          remoteHasData: (payload) =>
            hasMeaningfulVanodeData(
              parseVanodePersisted(payload as Partial<VanodePersisted>),
            ),
        });

        const merged = applyLoaded(base);
        saveVanode(merged, storageKey);
        if (pushLocal && hasMeaningfulVanodeData(merged)) {
          scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.dashboard, merged, 200);
        }

        await hydrateScreenCaptureManifestFromServer(userId);

        setData(merged);
        syncActiveClientSession(merged.activeClientId);
        persistReady.current = true;
        setBootstrapped(true);
      })();
    });
    return () => cancelAnimationFrame(id);
  }, [storageKey, sessionStatus, userId]);

  useEffect(() => {
    if (!persistReady.current || sessionStatus !== "authenticated" || !userId) {
      return;
    }
    saveVanode(data, storageKey);
    if (hasMeaningfulVanodeData(data)) {
      scheduleNodeWidgetSave(NODE_WIDGET_KEYS.vanode.dashboard, data);
    }
  }, [data, storageKey, sessionStatus, userId]);

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
    const id = uid();
    setData((d) => {
      const row: Note = {
        ...n,
        clientId: resolveClientIdForWrite(d.activeClientId, n.clientId),
        id,
        updatedAt: new Date().toISOString(),
      };
      return { ...d, notes: [row, ...d.notes] };
    });
    return id;
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
    const id = uid();
    const createdAt = new Date().toISOString();
    let row: EodLog = {
      ...log,
      clientId: log.clientId,
      id,
      createdAt,
    };
    setData((d) => {
      row = {
        ...log,
        clientId: resolveClientIdForWrite(d.activeClientId, log.clientId),
        id,
        createdAt,
      };
      return { ...d, eodLogs: [row, ...d.eodLogs] };
    });
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
    const id = uid();
    const createdAt = new Date().toISOString();
    setData((d) => {
      const row: Invoice = {
        ...inv,
        clientId: resolveClientIdForWrite(d.activeClientId, inv.clientId),
        id,
        createdAt,
      };
      return { ...d, invoices: [row, ...d.invoices] };
    });
    return { id, createdAt, ...inv };
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
