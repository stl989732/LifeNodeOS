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
      skipped: 0,
      message: "No local items to export in this view.",
    });
  }

  const { start, end } = monthSyncWindow(body.month);

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
    );

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.pushed > 0
          ? `Exported ${result.pushed} item${result.pushed === 1 ? "" : "s"} to Google Calendar.`
          : "No new local items to export for this month.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_failed";
    console.error("[calendar/push]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
