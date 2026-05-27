export type AppearanceMode = "light" | "dark" | "system";
export type UiDensity = "compact" | "spacious";
export type AiProactivity = "passive" | "balanced" | "autonomous";
export type AiPersona = "minimal" | "coach" | "executive";
export type SyncFrequency = "realtime" | "hourly" | "daily";

export type NotificationChannels = {
  push: boolean;
  sms: boolean;
  email: boolean;
};

export type NotificationRowId =
  | "critical_biz_leads"
  | "daily_agenda"
  | "home_routines"
  | "life_pulse_reminders"
  | "trader_alerts";

export type ContextMemory = {
  id: string;
  label: string;
  createdAt: string;
};

export type LifeNodeSettings = {
  appearance: AppearanceMode;
  density: UiDensity;
  aiProactivity: AiProactivity;
  aiPersona: AiPersona;
  contextMemories: ContextMemory[];
  focusHoursStart: string;
  focusHoursEnd: string;
  timezone: string;
  dndEnabled: boolean;
  dndEmergencyOverride: boolean;
  notifications: Record<NotificationRowId, NotificationChannels>;
  syncFrequency: SyncFrequency;
};

export const SETTINGS_STORAGE_KEY = "lifenode_os_settings_v1";

export const NOTIFICATION_ROWS: { id: NotificationRowId; label: string }[] = [
  { id: "critical_biz_leads", label: "Critical Biz Leads" },
  { id: "daily_agenda", label: "Daily Agenda Summary" },
  { id: "home_routines", label: "Home / Routine Reminders" },
  { id: "life_pulse_reminders", label: "LifePulse Plan Reminders" },
  { id: "trader_alerts", label: "Trader Risk Alerts" },
];

const DEFAULT_NOTIFICATIONS = (): Record<NotificationRowId, NotificationChannels> => ({
  critical_biz_leads: { push: true, sms: true, email: true },
  daily_agenda: { push: true, sms: false, email: true },
  home_routines: { push: true, sms: false, email: false },
  life_pulse_reminders: { push: true, sms: false, email: true },
  trader_alerts: { push: true, sms: true, email: false },
});

export const DEFAULT_LIFE_NODE_SETTINGS: LifeNodeSettings = {
  appearance: "system",
  density: "spacious",
  aiProactivity: "balanced",
  aiPersona: "coach",
  contextMemories: [
    {
      id: "mem_pref_1",
      label: "Prefers concise morning briefings before 9 AM",
      createdAt: new Date().toISOString(),
    },
    {
      id: "mem_pref_2",
      label: "BizNode: follow-up SLA within 24h for warm leads",
      createdAt: new Date().toISOString(),
    },
  ],
  focusHoursStart: "09:00",
  focusHoursEnd: "18:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dndEnabled: false,
  dndEmergencyOverride: true,
  notifications: DEFAULT_NOTIFICATIONS(),
  syncFrequency: "hourly",
};

export function loadLifeNodeSettings(): LifeNodeSettings {
  if (typeof window === "undefined") return DEFAULT_LIFE_NODE_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_LIFE_NODE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LifeNodeSettings>;
    return {
      ...DEFAULT_LIFE_NODE_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_NOTIFICATIONS(),
        ...(parsed.notifications ?? {}),
      },
      contextMemories: Array.isArray(parsed.contextMemories)
        ? parsed.contextMemories
        : DEFAULT_LIFE_NODE_SETTINGS.contextMemories,
    };
  } catch {
    return DEFAULT_LIFE_NODE_SETTINGS;
  }
}

export function saveLifeNodeSettings(settings: LifeNodeSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("lifenode:settings-changed"));
}

export function appearanceToTheme(
  mode: AppearanceMode,
  routeTheme: string,
): string {
  if (mode === "light") return "grainy-dawn";
  if (mode === "dark") return "deep-onyx";
  return routeTheme;
}
