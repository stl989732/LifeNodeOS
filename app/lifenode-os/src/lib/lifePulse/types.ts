export const LIFE_PULSE_CATEGORIES = [
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "events", label: "Events", emoji: "🎟️" },
  { id: "skincare", label: "Skincare", emoji: "🧴" },
  { id: "life", label: "Life", emoji: "🌿" },
  { id: "business_goals", label: "Business", emoji: "📈" },
  { id: "social_media", label: "Social Media", emoji: "📱" },
  { id: "project_management", label: "Project Mgmt", emoji: "📋" },
  { id: "study", label: "Study", emoji: "📚" },
  { id: "pets", label: "Pet Animals", emoji: "🐾" },
] as const;

export type LifePulseCategoryId = (typeof LIFE_PULSE_CATEGORIES)[number]["id"];

export type { TrackerPriority, TrackerStatus } from "./trackerSchema";

import type { TrackerPriority, TrackerStatus } from "./trackerSchema";

export type LifePulseTracker = {
  id: string;
  user_id: string;
  category: LifePulseCategoryId;
  title: string;
  /** AI-generated empathetic plan (markdown). */
  description?: string | null;
  /** When the user planned this activity (ISO). */
  planned_at?: string | null;
  parent_id: string | null;
  /** Null on legacy rows; 0 = explicit Calm State baseline */
  progress_percent: number | null;
  start_date: string | null;
  due_date: string | null;
  target_date?: string | null;
  priority: TrackerPriority;
  status: TrackerStatus;
  context_data: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

export type CreateLifePulseTrackerInput = {
  userId?: string | null;
  category: LifePulseCategoryId;
  title: string;
  due_date?: string | null;
  start_date?: string | null;
  parent_id?: string | null;
  status?: TrackerStatus | string | null;
  priority?: TrackerPriority | string | null;
  progress_percent?: number;
  description?: string | null;
  planned_at?: string | null;
  context_data?: Record<string, unknown>;
};

export const CATEGORY_DEFAULT_METRICS: Record<LifePulseCategoryId, Record<string, unknown>> = {
  travel: { destination: "", budget: 0, packing_list: ["Passport", "Camera"], packed: {} },
  events: { event_name: "", venue: "", checklist: ["Tickets", "Outfit"], checked: {} },
  skincare: {
    morning: "Vitamin C",
    night: "Retinol",
    skin_hydration: "80%",
    morning_done: false,
    night_done: false,
  },
  life: { focus: "Daily balance", habits: ["Move", "Hydrate", "Reflect"], habit_done: {} },
  business_goals: { kpi_target: 50000, current_revenue: 0, source: "Meta Ads" },
  social_media: { platform: "Instagram", posts_planned: 12, posts_done: 0 },
  project_management: { project_name: "", tasks_total: 10, tasks_done: 0 },
  study: { subject: "", hours_target: 10, hours_done: 0 },
  pets: { pet_name: "", vaccine_due: "", food_brand: "" },
};
