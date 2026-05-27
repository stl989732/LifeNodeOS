import type { Note } from "./types";

const KEY = "lifenode_wb_vault_pending_v1";

export type PendingWhiteboardVault = {
  title: string;
  body: string;
  clientId: string | null;
  createdAt: string;
};

export function readPendingWhiteboardVault(): PendingWhiteboardVault[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is PendingWhiteboardVault =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as PendingWhiteboardVault).title === "string" &&
        typeof (x as PendingWhiteboardVault).body === "string",
    );
  } catch {
    return [];
  }
}

export function pushPendingWhiteboardVault(entry: PendingWhiteboardVault) {
  if (typeof window === "undefined") return;
  const cur = readPendingWhiteboardVault();
  cur.push(entry);
  localStorage.setItem(KEY, JSON.stringify(cur));
}

export function clearPendingWhiteboardVault() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function whiteboardVaultNotePayload(opts: {
  dataUrl: string;
  title: string;
  clientId: string | null;
}): Omit<Note, "id" | "updatedAt"> {
  const body = [
    "## Visual SOP",
    "",
    `**${opts.title}**`,
    "",
    "Captured from the global whiteboard.",
    "",
    `![Whiteboard sketch](${opts.dataUrl})`,
    "",
    "---",
    "",
    "_Auto-generated draft — edit or send with your EOD._",
  ].join("\n");

  return {
    title: opts.title,
    body,
    clientId: opts.clientId,
    labels: ["whiteboard", "visual-sop"],
  };
}
