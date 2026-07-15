import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pushLocalItemsToGoogleCalendar } from "@/src/lib/calendar/googleCalendarSync";
import { monthSyncWindow } from "@/src/lib/calendar/monthWindow";
import type { ScheduleItem } from "@/src/lib/calendar/types";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";

export const runtime = "nodejs";

type PushBody = {
  month?: string;
  items?: ScheduleItem[];
  /** IANA timezone from the browser (e.g. America/Los_Angeles). */
  timeZone?: string;
};

/** POST — export local dashboard items into Google Calendar. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json({ error: "account_link_failed" }, { status: 403 });
  }

  let body: PushBody = {};
  try {
    body = (await request.json()) as PushBody;
  } catch {
    body = {};
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const localItems = items.filter((row) => row?.source === "local");
  if (localItems.length === 0) {
    return NextResponse.json({
      ok: true,
      pushed: 0,
      updated: 0,
      skipped: 0,
      externalIds: {},
      message: "No local items to export in this view.",
    });
  }

  const { start, end } = monthSyncWindow(body.month);
  const timeZone =
    typeof body.timeZone === "string" && body.timeZone.trim()
      ? body.timeZone.trim()
      : "UTC";

  try {
    const accessToken = await getValidAccessToken(
      integrationUserId,
      "google_calendar",
    );
    const result = await pushLocalItemsToGoogleCalendar(
      accessToken,
      localItems,
      start,
      end,
      timeZone,
    );

    const total = result.pushed + result.updated;
    return NextResponse.json({
      ok: true,
      ...result,
      message:
        total > 0
          ? `Synced ${total} item${total === 1 ? "" : "s"} to Google Calendar.`
          : "No new local items to export for this month.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_failed";
    console.error("[calendar/push]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
