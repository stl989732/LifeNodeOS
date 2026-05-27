import { appendNativeGroceryUnique } from "@/src/lib/nativeGroceryBridge";

const MEAL_PLAN_KEY = "lifenode.kitchen.mealplan.v1";
const PANTRY_KEY = "lifenode.kitchen.pantry.v1";
const RECIPE_VAULT_KEY = "lifenode.homenode.recipe-vault.v1";

export type KitchenContext = {
  mealPlanLines: string[];
  recentRecipeTitles: string[];
  pantryHints: string[];
};

function readLabelList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .map((row) => {
        if (typeof row === "string" && row.trim()) return row.trim();
        if (row && typeof row === "object" && "label" in row) {
          const l = (row as { label?: string }).label;
          return typeof l === "string" ? l.trim() : "";
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function readKitchenContextForVital(): KitchenContext {
  if (typeof window === "undefined") {
    return { mealPlanLines: [], recentRecipeTitles: [], pantryHints: [] };
  }
  const mealPlanLines = readLabelList(MEAL_PLAN_KEY);
  const pantryHints = readLabelList(PANTRY_KEY).slice(0, 24);
  let recentRecipeTitles: string[] = [];
  try {
    const raw = window.localStorage.getItem(RECIPE_VAULT_KEY);
    if (raw) {
      const v = JSON.parse(raw) as unknown;
      if (Array.isArray(v)) {
        recentRecipeTitles = v
          .map((e) => {
            if (e && typeof e === "object" && "title" in e) {
              const t = (e as { title?: string }).title;
              return typeof t === "string" ? t.trim() : "";
            }
            return "";
          })
          .filter(Boolean)
          .slice(0, 8);
      }
    }
  } catch {
    /* ignore */
  }
  return { mealPlanLines, recentRecipeTitles, pantryHints };
}

const SODIUM_HINTS = /\b(salt|soy|fish sauce|patis|bacon|ham|bulalo|broth|pickle|kimchi|miso)\b/i;
const CARB_HINTS = /\b(pasta|rice|bread|oat|tortilla|noodle|lasagna|pizza|cake|sugar|dessert)\b/i;

export function analyzeCulinaryCorrelation(symptomLabel: string, kitchen: KitchenContext): string {
  const meals = kitchen.mealPlanLines.join(" ").toLowerCase();
  const recipes = kitchen.recentRecipeTitles.join(" ").toLowerCase();
  const blob = `${meals} ${recipes}`;
  const s = symptomLabel.toLowerCase();

  if ((s.includes("bloat") || s.includes("🤢")) && (SODIUM_HINTS.test(blob) || CARB_HINTS.test(blob))) {
    const hit = kitchen.recentRecipeTitles[0] || kitchen.mealPlanLines[0] || "a recent meal";
    return `Noted. Kitchen data shows sodium- or carb-forward meals (${hit}). If this keeps lining up with bloating, try a lighter protein-forward plate tomorrow.`;
  }
  if ((s.includes("energy") || s.includes("⚡")) && CARB_HINTS.test(blob)) {
    return `Noted. Your meal plan mentions higher-glycemic foods recently. Many people feel an afternoon dip after a carb-heavy lunch — consider balancing with protein at midday.`;
  }
  if ((s.includes("brain") || s.includes("fog") || s.includes("🧠")) && kitchen.recentRecipeTitles.length > 0) {
    return `Noted. Recipe vault includes “${kitchen.recentRecipeTitles[0]}”. We’ll keep watching timing vs. how you feel — log again if it repeats.`;
  }
  if (kitchen.mealPlanLines.length === 0 && kitchen.recentRecipeTitles.length === 0) {
    return `Noted. No recent Kitchen / ChefNode meals on file yet — connect meal plan or save a recipe to the vault for richer “fuel vs. feeling” links.`;
  }
  return `Noted. Kitchen context is available (${kitchen.mealPlanLines.length} meal lines, ${kitchen.recentRecipeTitles.length} saved recipes). We’ll surface patterns as you log more days.`;
}

export function suggestVitaminDGroceryIfNeeded(summaryText: string): boolean {
  if (typeof window === "undefined") return false;
  const t = summaryText.toLowerCase();
  if (!/\b(vitamin\s*d|vit\s*d|25-oh|25\(oh\)|low\s*d|deficien)\b/i.test(t)) return false;
  appendNativeGroceryUnique("Vitamin D–rich foods (eggs, fortified milk, salmon)");
  return true;
}
