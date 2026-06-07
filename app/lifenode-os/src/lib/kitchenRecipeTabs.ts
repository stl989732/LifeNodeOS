export const CHEF_RECIPE_PLACEHOLDER_STEP = "ChefNode is writing your recipe…";

export type KitchenRecipeTabRecipe = {
  title: string;
  prepTime?: string;
  servings?: string;
  steps?: string[];
  ingredients?: { item: string; amount?: string }[];
  caloriesPerServing?: number | null;
  imagePrompt?: string;
  pollinationsQuery?: string;
};

export function isIncompleteChefRecipe(
  recipe: KitchenRecipeTabRecipe | null | undefined,
): boolean {
  if (!recipe?.title?.trim()) return true;
  const steps = recipe.steps ?? [];
  if (steps.length === 0) return true;
  if (steps.length === 1 && steps[0] === CHEF_RECIPE_PLACEHOLDER_STEP) return true;
  return false;
}

/** Drop in-flight / placeholder tabs before localStorage + server sync. */
export function sanitizeKitchenRecipeTabsForPersistence(
  tabs: KitchenRecipeTab[],
): KitchenRecipeTab[] {
  return tabs
    .filter((t) => !t.loading && !isIncompleteChefRecipe(t.recipe))
    .map((t) => ({ ...t, loading: false, error: t.error ?? null }));
}

/** Multi-recipe workspace list (`recipesList` in product specs). */
export type KitchenRecipeTab = {
  id: string;
  recipe: KitchenRecipeTabRecipe;
  category: string | null;
  imageDataUrl: string | null;
  imageFailed: boolean;
  ingredientChecked: Record<string, boolean>;
  vaultSaved: boolean;
  loading?: boolean;
  error?: string | null;
};

export function kitchenTabIdFromTitle(
  title: string,
  existingTabs: Pick<KitchenRecipeTab, "id">[],
): string {
  const base =
    String(title || "recipe")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "recipe";
  const ids = new Set(existingTabs.map((t) => t.id));
  let id = base;
  let n = 2;
  while (ids.has(id)) {
    id = `${base}-${n++}`;
  }
  return id;
}

export function upsertKitchenRecipeTab(
  tabs: KitchenRecipeTab[],
  partial: {
    id?: string;
    recipe: KitchenRecipeTabRecipe;
    category?: string | null;
    imageDataUrl?: string | null;
    imageFailed?: boolean;
    ingredientChecked?: Record<string, boolean>;
    vaultSaved?: boolean;
    loading?: boolean;
    error?: string | null;
  },
): { tabs: KitchenRecipeTab[]; activeId: string } {
  const id = partial.id ?? kitchenTabIdFromTitle(partial.recipe.title, tabs);
  const idx = tabs.findIndex((t) => t.id === id);
  const prev = idx >= 0 ? tabs[idx] : null;
  const entry: KitchenRecipeTab = {
    id,
    recipe: partial.recipe,
    category: partial.category !== undefined ? partial.category : (prev?.category ?? null),
    imageDataUrl:
      partial.imageDataUrl !== undefined
        ? partial.imageDataUrl
        : (prev?.imageDataUrl ?? null),
    imageFailed: partial.imageFailed ?? prev?.imageFailed ?? false,
    ingredientChecked: partial.ingredientChecked ?? prev?.ingredientChecked ?? {},
    vaultSaved: partial.vaultSaved ?? prev?.vaultSaved ?? false,
    loading: partial.loading ?? false,
    error: partial.error !== undefined ? partial.error : (prev?.error ?? null),
  };
  const next =
    idx >= 0 ? tabs.map((t, i) => (i === idx ? entry : t)) : [...tabs, entry];
  return { tabs: next, activeId: id };
}

export function getActiveKitchenTab(
  tabs: KitchenRecipeTab[],
  activeId: string | null,
): KitchenRecipeTab | null {
  if (!tabs.length) return null;
  if (activeId) {
    const found = tabs.find((t) => t.id === activeId);
    if (found) return found;
  }
  return tabs[0] ?? null;
}

function tabCompletenessScore(tab: KitchenRecipeTab): number {
  const steps = tab.recipe?.steps?.length ?? 0;
  if (steps === 1 && tab.recipe?.steps?.[0] === CHEF_RECIPE_PLACEHOLDER_STEP) return 0;
  const ing = tab.recipe?.ingredients?.length ?? 0;
  return steps * 10 + ing + (tab.imageDataUrl ? 5 : 0) + (tab.loading ? -1 : 0);
}

/** Collapse duplicate titles — keeps the most complete tab per dish name. */
export function dedupeKitchenRecipeTabsByTitle(tabs: KitchenRecipeTab[]): KitchenRecipeTab[] {
  const byTitle = new Map<string, KitchenRecipeTab>();
  for (const tab of tabs) {
    const key = tab.recipe?.title?.trim().toLowerCase() || tab.id;
    const prev = byTitle.get(key);
    if (!prev || tabCompletenessScore(tab) >= tabCompletenessScore(prev)) {
      byTitle.set(key, tab);
    }
  }
  return Array.from(byTitle.values());
}

export function removeKitchenRecipeTab(
  tabs: KitchenRecipeTab[],
  tabId: string,
): { tabs: KitchenRecipeTab[]; activeId: string | null } {
  const next = tabs.filter((t) => t.id !== tabId);
  return { tabs: next, activeId: next[0]?.id ?? null };
}

export function mergeKitchenRecipeTabs(
  tabs: KitchenRecipeTab[],
  entries: Parameters<typeof upsertKitchenRecipeTab>[1][],
): { tabs: KitchenRecipeTab[]; activeId: string | null } {
  let next = tabs;
  let activeId: string | null = null;
  for (const entry of entries) {
    const result = upsertKitchenRecipeTab(next, entry);
    next = result.tabs;
    activeId = result.activeId;
  }
  return { tabs: next, activeId };
}
