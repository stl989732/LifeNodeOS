/** Shared with HomeNode Smart Cart "LifeNode Native List" — kitchen branch writes here too. */
export const NATIVE_GROCERY_STORAGE_KEY = "lifenode.homenode.native-grocery.v1";

export const NATIVE_GROCERY_CHANGED = "lifenode-native-grocery";

export type NativeGroceryStore = {
  budget: number | null;
  items: string[];
};

function emptyStore(): NativeGroceryStore {
  return { budget: null, items: [] };
}

export function readNativeGroceryStore(
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
): NativeGroceryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return {
        budget: null,
        items: parsed.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        ),
      };
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as { budget?: unknown; items?: unknown };
      const items = Array.isArray(obj.items)
        ? obj.items.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0,
          )
        : [];
      const budget =
        obj.budget != null && Number.isFinite(Number(obj.budget))
          ? Number(obj.budget)
          : null;
      return { budget, items };
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function writeNativeGroceryStore(
  store: NativeGroceryStore,
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
) {
  window.localStorage.setItem(storageKey, JSON.stringify(store));
  window.dispatchEvent(new Event(NATIVE_GROCERY_CHANGED));
}

export function readNativeGroceryList(
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
): string[] {
  return readNativeGroceryStore(storageKey).items;
}

export function writeNativeGroceryList(
  items: string[],
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
) {
  const current = readNativeGroceryStore(storageKey);
  writeNativeGroceryStore({ ...current, items }, storageKey);
}

export function appendNativeGroceryUnique(raw: string) {
  const label = raw.trim();
  if (!label) return;
  const cur = readNativeGroceryList();
  const lower = label.toLowerCase();
  if (cur.some((x) => x.trim().toLowerCase() === lower)) return;
  writeNativeGroceryList([...cur, label]);
}

export function ensureNativeGrocerySeeded(
  defaults: string[],
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
) {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(storageKey)) {
    writeNativeGroceryList(defaults, storageKey);
  }
}
