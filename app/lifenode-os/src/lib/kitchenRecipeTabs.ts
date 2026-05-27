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
