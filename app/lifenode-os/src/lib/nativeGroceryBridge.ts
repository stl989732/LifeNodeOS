/** Shared with HomeNode Smart Cart "LifeNode Native List" — kitchen branch writes here too. */
export const NATIVE_GROCERY_STORAGE_KEY = "lifenode.homenode.native-grocery.v1";

export const NATIVE_GROCERY_CHANGED = "lifenode-native-grocery";

export function readNativeGroceryList(
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function writeNativeGroceryList(
  items: string[],
  storageKey: string = NATIVE_GROCERY_STORAGE_KEY,
) {
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  window.dispatchEvent(new Event(NATIVE_GROCERY_CHANGED));
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
