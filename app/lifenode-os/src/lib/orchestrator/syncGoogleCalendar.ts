import { fetchGoogleCalendarItems } from "@/src/lib/calendar/googleCalendarSync";
import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import type { InboxItemUpsert } from "./types";

function monthWindow(): { start: Date; end: Date } {
  const anchor = new Date();
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m + 2, 0, 23, 59, 59);
  return { start, end };
}

export async function syncGoogleCalendarInbox(
  integrationUserId: string,
  sessionUserId: string,
): Promise<InboxItemUpsert[]> {
  const accessToken = await getValidAccessToken(integrationUserId, "google_calendar");
  const { start, end } = monthWindow();
  const events = await fetchGoogleCalendarItems(accessToken, start, end);

  return events
    .filter((ev) => ev.externalId)
    .map((ev) => {
      const receivedAt = ev.startTime
        ? new Date(`${ev.date}T${ev.startTime}:00`).toISOString()
        : new Date(`${ev.date}T12:00:00`).toISOString();

      return {
        user_id: sessionUserId,
        source: "google_calendar" as const,
        external_id: ev.externalId!,
        kind: "calendar_event" as const,
        title: ev.title,
        snippet: ev.notes?.slice(0, 280) ?? ev.kind,
        body: ev.notes ?? null,
        from_label: "Google Calendar",
        from_id: "google_calendar",
        received_at: receivedAt,
        status: "inbox" as const,
        transfer_meta: {},
        provider_payload: {
          scheduleItemId: ev.id,
          date: ev.date,
          startTime: ev.startTime ?? null,
          endTime: ev.endTime ?? null,
          allDay: ev.allDay ?? false,
          kind: ev.kind,
        },
        local_notes: null,
      };
    });
}
