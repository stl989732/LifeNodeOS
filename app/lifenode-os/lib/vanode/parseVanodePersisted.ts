import type {
  ClientCredential,
  ScratchPadSavedEntry,
  ScratchPadTag,
  VanodePersisted,
} from "./types";
import { defaultVanodePersisted } from "./constants";

/** Normalize partial JSON (local or server) into a full VanodePersisted shape. */
export function parseVanodePersisted(
  parsed: Partial<VanodePersisted> | null | undefined,
): VanodePersisted {
  if (!parsed || typeof parsed !== "object") return defaultVanodePersisted();

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
      const allowed: ScratchPadTag[] = [
        "URGENT",
        "GENERAL",
        "HIGH_PRIORITY",
        "RANDOM",
      ];
      const arr = raw as unknown[];
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
}

export function hasMeaningfulVanodeData(data: VanodePersisted): boolean {
  if (data.discoveryComplete) return true;
  if (data.notes.length > 0) return true;
  if (data.clients.length > 0) return true;
  if (data.eodLogs.length > 0) return true;
  if (data.invoices.length > 0) return true;
  if (data.waitingTasks.length > 0) return true;
  if (data.liveTranscripts.length > 0) return true;
  if (data.scratchPadSaves.length > 0) return true;
  if (data.scratchPad.text.trim().length > 0) return true;
  if (data.syncedToolIds.length > 0) return true;
  return false;
}
