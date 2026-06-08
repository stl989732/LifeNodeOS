import type { ScheduleProvider } from "./types";

/** App labels passed to `connectAppToNode` for calendar integrations. */
export const CALENDAR_CONNECT_APPS: Record<
  Exclude<ScheduleProvider, "local">,
  string
> = {
  google: "Google Calendar",
  outlook: "Outlook",
  apple: "Apple Calendar",
  motion: "Motion",
  sunsama: "Sunsama",
  notion: "Notion",
};

export const CALENDAR_TARGET_NODE = "CALENDAR";

export function connectedAppKey(appId: string): string {
  return `${CALENDAR_TARGET_NODE.toLowerCase()}_${appId.toLowerCase()}`;
}
