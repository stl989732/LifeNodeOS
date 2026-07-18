import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type WebAppViewStats = {
  /** All-time page views (sum of daily page_views). */
  totalPageViews: number;
  /** All-time unique visitor-days (sum of daily unique_visitors). */
  totalUniqueVisitors: number;
  /** Page views today (UTC). */
  todayPageViews: number;
  /** Unique visitors today (UTC). */
  todayUniqueVisitors: number;
  /** Page views in the last 7 UTC days (including today). */
  last7dPageViews: number;
  /** Unique visitor-days in the last 7 UTC days. */
  last7dUniqueVisitors: number;
};

const EMPTY_VIEW_STATS: WebAppViewStats = {
  totalPageViews: 0,
  totalUniqueVisitors: 0,
  todayPageViews: 0,
  todayUniqueVisitors: 0,
  last7dPageViews: 0,
  last7dUniqueVisitors: 0,
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Record one page view for an anonymous visitor key (service-role RPC). */
export async function recordWebAppPageView(
  visitorKey: string,
): Promise<{ ok: boolean; reason?: string }> {
  const key = visitorKey.trim();
  if (key.length < 8 || key.length > 128) {
    return { ok: false, reason: "invalid_visitor" };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("record_web_app_page_view", {
      p_visitor_key: key,
    });
    if (error) {
      console.error("[web-app-views] record failed", error.message);
      return { ok: false, reason: error.message };
    }
    const payload = data as { ok?: boolean; reason?: string } | null;
    if (payload && payload.ok === false) {
      return { ok: false, reason: payload.reason };
    }
    return { ok: true };
  } catch (err) {
    console.error("[web-app-views] record threw", err);
    return { ok: false, reason: "unavailable" };
  }
}

/** Aggregate rollups for Admin dashboard. Failures return zeros. */
export async function getWebAppViewStats(): Promise<WebAppViewStats> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("web_app_daily_stats")
      .select("view_date, page_views, unique_visitors");
    if (error) throw error;

    const today = utcToday();
    const from7 = utcDaysAgo(6);
    let totalPageViews = 0;
    let totalUniqueVisitors = 0;
    let todayPageViews = 0;
    let todayUniqueVisitors = 0;
    let last7dPageViews = 0;
    let last7dUniqueVisitors = 0;

    for (const row of data ?? []) {
      const views = Number(row.page_views ?? 0);
      const uniques = Number(row.unique_visitors ?? 0);
      const day = String(row.view_date ?? "");
      totalPageViews += views;
      totalUniqueVisitors += uniques;
      if (day === today) {
        todayPageViews = views;
        todayUniqueVisitors = uniques;
      }
      if (day >= from7 && day <= today) {
        last7dPageViews += views;
        last7dUniqueVisitors += uniques;
      }
    }

    return {
      totalPageViews,
      totalUniqueVisitors,
      todayPageViews,
      todayUniqueVisitors,
      last7dPageViews,
      last7dUniqueVisitors,
    };
  } catch (err) {
    console.error("[web-app-views] stats read failed", err);
    return EMPTY_VIEW_STATS;
  }
}
