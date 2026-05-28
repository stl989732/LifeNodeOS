"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CalendarDays,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock4,
  Leaf,
  Pencil,
  Plus,
  Refrigerator,
  RefreshCw,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import {
  appendNativeGroceryUnique,
  readNativeGroceryList,
  writeNativeGroceryList,
  NATIVE_GROCERY_CHANGED,
} from "@/src/lib/nativeGroceryBridge";
import {
  buildIntelligence,
  classifyExpiry,
  lowStockItems,
  recipeStats,
  STATUS_META,
  STORAGE_TYPES,
  SHELF_PRESETS,
} from "./data";
import ChefUtensilLoader from "@/src/components/ChefUtensilLoader";

/** User-saved recipes only — no demo seed data for new accounts. */
const USER_RECIPES = [];
import { chefRecipeImageSrc, retryPollinationsDishImage } from "@/src/lib/kitchenDishImage";
import {
  getActiveKitchenTab,
  kitchenTabIdFromTitle,
  mergeKitchenRecipeTabs,
  upsertKitchenRecipeTab,
} from "@/src/lib/kitchenRecipeTabs";
import KitchenRecipeTabBar from "@/src/components/home-kitchen/KitchenRecipeTabBar";
import KitchenVaultToast from "@/src/components/home-kitchen/KitchenVaultToast";
import { appendRecipeToVault } from "@/src/lib/recipeVaultStorage";
import { FLARE_MODE_CHANGED, readFlareMode } from "@/src/lib/flareModeBridge";
import {
  KITCHEN_BTN_GLASS,
  KITCHEN_GLASS_CARD,
  KITCHEN_GLASS_PANEL,
  KITCHEN_TEXT,
} from "@/src/lib/homeNode/kitchenMintCream";

const FLARE_HEALING_RE =
  /salmon|greens|spinach|yogurt|berry|soup|ginger|turmeric|anti.?inflam|healing|light|bowl/i;

const PANTRY_KEY = "lifenode.kitchen.pantry.v1";
const MEAL_PLAN_KEY = "lifenode.kitchen.mealplan.v1";

const STORAGE_ICONS = {
  refrigerator: Refrigerator,
  freezer: Snowflake,
  pantry: Wand2,
  cabinets: Sparkles,
};

