// Sample HomeNode kitchen data + classification utilities.
// In production, items come from AI vision detection + manual edits.

export const STORAGE_TYPES = [
  {
    id: "refrigerator",
    label: "Refrigerator",
    blurb: "Daily-use, perishable",
    accent: "#84A59D",
  },
  {
    id: "freezer",
    label: "Freezer",
    blurb: "Long-term, frozen goods",
    accent: "#60A5FA",
  },
  {
    id: "pantry",
    label: "Pantry",
    blurb: "Dry goods, snacks, baking",
    accent: "#D4A373",
  },
  {
    id: "cabinets",
    label: "Cabinets",
    blurb: "Spices, oils, condiments",
    accent: "#A78BFA",
  },
];

export const SHELF_PRESETS = {
  refrigerator: ["Top shelf", "Middle shelf", "Bottom shelf", "Door shelf", "Crisper drawer"],
  freezer: ["Top drawer", "Middle drawer", "Bottom drawer"],
  pantry: ["Top shelf", "Middle shelf", "Bottom shelf"],
  cabinets: ["Upper cabinet", "Lower cabinet"],
};

// Demo items as if they came back from AI detection.
// daysToExpiry is relative — classification computes the badge.
export const DEMO_ITEMS = [
  { id: "yogurt", name: "Greek Yogurt", category: "Dairy", quantity: "1 tub", percentRemaining: 35, daysToExpiry: 1, storage: "refrigerator", shelf: "Top shelf" },
  { id: "spinach", name: "Baby Spinach", category: "Produce", quantity: "1 bag", percentRemaining: 60, daysToExpiry: 2, storage: "refrigerator", shelf: "Crisper drawer" },
  { id: "milk", name: "Whole Milk", category: "Dairy", quantity: "1.5 L", percentRemaining: 20, daysToExpiry: 3, storage: "refrigerator", shelf: "Door shelf" },
  { id: "eggs", name: "Eggs", category: "Dairy", quantity: "4 of 12", percentRemaining: 33, daysToExpiry: 9, storage: "refrigerator", shelf: "Door shelf" },
  { id: "strawberries", name: "Strawberries", category: "Produce", quantity: "1 punnet", percentRemaining: 70, daysToExpiry: 2, storage: "refrigerator", shelf: "Middle shelf" },
  { id: "chicken", name: "Chicken Breast", category: "Protein", quantity: "500 g", percentRemaining: 100, daysToExpiry: 1, storage: "refrigerator", shelf: "Bottom shelf" },
  { id: "cheddar", name: "Cheddar Block", category: "Dairy", quantity: "200 g", percentRemaining: 80, daysToExpiry: 14, storage: "refrigerator", shelf: "Middle shelf" },
  { id: "berries-frozen", name: "Mixed Berries", category: "Produce", quantity: "1 bag", percentRemaining: 50, daysToExpiry: 120, storage: "freezer", shelf: "Top drawer" },
  { id: "salmon", name: "Salmon Fillets", category: "Protein", quantity: "2 fillets", percentRemaining: 100, daysToExpiry: 60, storage: "freezer", shelf: "Middle drawer" },
  { id: "pasta", name: "Penne Pasta", category: "Dry Goods", quantity: "750 g", percentRemaining: 75, daysToExpiry: 240, storage: "pantry", shelf: "Top shelf" },
  { id: "tomatoes-canned", name: "Crushed Tomatoes", category: "Canned", quantity: "2 cans", percentRemaining: 100, daysToExpiry: 365, storage: "pantry", shelf: "Middle shelf" },
  { id: "olive-oil", name: "Olive Oil", category: "Oils", quantity: "500 ml", percentRemaining: 45, daysToExpiry: 180, storage: "cabinets", shelf: "Upper cabinet" },
  { id: "garlic", name: "Garlic", category: "Produce", quantity: "1 bulb", percentRemaining: 90, daysToExpiry: 21, storage: "pantry", shelf: "Bottom shelf" },
  { id: "onion", name: "Yellow Onion", category: "Produce", quantity: "3", percentRemaining: 100, daysToExpiry: 30, storage: "pantry", shelf: "Bottom shelf" },
];

// 1-3d => Expiring Soon, 4-7d => Use Soon, 7+ => Fresh.
export function classifyExpiry(days) {
  if (days <= 3) return "expiring";
  if (days <= 7) return "use-soon";
  return "fresh";
}

