import type { VanodePersisted } from "./types";
import { VANODE_STORAGE_KEY, defaultVanodePersisted } from "./constants";
import { readScopedLocalStorage } from "@/src/lib/userScopedStorage";
import { parseVanodePersisted } from "./parseVanodePersisted";
import { touchLocalWidgetUpdatedAt } from "@/src/lib/nodeWidgetSync";

export function loadVanode(storageKey: string = VANODE_STORAGE_KEY): VanodePersisted {
  if (typeof window === "undefined") return defaultVanodePersisted();
  try {
    const raw = readScopedLocalStorage(storageKey);
    if (!raw) return defaultVanodePersisted();
    return parseVanodePersisted(JSON.parse(raw) as Partial<VanodePersisted>);
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
  touchLocalWidgetUpdatedAt(storageKey);
}
