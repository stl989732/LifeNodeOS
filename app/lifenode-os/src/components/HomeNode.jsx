"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";
import DualRailCommandCenter from "@/src/components/shell/DualRailCommandCenter";
import AppCategoryRequestFooter from "@/src/components/AppCategoryRequestFooter";
import ChefUtensilLoader from "@/src/components/ChefUtensilLoader";
import { useLoadingOverlay } from "@/src/context/LoadingOverlayContext";
import { useLifeNodeContext } from "@/src/context/LifeNodeContext";
import { useReportNodeUserData } from "@/src/hooks/useReportNodeUserData";
import { useServerOnboardingComplete } from "@/src/hooks/useServerOnboardingComplete";
import {
  ensureNativeGrocerySeeded,
  NATIVE_GROCERY_CHANGED,
  NATIVE_GROCERY_STORAGE_KEY,
  readNativeGroceryList,
  writeNativeGroceryList,
} from "@/src/lib/nativeGroceryBridge";
import { chefRecipeImageSrc } from "@/src/lib/kitchenDishImage";
import {
  getActiveKitchenTab,
  kitchenTabIdFromTitle,
  mergeKitchenRecipeTabs,
  upsertKitchenRecipeTab,
} from "@/src/lib/kitchenRecipeTabs";
import KitchenRecipeTabBar from "@/src/components/home-kitchen/KitchenRecipeTabBar";
import KitchenVaultToast from "@/src/components/home-kitchen/KitchenVaultToast";
import { appendRecipeToVault, RECIPE_VAULT_KEY } from "@/src/lib/recipeVaultStorage";
import {
  clearFlareTaskFlags,
  deactivateFlareMode,
  FLARE_MODE_CHANGED,
  readFlareMode,
} from "@/src/lib/flareModeBridge";
import {
  KITCHEN_BG_CLASS,
  KITCHEN_BTN_PRIMARY,
  KITCHEN_CHIP_ACTIVE,
  KITCHEN_CHIP_IDLE,
  KITCHEN_INNER_PANEL,
  KITCHEN_INNER_PANEL_SM,
  KITCHEN_INPUT_CLASS,
  KITCHEN_TEXT,
  KITCHEN_TOGGLE_ACTIVE,
  KITCHEN_TOGGLE_IDLE,
} from "@/src/lib/homeNode/kitchenMintCream";
import {
  ArrowUpRight,
  Calculator,
  Calendar,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Heart,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Mic,
  NotebookPen,
  Pencil,
  Plus,
  Refrigerator,
  ShoppingCart,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

const STORAGE_KEY = "lifenode.homenode.setup.v1";
const NOTES_KEY = "lifenode.homenode.notes.v1";
const SAVED_NOTES_KEY = "lifenode.homenode.saved-notes.v1";
const BUDGET_ROWS_KEY = "lifenode.homenode.budget-rows.v1";
const CHORE_ROWS_KEY = "lifenode.homenode.chore-rows.v1";
const ACTIVITY_PREP_KEY = "lifenode.homenode.activity-prep.v1";
const UPCOMING_ENGAGEMENT_KEY = "lifenode.homenode.upcoming-engagement.v1";

function normalizeActivityPrepRow(row) {
  if (row && typeof row.title === "string") {
    return {
      id: row.id || crypto.randomUUID(),
      title: row.title,
      scheduledAt: row.scheduledAt || "",
      participantType: row.participantType === "person" ? "person" : "child",
      participantName: row.participantName || "",
      itemsToBring: row.itemsToBring || "",
    };
  }
  return {
    id: row?.id || crypto.randomUUID(),
    title: row?.label || "",
    scheduledAt: "",
    participantType: "child",
    participantName: "",
    itemsToBring: "",
  };
}

function createEmptyActivityPrepRow() {
  return {
    id: crypto.randomUUID(),
    title: "",
    scheduledAt: "",
    participantType: "child",
    participantName: "",
    itemsToBring: "",
  };
}

const RECIPE_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const HOME_APPS_PRIMARY = [
  "Google Calendar",
  "Any.do",
  "Cozi",
  "Google Drive",
  "Dropbox",
  "Evernote",
];
const HOME_APPS_MORE = [
  "TimeTree",
  "FamilyWall",
  "Bring!",
  "OurGroceries",
  "AnyList",
  "MealBoard",
  "Paprika Recipe Manager",
  "Sweepy",
  "TodyMaple",
  "Fami",
  "YNAB",
  "Monarch Money",
  "Rocket Money",
  "Life360",
  "Bark",
  "OurPact",
  "Medisafe",
  "MyChart",
];
const PRIORITIES = [
  "Meal Planning",
  "Budgeting",
  "School/Activities",
  "Chores/Task",
  "Family Safety",
  "Transportation and Appointment",
];

const PRIORITY_DETAILS = {
  "School/Activities":
    "Managing school calendars, soccer practices, dentist appointments, field trip forms, and birthday party RSVPs.",
  "Meal Planning":
    "Meal planning, grocery shopping, cleaning, and repairing items.",
  Budgeting:
    "Keeping track of household needs, such as buying school uniforms, clothing, or replenishing groceries.",
  "Transportation and Appointment":
    "Managing carpools or transporting family members to various events.",
  "Chores/Task":
    "The invisible labor of remembering deadlines, anticipating future needs (e.g., needing new shoes), and organizing WhatsApp groups.",
  "Family Safety":
    "Coordinating check-ins, safety alerts, medication reminders, and shared emergency context across the household.",
};

const NOTE_LABELS = ["Reminder", "Urgent", "School", "Health", "Finance", "General"];
const NOTE_COLORS = [
  { name: "Sage", value: "#84A59D" },
  { name: "Coral", value: "#F28482" },
  { name: "Sky", value: "#60A5FA" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Violet", value: "#A78BFA" },
];
const MEAL_PRESETS = ["Comfort Stew", "Garden Grain Bowl", "Coastal Citrus Fish", "Sunrise Oat Bake"];

/** Home command deck (rail 2) — same ids as `sectionFilter` / scroll targets. */
const HOME_FEATURE_DECK = [
  { id: "chef-node", label: "ChefNode", icon: Utensils },
  { id: "smart-cart", label: "Smart Cart", icon: ShoppingCart },
  { id: "chore-hub", label: "Chore & Reward Hub", icon: CalendarCheck },
  { id: "home-overview", label: "Home Overview", icon: LayoutDashboard },
];

export default function HomeNode() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [step, setStep] = useState(1);
  const [selectedApps, setSelectedApps] = useState([]);
  const [useNativeTools, setUseNativeTools] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notes, setNotes] = useState("");

  const [showNotes, setShowNotes] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [showMoreApps, setShowMoreApps] = useState(false);
  const [loginPromptApp, setLoginPromptApp] = useState("");
  const [nativeGroceryList, setNativeGroceryList] = useState([]);
  const [savedNotes, setSavedNotes] = useState([]);
  const [noteLabel, setNoteLabel] = useState("General");
  const [noteColor, setNoteColor] = useState("#84A59D");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantReply, setAssistantReply] = useState(
    "Ask about household tasks once you've added your family context and connected apps.",
  );
  const [ingredientsOnHand, setIngredientsOnHand] = useState("");
  const [kitchenRecipeTabs, setKitchenRecipeTabs] = useState([]);
  const [activeKitchenTabId, setActiveKitchenTabId] = useState(null);
  const [kitchenVaultToast, setKitchenVaultToast] = useState(null);
  const [mealLoading, setMealLoading] = useState(false);
  const [vaultFocusId, setVaultFocusId] = useState(null);
  const [chefPhase, setChefPhase] = useState("idle");
  const [chefIntro, setChefIntro] = useState("");
  const [discoveryOptions, setDiscoveryOptions] = useState([]);
  const [selectedDiscoveryIds, setSelectedDiscoveryIds] = useState([]);
  const [chefCookMode, setChefCookMode] = useState(false);
  const [sectionFilter, setSectionFilter] = useState(null);
  const [flareActive, setFlareActive] = useState(false);

  const [budgetRows, setBudgetRows] = useState([]);
  const [budgetCollapsed, setBudgetCollapsed] = useState(false);
  const [chores, setChores] = useState([]);
  const [choreHubCollapsed, setChoreHubCollapsed] = useState(false);
  const [recipeVault, setRecipeVault] = useState([]);
  const [vaultCollapsed, setVaultCollapsed] = useState(false);
  const [vaultFilter, setVaultFilter] = useState("All");
  const [chefTip, setChefTip] = useState("");
  const [chefTipLoading, setChefTipLoading] = useState(false);
  const [activityPrepItems, setActivityPrepItems] = useState([]);
  const [upcomingEngagement, setUpcomingEngagement] = useState(null);
  const { patchBridgeSignals } = useLifeNodeContext();

  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chefTipFetchedRef = useRef(false);
  const chefDiscoverFlowRef = useRef(false);
  const pendingChefTabIdRef = useRef(null);

  const activeKitchenTab = useMemo(
    () => getActiveKitchenTab(kitchenRecipeTabs, activeKitchenTabId),
    [kitchenRecipeTabs, activeKitchenTabId],
  );
  const generatedMeal = activeKitchenTab?.recipe ?? null;
  const mealCategory = activeKitchenTab?.category ?? null;
  const loadingOverlay = useLoadingOverlay();

  const markHomeSetupComplete = useCallback(() => {
    setIsInitialized(true);
    if (typeof window === "undefined" || !userId) return;
    try {
      const key = userScopedStorageKey(STORAGE_KEY, userId);
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...parsed, isInitialized: true }),
      );
    } catch {
      /* non-fatal */
    }
  }, [userId]);

  useServerOnboardingComplete("HomeNode", markHomeSetupComplete);

  useEffect(() => {
    const onOnboardingDone = () => markHomeSetupComplete();
    window.addEventListener("lifenode:onboarding:changed", onOnboardingDone);
    return () =>
      window.removeEventListener("lifenode:onboarding:changed", onOnboardingDone);
  }, [markHomeSetupComplete]);

  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    function syncFlare() {
      setFlareActive(readFlareMode().active);
    }
    syncFlare();
    window.addEventListener(FLARE_MODE_CHANGED, syncFlare);
    return () => window.removeEventListener(FLARE_MODE_CHANGED, syncFlare);
  }, []);

  const scopedKeys = useMemo(
    () => ({
      setup: userScopedStorageKey(STORAGE_KEY, userId),
      notes: userScopedStorageKey(NOTES_KEY, userId),
      savedNotes: userScopedStorageKey(SAVED_NOTES_KEY, userId),
      budget: userScopedStorageKey(BUDGET_ROWS_KEY, userId),
      chores: userScopedStorageKey(CHORE_ROWS_KEY, userId),
      prep: userScopedStorageKey(ACTIVITY_PREP_KEY, userId),
      engagement: userScopedStorageKey(UPCOMING_ENGAGEMENT_KEY, userId),
      nativeGrocery: userScopedStorageKey(NATIVE_GROCERY_STORAGE_KEY, userId),
      recipeVault: userScopedStorageKey(RECIPE_VAULT_KEY, userId),
    }),
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => {
      ensureNativeGrocerySeeded([], scopedKeys.nativeGrocery);
      const g = readNativeGroceryList(scopedKeys.nativeGrocery);
      setNativeGroceryList(g);

      const saved = window.localStorage.getItem(scopedKeys.setup);
      const savedNotes = window.localStorage.getItem(scopedKeys.notes);
      const savedNotesList = window.localStorage.getItem(scopedKeys.savedNotes);
      const rawVault = window.localStorage.getItem(scopedKeys.recipeVault);
      const rawBudget = window.localStorage.getItem(scopedKeys.budget);
      const rawChores = window.localStorage.getItem(scopedKeys.chores);
      const rawPrep = window.localStorage.getItem(scopedKeys.prep);
      const rawEng = window.localStorage.getItem(scopedKeys.engagement);

      if (savedNotes) setNotes(savedNotes);
      if (savedNotesList) {
        try {
          setSavedNotes(JSON.parse(savedNotesList));
        } catch {
          setSavedNotes([]);
        }
      }

      if (rawVault) {
        try {
          const v = JSON.parse(rawVault);
          if (Array.isArray(v)) setRecipeVault(v);
        } catch {
          setRecipeVault([]);
        }
      }

      const legacyChildName =
        typeof window !== "undefined"
          ? window.localStorage.getItem("lifenode.homenode.child-name.v1")
          : null;

      let setupInitialized = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.selectedApps)) setSelectedApps(parsed.selectedApps);
          if (typeof parsed?.useNativeTools === "boolean") setUseNativeTools(parsed.useNativeTools);
          if (Array.isArray(parsed?.selectedPriorities)) {
            setSelectedPriorities(parsed.selectedPriorities);
          } else if (parsed?.priority) {
            setSelectedPriorities([parsed.priority]);
          }
          setupInitialized = !!parsed?.isInitialized;
          if (setupInitialized) setIsInitialized(true);
        } catch {
          // Ignore invalid persisted setup and start fresh.
        }
      }

      let nextBudget = [];
      if (rawBudget) {
        try {
          const b = JSON.parse(rawBudget);
          if (Array.isArray(b) && b.length) nextBudget = b;
        } catch {
          /* ignore */
        }
      }
      setBudgetRows(nextBudget);

      let nextChores = [];
      if (rawChores) {
        try {
          const c = JSON.parse(rawChores);
          if (Array.isArray(c) && c.length) nextChores = c;
        } catch {
          /* ignore */
        }
      }
      setChores(nextChores);

      let nextPrep = [];
      if (rawPrep) {
        try {
          const p = JSON.parse(rawPrep);
          if (Array.isArray(p) && p.length) {
            nextPrep = p.map(normalizeActivityPrepRow);
          }
        } catch {
          /* ignore */
        }
      }
      const migratedChild =
        (saved &&
          (() => {
            try {
              const parsed = JSON.parse(saved);
              return typeof parsed?.childName === "string" ? parsed.childName.trim() : "";
            } catch {
              return "";
            }
          })()) ||
        legacyChildName?.trim() ||
        "";
      if (!nextPrep.length && migratedChild) {
        nextPrep = [
          {
            ...createEmptyActivityPrepRow(),
            participantName: migratedChild,
          },
        ];
      }
      setActivityPrepItems(nextPrep);

      let nextEng = null;
      if (rawEng) {
        try {
          nextEng = JSON.parse(rawEng);
        } catch {
          nextEng = null;
        }
      }
      setUpcomingEngagement(nextEng);
    });
  }, [userId, scopedKeys]);

  useEffect(() => {
    if (!userId) return;
    writeNativeGroceryList(nativeGroceryList, scopedKeys.nativeGrocery);
  }, [nativeGroceryList, userId, scopedKeys.nativeGrocery]);

  useEffect(() => {
    function syncGroceryFromStore() {
      setNativeGroceryList((prev) => {
        const next = readNativeGroceryList();
        if (
          prev.length === next.length &&
          prev.every((v, i) => v === next[i])
        ) {
          return prev;
        }
        return next;
      });
    }
    window.addEventListener(NATIVE_GROCERY_CHANGED, syncGroceryFromStore);
    function onStorage(e) {
      if (e.key === NATIVE_GROCERY_STORAGE_KEY) syncGroceryFromStore();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NATIVE_GROCERY_CHANGED, syncGroceryFromStore);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || recipeVault.length > 0 || chefTipFetchedRef.current) return;
    chefTipFetchedRef.current = true;
    let cancelled = false;
    (async () => {
      setChefTipLoading(true);
      try {
        const res = await fetch("/api/homenode/kitchen-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "chef_tip" }),
        });
        const data = await res.json();
        if (!cancelled) setChefTip(data?.tip || "");
      } catch {
        if (!cancelled) {
          setChefTip(
            "Mise en place: always have ingredients prepped before you start cooking.",
          );
        }
      } finally {
        if (!cancelled) setChefTipLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, recipeVault.length]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.notes, notes);
  }, [notes, userId, scopedKeys.notes]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.savedNotes, JSON.stringify(savedNotes));
  }, [savedNotes, userId, scopedKeys.savedNotes]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.budget, JSON.stringify(budgetRows));
  }, [budgetRows, userId, scopedKeys.budget]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.chores, JSON.stringify(chores));
  }, [chores, userId, scopedKeys.chores]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.recipeVault, JSON.stringify(recipeVault));
  }, [recipeVault, userId, scopedKeys.recipeVault]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(scopedKeys.prep, JSON.stringify(activityPrepItems));
  }, [activityPrepItems, userId, scopedKeys.prep]);

  useEffect(() => {
    if (!userId) return;
    window.localStorage.setItem(
      scopedKeys.engagement,
      JSON.stringify(upcomingEngagement),
    );
  }, [upcomingEngagement, userId, scopedKeys.engagement]);

  const smartCartSource = useMemo(() => {
    if (useNativeTools) return "LifeNode Native List";
    const groceryCapable = selectedApps.find((app) =>
      ["Any.do", "Cozi", "Bring!", "OurGroceries", "AnyList", "MealBoard", "Paprika Recipe Manager"].includes(app),
    );
    return groceryCapable ? `${groceryCapable} Grocery Sync` : "No grocery app connected";
  }, [selectedApps, useNativeTools]);

  const canContinueStep2 = useMemo(
    () => selectedApps.length > 0 || useNativeTools,
    [selectedApps.length, useNativeTools],
  );

  const filteredRecipeVault = useMemo(() => {
    if (vaultFilter === "All") return recipeVault;
    return recipeVault.filter((r) => r.category === vaultFilter);
  }, [recipeVault, vaultFilter]);

  const homeDeck = useMemo(() => {
    const f = sectionFilter;
    if (!f) {
      return {
        strip: true,
        cart: true,
        chore: true,
        native: true,
        budget: true,
        kitchen: true,
        notes: true,
        intel: true,
        cw: "lg:col-span-4",
        chw: "lg:col-span-5",
        nw: "lg:col-span-3",
      };
    }
    if (f === "home-overview") {
      return {
        strip: true,
        cart: true,
        chore: true,
        native: true,
        budget: false,
        kitchen: false,
        notes: false,
        intel: false,
        cw: "lg:col-span-4",
        chw: "lg:col-span-5",
        nw: "lg:col-span-3",
      };
    }
    if (f === "smart-cart") {
      return {
        strip: false,
        cart: true,
        chore: false,
        native: false,
        budget: false,
        kitchen: false,
        notes: false,
        intel: false,
        cw: "lg:col-span-12",
        chw: "",
        nw: "",
      };
    }
    if (f === "chore-hub") {
      return {
        strip: false,
        cart: false,
        chore: true,
        native: false,
        budget: false,
        kitchen: false,
        notes: false,
        intel: false,
        cw: "",
        chw: "lg:col-span-12",
        nw: "",
      };
    }
    if (f === "chef-node") {
      return {
        strip: false,
        cart: false,
        chore: false,
        native: false,
        budget: false,
        kitchen: true,
        notes: false,
        intel: false,
        cw: "",
        chw: "",
        nw: "",
      };
    }
    return {
      strip: true,
      cart: true,
      chore: true,
      native: true,
      budget: true,
      kitchen: true,
      notes: true,
      intel: true,
      cw: "lg:col-span-4",
      chw: "lg:col-span-5",
      nw: "lg:col-span-3",
    };
  }, [sectionFilter]);

  useEffect(() => {
    if (!isInitialized || sectionFilter !== "chef-node") return;
    const t = window.setTimeout(() => {
      document.getElementById("chef-node")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [isInitialized, sectionFilter]);

  function toggleApp(app) {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((x) => x !== app) : [...prev, app],
    );
    setLoginPromptApp(app);
  }

  function togglePriority(option) {
    setSelectedPriorities((prev) =>
      prev.includes(option) ? prev.filter((x) => x !== option) : [...prev, option],
    );
  }

  function completeSetup() {
    if (selectedPriorities.length === 0 || !canContinueStep2) return;
    const payload = {
      selectedApps,
      useNativeTools,
      selectedPriorities,
      isInitialized: true,
    };
    window.localStorage.setItem(scopedKeys.setup, JSON.stringify(payload));
    setBudgetRows([]);
    setChores([]);
    setActivityPrepItems([]);
    setUpcomingEngagement(null);
    window.localStorage.setItem(scopedKeys.budget, JSON.stringify([]));
    window.localStorage.setItem(scopedKeys.chores, JSON.stringify([]));
    window.localStorage.setItem(scopedKeys.prep, JSON.stringify([]));
    window.localStorage.removeItem(scopedKeys.engagement);
    setIsInitialized(true);
  }

  function runCalc() {
    try {
      const result = Function(`"use strict"; return (${calcInput || "0"});`)();
      setCalcInput(String(result));
    } catch {
      setCalcInput("Error");
    }
  }

  function addCalcToken(token) {
    if (calcInput === "Error") {
      setCalcInput(token);
      return;
    }
    setCalcInput((prev) => `${prev}${token}`);
  }

  function saveCurrentNote() {
    const value = notes.trim();
    if (!value) return;
    setSavedNotes((prev) => [
      {
        id: crypto.randomUUID(),
        text: value,
        label: noteLabel,
        color: noteColor,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNotes("");
  }

  function deleteSavedNote(id) {
    setSavedNotes((prev) => prev.filter((note) => note.id !== id));
  }

  function mealThumbDataUrl(title) {
    const safe = String(title)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .slice(0, 22);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#84A59D"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient></defs><rect width="120" height="120" rx="20" fill="url(#g)"/><text x="60" y="66" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui,sans-serif">${safe}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function pickKitchenImageDataUrl(data) {
    if (!data || typeof data !== "object") return null;
    const direct = data.imageDataUrl;
    if (typeof direct === "string" && direct.startsWith("data:image")) return direct;
    const list = data.imageDataUrls;
    if (Array.isArray(list)) {
      const first = list.find(
        (u) => typeof u === "string" && u.startsWith("data:image"),
      );
      if (first) return first;
    }
    return null;
  }

  function normalizeKitchenRecipe(obj) {
    if (!obj || typeof obj !== "object") return null;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const prepTime = typeof obj.prepTime === "string" ? obj.prepTime : "30 min";
    const servings = typeof obj.servings === "string" ? obj.servings : "4";
    const steps = Array.isArray(obj.steps)
      ? obj.steps.filter((s) => typeof s === "string")
      : [];
    const ingRaw = obj.ingredients;
    const ingredients = [];
    if (Array.isArray(ingRaw)) {
      for (const row of ingRaw) {
        if (row && typeof row === "object") {
          const r = row;
          const item =
            typeof r.item === "string"
              ? r.item.trim()
              : typeof r.name === "string"
                ? r.name.trim()
                : "";
          const amount =
            typeof r.amount === "string"
              ? r.amount.trim()
              : typeof r.qty === "string"
                ? r.qty.trim()
                : "";
          if (item) ingredients.push({ item, amount: amount || "as needed" });
        }
      }
    }
    let caloriesPerServing = null;
    const rawCal = obj.caloriesPerServing;
    if (typeof rawCal === "number" && Number.isFinite(rawCal)) {
      caloriesPerServing = Math.max(50, Math.round(rawCal));
    } else if (typeof rawCal === "string") {
      const n = parseInt(String(rawCal).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n)) caloriesPerServing = Math.max(50, n);
    }
    const imagePrompt = typeof obj.imagePrompt === "string" ? obj.imagePrompt.trim() : "";
    if (!title || steps.length === 0) return null;
    return {
      title,
      prepTime,
      servings,
      steps,
      ingredients,
      caloriesPerServing,
      imagePrompt,
    };
  }

  function showKitchenVaultToast(text) {
    setKitchenVaultToast(text);
    window.setTimeout(() => setKitchenVaultToast(null), 4200);
  }

  function patchActiveKitchenTab(patch) {
    const tabId = activeKitchenTabId ?? activeKitchenTab?.id;
    if (!tabId) return;
    setKitchenRecipeTabs((tabs) =>
      tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
    );
  }

  async function categorizeRecipe(recipe) {
    const textForCat = [
      ...(Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((x) => `${x.item} ${x.amount || ""}`)
        : []),
      ...(Array.isArray(recipe.steps) ? recipe.steps : []),
    ].join("\n");
    let category = "Dinner";
    try {
      const catRes = await fetchKitchenAi({
        mode: "categorize",
        recipeTitle: recipe.title,
        recipeText: textForCat.slice(0, 1200),
      });
      if (catRes?.category && RECIPE_CATEGORIES.includes(catRes.category)) {
        category = catRes.category;
      }
    } catch {
      /* keep default */
    }
    return category;
  }

  async function commitChefRecipes(recipes, apiImage) {
    const list = recipes.filter(Boolean);
    if (!list.length) return;
    const pendingId = pendingChefTabIdRef.current;
    const entries = await Promise.all(
      list.map(async (recipe, index) => ({
        id: index === 0 ? pendingId ?? undefined : undefined,
        recipe,
        category: await categorizeRecipe(recipe),
        imageDataUrl: index === 0 ? apiImage || null : null,
        imageFailed: false,
        loading: false,
        error: null,
      })),
    );
    pendingChefTabIdRef.current = null;
    let nextActiveId = null;
    setKitchenRecipeTabs((prev) => {
      const merged = mergeKitchenRecipeTabs(prev, entries);
      nextActiveId = merged.activeId;
      return merged.tabs;
    });
    if (nextActiveId) setActiveKitchenTabId(nextActiveId);
  }

  function stageChefTabLoading(mealTitle, accumulate) {
    const title = mealTitle.trim();
    const placeholder = {
      title,
      prepTime: "—",
      servings: "—",
      steps: ["ChefNode is writing your recipe…"],
      ingredients: [],
    };
    let stagedId = null;
    setKitchenRecipeTabs((prev) => {
      const base = accumulate ? prev : [];
      const tabId = kitchenTabIdFromTitle(title, base);
      stagedId = tabId;
      const { tabs } = upsertKitchenRecipeTab(base, {
        id: tabId,
        recipe: placeholder,
        loading: true,
        category: null,
        imageDataUrl: null,
        imageFailed: false,
        error: null,
      });
      return tabs;
    });
    pendingChefTabIdRef.current = stagedId;
    if (stagedId) setActiveKitchenTabId(stagedId);
  }

  function isLikelySpecificDish(s) {
    const t = s.trim();
    if (!t) return false;
    if (/\brecipe\b/i.test(t)) return true;
    const lower = t.toLowerCase();
    if (/\b(something|anything|ideas?|healthy|quick|easy|craving|mood|help|suggest|want|feel like)\b/.test(lower)) {
      return false;
    }
    if (t.includes(",") && t.split(",").filter((x) => x.trim()).length > 2) return false;
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length <= 4 && t.length <= 40 && !/\b(and|with|or)\b/i.test(lower)) return true;
    return false;
  }

  function fallbackChefExecuteRecipe(title) {
    return {
      title,
      prepTime: "35 min",
      servings: "4",
      caloriesPerServing: 420,
      imagePrompt: "",
      ingredients: [
        { item: "Olive oil", amount: "2 tbsp" },
        { item: "Aromatics", amount: "1 cup chopped" },
        { item: "Main ingredients", amount: "as needed" },
        { item: "Stock or water", amount: "2 cups" },
      ],
      steps: [
        "Prep all ingredients before heat goes on.",
        "Build flavor in the pan: sear or sweat as fits the dish.",
        "Simmer or finish until textures are right; taste and adjust salt.",
        "Rest briefly if needed, plate, and serve.",
      ],
    };
  }

  async function runChefDiscover() {
    const q = ingredientsOnHand.trim();
    if (!q) return;
    chefDiscoverFlowRef.current = true;
    loadingOverlay.show("ChefNode is preparing your kitchen…");
    setMealLoading(true);
    setChefPhase("idle");
    setDiscoveryOptions([]);
    setChefIntro("");
    setKitchenRecipeTabs([]);
    setActiveKitchenTabId(null);
    setSelectedDiscoveryIds([]);
    pendingChefTabIdRef.current = null;
    try {
      if (isLikelySpecificDish(q)) {
        setChefIntro("");
        await runChefExecute(q, { strictModelImage: true });
        return;
      }
      const data = await fetchKitchenAi({ mode: "chef_discover", userRequest: q });
      if (data?.phase === "direct" && data?.mealTitle) {
        setChefIntro(typeof data.message === "string" ? data.message : "");
        await runChefExecute(String(data.mealTitle), { strictModelImage: true });
        return;
      }
      if (data?.phase === "discovery" && Array.isArray(data.options) && data.options.length >= 3) {
        setChefIntro(typeof data.message === "string" ? data.message : "");
        setDiscoveryOptions(
          data.options.slice(0, 3).map((o, i) => ({
            id: `opt-${i}-${o.title}`,
            title: o.title,
            tagline: o.tagline || "",
          })),
        );
        setSelectedDiscoveryIds([]);
        setChefPhase("discovery");
        return;
      }
      setChefIntro("Could not read suggestions. Try rephrasing, or name a specific dish.");
    } catch {
      setChefIntro("Something went wrong. Check your connection and try again.");
    } finally {
      chefDiscoverFlowRef.current = false;
      loadingOverlay.hide();
      setMealLoading(false);
    }
  }

  function toggleDiscoverySelection(optionId) {
    setSelectedDiscoveryIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    );
  }

  function discoveryOptionHasTab(title) {
    const key = String(title || "").trim().toLowerCase();
    if (!key) return false;
    return kitchenRecipeTabs.some((t) => t.recipe.title?.trim().toLowerCase() === key);
  }

  async function cookSelectedDiscoveryMeals() {
    const picks = discoveryOptions.filter((o) => selectedDiscoveryIds.includes(o.id));
    if (!picks.length) return;

    setMealLoading(true);
    setChefPhase("recipe");
    try {
      let tabCount = kitchenRecipeTabs.length;
      for (let i = 0; i < picks.length; i++) {
        await runChefExecute(picks[i].title, {
          strictModelImage: true,
          accumulate: tabCount > 0 || i > 0,
          keepDiscovery: true,
          manageLoading: false,
        });
        tabCount += 1;
      }
    } finally {
      setMealLoading(false);
    }
  }

  async function runChefExecute(selectedMealTitle, opts) {
    const strictModelImage = Boolean(opts?.strictModelImage);
    const accumulate =
      opts?.accumulate !== undefined
        ? Boolean(opts.accumulate)
        : kitchenRecipeTabs.length > 0;
    const keepDiscovery = Boolean(opts?.keepDiscovery);
    const manageLoading = opts?.manageLoading !== false;
    const meal = selectedMealTitle.trim();
    if (!meal) return;
    if (manageLoading) setMealLoading(true);
    setChefPhase("recipe");
    if (!accumulate) {
      if (!keepDiscovery) setDiscoveryOptions([]);
      setKitchenRecipeTabs([]);
      setActiveKitchenTabId(null);
    }
    stageChefTabLoading(meal, accumulate);
    const pantry = ingredientsOnHand.trim();
    const pantryHints =
      pantry && !pantry.toLowerCase().includes(meal.slice(0, 8).toLowerCase()) ? pantry : "";
    try {
      const data = await fetchKitchenAi({
        mode: "chef_execute",
        selectedMeal: meal,
        pantryHints,
      });
      const apiImage = pickKitchenImageDataUrl(data);
      const hasRecipePayload =
        (Array.isArray(data?.recipes) && data.recipes.length > 0) ||
        (data?.recipe && typeof data.recipe === "object");
      if (strictModelImage && !apiImage && !hasRecipePayload) {
        setChefIntro(
          data?.error === "no_model_image"
            ? "The kitchen model did not return an image. Try again."
            : "Could not load a model-generated image. Try again.",
        );
        if (!accumulate) {
          setKitchenRecipeTabs([]);
          setActiveKitchenTabId(null);
        } else {
          patchActiveKitchenTab({ loading: false, error: "Could not load image." });
        }
        return;
      }

      const multiRaw = data?.recipes;
      if (Array.isArray(multiRaw) && multiRaw.length >= 2) {
        const list = multiRaw.map((x) => normalizeKitchenRecipe(x)).filter(Boolean);
        if (list.length >= 2) {
          if (strictModelImage && !apiImage) {
            setChefIntro("The kitchen model did not return an image. Try again.");
            if (!accumulate) {
              setKitchenRecipeTabs([]);
              setActiveKitchenTabId(null);
            }
            return;
          }
          await commitChefRecipes(list, apiImage);
          return;
        }
      }

      let recipe = normalizeKitchenRecipe(data?.recipe);
      if (!recipe) {
        const raw = data?.recipe && typeof data.recipe === "object" ? data.recipe : null;
        if (raw && Array.isArray(raw.steps) && raw.steps.length > 0) {
          recipe = normalizeKitchenRecipe(raw);
        }
      }
      if (!recipe) {
        recipe = fallbackChefExecuteRecipe(meal);
      }
      if (strictModelImage && !apiImage) {
        setChefIntro("The kitchen model did not return an image. Try again.");
        if (!accumulate) {
          setKitchenRecipeTabs([]);
          setActiveKitchenTabId(null);
        } else {
          patchActiveKitchenTab({ loading: false, error: "Could not load image." });
        }
        return;
      }
      await commitChefRecipes([recipe], apiImage);
    } catch (e) {
      if (strictModelImage) {
        if (e?.details?.error === "no_model_image") {
          setChefIntro(
            typeof e.details?.message === "string"
              ? e.details.message
              : "The kitchen model did not return an image. Try again.",
          );
        } else {
          setChefIntro("Something went wrong. Check your connection and try again.");
        }
        if (!accumulate) {
          setKitchenRecipeTabs([]);
          setActiveKitchenTabId(null);
        } else {
          patchActiveKitchenTab({
            loading: false,
            error: "Something went wrong. Try again.",
          });
        }
      } else {
        const local = fallbackChefExecuteRecipe(meal);
        await commitChefRecipes([local], null);
      }
    } finally {
      pendingChefTabIdRef.current = null;
      if (manageLoading) setMealLoading(false);
    }
  }

  function resetChefSearch() {
    setKitchenRecipeTabs([]);
    setActiveKitchenTabId(null);
    pendingChefTabIdRef.current = null;
    setChefPhase("idle");
    setChefIntro("");
    setDiscoveryOptions([]);
    setSelectedDiscoveryIds([]);
    setKitchenVaultToast(null);
  }

  function toggleIngredientCheck(key) {
    const tabId = activeKitchenTabId ?? activeKitchenTab?.id;
    if (!tabId) return;
    setKitchenRecipeTabs((tabs) =>
      tabs.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          ingredientChecked: {
            ...t.ingredientChecked,
            [key]: !t.ingredientChecked[key],
          },
        };
      }),
    );
  }

  function totalBudgetRemaining() {
    return budgetRows.reduce((s, r) => s + (Number(r.remaining) || 0), 0);
  }

  function choresDueTodayCount() {
    return chores.filter((c) => c.status === "Due Today").length;
  }

  async function fetchKitchenAi(payload) {
    const res = await fetch("/api/homenode/kitchen-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      const err = new Error(
        typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
            ? data.message
            : `Kitchen AI HTTP ${res.status}`,
      );
      err.details = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function fallbackRecipeFromIngredients(cleanedIngredients) {
    const keyIngredients = cleanedIngredients.slice(0, 3);
    return {
      title: `${keyIngredients.join(" + ")} Skillet`,
      prepTime: "20 min",
      servings: "4",
      caloriesPerServing: 385,
      imagePrompt: "",
      ingredients: cleanedIngredients.map((x) => ({ item: x, amount: "as needed" })),
      steps: [
        "Saute aromatics and sturdy ingredients in olive oil for 5 minutes.",
        "Add remaining ingredients with seasoning and simmer until tender.",
        "Finish with a bright garnish and serve warm with a side of grains.",
      ],
    };
  }

  async function generateQuickMeal() {
    const cleanedIngredients = ingredientsOnHand
      .split(",")
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);
    if (cleanedIngredients.length === 0) return;

    const accumulate = kitchenRecipeTabs.length > 0;
    setMealLoading(true);
    setChefPhase("recipe");
    if (!accumulate) {
      setDiscoveryOptions([]);
      setChefIntro("");
      setKitchenRecipeTabs([]);
      setActiveKitchenTabId(null);
    }
    const preview = cleanedIngredients.slice(0, 3).join(" + ");
    stageChefTabLoading(preview || "Pantry skillet", accumulate);
    try {
      const data = await fetchKitchenAi({
        mode: "recipe",
        ingredients: cleanedIngredients.join(", "),
      });
      let raw = data?.recipe && typeof data.recipe === "object" ? data.recipe : null;
      if (!raw) {
        raw = fallbackRecipeFromIngredients(cleanedIngredients);
      }
      const ing = Array.isArray(raw.ingredients) ? raw.ingredients : [];
      if (ing.length === 0) {
        raw = {
          ...raw,
          ingredients: cleanedIngredients.map((x) => ({ item: x, amount: "as needed" })),
        };
      }
      let recipe = normalizeKitchenRecipe(raw);
      if (!recipe) {
        recipe = {
          ...fallbackRecipeFromIngredients(cleanedIngredients),
          imagePrompt: "",
        };
      }
      const apiImage = pickKitchenImageDataUrl(data);
      await commitChefRecipes([recipe], apiImage);
    } catch {
      const local = { ...fallbackRecipeFromIngredients(cleanedIngredients), imagePrompt: "" };
      await commitChefRecipes([local], null);
    } finally {
      pendingChefTabIdRef.current = null;
      setMealLoading(false);
    }
  }

  function saveRecipeToVault() {
    const tab = activeKitchenTab;
    if (!tab?.recipe?.title) return;
    const meal = tab.recipe;
    const steps = Array.isArray(meal.steps) ? meal.steps : [];
    const ing = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    const ingLines = ing.map((r) =>
      r.amount ? `${r.item}: ${r.amount}` : r.item,
    );
    const cals =
      meal.caloriesPerServing != null &&
      Number.isFinite(Number(meal.caloriesPerServing))
        ? Math.round(Number(meal.caloriesPerServing))
        : null;
    const img = chefRecipeImageSrc({
      imageDataUrl: tab.imageDataUrl,
      title: meal.title,
    });
    const entry = {
      id: crypto.randomUUID(),
      title: meal.title,
      instructions: [ingLines.filter(Boolean).join("\n"), steps.join("\n\n")]
        .filter(Boolean)
        .join("\n\n---\n\n"),
      ingredients: ing,
      steps,
      category: tab.category || "Dinner",
      imageUrl: img,
      caloriesPerServing: cals,
      createdAt: new Date().toISOString(),
    };
    const nextVault = appendRecipeToVault(entry);
    if (nextVault) setRecipeVault(nextVault);
    setKitchenRecipeTabs((tabs) =>
      tabs.map((t) => (t.id === tab.id ? { ...t, vaultSaved: true } : t)),
    );
    showKitchenVaultToast("Recipe Saved Successfully");
  }

  function removeRecipeFromVault(id) {
    if (!window.confirm("Remove this recipe from your vault?")) return;
    setRecipeVault((prev) => prev.filter((r) => r.id !== id));
    setVaultFocusId((open) => (open === id ? null : open));
  }

  function vaultEntryDetail(entry) {
    if (!entry) return null;
    const ingredients = Array.isArray(entry.ingredients) ? [...entry.ingredients] : [];
    let steps = Array.isArray(entry.steps) ? [...entry.steps] : [];
    if (steps.length === 0 && entry.instructions) {
      const raw = String(entry.instructions);
      if (raw.includes("\n\n---\n\n")) {
        const [ingBlob, stepBlob] = raw.split("\n\n---\n\n");
        if (ingredients.length === 0 && ingBlob) {
          for (const line of ingBlob.split("\n")) {
            const t = line.trim();
            if (!t) continue;
            const m = t.match(/^(.+?):\s*(.+)$/);
            if (m) ingredients.push({ item: m[1].trim(), amount: m[2].trim() });
            else ingredients.push({ item: t, amount: "" });
          }
        }
        if (stepBlob) {
          steps = stepBlob.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
        }
      } else {
        steps = raw.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
      }
    }
    return {
      ...entry,
      ingredients,
      steps,
      displayImage: entry.imageUrl || mealThumbDataUrl(entry.title),
    };
  }

  function addBudgetCategory() {
    const name = window.prompt("Category name?");
    if (!name?.trim()) return;
    const total = Number(window.prompt("Monthly budget total?", "500"));
    const remaining = Number(
      window.prompt("Remaining amount?", String(Number.isFinite(total) ? total : 500)),
    );
    setBudgetRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: name.trim(),
        remaining: Number.isFinite(remaining) ? remaining : 0,
        total: Number.isFinite(total) ? total : 500,
      },
    ]);
  }

  function editBudgetRow(row) {
    const cat = window.prompt("Category name", row.category);
    if (!cat?.trim()) return;
    const total = Number(window.prompt("Total budget", String(row.total)));
    const remaining = Number(window.prompt("Remaining", String(row.remaining)));
    setBudgetRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              category: cat.trim(),
              total: Number.isFinite(total) ? total : r.total,
              remaining: Number.isFinite(remaining) ? remaining : r.remaining,
            }
          : r,
      ),
    );
  }

  function deleteBudgetRow(id) {
    if (!window.confirm("Remove this budget category?")) return;
    setBudgetRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addChore() {
    const task = window.prompt("Chore name?");
    if (!task?.trim()) return;
    const points = Number(window.prompt("Points?", "15"));
    const statusRaw =
      window.prompt("Status: Due Today, Upcoming, or Earned", "Due Today") || "Due Today";
    const normalized = ["Due Today", "Upcoming", "Earned"].includes(statusRaw)
      ? statusRaw
      : "Upcoming";
    setChores((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        task: task.trim(),
        points: Number.isFinite(points) ? points : 15,
        status: normalized,
      },
    ]);
  }

  function deleteChore(id) {
    setChores((prev) => prev.filter((c) => c.id !== id));
  }

  function addActivityPrepRow() {
    setActivityPrepItems((prev) => [...prev, createEmptyActivityPrepRow()]);
  }

  function updateActivityPrepRow(id, patch) {
    setActivityPrepItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function deleteActivityPrepItem(id) {
    setActivityPrepItems((prev) => prev.filter((x) => x.id !== id));
  }

  const hasHomeUserData = useMemo(() => {
    if (isInitialized && selectedApps.length > 0) return true;
    if (nativeGroceryList.length > 0) return true;
    if (budgetRows.length > 0) return true;
    if (chores.length > 0) return true;
    if (savedNotes.length > 0) return true;
    if (notes.trim()) return true;
    if (recipeVault.length > 0) return true;
    return activityPrepItems.some(
      (row) =>
        row.title?.trim() ||
        row.participantName?.trim() ||
        row.itemsToBring?.trim() ||
        row.scheduledAt?.trim(),
    );
  }, [
    activityPrepItems,
    budgetRows.length,
    chores.length,
    isInitialized,
    nativeGroceryList.length,
    notes,
    recipeVault.length,
    savedNotes.length,
    selectedApps.length,
  ]);

  useReportNodeUserData("HomeNode", hasHomeUserData);

  useEffect(() => {
    if (!hasHomeUserData) {
      patchBridgeSignals({
        homeFridgeMilkLow: false,
        homeUserNearStore: false,
        homeCalendarHasConflict: false,
        homeNextEventMinutesUntil: 999,
        bizUnreadLeadCount: 0,
        bizLastFollowUpMinutesAgo: 0,
        vaHighPriorityPingCount: 0,
      });
      return;
    }
    const milkOnList = nativeGroceryList.some((item) => /milk/i.test(String(item)));
    patchBridgeSignals({
      homeFridgeMilkLow: milkOnList,
      homeUserNearStore: false,
    });
  }, [hasHomeUserData, nativeGroceryList, patchBridgeSignals]);

  async function handleCameraFile(file) {
    if (!file?.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = String(reader.result || "").split(",")[1];
      if (!base64) return;
      try {
        const data = await fetchKitchenAi({
          mode: "vision_ingredients",
          imageBase64: base64,
          mimeType: file.type,
        });
        const add = data?.ingredients;
        if (add) {
          setIngredientsOnHand((prev) => {
            const parts = prev
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
            add.split(",").forEach((piece) => {
              const s = piece.trim();
              if (s) parts.push(s);
            });
            return [...new Set(parts)].join(", ");
          });
        }
      } catch {
        /* silent */
      }
    };
    reader.readAsDataURL(file);
  }

  async function toggleVoiceCapture() {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = String(reader.result || "").split(",")[1];
          if (!base64) return;
          try {
            const data = await fetchKitchenAi({
              mode: "transcribe_audio",
              audioBase64: base64,
              mimeType: blob.type || "audio/webm",
            });
            const t = data?.transcript;
            if (t) {
              setIngredientsOnHand((prev) => {
                const parts = prev
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);
                t.split(",").forEach((piece) => {
                  const s = piece.trim();
                  if (s) parts.push(s);
                });
                return [...new Set(parts)].join(", ");
              });
            }
          } catch {
            /* silent */
          }
        };
        reader.readAsDataURL(blob);
      };
      mr.start(250);
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }

  async function askHomeAssistant() {
    const q = assistantQuestion.trim();
    if (!q) return;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are HomeNode assistant. Give concise practical home-logistics answers. If asked about traffic, suggest checking map app and provide a decision checklist.",
            },
            { role: "user", content: q },
          ],
        }),
      });
      const data = await response.json();
      setAssistantReply(data?.reply || "No response available.");
    } catch {
      setAssistantReply(
        "I couldn't fetch live context right now. For traffic, check Google Maps ETA and leave 15 minutes buffer.",
      );
    }
    setAssistantQuestion("");
  }

  function handleAddListItem(target) {
    const value = window.prompt("Add a new list item:");
    const item = value?.trim();
    if (!item) return;
    if (target === "grocery") {
      setNativeGroceryList((prev) => [...prev, item]);
      return;
    }
    setActivityPrepItems((prev) => [
      ...prev,
      { ...createEmptyActivityPrepRow(), title: item },
    ]);
  }

  return (
    <DualRailCommandCenter
      showFeatureRail={isInitialized}
      featureNav={HOME_FEATURE_DECK}
      activeFeatureId={sectionFilter ?? "home-overview"}
      onFeatureSelect={(id) => setSectionFilter(id)}
      workspaceTone="light"
      featureRailTitle="Command deck"
    >
    <div className={`${KITCHEN_BG_CLASS} p-6 ${KITCHEN_TEXT.body}`}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <header className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${KITCHEN_TEXT.label} mb-1`}>
                LifeNode OS — Home Surface
              </p>
              <h1 className={`text-3xl font-bold ${KITCHEN_TEXT.title} inline-flex items-center gap-2`}>
                <Home size={28} className={KITCHEN_TEXT.icon} />
                HomeNode
              </h1>
              <p className={`text-sm ${KITCHEN_TEXT.muted} mt-1`}>
                Good morning, let&apos;s orchestrate the home.
              </p>
              {isInitialized && upcomingEngagement ? (
                <div className="mt-3 rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-50/90 to-white/80 px-3 py-2.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-900/55">
                    Upcoming engagement
                  </p>
                  <p className="text-sm font-semibold text-[#1E293B] mt-0.5">
                    {upcomingEngagement.title}
                    {upcomingEngagement.when ? (
                      <span className="font-medium text-[#475569]"> · {upcomingEngagement.when}</span>
                    ) : null}
                    {upcomingEngagement.source ? (
                      <span className="text-xs font-normal text-[#475569]"> ({upcomingEngagement.source})</span>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/home/kitchen"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84A59D]/15 px-3.5 py-2 text-sm font-semibold text-[#3F5E58] hover:bg-[#84A59D]/25 transition-colors"
              >
                <Refrigerator size={14} />
                Kitchen
                <ArrowUpRight size={12} />
              </Link>
              {isInitialized ? (
                <button
                  onClick={() => {
                    setIsInitialized(false);
                    setStep(1);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-[#475569] text-sm font-semibold"
                >
                  Re-run Discovery
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {!isInitialized ? (
          <section className="glass-card p-6 md:p-8">
            <p className={`text-xs uppercase tracking-[0.2em] ${KITCHEN_TEXT.accent} font-semibold mb-2`}>
              HomeNode Discovery
            </p>
            <h2 className={`text-2xl font-bold ${KITCHEN_TEXT.title} mb-6`}>Step {step} of 3</h2>

            {step === 1 ? (
              <div>
                <p className="text-sm font-semibold text-[#1E293B] mb-2">
                  How do you track your home life?
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {HOME_APPS_PRIMARY.map((app) => (
                    <button
                      key={app}
                      onClick={() => toggleApp(app)}
                      className={`rounded-2xl p-4 text-left transition-all ${
                        selectedApps.includes(app)
                          ? KITCHEN_TOGGLE_ACTIVE
                          : KITCHEN_TOGGLE_IDLE
                      }`}
                    >
                      <p className="font-semibold">{app}</p>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowMoreApps(true)}
                    className={`rounded-2xl p-4 text-left transition-all ${KITCHEN_TOGGLE_IDLE}`}
                  >
                    <p className="font-semibold inline-flex items-center gap-2">
                      <Plus size={14} />
                      More
                    </p>
                    <p className="text-xs text-[#475569] mt-1">More home ecosystem apps</p>
                  </button>
                </div>
                <AppCategoryRequestFooter
                  category="Home ecosystem"
                  nodeLabel="HomeNode"
                  variant="glass"
                  className="mt-4"
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={selectedApps.length === 0}
                    className={`px-4 py-2 rounded-xl ${KITCHEN_BTN_PRIMARY}`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="text-sm font-semibold text-[#1E293B] mb-2">The Native Pivot</p>
                <label className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm text-[#1E293B]">
                  <input
                    type="checkbox"
                    checked={useNativeTools}
                    onChange={(e) => setUseNativeTools(e.target.checked)}
                    className="accent-[#84A59D]"
                  />
                  No app? Use LifeNode Native Tools.
                </label>
                <p className="text-xs text-[#475569] mt-3">
                  When enabled: Notes, Household Calculator, and Smart Grocery List become available.
                </p>
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className={`px-4 py-2 rounded-xl ${KITCHEN_CHIP_IDLE}`}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                    className={`px-4 py-2 rounded-xl ${KITCHEN_BTN_PRIMARY}`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="text-sm font-semibold text-[#1E293B] mb-2">
                  What&apos;s the priority for your HomeNode?
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PRIORITIES.map((option) => (
                    <button
                      key={option}
                      onClick={() => togglePriority(option)}
                      className={`rounded-2xl p-4 text-left transition-all ${
                        selectedPriorities.includes(option)
                          ? KITCHEN_TOGGLE_ACTIVE
                          : KITCHEN_TOGGLE_IDLE
                      }`}
                    >
                      <p className="font-semibold">{option}</p>
                      <p className="text-xs opacity-80 mt-1">
                        {PRIORITY_DETAILS[option]}
                      </p>
                    </button>
                  ))}
                </div>
                {selectedPriorities.length > 0 ? (
                  <div className={`mt-4 ${KITCHEN_INNER_PANEL}`}>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                      Inside selected focus areas
                    </p>
                    <ul className="space-y-2">
                      {selectedPriorities.map((item) => (
                        <li key={item} className="text-sm text-[#1E293B]">
                          <span className="font-semibold">{item}:</span>{" "}
                          {PRIORITY_DETAILS[item]}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className={`px-4 py-2 rounded-xl ${KITCHEN_CHIP_IDLE}`}
                  >
                    Back
                  </button>
                  <button
                    onClick={completeSetup}
                    disabled={selectedPriorities.length === 0}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${KITCHEN_BTN_PRIMARY}`}
                  >
                    <CheckCircle2 size={16} />
                    Launch HomeNode
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <div className="min-w-0 space-y-6">
            {sectionFilter ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSectionFilter(null)}
                  className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#475569] shadow-sm hover:bg-white"
                >
                  Show all modules
                </button>
              </div>
            ) : null}
            {flareActive && (!sectionFilter || sectionFilter === "home-overview") ? (
              <section className="mb-4 rounded-3xl border border-rose-200/70 bg-rose-50/80 p-5 shadow-[0_12px_32px_rgba(244,63,94,0.12)] backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-800">Flare protocol active</p>
                <p className="mt-1 text-sm text-rose-950">
                  Recovery mode is on across LifeNode. Use Quick Ask below for urgent help, or deactivate when you feel
                  stable.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      deactivateFlareMode();
                      clearFlareTaskFlags();
                      setFlareActive(false);
                    }}
                    className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
                  >
                    Deactivate flare protocol
                  </button>
                  <Link
                    href="/vital"
                    className="rounded-xl border border-rose-200 bg-white/90 px-4 py-2 text-xs font-semibold text-rose-900 hover:bg-white"
                  >
                    Open VitalNode
                  </Link>
                </div>
              </section>
            ) : null}
            {(!sectionFilter || sectionFilter === "home-overview") ? (
            <section className="glass-card p-6">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${KITCHEN_TEXT.label} mb-2`}>
                Quick ask
              </p>
              <p className={`text-sm ${KITCHEN_TEXT.muted} mb-3`}>{assistantReply}</p>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                <input
                  value={assistantQuestion}
                  onChange={(e) => setAssistantQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") askHomeAssistant();
                  }}
                  placeholder={
                    flareActive
                      ? "Find the nearest pharmacy open now…"
                      : "Household question…"
                  }
                  className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[#84A59D]/50 focus:ring-2 focus:ring-[#84A59D]/20"
                />
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={askHomeAssistant}
                    className={KITCHEN_BTN_PRIMARY}
                  >
                    Ask
                  </button>
                </div>
              </div>
            </section>
            ) : null}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {(homeDeck.strip ||
                  homeDeck.cart ||
                  homeDeck.chore ||
                  homeDeck.native ||
                  homeDeck.kitchen ||
                  homeDeck.budget ||
                  homeDeck.notes ||
                  homeDeck.intel) ? (
                  <div
                    id={homeDeck.strip ? "home-overview" : undefined}
                    className={
                      homeDeck.strip
                        ? "lg:col-span-12 grid grid-cols-1 gap-6 lg:grid-cols-12"
                        : "lg:col-span-12 grid grid-cols-1 gap-6"
                    }
                  >
                    {homeDeck.cart ? (
                      <section
                        id="smart-cart"
                        className={`glass-card p-6 ${homeDeck.cw}`}
                      >
              <h2 className={`font-semibold mb-4 flex items-center gap-2 ${KITCHEN_TEXT.title}`}>
                <ShoppingCart size={18} className={KITCHEN_TEXT.icon} /> Smart Cart
              </h2>
              <div className={KITCHEN_INNER_PANEL}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Source</p>
                  <button
                    onClick={() => handleAddListItem("grocery")}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1E293B]"
                  >
                    Add list
                  </button>
                </div>
                <p className="text-sm font-semibold text-[#1E293B]">{smartCartSource}</p>
                {useNativeTools ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nativeGroceryList.map((item) => (
                      <span key={item} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-[#1E293B]">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#475569] mt-2">
                    Connected apps can auto-populate grocery actions.
                  </p>
                )}
              </div>
            </section>
                    ) : null}
                    {homeDeck.chore ? (
            <section
              id="chore-hub"
              className={`glass-card p-6 ${homeDeck.chw}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className={`font-semibold flex items-center gap-2 ${KITCHEN_TEXT.title}`}>
                  <Calendar size={20} className={KITCHEN_TEXT.icon} /> Chore & Reward Hub
                </h2>
                <button
                  type="button"
                  onClick={() => setChoreHubCollapsed((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-[#475569] hover:bg-[#84A59D]/20 hover:text-[#3F5E58] transition-colors"
                >
                  Focus {choreHubCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              {choreHubCollapsed ? (
                <div className="rounded-[20px] bg-white/40 backdrop-blur-xl border border-white/60 px-4 py-5 text-center shadow-inner">
                  <p className="text-sm font-medium text-[#1E293B] tracking-tight">
                    <span className="text-[#3F5E58] font-semibold">{choresDueTodayCount()}</span>{" "}
                    Chores Due Today
                  </p>
                </div>
              ) : (
                <>
                  <div className={`${KITCHEN_INNER_PANEL} mb-4`}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Chore Rewards</p>
                      <button
                        type="button"
                        onClick={addChore}
                        className="inline-flex items-center gap-1 rounded-full bg-[#84A59D]/15 hover:bg-[#84A59D]/25 text-[#3F5E58] text-xs font-semibold px-3 py-1"
                      >
                        <Plus size={13} />
                        Add Chore
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {chores.map((chore) => (
                        <div
                          key={chore.id}
                          className="group rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#1E293B]">{chore.task}</p>
                            <p className="text-xs text-[#475569]">{chore.points} LifeNode Points</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                chore.status === "Earned"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : chore.status === "Due Today"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-[#475569]"
                              }`}
                            >
                              {chore.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteChore(chore.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              aria-label="Delete chore"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
                    ) : null}
                    {homeDeck.native ? (
            <section className={`glass-card p-6 ${homeDeck.nw}`}>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className={KITCHEN_TEXT.icon} />
                <p className="font-semibold text-[#1E293B]">Native Tools</p>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setUseNativeTools(true);
                    setShowNotes((v) => !v);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1.5"
                >
                  <NotebookPen size={13} />
                  {showNotes ? "Hide Notes" : "Show Notes"}
                </button>
                <button
                  onClick={() => {
                    setUseNativeTools(true);
                    setShowCalculator((v) => !v);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1.5"
                >
                  <Calculator size={13} />
                  {showCalculator ? "Hide Calc" : "Show Calc"}
                </button>
              </div>

              {showNotes ? (
                <div className={`${KITCHEN_INNER_PANEL_SM} mb-3`}>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Notes Card</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select
                      value={noteLabel}
                      onChange={(e) => setNoteLabel(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      {NOTE_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={noteColor}
                      onChange={(e) => setNoteColor(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      {NOTE_COLORS.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Family reminders..."
                    className="w-full min-h-[100px] rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#84A59D]/30"
                  />
                  <button
                    onClick={saveCurrentNote}
                    className={`mt-2 w-full py-2 rounded-lg ${KITCHEN_BTN_PRIMARY}`}
                  >
                    Save
                  </button>
                </div>
              ) : null}

              {showCalculator ? (
                <div className={KITCHEN_INNER_PANEL_SM}>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Chaos Calculator
                  </p>
                  <input
                    value={calcInput}
                    onChange={(e) =>
                      setCalcInput(e.target.value.replace(/[^0-9+\-*/().% ]/g, ""))
                    }
                    className="w-full rounded-lg border border-slate-200 p-2 text-right text-sm mb-2"
                    placeholder="0"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "%", "+"].map((token) => (
                      <button
                        key={token}
                        onClick={() => addCalcToken(token)}
                        className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={runCalc}
                      className={`flex-1 py-1.5 rounded-lg ${KITCHEN_BTN_PRIMARY}`}
                    >
                      Calculate
                    </button>
                    <button
                      onClick={() => setCalcInput("")}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
                    ) : null}

                    {homeDeck.budget ? (
            <section className="glass-card p-6 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className={KITCHEN_TEXT.icon} />
                  <h2 className={`font-semibold ${KITCHEN_TEXT.title}`}>Monthly Budget Tracker</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addBudgetCategory}
                    className="inline-flex items-center gap-1 rounded-full bg-[#84A59D]/15 hover:bg-[#84A59D]/25 text-[#3F5E58] text-xs font-semibold px-3 py-1.5"
                  >
                    <Plus size={14} />
                    Add Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetCollapsed((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-[#475569] hover:bg-[#84A59D]/20 hover:text-[#3F5E58] transition-colors"
                  >
                    Focus {budgetCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>
              {budgetCollapsed ? (
                <div className="rounded-[20px] bg-white/40 backdrop-blur-xl border border-white/60 px-4 py-6 text-center shadow-inner">
                  <p className="text-lg font-semibold text-[#1E293B]">
                    Total Remaining:{" "}
                    <span className="text-[#3F5E58]">${totalBudgetRemaining().toLocaleString()}</span>
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {budgetRows.map((item) => {
                      const pct = Math.max(
                        0,
                        Math.min(100, Math.round((item.remaining / item.total) * 100)),
                      );
                      return (
                        <div
                          key={item.id}
                          className="group relative rounded-xl bg-white/85 p-3 text-sm border border-slate-100/80"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-[#1E293B]">{item.category}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => editBudgetRow(item)}
                                  className="p-1.5 rounded-lg text-[#475569] hover:bg-[#84A59D]/15 hover:text-[#3F5E58]"
                                  aria-label="Edit category"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteBudgetRow(item.id)}
                                  className="p-1.5 rounded-lg text-[#475569] hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete category"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-[#475569] whitespace-nowrap">
                                ${item.remaining} Remaining Of ${item.total}
                              </p>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#84A59D]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={KITCHEN_INNER_PANEL_SM}>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 inline-flex items-center gap-1">
                      <MessageSquareText size={13} />
                      Financial Command
                    </p>
                    <p className="text-sm text-[#1E293B] leading-relaxed">
                      Keep spending visible and calm with one glance. Use this panel to rebalance household categories before week-end surprises happen.
                    </p>
                  </div>
                </>
              )}
            </section>
                    ) : null}

                    {homeDeck.kitchen ? (
            <section id="chef-node" className="glass-card p-6 lg:col-span-12">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Utensils size={18} className={KITCHEN_TEXT.icon} />
                  <h2 className={`font-semibold ${KITCHEN_TEXT.title}`}>ChefNode</h2>
                </div>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCameraFile(f);
                  e.target.value = "";
                }}
              />
              <div className="rounded-[20px] bg-white/85 p-4 border border-slate-100/80 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                    Mood, craving, or pantry
                  </p>
                  <textarea
                    value={ingredientsOnHand}
                    onChange={(e) => setIngredientsOnHand(e.target.value)}
                    rows={3}
                    placeholder='e.g. "Something healthy with chicken" or "Turkey Lasagna recipe"'
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#84A59D]/30 resize-y min-h-[4.5rem]"
                  />
                  <p className="text-[11px] text-[#475569] mt-1.5">
                    Vague craving → <span className="font-medium text-[#475569]">Get meal ideas</span>. Comma
                    pantry list → <span className="font-medium text-[#475569]">Cook from pantry</span>.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MEAL_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={mealLoading}
                      onClick={() => runChefExecute(preset)}
                      className="rounded-full border border-[#84A59D]/40 bg-[#84A59D]/10 px-3 py-1.5 text-xs font-semibold text-[#3F5E58] hover:bg-[#84A59D]/20 disabled:opacity-50 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#475569] hover:bg-[#84A59D]/10 hover:text-[#3F5E58] hover:border-[#84A59D]/40 transition-colors"
                    title="Photo to ingredients"
                    aria-label="Upload meal photo"
                  >
                    <Camera size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleVoiceCapture}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isRecording
                        ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
                        : "border-slate-200 bg-white text-[#475569] hover:bg-[#84A59D]/10 hover:text-[#3F5E58] hover:border-[#84A59D]/40"
                    }`}
                    title={isRecording ? "Stop recording" : "Voice to text"}
                    aria-label="Voice input"
                  >
                    <Mic size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={runChefDiscover}
                    disabled={mealLoading || !ingredientsOnHand.trim()}
                    className={`px-4 py-2.5 ${KITCHEN_BTN_PRIMARY} disabled:opacity-50`}
                  >
                    {mealLoading && chefPhase !== "recipe" ? "Thinking…" : "Get meal ideas"}
                  </button>
                  <button
                    type="button"
                    onClick={generateQuickMeal}
                    disabled={mealLoading}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#1E293B] disabled:opacity-50 hover:bg-slate-50"
                  >
                    Cook from pantry
                  </button>
                  {chefPhase === "recipe" && kitchenRecipeTabs.length > 0 ? (
                    <button
                      type="button"
                      onClick={resetChefSearch}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white/90 text-sm font-semibold text-[#475569] hover:bg-[#84A59D]/10 hover:text-[#3F5E58]"
                    >
                      New search
                    </button>
                  ) : null}
                </div>

                {chefPhase === "recipe" && kitchenRecipeTabs.length > 0 ? (
                  <KitchenRecipeTabBar
                    tabs={kitchenRecipeTabs}
                    activeTabId={activeKitchenTabId}
                    onSelect={setActiveKitchenTabId}
                  />
                ) : null}

                {discoveryOptions.length > 0 ? (
                  <div className="rounded-2xl border border-teal-200/50 bg-teal-50/40 p-4">
                    <p className="text-sm text-[#1E293B] mb-3 leading-relaxed">{chefIntro}</p>
                    <p className="text-[10px] uppercase tracking-widest text-teal-900/60 font-semibold mb-2">
                      Pick one or more — then generate
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      {discoveryOptions.map((opt) => {
                        const selected = selectedDiscoveryIds.includes(opt.id);
                        const alreadyCooked = discoveryOptionHasTab(opt.title);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={mealLoading}
                            onClick={() => toggleDiscoverySelection(opt.id)}
                            className={`flex-1 min-w-[140px] text-left rounded-2xl border px-3 py-2.5 shadow-sm transition-all disabled:opacity-50 ${
                              selected
                                ? "border-teal-500 bg-white ring-2 ring-teal-400/40"
                                : "border-teal-300/60 bg-white/90 hover:border-teal-500 hover:shadow-md"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                  selected
                                    ? "border-teal-600 bg-teal-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {selected ? <CheckCircle2 size={14} /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#1E293B]">{opt.title}</p>
                                {opt.tagline ? (
                                  <p className="text-xs text-[#475569] mt-0.5">{opt.tagline}</p>
                                ) : null}
                                {alreadyCooked ? (
                                  <p className="text-[10px] font-semibold text-teal-800 mt-1">
                                    Recipe ready — open its tab
                                  </p>
                                ) : null}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={mealLoading || selectedDiscoveryIds.length === 0}
                        onClick={() => void cookSelectedDiscoveryMeals()}
                        className={`px-4 py-2.5 text-sm ${KITCHEN_BTN_PRIMARY} disabled:opacity-50`}
                      >
                        {mealLoading
                          ? "ChefNode is cooking…"
                          : `Generate ${selectedDiscoveryIds.length} recipe${
                              selectedDiscoveryIds.length === 1 ? "" : "s"
                            }`}
                      </button>
                      <button
                        type="button"
                        disabled={mealLoading}
                        onClick={() => setSelectedDiscoveryIds(discoveryOptions.map((o) => o.id))}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-teal-300/70 bg-white/90 text-[#3F5E58] hover:bg-teal-50 disabled:opacity-50"
                      >
                        Select all
                      </button>
                      {selectedDiscoveryIds.length > 0 ? (
                        <button
                          type="button"
                          disabled={mealLoading}
                          onClick={() => setSelectedDiscoveryIds([])}
                          className="px-3 py-2 text-xs font-semibold text-[#475569] hover:text-[#1E293B] disabled:opacity-50"
                        >
                          Clear selection
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {chefPhase === "recipe" && generatedMeal ? (
                  <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/90 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4 p-4">
                      <div className="lg:col-span-7 space-y-3">
                        {activeKitchenTab?.loading ? (
                          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/60 px-4 py-6">
                            <ChefUtensilLoader compact message="Building your recipe…" />
                          </div>
                        ) : generatedMeal?.title && !activeKitchenTab?.imageFailed ? (
                          <div className="overflow-hidden rounded-2xl border border-white shadow-md bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={chefRecipeImageSrc({
                                imageDataUrl: activeKitchenTab?.imageDataUrl,
                                title: generatedMeal.title,
                              })}
                              alt={generatedMeal.title || "Recipe dish"}
                              referrerPolicy="no-referrer"
                              decoding="async"
                              fetchPriority="high"
                              onError={() => {
                                const title = generatedMeal?.title?.trim();
                                if (activeKitchenTab?.imageDataUrl && title) {
                                  patchActiveKitchenTab({
                                    imageDataUrl: null,
                                    imageFailed: false,
                                  });
                                  return;
                                }
                                patchActiveKitchenTab({ imageFailed: true });
                              }}
                              className="w-full max-h-72 object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300/80 bg-white/60 px-4 py-6 text-center">
                            <p className="text-xs text-[#475569]">
                              {generatedMeal?.title
                                ? "Image could not be loaded."
                                : "No image preview yet — image is generated before recipe text."}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                patchActiveKitchenTab({ imageFailed: false });
                                const title = generatedMeal?.title?.trim();
                                if (title) {
                                  void runChefExecute(title, {
                                    accumulate: true,
                                    strictModelImage: true,
                                  });
                                }
                              }}
                              className={`rounded-xl px-4 py-2 text-xs ${KITCHEN_BTN_PRIMARY}`}
                            >
                              Retry image
                            </button>
                          </div>
                        )}
                        {generatedMeal.caloriesPerServing != null &&
                        Number.isFinite(Number(generatedMeal.caloriesPerServing)) ? (
                          <div className="rounded-2xl border border-teal-200/70 bg-teal-50/95 px-4 py-3 shadow-sm">
                            <p className="text-[10px] uppercase tracking-widest text-teal-900/70 font-semibold mb-1">
                              Nutritional snapshot
                            </p>
                            <p className="text-lg font-semibold text-teal-950">
                              ~{Math.round(Number(generatedMeal.caloriesPerServing))}{" "}
                              <span className="text-[#475569] font-normal text-sm">kcal per serving</span>
                            </p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1E293B] text-xl">{generatedMeal.title}</p>
                          {mealCategory ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#84A59D]/20 text-[#3F5E58]">
                              {mealCategory}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#475569]">
                          Prep: {generatedMeal.prepTime} · Serves: {generatedMeal.servings}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <p className="text-[10px] uppercase tracking-widest text-[#475569] font-semibold">
                            Cooking mode
                          </p>
                          <button
                            type="button"
                            onClick={() => setChefCookMode((v) => !v)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              chefCookMode
                                ? "border-teal-400 bg-teal-50 text-teal-900"
                                : "border-slate-200 bg-white text-[#475569]"
                            }`}
                          >
                            {chefCookMode ? "Large type on" : "Large type off"}
                          </button>
                        </div>
                        <ol
                          className={`space-y-3 list-decimal list-inside text-[#1E293B] ${
                            chefCookMode ? "text-lg leading-relaxed" : "text-sm leading-relaxed"
                          }`}
                        >
                          {(Array.isArray(generatedMeal.steps) ? generatedMeal.steps : []).map((s, i) => (
                            <li key={`${i}-${s.slice(0, 24)}`} className="pl-1">
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="lg:col-span-5 mt-4 lg:mt-0">
                        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 h-full max-h-[480px] overflow-auto">
                          <p className="text-[10px] uppercase tracking-widest text-[#475569] font-semibold mb-3">
                            Ingredients
                          </p>
                          <ul className="space-y-2">
                            {(Array.isArray(generatedMeal.ingredients) ? generatedMeal.ingredients : []).map(
                              (row, i) => {
                                const key = `ing-${i}-${row.item}`;
                                const checked = !!activeKitchenTab?.ingredientChecked?.[key];
                                return (
                                  <li
                                    key={key}
                                    className={`flex items-start gap-2 rounded-xl border px-2 py-2 text-sm ${
                                      checked
                                        ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                                        : "border-slate-100 bg-white"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleIngredientCheck(key)}
                                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#84A59D] rounded border-slate-300"
                                    />
                                    <span className="text-[#1E293B]">
                                      <span className="font-medium">{row.item}</span>
                                      {row.amount ? (
                                        <span className="text-[#475569]"> — {row.amount}</span>
                                      ) : null}
                                    </span>
                                  </li>
                                );
                              },
                            )}
                          </ul>
                          {(!generatedMeal.ingredients || generatedMeal.ingredients.length === 0) && (
                            <p className="text-xs text-[#475569]">No structured list — use steps below.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200/80 bg-white/55 px-4 py-4">
                      <button
                        type="button"
                        onClick={saveRecipeToVault}
                        disabled={activeKitchenTab?.vaultSaved}
                        className="w-full rounded-[20px] bg-[#84A59D] py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#739a90] disabled:cursor-default disabled:bg-[#9bb5af]"
                      >
                        {activeKitchenTab?.vaultSaved
                          ? "Saved to Vault"
                          : "Save recipe to Vault"}
                      </button>
                    </div>
                  </div>
                ) : chefIntro && chefPhase === "idle" && kitchenRecipeTabs.length === 0 && discoveryOptions.length === 0 ? (
                  <p className="text-sm text-amber-800 bg-amber-50/90 border border-amber-200/60 rounded-xl px-3 py-2">
                    {chefIntro}
                  </p>
                ) : kitchenRecipeTabs.length === 0 && chefPhase === "idle" ? (
                  <p className="text-sm text-[#475569]">
                    Start with a craving or tap a preset — ChefNode suggests three paths first, then locks in a
                    recipe with photo, calories, and a checklist.
                  </p>
                ) : null}
              </div>
            </section>
                    ) : null}

            {homeDeck.notes ? (
            <section className="lg:col-span-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[20px] bg-white/60 backdrop-blur-xl p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-white/50">
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen size={16} className={KITCHEN_TEXT.icon} />
                  <h2 className={`font-semibold ${KITCHEN_TEXT.title}`}>Saved Notes</h2>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                  {savedNotes.length === 0 ? (
                    <p className="text-sm text-[#475569]">No saved notes yet.</p>
                  ) : (
                    savedNotes.map((note) => (
                      <div key={note.id} className="rounded-xl bg-white/85 p-3 border border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: note.color }}
                            />
                            <span className="text-xs font-semibold text-[#475569]">{note.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteSavedNote(note.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#475569]"
                            aria-label="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-sm text-[#1E293B]">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[20px] bg-white/60 backdrop-blur-xl p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-white/50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-semibold text-[#1E293B]">Activity Prep</h2>
                    <p className="text-xs text-[#475569]">
                      Plan activities, who they&apos;re for, and what to bring.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addActivityPrepRow}
                    className="inline-flex items-center gap-1 rounded-full bg-[#84A59D]/15 hover:bg-[#84A59D]/25 text-[#3F5E58] text-xs font-semibold px-3 py-1"
                  >
                    <Plus size={13} />
                    Add plan
                  </button>
                </div>
                {activityPrepItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-8 text-center text-sm text-[#475569]">
                    No activity plans yet. Add a row to track titles, schedule, and packing lists.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                      <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          <th className="px-2 pb-1">Activity title</th>
                          <th className="px-2 pb-1">When</th>
                          <th className="px-2 pb-1">For</th>
                          <th className="px-2 pb-1">Things to bring</th>
                          <th className="px-2 pb-1 w-10" aria-label="Remove" />
                        </tr>
                      </thead>
                      <tbody>
                        {activityPrepItems.map((row) => (
                          <tr key={row.id} className="align-top">
                            <td className="px-2">
                              <input
                                value={row.title}
                                onChange={(e) =>
                                  updateActivityPrepRow(row.id, { title: e.target.value })
                                }
                                placeholder="Soccer practice"
                                className="w-full min-w-[8rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-[#1E293B]"
                              />
                            </td>
                            <td className="px-2">
                              <input
                                type="datetime-local"
                                value={row.scheduledAt}
                                onChange={(e) =>
                                  updateActivityPrepRow(row.id, {
                                    scheduledAt: e.target.value,
                                  })
                                }
                                className="w-full min-w-[10rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-[#1E293B]"
                              />
                            </td>
                            <td className="px-2">
                              <select
                                value={row.participantType}
                                onChange={(e) =>
                                  updateActivityPrepRow(row.id, {
                                    participantType: e.target.value,
                                  })
                                }
                                className="mb-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-[#1E293B]"
                              >
                                <option value="child">Child&apos;s name</option>
                                <option value="person">Person&apos;s name</option>
                              </select>
                              <input
                                value={row.participantName}
                                onChange={(e) =>
                                  updateActivityPrepRow(row.id, {
                                    participantName: e.target.value,
                                  })
                                }
                                placeholder={
                                  row.participantType === "person" ? "Alex" : "Leo"
                                }
                                className="w-full min-w-[7rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-[#1E293B]"
                              />
                            </td>
                            <td className="px-2">
                              <textarea
                                value={row.itemsToBring}
                                onChange={(e) =>
                                  updateActivityPrepRow(row.id, {
                                    itemsToBring: e.target.value,
                                  })
                                }
                                placeholder="Water bottle, cleats, snack…"
                                rows={2}
                                className="w-full min-w-[9rem] resize-y rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-[#1E293B]"
                              />
                            </td>
                            <td className="px-2">
                              <button
                                type="button"
                                onClick={() => deleteActivityPrepItem(row.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                aria-label="Remove activity plan"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div
                className={`rounded-[20px] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-white/50 transition-all ${
                  vaultCollapsed
                    ? "bg-white/40 backdrop-blur-xl"
                    : "bg-white/60 backdrop-blur-xl"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className={KITCHEN_TEXT.icon} />
                    <h2 className={`font-semibold ${KITCHEN_TEXT.title}`}>Recipe Vault</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVaultCollapsed((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-[#475569] hover:bg-[#84A59D]/20 hover:text-[#3F5E58]"
                  >
                    Focus {vaultCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
                {vaultCollapsed ? (
                  <p className="text-sm text-[#475569] text-center py-6 rounded-[20px] bg-white/35 backdrop-blur-md border border-white/50">
                    {recipeVault.length} saved recipe{recipeVault.length === 1 ? "" : "s"}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {["All", ...RECIPE_CATEGORIES].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setVaultFilter(cat)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            vaultFilter === cat
                              ? "bg-[#84A59D] text-white border-[#84A59D]"
                              : "bg-slate-100 text-[#475569] border-transparent hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {recipeVault.length === 0 ? (
                      <div className="rounded-[20px] bg-white/50 border border-slate-100 p-4">
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                          Chef&apos;s Tip
                        </p>
                        <p className="text-sm text-[#475569] italic leading-relaxed">
                          {chefTipLoading ? "Gathering a calm kitchen thought…" : chefTip}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                        {filteredRecipeVault.map((r) => (
                          <div
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setVaultFocusId(r.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setVaultFocusId(r.id);
                              }
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-slate-100 bg-white/85 px-3 py-2.5 shadow-sm transition hover:border-[#84A59D]/45 hover:bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.imageUrl || mealThumbDataUrl(r.title)}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-xl object-cover border border-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#1E293B] truncate">{r.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#475569]">
                                  {r.category}
                                </span>
                                {r.caloriesPerServing != null &&
                                Number.isFinite(Number(r.caloriesPerServing)) ? (
                                  <span className="text-[10px] font-semibold text-teal-800/90">
                                    ~{Math.round(Number(r.caloriesPerServing))} kcal / serving
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecipeFromVault(r.id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                              aria-label="Delete recipe"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {filteredRecipeVault.length === 0 ? (
                          <p className="text-sm text-[#475569] py-4 text-center">No recipes in this category.</p>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
                    ) : null}

                    {homeDeck.intel ? (
            <section className="glass-card p-6 lg:col-span-12">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#84A59D]" />
                <h2 className={`font-semibold ${KITCHEN_TEXT.title}`}>HomeNode Intelligence</h2>
              </div>
              <div className="space-y-2 text-sm text-[#1E293B]">
                <p>
                  Priorities set to{" "}
                  <span className="font-semibold">
                    {selectedPriorities.length > 0
                      ? selectedPriorities.join(", ")
                      : "none yet"}
                  </span>
                  . Cross-checking schedules and routines for conflicts.
                </p>
                <p>
                  Connected stack: {selectedApps.join(", ")} {useNativeTools ? "+ LifeNode Native Tools" : ""}.
                </p>
              </div>
            </section>
                    ) : null}
              </div>
                ) : null}
            </div>
            {sectionFilter && ["smart-cart", "chore-hub", "chef-node"].includes(sectionFilter) ? (
              <section className="glass-card p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#475569] mb-2">
                  Quick ask
                </p>
                <p className="text-sm text-[#475569] mb-3">{assistantReply}</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                  <input
                    value={assistantQuestion}
                    onChange={(e) => setAssistantQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") askHomeAssistant();
                    }}
                    placeholder={
                    flareActive
                      ? "Find the nearest pharmacy open now…"
                      : "Household question…"
                  }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[#84A59D]/50 focus:ring-2 focus:ring-[#84A59D]/20"
                  />
                  <button
                    type="button"
                    onClick={askHomeAssistant}
                    className={`shrink-0 self-start rounded-xl lg:self-stretch ${KITCHEN_BTN_PRIMARY}`}
                  >
                    Ask
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {mealLoading &&
      (chefPhase !== "recipe" || kitchenRecipeTabs.length === 0) &&
      !chefDiscoverFlowRef.current ? (
        <div className="fixed inset-0 z-[92] flex items-center justify-center bg-[#0F172A]/25 p-6 backdrop-blur-md">
          <div className="glass-card max-w-md px-8 py-8">
            <ChefUtensilLoader
              message="ChefNode is preparing your kitchen…"
              subMessage="Image prompt runs before recipe details."
            />
          </div>
        </div>
      ) : null}

      {vaultFocusId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/30 p-4 backdrop-blur-md"
          role="presentation"
          onClick={() => setVaultFocusId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vault-focus-title"
            className="glass-card relative max-h-[min(92dvh,880px)] w-full max-w-2xl overflow-y-auto p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-3 top-3 flex gap-2">
              <button
                type="button"
                onClick={() => setVaultFocusId(null)}
                className="rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1E293B] hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setVaultFocusId(null)}
                className="rounded-xl border border-slate-200 bg-white/95 p-2 text-[#475569] hover:bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {(() => {
              const raw = recipeVault.find((x) => x.id === vaultFocusId);
              const d = raw ? vaultEntryDetail(raw) : null;
              if (!d) {
                return (
                  <p className="pt-10 text-sm text-[#475569]">Recipe not found.</p>
                );
              }
              return (
                <div className="pt-6">
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.displayImage}
                      alt=""
                      className="max-h-80 w-full object-cover"
                    />
                  </div>
                  <h3 id="vault-focus-title" className="mt-5 text-xl font-bold text-[#1E293B]">
                    {d.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#475569]">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">{d.category}</span>
                    {d.caloriesPerServing != null && Number.isFinite(Number(d.caloriesPerServing)) ? (
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 font-semibold text-teal-900">
                        ~{Math.round(Number(d.caloriesPerServing))} kcal / serving
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">
                      Ingredients
                    </p>
                    <ul className="space-y-1.5 text-sm text-[#1E293B]">
                      {d.ingredients.length > 0 ? (
                        d.ingredients.map((row, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-slate-400">•</span>
                            <span>
                              {typeof row === "string" ? (
                                row
                              ) : (
                                <>
                                  <span className="font-medium">{row.item}</span>
                                  {row.amount ? (
                                    <span className="text-[#475569]"> — {row.amount}</span>
                                  ) : null}
                                </>
                              )}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[#475569]">No ingredient list stored.</li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-2">
                      Step-by-step
                    </p>
                    <ol className="list-decimal space-y-3 pl-5 text-sm text-[#1E293B]">
                      {d.steps.length > 0 ? (
                        d.steps.map((s, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {s}
                          </li>
                        ))
                      ) : (
                        <li className="list-none text-[#475569]">No steps stored.</li>
                      )}
                    </ol>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {showMoreApps ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0F172A]/25 p-6 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl max-h-[85vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${KITCHEN_TEXT.title}`}>More Home Apps</h3>
              <button onClick={() => setShowMoreApps(false)} className={`p-2 rounded-lg ${KITCHEN_CHIP_IDLE}`}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HOME_APPS_MORE.map((app) => (
                <button
                  key={app}
                  onClick={() => toggleApp(app)}
                  className={`rounded-2xl p-3 text-left transition-all ${
                    selectedApps.includes(app)
                      ? KITCHEN_TOGGLE_ACTIVE
                      : KITCHEN_TOGGLE_IDLE
                  }`}
                >
                  <p className="font-semibold text-sm">{app}</p>
                </button>
              ))}
            </div>
            <AppCategoryRequestFooter
              category="Home ecosystem"
              nodeLabel="HomeNode"
              className="mt-4"
            />
          </div>
        </div>
      ) : null}

      {loginPromptApp ? (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-[#0F172A]/25 p-6 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <h3 className={`text-lg font-bold ${KITCHEN_TEXT.title} mb-2`}>Connect {loginPromptApp}</h3>
            <p className={`text-sm ${KITCHEN_TEXT.muted} mb-5`}>
              Please log in to {loginPromptApp} so HomeNode can check your information and household context.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setLoginPromptApp("")}
                className={`px-3 py-2 rounded-xl text-sm ${KITCHEN_CHIP_IDLE}`}
              >
                Later
              </button>
              <button
                onClick={() => setLoginPromptApp("")}
                className={`px-3 py-2 rounded-xl text-sm ${KITCHEN_BTN_PRIMARY}`}
              >
                I&apos;ll Log In
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <KitchenVaultToast
        message={kitchenVaultToast}
        onDismiss={() => setKitchenVaultToast(null)}
      />
    </div>
    </DualRailCommandCenter>
  );
}

