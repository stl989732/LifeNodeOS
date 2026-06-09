export type ScheduleItemKind =
  | "task"
  | "appointment"
  | "event"
  | "travel"
  | "project";

export type ScheduleProvider =
  | "local"
  | "google"
  | "outlook"
  | "apple"
  | "motion"
  | "sunsama"
  | "notion";

export type ScheduleItem = {
  id: string;
  title: string;
  kind: ScheduleItemKind;
  /** ISO date YYYY-MM-DD */
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  notes?: string;
  source: ScheduleProvider;
  /** Provider event id for synced rows (dedupe on re-sync). */
  externalId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarIntegration = {
  id: ScheduleProvider;
  label: string;
  description: string;
  connected: boolean;
};

export const SCHEDULE_KIND_LABELS: Record<ScheduleItemKind, string> = {
  task: "Task",
  appointment: "Appointment",
  event: "Event",
  travel: "Travel",
  project: "Project",
};

export const DEFAULT_INTEGRATIONS: CalendarIntegration[] = [
  {
    id: "google",
    label: "Google Calendar",
    description: "Sync meetings and all-day events",
    connected: false,
  },
  {
    id: "outlook",
    label: "Outlook / Microsoft 365",
    description: "Work calendar and Teams blocks",
    connected: false,
  },
  {
    id: "apple",
    label: "Apple Calendar",
    description: "iCloud schedules via CalDAV",
    connected: false,
  },
  {
    id: "motion",
    label: "Motion",
    description: "Auto-scheduled tasks and focus blocks",
    connected: false,
  },
  {
    id: "sunsama",
    label: "Sunsama",
    description: "Daily planning and task roll-forward",
    connected: false,
  },
  {
    id: "notion",
    label: "Notion",
    description: "Databases with due dates and projects",
    connected: false,
  },
];

export type CalendarStore = {
  items: ScheduleItem[];
  integrations: CalendarIntegration[];
};
