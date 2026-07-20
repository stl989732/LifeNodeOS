import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import {
  scheduleNodeWidgetSave,
  touchLocalWidgetUpdatedAt,
} from "@/src/lib/nodeWidgetSync";

/** Same key as HomeNode `recipeVault` — Kitchen saves here so vault stays unified. */
export const RECIPE_VAULT_KEY = "lifenode.homenode.recipe-vault.v1";

export const RECIPE_VAULT_CHANGED_EVENT = "lifenode:recipe-vault:changed";

/**
 * @param {string} [storageKey]
 * @returns {object[]}
 */
export function readRecipeVault(storageKey = RECIPE_VAULT_KEY) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {object[]} items
 * @param {string} [storageKey]
 */
export function writeRecipeVault(items, storageKey = RECIPE_VAULT_KEY) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

/**
 * Union vault lists by recipe id (first occurrence wins); newest createdAt first.
 * @param {unknown[]} lists
 * @returns {object[]}
 */
export function mergeRecipeVaultLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const id = entry?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(entry);
    }
  }
  return out.sort((a, b) => {
    const ta = Date.parse(a?.createdAt) || 0;
    const tb = Date.parse(b?.createdAt) || 0;
    return tb - ta;
  });
}

/**
 * Write vault to localStorage, bump widget timestamp, and debounce cloud sync.
 * @param {object[]} items
 * @param {string} [storageKey]
 */
export function persistRecipeVault(items, storageKey = RECIPE_VAULT_KEY) {
  if (typeof window === "undefined") return;
  writeRecipeVault(items, storageKey);
  touchLocalWidgetUpdatedAt(storageKey);
  scheduleNodeWidgetSave(NODE_WIDGET_KEYS.home.recipeVault, items);
  try {
    window.dispatchEvent(
      new CustomEvent(RECIPE_VAULT_CHANGED_EVENT, { detail: { storageKey } }),
    );
  } catch {
    /* noop */
  }
}

/**
 * @param {object} entry — same shape HomeNode uses (id, title, instructions, ingredients, steps, category, imageUrl, caloriesPerServing, createdAt)
 * @param {string} [storageKey] — pass user-scoped key from HomeNode / Kitchen
 * @returns {object[]|null} New vault array written to storage, or null on failure.
 */
export function appendRecipeToVault(entry, storageKey = RECIPE_VAULT_KEY) {
  if (typeof window === "undefined") return null;
  try {
    const prev = readRecipeVault(storageKey);
    const next = [entry, ...prev.filter((r) => r?.id !== entry?.id)];
    persistRecipeVault(next, storageKey);
    return next;
  } catch {
    return null;
  }
}
