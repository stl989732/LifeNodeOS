/** Same key as HomeNode `recipeVault` — Kitchen saves here so vault stays unified. */
export const RECIPE_VAULT_KEY = "lifenode.homenode.recipe-vault.v1";

/**
 * @param {object} entry — same shape HomeNode uses (id, title, instructions, ingredients, steps, category, imageUrl, caloriesPerServing, createdAt)
 * @returns {object[]|null} New vault array written to storage, or null on failure.
 */
export function appendRecipeToVault(entry) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECIPE_VAULT_KEY);
    let prev = [];
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) prev = p;
    }
    const next = [entry, ...prev];
    window.localStorage.setItem(RECIPE_VAULT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