export const STATUS_META = {
  expiring: {
    label: "Expiring Soon",
    short: "Expiring",
    accent: "#E76F51",
    soft: "rgba(231, 111, 81, 0.10)",
    textOn: "#9B3B22",
  },
  "use-soon": {
    label: "Use Soon",
    short: "Use Soon",
    accent: "#E9A23B",
    soft: "rgba(233, 162, 59, 0.12)",
    textOn: "#8A5A0E",
  },
  fresh: {
    label: "Fresh",
    short: "Fresh",
    accent: "#84A59D",
    soft: "rgba(132, 165, 157, 0.12)",
    textOn: "#3F5E58",
  },
};

// Recipe suggestions — referenced item IDs determine "you have X/Y" math.
export const DEMO_RECIPES = [
  {
    id: "chicken-pasta",
    title: "Garlic Chicken Pasta",
    timeMinutes: 25,
    needsIds: ["chicken", "pasta", "garlic", "olive-oil", "onion", "tomatoes-canned", "spinach", "cheddar"],
    rationale: "Uses chicken expiring tomorrow + spinach to use within 2 days.",
  },
  {
    id: "berry-yogurt-bowl",
    title: "Berry Yogurt Breakfast Bowl",
    timeMinutes: 5,
    needsIds: ["yogurt", "strawberries", "berries-frozen"],
    rationale: "Uses yogurt before it expires + strawberries close to peak.",
  },
  {
    id: "salmon-greens",
    title: "Pan-Seared Salmon with Greens",
    timeMinutes: 20,
    needsIds: ["salmon", "spinach", "olive-oil", "garlic", "onion"],
    rationale: "Defrost the salmon — pairs well with the spinach you should use.",
  },
];

export function recipeStats(recipe, items) {
  const ownedIds = new Set(items.map((i) => i.id));
  const have = recipe.needsIds.filter((id) => ownedIds.has(id));
  const missing = recipe.needsIds.filter((id) => !ownedIds.has(id));
  return { have, missing, haveCount: have.length, totalCount: recipe.needsIds.length };
}

// Low-stock heuristic: percentRemaining <= 35.
export function lowStockItems(items) {
  return items
    .filter((i) => i.percentRemaining <= 35)
    .sort((a, b) => a.percentRemaining - b.percentRemaining);
}

// Generate the proactive intelligence messages — the "most important thing."
// Returns conversational, contextual lines, not robotic counts.
export function buildIntelligence(items, recipes) {
  const messages = [];

  const expiringTomorrow = items.filter((i) => i.daysToExpiry <= 1);
  expiringTomorrow.forEach((item) => {
    if (item.id === "yogurt") {
      messages.push({
        id: `${item.id}-msg`,
        tone: "expiring",
        text: `Your ${item.name.toLowerCase()} expires tomorrow. Consider using it for breakfast or smoothies.`,
        action: "Find a recipe",
        actionKind: "find-recipe",
        contextItemId: item.id,
      });
    } else {
      messages.push({
        id: `${item.id}-msg`,
        tone: "expiring",
        text: `${item.name} expires tomorrow — plan it into tonight or tomorrow's meal.`,
        action: "Find a recipe",
        actionKind: "find-recipe",
        contextItemId: item.id,
      });
    }
  });

  const useSoonProduce = items.filter((i) => i.daysToExpiry > 1 && i.daysToExpiry <= 3 && i.category === "Produce");
  useSoonProduce.forEach((item) => {
    messages.push({
      id: `${item.id}-msg`,
      tone: "use-soon",
      text: `Your ${item.name.toLowerCase()} should be used within ${item.daysToExpiry} days.`,
      action: "Add to meal plan",
      actionKind: "add-meal-plan",
      contextItemId: item.id,
      contextLabel: item.name,
    });
  });

  const lowStock = lowStockItems(items).slice(0, 2);
  if (lowStock.length > 0) {
    const names = lowStock.map((i) => i.name.toLowerCase()).join(" and ");
    messages.push({
      id: "low-stock-msg",
      tone: "fresh",
      text: `You're low on ${names}. Want them on this week's grocery list?`,
      action: "Add to grocery",
      actionKind: "add-grocery",
      contextItemIds: lowStock.map((i) => i.id),
    });
  }

  const bestRecipe = recipes
    .map((r) => ({ recipe: r, stats: recipeStats(r, items) }))
    .filter(({ stats }) => stats.haveCount >= Math.ceil(stats.totalCount * 0.6))
    .sort((a, b) => b.stats.haveCount / b.stats.totalCount - a.stats.haveCount / a.stats.totalCount)[0];

  if (bestRecipe) {
    messages.push({
      id: "recipe-msg",
      tone: "fresh",
      text: `You already have ${bestRecipe.stats.haveCount} of ${bestRecipe.stats.totalCount} ingredients for ${bestRecipe.recipe.title}.`,
      action: "View recipe",
      actionKind: "view-recipe",
      contextRecipeId: bestRecipe.recipe.id,
    });
  }

  return messages.slice(0, 4);
}
