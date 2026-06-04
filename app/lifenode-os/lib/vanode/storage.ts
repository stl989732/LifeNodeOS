import type {
  VanodePersisted,
  ClientCredential,
  ScratchPadSavedEntry,
  ScratchPadTag,
} from "./types";
import { VANODE_STORAGE_KEY, defaultVanodePersisted } from "./constants";

export function loadVanode(storageKey: string = VANODE_STORAGE_KEY): VanodePersisted {
  if (typeof window === "undefined") return defaultVanodePersisted();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultVanodePersisted();
    const parsed = JSON.parse(raw) as Partial<VanodePersisted>;
    const d = defaultVanodePersisted();
    const waitingTasksRaw = parsed.waitingTasks ?? d.waitingTasks;
    const migratedWaiting = waitingTasksRaw.map((w) => ({
      ...w,
      createdAt:
        "createdAt" in w && typeof (w as { createdAt?: string }).createdAt === "string"
          ? (w as { createdAt: string }).createdAt
          : new Date().toISOString(),
    }));

    return {
      ...d,
      ...parsed,
      nativeTools: { ...d.nativeTools, ...parsed.nativeTools },
      settings: { ...d.settings, ...parsed.settings },
      scratchPad: (() => {
        const sp = parsed.scratchPad;
        if (!sp || typeof sp !== "object") return d.scratchPad;
        const allowed: ScratchPadTag[] = [
          "URGENT",
          "GENERAL",
          "HIGH_PRIORITY",
          "RANDOM",
        ];
        const tags = Array.isArray(sp.tags)
          ? sp.tags.filter((t): t is ScratchPadTag =>
              allowed.includes(t as ScratchPadTag),
            )
          : d.scratchPad.tags;
        return {
          text: typeof sp.text === "string" ? sp.text : d.scratchPad.text,
          tags,
        };
      })(),
      scratchPadSaves: (() => {
        const raw = parsed.scratchPadSaves;
        if (!Array.isArray(raw)) return d.scratchPadSaves;
        const arr = raw as unknown[];
        const allowed: ScratchPadTag[] = [
          "URGENT",
          "GENERAL",
          "HIGH_PRIORITY",
          "RANDOM",
        ];
        return arr
          .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
          .map((x): ScratchPadSavedEntry | null => {
            const id = typeof x.id === "string" ? x.id : "";
            const text = typeof x.text === "string" ? x.text : "";
            const savedAt =
              typeof x.savedAt === "string"
                ? x.savedAt
                : new Date().toISOString();
            const tags = Array.isArray(x.tags)
              ? x.tags.filter((t): t is ScratchPadTag =>
                  allowed.includes(t as ScratchPadTag),
                )
              : [];
            if (!id || !text.trim()) return null;
            return { id, text, tags, savedAt };
          })
          .filter((e): e is ScratchPadSavedEntry => e !== null);
      })(),
      activeClientId: parsed.activeClientId ?? d.activeClientId,
      valueMetrics: { ...d.valueMetrics, ...parsed.valueMetrics },
      liveTranscripts: parsed.liveTranscripts ?? d.liveTranscripts,
      syncedToolIds: parsed.syncedToolIds ?? d.syncedToolIds,
      clients: (parsed.clients ?? d.clients).map((c) => ({
        ...c,
        credentials: Array.isArray(
          (c as { credentials?: ClientCredential[] }).credentials,
        )
          ? (c as { credentials: ClientCredential[] }).credentials
          : [],
      })),
      notes: parsed.notes ?? d.notes,
      eodLogs: parsed.eodLogs ?? d.eodLogs,
      waitingTasks: migratedWaiting,
      invoices: parsed.invoices ?? d.invoices,
    };
  } catch {
    return defaultVanodePersisted();
  }
}

export function saveVanode(
  data: VanodePersisted,
  storageKey: string = VANODE_STORAGE_KEY,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(data));
}
