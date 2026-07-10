import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  runLinosBreakdown,
  runLinosIntake,
} from "@/src/lib/lifePulse/linosConversation";
import { enforceAiRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";
import type { LifePulseCategoryId } from "@/src/lib/lifePulse/types";

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

  const rateLimited = await enforceAiRateLimit(userId);
  if (rateLimited) return rateLimited;

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
  const phase = obj.phase === "breakdown" ? "breakdown" : "intake";
  const rawPrompt = typeof obj.rawPrompt === "string" ? obj.rawPrompt.trim() : "";

  if (!rawPrompt) {
    return NextResponse.json({ error: "RAW_PROMPT_REQUIRED" }, { status: 400 });
  }

  const categoryHint =
    typeof obj.categoryHint === "string" && VALID_CATEGORIES.has(obj.categoryHint)
      ? (obj.categoryHint as LifePulseCategoryId)
      : undefined;

  try {
    if (phase === "intake") {
      const result = await runLinosIntake({
        userId,
        rawPrompt,
        categoryHint,
      });
      return NextResponse.json(result);
    }

    const domain =
      typeof obj.domain === "string" && VALID_CATEGORIES.has(obj.domain)
        ? (obj.domain as LifePulseCategoryId)
        : categoryHint;

    if (!domain) {
      return NextResponse.json({ error: "DOMAIN_REQUIRED" }, { status: 400 });
    }

    const qualifyingAnswers =
      obj.qualifyingAnswers && typeof obj.qualifyingAnswers === "object"
        ? (obj.qualifyingAnswers as Record<string, string>)
        : {};

    const result = await runLinosBreakdown({
      userId,
      rawPrompt,
      domain,
      qualifyingAnswers,
    });

    if ("error" in result) {
      return NextResponse.json(result, {
        status: result.usage.plan.locked ? 429 : 500,
      });
    }

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("POST /api/life-pulse/linos-chat:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
