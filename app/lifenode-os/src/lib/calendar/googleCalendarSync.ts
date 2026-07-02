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
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new Error("Invalid sync date range");
  }

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

type GoogleInsertEvent = {
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
};

function localScheduleToGoogleEvent(
  item: ScheduleItem,
  timeZone: string,
): GoogleInsertEvent | null {
  const summary = item.title.trim();
  if (!summary || !item.date) return null;

  if (item.allDay) {
    return {
      summary,
      description: item.notes,
      start: { date: item.date },
      end: { date: item.date },
    };
  }

  const startTime = item.startTime ?? "09:00";
  const endTime = item.endTime ?? startTime;
  return {
    summary,
    description: item.notes,
    start: { dateTime: `${item.date}T${startTime}:00`, timeZone },
    end: { dateTime: `${item.date}T${endTime}:00`, timeZone },
  };
}

export async function pushLocalItemsToGoogleCalendar(
  accessToken: string,
  items: ScheduleItem[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<{ pushed: number; skipped: number }> {
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new Error("Invalid sync date range");
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const startKey = formatDateKey(rangeStart);
  const endKey = formatDateKey(rangeEnd);

  let pushed = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.source !== "local") {
      skipped += 1;
      continue;
    }
    if (item.date < startKey || item.date > endKey) {
      skipped += 1;
      continue;
    }
    if (item.externalId) {
      skipped += 1;
      continue;
    }

    const body = localScheduleToGoogleEvent(item, timeZone);
    if (!body) {
      skipped += 1;
      continue;
    }

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Google Calendar export error: ${detail.slice(0, 200)}`);
    }

    pushed += 1;
  }

  return { pushed, skipped };
}
