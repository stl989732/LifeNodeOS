import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendNotification } from "@/lib/user-state-store";
import {
  getLinosUsageStatus,
  LINOS_PLAN_LOCK_MESSAGE,
  meterLinosPlan,
} from "@/src/lib/lifePulse/linosUsageLimit";
import {
  generateLinosTrackerPlan,
  planFromBlueprint,
} from "@/src/lib/lifePulse/linosTrackerAi";
import type { PlanTableRow } from "@/src/lib/lifePulse/structuredPlans";
import {
  buildTrackerInsertRow,
  categoryFromDb,
  insertTrackerRow,
  normalizeTracker,
} from "@/src/lib/lifePulse/trackerDb";
import type { LifePulseCategoryId } from "@/src/lib/lifePulse/types";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

const VALID_CATEGORIES = new Set([
  "travel",
  "events",
  "skincare",
  "life",
  "business_goals",
  "social_media",
  "project_management",
  "study",
  "pets",
]);

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const rawPrompt = typeof obj.rawPrompt === "string" ? obj.rawPrompt.trim() : "";
  const category = typeof obj.category === "string" ? obj.category : "";

  if (!rawPrompt) {
    return NextResponse.json({ error: "RAW_PROMPT_REQUIRED" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
  }

  const dueHint =
    typeof obj.due_date === "string" ? obj.due_date : null;

  const qualifyingAnswers =
    obj.qualifyingAnswers && typeof obj.qualifyingAnswers === "object"
      ? (obj.qualifyingAnswers as Record<string, string>)
      : {};

  try {
    const planned_at = new Date().toISOString();
    const blueprintRaw = obj.planBlueprint;

    let plan;
    if (blueprintRaw && typeof blueprintRaw === "object") {
      const bp = blueprintRaw as Record<string, unknown>;
      const tableData = Array.isArray(bp.table_data) ? bp.table_data : [];
      plan = planFromBlueprint({
        blueprint: {
          title: String(bp.title ?? rawPrompt.slice(0, 80)),
          summary_text: String(bp.summary_text ?? bp.linos_intro ?? ""),
          linos_intro: String(bp.linos_intro ?? bp.summary_text ?? ""),
          due_date_iso:
            typeof bp.due_date_iso === "string" ? bp.due_date_iso : dueHint,
          table_columns: Array.isArray(bp.table_columns)
            ? (bp.table_columns as string[])
            : [],
          table_data: tableData as PlanTableRow[],
        },
        rawPrompt,
        category: category as LifePulseCategoryId,
        qualifyingAnswers,
      });
    } else {
      const usage = await getLinosUsageStatus(userId);
      if (usage.plan.locked) {
        return NextResponse.json(
          { error: LINOS_PLAN_LOCK_MESSAGE, usage },
          { status: 429 },
        );
      }
      plan = await generateLinosTrackerPlan({
        rawPrompt,
        category: category as LifePulseCategoryId,
        due_date: dueHint,
        qualifyingAnswers,
      });
      const planUsage = await meterLinosPlan(userId);
      if (planUsage.locked) {
        return NextResponse.json(
          { error: LINOS_PLAN_LOCK_MESSAGE, usage: await getLinosUsageStatus(userId) },
          { status: 429 },
        );
      }
    }

    const supabase = createSupabaseAdminClient();
    const row = buildTrackerInsertRow(
      {
        category: category as LifePulseCategoryId,
        title: plan.title,
        due_date: plan.due_date,
        status: "Planned",
        priority: "Medium",
        progress_percent: 0,
        description: plan.description,
        planned_at,
        context_data: {
          ...plan.context_data,
          table_columns: plan.table_columns,
          table_rows: plan.table_rows,
        },
      },
      userId,
    );

    const { data, error } = await insertTrackerRow(
      supabase,
      row,
      category as LifePulseCategoryId,
    );

    if (error || !data) {
      console.error("Supabase insert after Linos generate:", error);
      return NextResponse.json(
        { error: error?.message ?? "INSERT_FAILED", details: error },
        { status: 400 },
      );
    }

    const notificationsCreated = [];
    for (const alert of plan.proactive_alerts) {
      try {
        const notif = await appendNotification(userId, {
          bridgeId: alert.bridgeId.slice(0, 120),
          triggerSource: alert.triggerSource.slice(0, 120) || "LifePulse",
          message: alert.message.slice(0, 500),
          targetNode:
            alert.targetNode === "BizNode" ||
            alert.targetNode === "HomeNode" ||
            alert.targetNode === "VitalNode" ||
            alert.targetNode === "ProNode" ||
            alert.targetNode === "TraderNode" ||
            alert.targetNode === "VANode"
              ? alert.targetNode
              : null,
          primaryActionLabel: alert.primaryActionLabel?.slice(0, 120) ?? "Open LifePulse",
        });
        notificationsCreated.push(notif);
      } catch (e) {
        console.error("appendNotification:", e);
      }
    }

    const tracker = normalizeTracker(data);
    return NextResponse.json({
      tracker: {
        ...tracker,
        category: categoryFromDb(String(data.category ?? tracker.category)),
      },
      notificationsCreated: notificationsCreated.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/life-pulse/generate-tracker:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
