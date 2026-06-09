import { formatDateKey } from "./storage";
import { buildSyncedItem } from "./mergeSyncedItems";
import type { ScheduleItem } from "./types";

type GoogleEventDate = { date?: string; dateTime?: string; timeZone?: string };

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  location?: string;
};

type GoogleEventsResponse = {
  items?: GoogleCalendarEvent[];
};

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeFromIso(iso: string): { dateKey: string; time?: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateKey: iso.slice(0, 10) };
  }
  return {
    dateKey: formatDateKey(d),
    time: padTime(d.getHours(), d.getMinutes()),
  };
}

function mapGoogleEvent(event: GoogleCalendarEvent): ScheduleItem | null {
  if (!event.id || !event.summary?.trim()) return null;

  const start = event.start;
  const end = event.end;
  if (!start) return null;

  if (start.date) {
    return buildSyncedItem({
      title: event.summary.trim(),
      kind: "event",
      date: start.date,
      allDay: true,
      notes: [event.description, event.location].filter(Boolean).join("\n") || undefined,
      source: "google",
      externalId: event.id,
    });
  }

  if (!start.dateTime) return null;
  const startParsed = timeFromIso(start.dateTime);
  const endParsed = end?.dateTime ? timeFromIso(end.dateTime) : null;

  return buildSyncedItem({
    title: event.summary.trim(),
    kind: "appointment",
    date: startParsed.dateKey,
    startTime: startParsed.time,
    endTime: endParsed?.time,
    notes: [event.description, event.location].filter(Boolean).join("\n") || undefined,
    source: "google",
    externalId: event.id,
  });
}

export async function fetchGoogleCalendarItems(
  accessToken: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<ScheduleItem[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Google Calendar API error: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as GoogleEventsResponse;
  const mapped = (data.items ?? [])
    .map(mapGoogleEvent)
    .filter((row): row is ScheduleItem => row !== null);

  return mapped;
}
