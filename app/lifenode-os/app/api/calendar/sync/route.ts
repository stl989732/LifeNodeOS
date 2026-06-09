import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchGoogleCalendarItems } from "@/src/lib/calendar/googleCalendarSync";
import { resolveIntegrationUserId } from "@/src/lib/integrations/resolveIntegrationUserId";
import { getValidAccessToken } from "@/src/lib/integrations/tokenManager";
import type { ScheduleProvider } from "@/src/lib/calendar/types";

export const runtime = "nodejs";

const OAUTH_LIVE_PROVIDERS: ScheduleProvider[] = ["google"];

type SyncBody = {
  provider?: ScheduleProvider;
  /** YYYY-MM-DD anchor for month sync window */
  month?: string;
};

function monthWindow(monthKey?: string): { start: Date; end: Date } {
  const anchor = monthKey ? new Date(`${monthKey}-01T12:00:00`) : new Date();
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m + 2, 0, 23, 59, 59);
  return { start, end };
}

/** POST — pull external calendar events for connected providers. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrationUserId = await resolveIntegrationUserId(session);
  if (!integrationUserId) {
    return NextResponse.json({ error: "account_link_failed" }, { status: 403 });
  }

  let body: SyncBody = {};
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    body = {};
  }

  const provider = body.provider ?? "google";
  const { start, end } = monthWindow(body.month);

  if (!OAUTH_LIVE_PROVIDERS.includes(provider)) {
    return NextResponse.json({
      ok: true,
      provider,
      items: [],
      liveSync: false,
      message: `${providerLabel(provider)} OAuth sync is not live yet. Your connection is saved — manual entries still appear on your calendar.`,
    });
  }

  try {
    const accessToken = await getValidAccessToken(integrationUserId, "google_calendar");
    const items =
      provider === "google"
        ? await fetchGoogleCalendarItems(accessToken, start, end)
        : [];

    return NextResponse.json({
      ok: true,
      provider,
      items,
      liveSync: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync_failed";
    console.error("[calendar/sync]", e);
    return NextResponse.json({ error: message, provider }, { status: 502 });
  }
}

function providerLabel(provider: ScheduleProvider): string {
  const labels: Record<ScheduleProvider, string> = {
    local: "Local",
    google: "Google Calendar",
    outlook: "Outlook",
    apple: "Apple Calendar",
    motion: "Motion",
    sunsama: "Sunsama",
    notion: "Notion",
  };
  return labels[provider] ?? provider;
}