function readLabelList(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .map((row) => {
        if (typeof row === "string" && row.trim()) {
          return { id: crypto.randomUUID(), label: row.trim() };
        }
        if (row && typeof row === "object" && typeof row.label === "string") {
          return {
            id: typeof row.id === "string" && row.id ? row.id : crypto.randomUUID(),
            label: row.label.trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeLabelList(key, rows) {
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function KitchenGlassModal({ open, title, onClose, headerRight, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kitchen-focus-title"
        className="relative z-[121] flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/45 bg-white/65 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/50 px-5 py-4">
          <h2 id="kitchen-focus-title" className="text-lg font-semibold tracking-tight text-[#1E293B]">
            {title}
          </h2>
          <div className="flex items-center gap-1">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[#475569] transition-colors hover:bg-white/80 hover:text-[#1E293B]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-white/50 bg-white/40 px-5 py-3 backdrop-blur-sm">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ListEditorRows({ rows, onChange, placeholder }) {
  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), label: "" }]);
  }
  function updateRow(id, label) {
    onChange(rows.map((r) => (r.id === id ? { ...r, label } : r)));
  }
  function removeRow(id) {
    onChange(rows.filter((r) => r.id !== id));
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-3 py-2 shadow-sm"
        >
          <input
            value={row.label}
            onChange={(e) => updateRow(row.id, e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#1E293B] outline-none focus:border-[#84A59D]/40"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove row"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#84A59D]/40 bg-[#84A59D]/8 py-3 text-sm font-semibold text-[#3F5E58] hover:bg-[#84A59D]/15"
        >
          <Plus size={16} />
          Add line
        </button>
      </li>
    </ul>
  );
}

function normalizeChefApiRecipe(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const prepTime = typeof raw.prepTime === "string" ? raw.prepTime : "—";
  const servings = typeof raw.servings === "string" ? raw.servings : "—";
  const steps = Array.isArray(raw.steps)
    ? raw.steps.filter((s) => typeof s === "string")
    : [];
  const ingRaw = raw.ingredients;
  const ingredients = [];
  if (Array.isArray(ingRaw)) {
    for (const row of ingRaw) {
      if (row && typeof row === "object") {
        const item = typeof row.item === "string" ? row.item.trim() : "";
        const amount = typeof row.amount === "string" ? row.amount.trim() : "";
        if (item) ingredients.push({ item, amount: amount || "as needed" });
      }
    }
  }
  let caloriesPerServing = null;
  if (raw.caloriesPerServing != null) {
    const n = Number(raw.caloriesPerServing);
    if (Number.isFinite(n)) caloriesPerServing = Math.round(n);
  }
  const imagePrompt = typeof raw.imagePrompt === "string" ? raw.imagePrompt.trim() : "";
  if (!title || steps.length === 0) return null;
  return { title, prepTime, servings, steps, ingredients, caloriesPerServing, imagePrompt };
}

function pickKitchenImageDataUrl(data) {
  if (!data || typeof data !== "object") return null;
  const d = data.imageDataUrl;
  if (typeof d === "string" && d.startsWith("data:image")) return d;
  const list = data.imageDataUrls;
  if (Array.isArray(list)) {
    const first = list.find((u) => typeof u === "string" && u.startsWith("data:image"));
    if (first) return first;
  }
  return null;
}

function extractRecipePayload(data) {
  const imageDataUrl = pickKitchenImageDataUrl(data);
  const pollinationsQuery =
    typeof data?.pollinationsQuery === "string"
      ? data.pollinationsQuery
      : undefined;
  if (Array.isArray(data?.recipes) && data.recipes.length > 0) {
    const first = data.recipes[0];
    return {
      recipe: first,
      imageDataUrl,
      pollinationsQuery:
        pollinationsQuery ||
        (typeof first?.pollinationsQuery === "string"
          ? first.pollinationsQuery
          : undefined),
    };
  }
  const recipe = data?.recipe ?? null;
  return {
    recipe,
    imageDataUrl,
    pollinationsQuery:
      pollinationsQuery ||
      (typeof recipe?.pollinationsQuery === "string"
        ? recipe.pollinationsQuery
        : undefined),
  };
}

/** Same vault entry shape as HomeNode `saveRecipeToVault`. */
function buildVaultEntryFromKitchenRecipe(recipe, imageDataUrl) {
  if (!recipe?.title) return null;
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const ing = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const ingLines = ing.map((r) => (r.amount ? `${r.item}: ${r.amount}` : r.item));
  const cals =
    recipe.caloriesPerServing != null && Number.isFinite(Number(recipe.caloriesPerServing))
      ? Math.round(Number(recipe.caloriesPerServing))
      : null;
  const img = chefRecipeImageSrc({
    imageDataUrl: imageDataUrl || null,
    title: recipe.title,
  });
  return {
    id: crypto.randomUUID(),
    title: recipe.title,
    instructions: [ingLines.filter(Boolean).join("\n"), steps.join("\n\n")]
      .filter(Boolean)
      .join("\n\n---\n\n"),
    ingredients: ing,
    steps,
    category: "Dinner",
    imageUrl: img,
    caloriesPerServing: cals,
    createdAt: new Date().toISOString(),
  };
}

function MealPlanEditorRows({ rows, onChange, onPickRecipe, placeholder }) {
  const [editingId, setEditingId] = useState(null);

  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), label: "" }]);
  }
  function updateRow(id, label) {
    onChange(rows.map((r) => (r.id === id ? { ...r, label } : r)));
  }
  function removeRow(id) {
    onChange(rows.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-3 py-2 shadow-sm"
        >
          {editingId === row.id ? (
            <input
              autoFocus
              value={row.label}
              onChange={(e) => updateRow(row.id, e.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingId(null);
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 rounded-lg border border-[#84A59D]/40 bg-white px-2 py-1.5 text-sm text-[#1E293B] outline-none"
            />
          ) : (
            <button
              type="button"
              disabled={!row.label.trim()}
              onClick={() => onPickRecipe(row.label.trim())}
              className="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#84A59D]/10 hover:text-[#3F5E58] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {row.label.trim() || "—"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingId((cur) => (cur === row.id ? null : row.id))}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/90 hover:text-[#3F5E58]"
            aria-label="Edit line"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove row"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#84A59D]/40 bg-[#84A59D]/8 py-3 text-sm font-semibold text-[#3F5E58] hover:bg-[#84A59D]/15"
        >
          <Plus size={16} />
          Add line
        </button>
      </li>
    </ul>
  );
}

function KitchenRecipeFocusModal({
  open,
  tabs,
  activeTabId,
  onSelectTab,
  selectedTitle,
  loading,
  error,
  recipe,
  imageUrl,
  imageFailed,
  onClose,
  onImageError,
  onSaveToVault,
  vaultSaved,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgStuckBypass, setImgStuckBypass] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    setImgStuckBypass(false);
  }, [imageUrl, recipe?.title]);

  useEffect(() => {
    if (!open || loading || imageFailed || !imageUrl) return;
    const t = window.setTimeout(() => setImgStuckBypass(true), 16000);
    return () => window.clearTimeout(t);
  }, [open, loading, imageFailed, imageUrl, recipe?.title]);

  if (!open) return null;

  const showImage = Boolean(imageUrl) && !imageFailed;
  const revealImage = showImage && (imgLoaded || imgStuckBypass);
  const showAwaitPhoto = showImage && !imgLoaded && !loading && !imgStuckBypass;

  return (
    <div className="fixed inset-0 z-[135] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close recipe"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kitchen-recipe-title"
        className="relative z-[136] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/45 bg-white/70 shadow-[0_28px_90px_rgba(15,23,42,0.2)] backdrop-blur-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#84A59D]">ChefNode · Kitchen</p>
            <h2 id="kitchen-recipe-title" className="truncate text-lg font-semibold text-[#1E293B]">
              {selectedTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#475569] transition-colors hover:bg-white/80 hover:text-[#1E293B]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {tabs?.length > 0 ? (
          <div className="shrink-0 border-b border-white/50 px-4 py-3">
            <KitchenRecipeTabBar tabs={tabs} activeTabId={activeTabId} onSelect={onSelectTab} />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-10">
              <ChefUtensilLoader message="Fetching recipe from ChefNode…" />
            </div>
          ) : error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">{error}</p>
          ) : recipe ? (
            <div className="space-y-4">
              <div className="relative min-h-[192px] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md">
                {showImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      decoding="async"
                      fetchPriority="high"
                      onLoad={() => setImgLoaded(true)}
                      onError={onImageError}
                      className={`w-full max-h-72 object-cover transition-opacity duration-500 ${
                        revealImage ? "relative z-0 opacity-100" : "absolute inset-0 z-0 h-full max-h-72 w-full opacity-0"
                      }`}
                    />
                    {showAwaitPhoto ? (
                      <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-slate-100/92 px-3 py-4">
                        <ChefUtensilLoader compact message="Loading dish photo…" />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[160px] items-center justify-center bg-slate-100/80 px-4 py-8 text-center text-sm text-[#475569]">
                    No image returned — recipe text is still available below.
                  </div>
                )}
              </div>
              {recipe.caloriesPerServing != null && Number.isFinite(Number(recipe.caloriesPerServing)) ? (
                <div className="rounded-2xl border border-teal-200/70 bg-teal-50/95 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal-900/70">Nutritional snapshot</p>
                  <p className="text-lg font-semibold text-teal-950">
                    ~{Math.round(Number(recipe.caloriesPerServing))}{" "}
                    <span className="text-sm font-normal text-[#475569]">kcal per serving</span>
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xl font-semibold text-[#1E293B]">{recipe.title}</p>
                <p className="mt-1 text-xs text-[#475569]">
                  Prep: {recipe.prepTime} · Serves: {recipe.servings}
                </p>
              </div>
              {recipe.ingredients?.length > 0 ? (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#475569]">Ingredients</p>
                  <ul className="space-y-1.5 text-sm text-[#1E293B]">
                    {recipe.ingredients.map((ing) => (
                      <li key={`${ing.item}-${ing.amount}`} className="flex gap-2">
                        <span className="font-medium text-[#1E293B]">{ing.item}</span>
                        <span className="text-[#475569]">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#475569]">Instructions</p>
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#1E293B]">
                  {recipe.steps.map((s, i) => (
                    <li key={`${i}-${s.slice(0, 24)}`}>{s}</li>
                  ))}
                </ol>
              </div>
              {typeof onSaveToVault === "function" ? (
                <button
                  type="button"
                  onClick={onSaveToVault}
                  disabled={vaultSaved}
                  className="w-full rounded-2xl bg-[#3F5E58] py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#325048] disabled:cursor-default disabled:bg-[#84A59D]"
                >
                  {vaultSaved ? "Saved to vault" : "Save recipe to Vault"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function KitchenDashboard({ items, enabledStorage, onReset, onItemsChange }) {
  const [activeStorage, setActiveStorage] = useState(enabledStorage[0] || "refrigerator");
  const [focus, setFocus] = useState(null);
  const [pantryRows, setPantryRows] = useState([]);
  const [groceryRows, setGroceryRows] = useState([]);
  const [mealPlanRows, setMealPlanRows] = useState([]);
  const [mealPlanOpen, setMealPlanOpen] = useState(false);
  const [flareActive, setFlareActive] = useState(false);
  const [mealPlanMinimized, setMealPlanMinimized] = useState(false);
  const [mealPlanShowAi, setMealPlanShowAi] = useState(false);
  const [scanBanner, setScanBanner] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Produce",
    quantity: "1",
    storage: "refrigerator",
    shelf: "Top shelf",
    percentRemaining: 100,
    daysToExpiry: 5,
  });

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [kitchenRecipeTabs, setKitchenRecipeTabs] = useState([]);
  const [activeKitchenTabId, setActiveKitchenTabId] = useState(null);
  const [kitchenVaultToast, setKitchenVaultToast] = useState(null);

  const activeKitchenTab = useMemo(
    () => getActiveKitchenTab(kitchenRecipeTabs, activeKitchenTabId),
    [kitchenRecipeTabs, activeKitchenTabId],
  );
  const [labelListsReady, setLabelListsReady] = useState(false);

  useEffect(() => {
    setPantryRows(readLabelList(PANTRY_KEY));
    setMealPlanRows(readLabelList(MEAL_PLAN_KEY));
    setLabelListsReady(true);
  }, []);

  useEffect(() => {
    function syncFlare() {
      setFlareActive(readFlareMode().active);
    }
    syncFlare();
    window.addEventListener(FLARE_MODE_CHANGED, syncFlare);
    return () => window.removeEventListener(FLARE_MODE_CHANGED, syncFlare);
  }, []);

  const syncGroceryFromBridge = useCallback(() => {
    setGroceryRows(
      readNativeGroceryList().map((label) => ({ id: crypto.randomUUID(), label })),
    );
  }, []);

  useEffect(() => {
    function onNative() {
      if (focus === "grocery") syncGroceryFromBridge();
    }
    window.addEventListener(NATIVE_GROCERY_CHANGED, onNative);
    return () => window.removeEventListener(NATIVE_GROCERY_CHANGED, onNative);
  }, [focus, syncGroceryFromBridge]);

  useEffect(() => {
    if (!labelListsReady) return;
    writeLabelList(PANTRY_KEY, pantryRows);
  }, [pantryRows, labelListsReady]);

  useEffect(() => {
    if (!labelListsReady) return;
    writeLabelList(MEAL_PLAN_KEY, mealPlanRows);
  }, [mealPlanRows, labelListsReady]);

  useEffect(() => {
    if (focus === "grocery") syncGroceryFromBridge();
  }, [focus, syncGroceryFromBridge]);

  const persistGrocery = useCallback((rows) => {
    const labels = rows.map((r) => r.label.trim()).filter(Boolean);
    writeNativeGroceryList(labels);
    setGroceryRows(rows);
  }, []);

  const filteredStorageTypes = STORAGE_TYPES.filter((s) => enabledStorage.includes(s.id));

  const storageItems = useMemo(
    () => items.filter((i) => i.storage === activeStorage),
    [items, activeStorage],
  );

  const groupedByShelf = useMemo(() => {
    const map = new Map();
    storageItems.forEach((item) => {
      const shelf = item.shelf || "Unsorted";
      if (!map.has(shelf)) map.set(shelf, []);
      map.get(shelf).push(item);
    });
    return Array.from(map.entries());
  }, [storageItems]);

  const counts = useMemo(() => {
    const c = { expiring: 0, "use-soon": 0, fresh: 0 };
    items.forEach((i) => {
      c[classifyExpiry(i.daysToExpiry)] += 1;
    });
    return c;
  }, [items]);

  const intelligence = useMemo(() => buildIntelligence(items, USER_RECIPES), [items]);
  const lowStock = useMemo(() => lowStockItems(items), [items]);

  const recipeMatches = useMemo(
    () =>
      USER_RECIPES.map((r) => ({ recipe: r, ...recipeStats(r, items) }))
        .sort((a, b) => b.haveCount / b.totalCount - a.haveCount / a.totalCount)
        .slice(0, 3),
    [items],
  );

  const shelfOptions = SHELF_PRESETS[newItem.storage] || SHELF_PRESETS.refrigerator;

  const assistantRecipes = useMemo(() => {
    const blob = mealPlanRows.map((r) => r.label).join(" ").toLowerCase();
    const inv = items.map((i) => `${i.name} ${i.id}`).join(" ").toLowerCase();
    const hay = `${blob} ${inv}`;
    let pool = USER_RECIPES;
    if (flareActive) {
      pool = USER_RECIPES.filter(
        (recipe) =>
          FLARE_HEALING_RE.test(recipe.title) ||
          FLARE_HEALING_RE.test(recipe.rationale) ||
          recipe.id === "salmon-greens",
      );
      if (pool.length === 0) {
        pool = USER_RECIPES.filter((r) => r.id === "salmon-greens");
      }
    }
    return pool
      .map((recipe) => {
        const hits = recipe.needsIds.filter(
          (id) =>
            hay.includes(id.replace(/-/g, " ")) ||
            hay.includes(id) ||
            items.some((it) => it.id === id && blob.includes(it.name.toLowerCase())),
        ).length;
        return { recipe, ...recipeStats(recipe, items), hits };
      })
      .sort((a, b) => b.hits - a.hits || b.haveCount / b.totalCount - a.haveCount / a.totalCount)
      .slice(0, 4);
  }, [mealPlanRows, items, flareActive]);

  const skipKitchenFetchRef = useRef(false);

  const openKitchenRecipe = useCallback(
    async (mealTitle, options = {}) => {
      const q = mealTitle.trim();
      if (!q) return;
      const accumulate = options.accumulate !== false;

      setRecipeModalOpen(true);
      skipKitchenFetchRef.current = false;

      let targetTabId = null;
      setKitchenRecipeTabs((prev) => {
        const base = accumulate ? prev : [];
        targetTabId = kitchenTabIdFromTitle(q, base);
        const cached = base.find((t) => t.id === targetTabId);
        if (
          cached?.recipe?.steps?.length > 0 &&
          !cached.loading &&
          !options.forceRefresh
        ) {
          skipKitchenFetchRef.current = true;
          return base;
        }
        const placeholder = {
          title: q,
          prepTime: "—",
          servings: "—",
          steps: ["ChefNode is writing your recipe…"],
          ingredients: [],
        };
        const { tabs } = upsertKitchenRecipeTab(base, {
          id: targetTabId,
          recipe: placeholder,
          loading: true,
          error: null,
          imageDataUrl: null,
          imageFailed: false,
          category: null,
        });
        return tabs;
      });
      if (targetTabId) setActiveKitchenTabId(targetTabId);
      if (skipKitchenFetchRef.current) return;

      const pantryBits = [
        ...items.map((i) => i.name),
        ...mealPlanRows.map((r) => r.label).filter((x) => x && x.trim().toLowerCase() !== q.toLowerCase()),
      ]
        .filter(Boolean)
        .slice(0, 48)
        .join(", ");
      try {
        const res = await fetch("/api/homenode/kitchen-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "chef_execute",
            selectedMeal: q,
            pantryHints: pantryBits,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : typeof data?.message === "string"
                ? data.message
                : `Kitchen AI error (${res.status})`,
          );
        }

        const multi = Array.isArray(data?.recipes)
          ? data.recipes.map((r) => normalizeChefApiRecipe(r)).filter(Boolean)
          : [];
        const singles = [];
        if (multi.length >= 2) {
          const apiImage = pickKitchenImageDataUrl(data);
          const entries = multi.map((rec, index) => ({
            id: index === 0 ? targetTabId ?? undefined : undefined,
            recipe: rec,
            category: "Dinner",
            imageDataUrl: index === 0 ? apiImage || null : null,
            imageFailed: false,
            loading: false,
            error: null,
          }));
          let mergedActiveId = null;
          setKitchenRecipeTabs((prev) => {
            const merged = mergeKitchenRecipeTabs(accumulate ? prev : [], entries);
            mergedActiveId = merged.activeId;
            return merged.tabs;
          });
          if (mergedActiveId) setActiveKitchenTabId(mergedActiveId);
          return;
        }

        const { recipe: rawRec, imageDataUrl } = extractRecipePayload(data);
        const rec = normalizeChefApiRecipe(rawRec);
        if (!rec) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Could not parse recipe from response.",
          );
        }
        const oversizedGemini =
          typeof imageDataUrl === "string" &&
          imageDataUrl.startsWith("data:") &&
          imageDataUrl.length > 900000;
        setKitchenRecipeTabs((prev) => {
          const { tabs } = upsertKitchenRecipeTab(prev, {
            id: targetTabId ?? undefined,
            recipe: rec,
            loading: false,
            error: null,
            imageDataUrl: oversizedGemini ? null : imageDataUrl || null,
            imageFailed: false,
            category: "Dinner",
          });
          return tabs;
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Something went wrong fetching the recipe.";
        setKitchenRecipeTabs((prev) => {
          const { tabs } = upsertKitchenRecipeTab(prev, {
            id: targetTabId ?? kitchenTabIdFromTitle(q, prev),
            recipe: { title: q, prepTime: "—", servings: "—", steps: [], ingredients: [] },
            loading: false,
            error: message,
          });
          return tabs;
        });
      }
    },
    [items, mealPlanRows],
  );

  const saveKitchenRecipeToVault = useCallback(() => {
    const tab = activeKitchenTab;
    if (!tab?.recipe?.title) return;
    const entry = buildVaultEntryFromKitchenRecipe(tab.recipe, tab.imageDataUrl);
    if (!entry) return;
    appendRecipeToVault(entry);
    setKitchenRecipeTabs((tabs) =>
      tabs.map((t) => (t.id === tab.id ? { ...t, vaultSaved: true } : t)),
    );
    setKitchenVaultToast("Recipe Saved Successfully");
    window.setTimeout(() => setKitchenVaultToast(null), 4200);
  }, [activeKitchenTab]);

  function handleIntelligenceAction(msg) {
    const kind = msg.actionKind;
    if (kind === "view-recipe") {
      window.requestAnimationFrame(() => {
        document.getElementById("kitchen-suggested-recipes")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }
    if (kind === "find-recipe") {
      setMealPlanOpen(true);
      setMealPlanMinimized(false);
      setMealPlanShowAi(true);
      if (msg.contextItemId) {
        const it = items.find((x) => x.id === msg.contextItemId);
        if (it) {
          setMealPlanRows((prev) => {
            if (prev.some((p) => p.label.toLowerCase() === it.name.toLowerCase())) return prev;
            return [...prev, { id: crypto.randomUUID(), label: it.name }];
          });
        }
      }
      return;
    }
    if (kind === "add-meal-plan" && msg.contextLabel) {
      setMealPlanOpen(true);
      setMealPlanMinimized(false);
      setMealPlanRows((prev) => {
        if (prev.some((p) => p.label.toLowerCase() === msg.contextLabel.toLowerCase())) return prev;
        return [...prev, { id: crypto.randomUUID(), label: msg.contextLabel }];
      });
      return;
    }
    if (kind === "add-grocery" && Array.isArray(msg.contextItemIds)) {
      msg.contextItemIds.forEach((id) => {
        const it = items.find((x) => x.id === id);
        if (it) appendNativeGroceryUnique(it.name);
      });
      setFocus("grocery");
      syncGroceryFromBridge();
    }
  }

  function addInventoryItem(e) {
    e.preventDefault();
    const name = newItem.name.trim();
    if (!name) return;
    const row = {
      id: crypto.randomUUID(),
      name,
      category: newItem.category.trim() || "General",
      quantity: newItem.quantity.trim() || "1",
      percentRemaining: Math.min(100, Math.max(0, Number(newItem.percentRemaining) || 100)),
      daysToExpiry: Math.min(400, Math.max(0, Number(newItem.daysToExpiry) || 7)),
      storage: newItem.storage,
      shelf: newItem.shelf || (SHELF_PRESETS[newItem.storage]?.[0] ?? "Top shelf"),
    };
    onItemsChange([row, ...items]);
    setFocus(null);
    setNewItem({
      name: "",
      category: "Produce",
      quantity: "1",
      storage: newItem.storage,
      shelf: row.shelf,
      percentRemaining: 100,
      daysToExpiry: 5,
    });
  }

  function removeInventoryItem(id) {
    onItemsChange(items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#84A59D]">
            HomeNode • Kitchen
          </p>
          <h1 className={`text-3xl font-semibold md:text-4xl ${KITCHEN_TEXT.title}`}>
            A calm view of your kitchen.
          </h1>
          <p className={`mt-2 max-w-xl text-sm leading-relaxed md:text-base ${KITCHEN_TEXT.muted}`}>
            HomeNode tracks what you have, surfaces what to use first, and quietly suggests meals.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border border-white/60 bg-white/55 backdrop-blur-sm ${KITCHEN_TEXT.muted} transition-colors hover:bg-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84A59D]`}
        >
          <RefreshCw size={14} /> Re-scan kitchen
        </button>
      </header>

      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFocus("add-item")}
          className={`inline-flex min-h-[44px] ${KITCHEN_BTN_GLASS}`}
        >
          <Plus size={16} strokeWidth={1.75} />
          Add Item
        </button>
        <button
          type="button"
          onClick={() => setScanBanner((v) => !v)}
          className={`inline-flex min-h-[44px] ${KITCHEN_BTN_GLASS}`}
        >
          <Camera size={16} strokeWidth={1.75} />
          Scan Fridge
        </button>
        <button
          type="button"
          onClick={() => setFocus("pantry")}
          className={`inline-flex min-h-[44px] ${KITCHEN_BTN_GLASS}`}
        >
          <Wand2 size={16} strokeWidth={1.75} />
          Open Pantry
        </button>
        <button
          type="button"
          onClick={() => setFocus("grocery")}
          className={`inline-flex min-h-[44px] ${KITCHEN_BTN_GLASS}`}
        >
          <ShoppingCart size={16} strokeWidth={1.75} />
          Grocery List
        </button>
      </nav>

      {scanBanner ? (
        <div className="rounded-2xl border border-[#84A59D]/30 bg-[#84A59D]/10 px-4 py-3 text-sm text-[#3F5E58]">
          Scan is simulated here — use <strong>Add Item</strong> to log what you see, or connect a
          camera flow later. Close this note when you&apos;re done.
          <button
            type="button"
            className="ml-3 text-xs font-bold underline"
            onClick={() => setScanBanner(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section aria-label="Inventory status" className="grid gap-4 sm:grid-cols-3">
        <StatusTile
          status="expiring"
          icon={AlertTriangle}
          count={counts.expiring}
          caption="In the next 3 days"
        />
        <StatusTile status="use-soon" icon={Clock4} count={counts["use-soon"]} caption="Within a week" />
        <StatusTile status="fresh" icon={Leaf} count={counts.fresh} caption="Plenty of time" />
      </section>

      <section className={`${KITCHEN_GLASS_PANEL} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-[#84A59D]" />
            <h2 className={`text-lg font-semibold ${KITCHEN_TEXT.title}`}>Meal plan</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setMealPlanOpen(true);
              setMealPlanMinimized(false);
            }}
            className="rounded-full bg-[#3F5E58] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#325048]"
          >
            Open meal plan
          </button>
        </div>
        <p className={`mt-2 text-xs ${KITCHEN_TEXT.muted}`}>
          Plan dinners for the week — focus mode supports list edits, minimize, and recipe ideas from
          your list.
        </p>
      </section>

      <section aria-label="HomeNode intelligence" className="rounded-3xl bg-gradient-to-br from-[#3F5E58] to-[#5A7E76] p-6 text-white shadow-[0_18px_40px_rgba(63,94,88,0.22)] md:p-8">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-white/85">
          <Sparkles size={16} />
          What HomeNode noticed
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {intelligence.map((msg) => (
            <li
              key={msg.id}
              className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm"
            >
              <p className="text-sm leading-relaxed text-white md:text-base">{msg.text}</p>
              <button
                type="button"
                onClick={() => handleIntelligenceAction(msg)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3F5E58] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {msg.action}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Inventory">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-xl font-semibold ${KITCHEN_TEXT.title}`}>Inventory</h2>
          <div
            role="tablist"
            aria-label="Storage location"
            className="flex flex-wrap gap-1.5 rounded-full border border-white/60 bg-white/50 p-1 backdrop-blur-sm"
          >
            {filteredStorageTypes.map((s) => {
              const Icon = STORAGE_ICONS[s.id] || Refrigerator;
              const active = activeStorage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveStorage(s.id)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84A59D] ${
                    active ? "bg-[#3F5E58] text-white shadow-sm" : `${KITCHEN_TEXT.muted} hover:bg-white/80`
                  }`}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {storageItems.length === 0 ? (
          <div className={`${KITCHEN_GLASS_PANEL} p-12 text-center`}>
            <p className={`text-sm ${KITCHEN_TEXT.muted}`}>Nothing here yet. Take a photo to detect items.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByShelf.map(([shelf, shelfItems]) => (
              <div key={shelf}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#475569]">
                  {shelf}
                </p>
                <div className="flex flex-wrap gap-3">
                  {shelfItems.map((item) => (
                    <div key={item.id} className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] min-w-[140px] max-w-[220px]">
                      <ItemCard item={item} onRemove={() => removeInventoryItem(item.id)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section
          id="kitchen-suggested-recipes"
          aria-label="Suggested recipes"
          className={`${KITCHEN_GLASS_PANEL} p-6 lg:col-span-3`}
        >
          <div className="mb-4 flex items-center gap-2">
            <ChefHat size={18} className="text-[#84A59D]" />
            <h2 className={`text-lg font-semibold ${KITCHEN_TEXT.title}`}>Suggested recipes</h2>
          </div>
          <ul className="space-y-3">
            {recipeMatches.map(({ recipe, haveCount, totalCount, missing }) => {
              const pct = (haveCount / totalCount) * 100;
              return (
                <li
                  key={recipe.id}
                  className={`${KITCHEN_GLASS_CARD} p-4 transition-shadow duration-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[#1E293B]">{recipe.title}</p>
                      <p className="mt-0.5 text-xs text-[#475569]">
                        {recipe.timeMinutes} min • {recipe.rationale}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#84A59D]/15 px-3 py-1 text-xs font-semibold text-[#3F5E58]">
                      {haveCount}/{totalCount} ready
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div
                      className="h-full rounded-full bg-[#84A59D] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {missing.length > 0 && (
                    <p className="mt-2 text-xs text-[#475569]">
                      Missing:{" "}
                      <span className="text-slate-700">
                        {missing
                          .map((id) => id.replace(/-/g, " "))
                          .slice(0, 4)
                          .join(", ")}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-label="Low stock" className={`${KITCHEN_GLASS_PANEL} p-6 lg:col-span-2`}>
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#84A59D]" />
            <h2 className={`text-lg font-semibold ${KITCHEN_TEXT.title}`}>Low stock</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className={`text-sm ${KITCHEN_TEXT.muted}`}>Stocks look good. Nothing urgent.</p>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-3 ${KITCHEN_GLASS_CARD} p-3`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1E293B]">{item.name}</p>
                    <p className="text-xs text-[#475569]">{item.percentRemaining}% remaining</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      appendNativeGroceryUnique(item.name);
                      setFocus("grocery");
                      syncGroceryFromBridge();
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#84A59D]/12 px-3 py-1 text-xs font-semibold text-[#3F5E58] transition-colors hover:bg-[#84A59D]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#84A59D]"
                    aria-label={`Add ${item.name} to LifeNode Native grocery list`}
                  >
                    <Plus size={12} /> Add
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[10px] text-slate-400">
            Adds sync to HomeNode → Smart Cart → LifeNode Native List (same device, no refresh
            needed).
          </p>
        </section>
      </div>

      <KitchenGlassModal
        open={focus === "pantry"}
        title="Pantry — focus mode"
        onClose={() => setFocus(null)}
        footer={
          <p className="text-center text-[10px] text-[#475569]">
            Edits save automatically to this browser.
          </p>
        }
      >
        <p className="mb-3 text-sm text-[#475569]">
          Add, edit, or remove pantry staples. This list is separate from your Smart Cart grocery run.
        </p>
        <ListEditorRows rows={pantryRows} onChange={setPantryRows} placeholder="e.g. Basmati rice" />
      </KitchenGlassModal>

      <KitchenGlassModal
        open={focus === "grocery"}
        title="Grocery list — focus mode"
        onClose={() => setFocus(null)}
        footer={
          <p className="text-center text-[10px] text-[#475569]">
            Synced with HomeNode Smart Cart → LifeNode Native List.
          </p>
        }
      >
        <p className="mb-3 text-sm text-[#475569]">
          Changes here appear on the Home surface grocery list immediately.
        </p>
        <ListEditorRows
          rows={groceryRows}
          onChange={(next) => persistGrocery(next)}
          placeholder="e.g. Oat milk"
        />
      </KitchenGlassModal>

      <KitchenGlassModal
        open={focus === "add-item"}
        title="Add kitchen item"
        onClose={() => setFocus(null)}
        footer={null}
      >
        <form className="space-y-3" onSubmit={addInventoryItem}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Name
            <input
              required
              value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Category
              <input
                value={newItem.category}
                onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Quantity
              <input
                value={newItem.quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Storage
            <select
              value={newItem.storage}
              onChange={(e) => {
                const st = e.target.value;
                const sh = SHELF_PRESETS[st]?.[0] || "Top shelf";
                setNewItem((p) => ({ ...p, storage: st, shelf: sh }));
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
            >
              {STORAGE_TYPES.filter((s) => enabledStorage.includes(s.id)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Shelf
            <select
              value={newItem.shelf}
              onChange={(e) => setNewItem((p) => ({ ...p, shelf: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
            >
              {shelfOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              % left
              <input
                type="number"
                min={0}
                max={100}
                value={newItem.percentRemaining}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, percentRemaining: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Days to expiry
              <input
                type="number"
                min={0}
                value={newItem.daysToExpiry}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, daysToExpiry: Number(e.target.value) }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#3F5E58] py-2.5 text-sm font-semibold text-white hover:bg-[#325048]"
          >
            Save to inventory
          </button>
        </form>
      </KitchenGlassModal>

      {mealPlanOpen && !mealPlanMinimized ? (
        <KitchenGlassModal
          open
          title="Meal plan — focus mode"
          onClose={() => {
            setMealPlanOpen(false);
            setMealPlanShowAi(false);
          }}
          headerRight={
            <button
              type="button"
              title="Minimize"
              aria-label="Minimize meal plan"
              onClick={() => setMealPlanMinimized(true)}
              className="rounded-xl p-2 text-[#475569] hover:bg-white/80 hover:text-[#1E293B]"
            >
              <ChevronDown size={20} />
            </button>
          }
          footer={
            <button
              type="button"
              onClick={() => setMealPlanShowAi((v) => !v)}
              className="w-full rounded-xl bg-[#3F5E58] py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#325048]"
            >
              {mealPlanShowAi ? "Hide assistant suggestions" : "Find recipe — AI assistant"}
            </button>
          }
        >
          <p className="mb-3 text-sm text-[#475569]">
            Build your week — lines save automatically. Tap a meal name to open a ChefNode-style
            recipe card (ingredients, steps, nutrition, image) from the kitchen model. Use the pencil
            to edit a line.
          </p>
          <MealPlanEditorRows
            rows={mealPlanRows}
            onChange={setMealPlanRows}
            onPickRecipe={openKitchenRecipe}
            placeholder="e.g. Tuesday — tacos"
          />
          {mealPlanShowAi ? (
            <div className="mt-5 rounded-2xl border border-[#84A59D]/25 bg-[#84A59D]/8 p-4">
              {flareActive ? (
                <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-900">
                  Flare protocol: anti-inflammatory meals only — lighter, healing-forward picks below.
                </p>
              ) : null}
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#3F5E58]">
                Assistant suggestions
              </p>
              <ul className="space-y-2">
                {assistantRecipes.map(({ recipe, haveCount, totalCount, hits }) => (
                  <li key={recipe.id}>
                    <button
                      type="button"
                      onClick={() => openKitchenRecipe(recipe.title)}
                      className="w-full rounded-xl bg-white/90 px-3 py-3 text-left text-sm text-[#1E293B] ring-1 ring-slate-100 transition-colors hover:bg-[#84A59D]/10 hover:ring-[#84A59D]/30"
                    >
                      <span className="block font-semibold">{recipe.title}</span>
                      <span className="mt-0.5 block text-xs text-[#475569]">
                        {haveCount}/{totalCount} on hand
                        {hits > 0 ? ` · ${hits} meal-plan match` : ""}
                      </span>
                      <span className="mt-1 block text-[11px] font-semibold text-[#3F5E58]">
                        Tap for full recipe →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </KitchenGlassModal>
      ) : null}

      {mealPlanOpen && mealPlanMinimized ? (
        <div className="fixed bottom-4 left-1/2 z-[122] flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/85 px-4 py-3 shadow-xl backdrop-blur-xl">
          <span className="text-sm font-semibold text-[#1E293B]">Meal plan</span>
          <button
            type="button"
            aria-label="Expand meal plan"
            onClick={() => setMealPlanMinimized(false)}
            className="rounded-lg p-2 text-[#475569] hover:bg-white"
          >
            <ChevronUp size={18} />
          </button>
        </div>
      ) : null}

      <KitchenRecipeFocusModal
        open={recipeModalOpen}
        tabs={kitchenRecipeTabs}
        activeTabId={activeKitchenTabId}
        onSelectTab={setActiveKitchenTabId}
        selectedTitle={activeKitchenTab?.recipe?.title ?? ""}
        loading={Boolean(activeKitchenTab?.loading)}
        error={activeKitchenTab?.error ?? null}
        recipe={activeKitchenTab?.recipe ?? null}
        imageUrl={
          activeKitchenTab?.recipe?.title
            ? chefRecipeImageSrc({
                imageDataUrl: activeKitchenTab.imageDataUrl,
                title: activeKitchenTab.recipe.title,
              })
            : null
        }
        imageFailed={Boolean(activeKitchenTab?.imageFailed)}
        onClose={() => {
          setRecipeModalOpen(false);
          setKitchenRecipeTabs([]);
          setActiveKitchenTabId(null);
        }}
        onImageError={() => {
          const tabId = activeKitchenTab?.id;
          if (!tabId) return;
          const title = activeKitchenTab?.recipe?.title;
          if (activeKitchenTab?.imageDataUrl && title) {
            setKitchenRecipeTabs((tabs) =>
              tabs.map((t) =>
                t.id === tabId ? { ...t, imageDataUrl: null, imageFailed: false } : t,
              ),
            );
            return;
          }
          const prompt =
            activeKitchenTab?.recipe?.pollinationsQuery ||
            activeKitchenTab?.recipe?.imagePrompt ||
            title;
          void retryPollinationsDishImage(prompt, 1)
            .then((next) => {
              setKitchenRecipeTabs((tabs) =>
                tabs.map((t) =>
                  t.id === tabId ? { ...t, imageDataUrl: next, imageFailed: false } : t,
                ),
              );
            })
            .catch(() => {
              setKitchenRecipeTabs((tabs) =>
                tabs.map((t) => (t.id === tabId ? { ...t, imageFailed: true } : t)),
              );
            });
        }}
        onSaveToVault={saveKitchenRecipeToVault}
        vaultSaved={Boolean(activeKitchenTab?.vaultSaved)}
      />

      <KitchenVaultToast
        message={kitchenVaultToast}
        onDismiss={() => setKitchenVaultToast(null)}
      />
    </div>
  );
}

function StatusTile({ status, icon: Icon, count, caption }) {
  const meta = STATUS_META[status];
  return (
    <div
      className={`flex items-start gap-4 ${KITCHEN_GLASS_PANEL} p-5 transition-transform duration-200 hover:-translate-y-0.5`}
      style={{ backgroundColor: meta.soft }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
        style={{ backgroundColor: meta.accent }}
      >
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-3xl font-semibold leading-none" style={{ color: meta.textOn }}>
          {count}
        </p>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: meta.textOn }}>
          {meta.label}
        </p>
        <p className="text-xs text-[#475569]">{caption}</p>
      </div>
    </div>
  );
}

function ItemCard({ item, onRemove }) {
  const status = classifyExpiry(item.daysToExpiry);
  const meta = STATUS_META[status];
  const dayLabel =
    item.daysToExpiry <= 0
      ? "Expires today"
      : item.daysToExpiry === 1
        ? "Expires tomorrow"
        : item.daysToExpiry < 30
          ? `${item.daysToExpiry} days left`
          : `${Math.round(item.daysToExpiry / 30)} mo left`;

  return (
    <article className={`group flex h-full flex-col gap-2 ${KITCHEN_GLASS_CARD} p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]`}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1E293B]">{item.name}</p>
          <p className="text-[11px] text-[#475569]">
            {item.category} • {item.quantity}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={14} />
          </button>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: meta.soft, color: meta.textOn }}
          >
            {meta.short}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-[10px] text-[#475569]">
          <span>{item.percentRemaining}%</span>
          <span style={{ color: meta.textOn, fontWeight: 600 }}>{dayLabel}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${item.percentRemaining}%`, backgroundColor: meta.accent }}
          />
        </div>
      </div>
    </article>
  );
}
