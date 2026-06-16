/** Same key as HomeNode `recipeVault` — Kitchen saves here so vault stays unified. */
export const RECIPE_VAULT_KEY = "lifenode.homenode.recipe-vault.v1";

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
 * @param {object} entry — same shape HomeNode uses (id, title, instructions, ingredients, steps, category, imageUrl, caloriesPerServing, createdAt)
 * @param {string} [storageKey] — pass user-scoped key from HomeNode / Kitchen
 * @returns {object[]|null} New vault array written to storage, or null on failure.
 */
export function appendRecipeToVault(entry, storageKey = RECIPE_VAULT_KEY) {
  if (typeof window === "undefined") return null;
  try {
    const prev = readRecipeVault(storageKey);
    const next = [entry, ...prev];
    writeRecipeVault(next, storageKey);
    return next;
  } catch {
    return null;
  }
}
