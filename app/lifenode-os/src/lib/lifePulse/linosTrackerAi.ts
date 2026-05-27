import { sanitizeAndTruncate } from "@/lib/truncation";
import { parseQuickAddTracker } from "./quickAddNlp";
import {
  defaultTableColumns,
  formatQualifyingAnswersForAi,
} from "./qualifyingQuestions";
import {
  effectivePlanDays,
  resolvePlanIntent,
  type PlanIntent,
} from "./planIntent";
import {
  buildCategoryPlanRows,
  rowsLookGeneric,
  skincareIntro,
  studyIntro,
  type PlanTableRow,
} from "./structuredPlans";
import {
  extractSummaryFromAiPayload,
  extractTableRowsFromAiPayload,
  rowsAreUsable,
} from "./linosTableNormalize";
import { getGeminiTextModel, geminiGenerateContentUrl } from "@/src/lib/geminiModels";
import { buildLinosMasterSystemPrompt } from "./linosMasterPrompt";
import { LIFE_PULSE_CATEGORIES, type LifePulseCategoryId } from "./types";

export type ProactiveAlertDraft = {
  bridgeId: string;
  message: string;
  triggerSource: string;
  targetNode: string | null;
  primaryActionLabel: string | null;
  fire_at: string | null;
};

export type LinosTrackerAiResult = {
  title: string;
  description: string;
  linos_intro: string;
  action_items: string[];
  due_date: string | null;
  proactive_alerts: ProactiveAlertDraft[];
  context_data: Record<string, unknown>;
  table_columns: string[];
  table_rows: { id: string; cells: Record<string, string>; label?: string }[];
};

function parseJsonLoose(s: string): Record<string, unknown> | null {
  const t = s.trim();
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try {
        return JSON.parse(m[1].trim()) as Record<string, unknown>;
      } catch {
        /* empty */
      }
    }
    const i = t.indexOf("{");
    const j = t.lastIndexOf("}");
    if (i !== -1 && j > i) {
      try {
        return JSON.parse(t.slice(i, j + 1)) as Record<string, unknown>;
      } catch {
        /* empty */
      }
    }
  }
  return null;
}

function categoryLabel(id: LifePulseCategoryId): string {
  return LIFE_PULSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Plan content lives in table_rows only — no duplicate bullet list in the UI. */
function buildDescriptionMarkdown(intro: string): string {
  return intro.trim();
}

function tableRowsToActionItems(rows: PlanTableRow[]): string[] {
  return rows.map((r) => {
    const vals = Object.values(r.cells).filter(Boolean);
    return vals.join(" — ").slice(0, 200);
  });
}

function ensureFullPlanTable(
  category: LifePulseCategoryId,
  intent: PlanIntent,
  rawPrompt: string,
  existingRows: PlanTableRow[],
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const targetDays = effectivePlanDays(intent, category);

  if (
    existingRows.length >= targetDays &&
    rowsAreUsable(existingRows) &&
    !rowsLookGeneric(existingRows)
  ) {
    return {
      table_columns: defaultTableColumns(category),
      table_rows: existingRows.slice(0, targetDays),
    };
  }

  const built = buildCategoryPlanRows(category, intent, rawPrompt, qualifyingAnswers);

  if (existingRows.length > 0 && rowsAreUsable(existingRows) && !rowsLookGeneric(existingRows)) {
    const merged = [...existingRows];
    for (let i = merged.length; i < targetDays; i++) {
      merged.push(built.table_rows[i] ?? built.table_rows[i % built.table_rows.length]);
    }
    return { table_columns: built.table_columns, table_rows: merged.slice(0, targetDays) };
  }

  return built;
}

function attachStructuredPlan(
  base: Omit<LinosTrackerAiResult, "table_columns" | "table_rows">,
  category: LifePulseCategoryId,
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
  existingRows: PlanTableRow[] = [],
): LinosTrackerAiResult {
  const { table_columns, table_rows } = ensureFullPlanTable(
    category,
    intent,
    rawPrompt,
    existingRows,
    qualifyingAnswers,
  );
  const action_items = tableRowsToActionItems(table_rows);

  return {
    ...base,
    action_items,
    description: buildDescriptionMarkdown(base.linos_intro),
    table_columns,
    table_rows,
    context_data: {
      ...base.context_data,
      table_columns,
      table_rows,
      plan_days: effectivePlanDays(intent, category),
      study_subject: intent.studySubject,
      qualifying_answers: qualifyingAnswers ?? {},
    },
  };
}

function buildAlerts(
  title: string,
  dueDate: string | null,
  days: number,
): ProactiveAlertDraft[] {
  const alerts: ProactiveAlertDraft[] = [];
  if (dueDate) {
    alerts.push({
      bridgeId: "life-pulse-due-date",
      message: `LifePulse: "${title}" — ${days}-day plan ends soon. Open your table for today's step.`,
      triggerSource: "LifePulse",
      targetNode: "HomeNode",
      primaryActionLabel: "Open LifePulse",
      fire_at: dueDate,
    });
  }
  return alerts;
}

/** Structured fallback — real subject/day content, never generic productivity boilerplate. */
function fallbackPlan(
  rawPrompt: string,
  category: LifePulseCategoryId,
  intent: PlanIntent,
  qualifyingAnswers?: Record<string, string>,
): LinosTrackerAiResult {
  const days = effectivePlanDays(intent, category);
  const due_date = intent.dueDateIso;

  let title: string;
  let linos_intro: string;

  if (category === "study") {
    const subject = intent.studySubject ?? "Study";
    title = `${days}-Day ${subject} Study Plan`;
    linos_intro = studyIntro(intent, days, qualifyingAnswers);
  } else if (category === "skincare") {
    title = `${days}-Day Skincare Plan`;
    linos_intro = skincareIntro(rawPrompt, days);
  } else {
    const short = rawPrompt.trim().slice(0, 60);
    title = short ? `${days}-Day Plan: ${short}` : `${days}-Day ${categoryLabel(category)} Plan`;
    linos_intro = `Your **${days}-day plan** for “${rawPrompt.slice(0, 100)}” is ready. Each row is a concrete step — open today's row and check it off when done.`;
  }

  const base = {
    title,
    linos_intro,
    action_items: [] as string[],
    description: "",
    due_date,
    proactive_alerts: buildAlerts(title, due_date, days),
    context_data: {
      linos_generated: true,
      source_prompt: rawPrompt,
      linos_intro,
      plan_days: days,
      study_subject: intent.studySubject,
      qualifying_answers: qualifyingAnswers ?? {},
    },
  };

  return attachStructuredPlan(
    base,
    category,
    intent,
    rawPrompt,
    qualifyingAnswers,
  );
}

function normalizeAiPayload(
  raw: Record<string, unknown>,
  rawPrompt: string,
  category: LifePulseCategoryId,
  intent: PlanIntent,
  qualifyingAnswers?: Record<string, string>,
): LinosTrackerAiResult {
  const parsedDue = intent.dueDateIso;
  const targetDays = effectivePlanDays(intent, category);

  const summaryFromAi = extractSummaryFromAiPayload(raw);
  const intro =
    summaryFromAi ??
    (typeof raw.linos_intro === "string" && raw.linos_intro.trim()
      ? raw.linos_intro.trim()
      : category === "study"
        ? studyIntro(intent, targetDays, qualifyingAnswers)
        : `Your ${targetDays}-day plan is ready — each day has specific instructions in the table below.`);

  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 120)
      : intent.studySubject
        ? `${targetDays}-Day ${intent.studySubject} Study Plan`
        : `${targetDays}-Day ${categoryLabel(category)} Plan`;

  const due_date =
    typeof raw.due_date_iso === "string"
      ? raw.due_date_iso
      : typeof raw.due_date === "string"
        ? raw.due_date
        : parsedDue;

  const table_columns =
    Array.isArray(raw.table_columns) && raw.table_columns.every((c) => typeof c === "string")
      ? (raw.table_columns as string[])
      : defaultTableColumns(category);

  const existingRows = extractTableRowsFromAiPayload(raw, category);

  const alertsRaw = raw.proactive_alerts;
  const proactive_alerts: ProactiveAlertDraft[] = Array.isArray(alertsRaw)
    ? alertsRaw
        .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
        .map((a, i) => ({
          bridgeId:
            typeof a.bridgeId === "string" ? a.bridgeId : `life-pulse-alert-${i}`,
          message:
            typeof a.message === "string"
              ? a.message.slice(0, 500)
              : "LifePulse reminder — check today's plan row.",
          triggerSource: "LifePulse",
          targetNode: "HomeNode",
          primaryActionLabel: "Open LifePulse",
          fire_at: typeof a.fire_at === "string" ? a.fire_at : due_date,
        }))
    : buildAlerts(title, due_date, targetDays);

  const base = {
    title,
    linos_intro: intro,
    action_items: [] as string[],
    description: "",
    due_date,
    proactive_alerts,
    context_data: {
      linos_generated: true,
      source_prompt: rawPrompt,
      category,
      linos_intro: intro,
      plan_days: targetDays,
      study_subject: intent.studySubject,
      qualifying_answers: qualifyingAnswers ?? {},
    },
  };

  return attachStructuredPlan(
    base,
    category,
    intent,
    rawPrompt,
    qualifyingAnswers,
    existingRows,
  );
}

function buildGeminiSystemPrompt(
  targetDays: number,
  intent: PlanIntent,
  category: LifePulseCategoryId,
): string {
  const columns = defaultTableColumns(category);
  const columnExample = columns
    .map((c) => `"${c}": "filled value — never empty"`)
    .join(", ");

  return buildLinosMasterSystemPrompt({
    targetDays,
    category,
    columns,
    columnExample,
    studySubject: intent.studySubject,
  });
}

/** Build tracker payload from conversational blueprint (phase 4 — save to DB). */
export function planFromBlueprint(input: {
  blueprint: {
    title: string;
    summary_text: string;
    linos_intro: string;
    due_date_iso: string | null;
    table_columns: string[];
    table_data: PlanTableRow[];
  };
  rawPrompt: string;
  category: LifePulseCategoryId;
  qualifyingAnswers?: Record<string, string>;
}): LinosTrackerAiResult {
  const intent = resolvePlanIntent(
    input.rawPrompt,
    input.category,
    input.blueprint.due_date_iso,
    input.qualifyingAnswers,
  );
  const days = effectivePlanDays(intent, input.category);

  const base = {
    title: input.blueprint.title.slice(0, 120),
    linos_intro: input.blueprint.linos_intro || input.blueprint.summary_text,
    action_items: [] as string[],
    description: "",
    due_date: input.blueprint.due_date_iso ?? intent.dueDateIso,
    proactive_alerts: buildAlerts(
      input.blueprint.title,
      input.blueprint.due_date_iso ?? intent.dueDateIso,
      days,
    ),
    context_data: {
      linos_generated: true,
      source_prompt: input.rawPrompt,
      linos_intro: input.blueprint.linos_intro,
      plan_days: days,
      conversation_flow: true,
      qualifying_answers: input.qualifyingAnswers ?? {},
    },
  };

  return attachStructuredPlan(
    base,
    input.category,
    intent,
    input.rawPrompt,
    input.qualifyingAnswers,
    input.blueprint.table_data,
  );
}

export async function generateLinosTrackerPlan(input: {
  rawPrompt: string;
  category: LifePulseCategoryId;
  due_date?: string | null;
  qualifyingAnswers?: Record<string, string>;
}): Promise<LinosTrackerAiResult> {
  const trimmed = input.rawPrompt.trim();
  const rawPrompt = trimmed ? sanitizeAndTruncate(trimmed) : "";
  const parsed = parseQuickAddTracker(rawPrompt);
  const intent = resolvePlanIntent(
    rawPrompt,
    input.category,
    input.due_date ?? parsed.due_date,
    input.qualifyingAnswers,
  );
  const targetDays = effectivePlanDays(intent, input.category);

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return fallbackPlan(rawPrompt, input.category, intent, input.qualifyingAnswers);
  }

  const url = `${geminiGenerateContentUrl(getGeminiTextModel())}?key=${apiKey}`;

  const answersBlock = input.qualifyingAnswers
    ? formatQualifyingAnswersForAi(input.qualifyingAnswers)
    : "";

  const userText = `Category: ${categoryLabel(input.category)}
User request (follow exactly): ${rawPrompt}
Required plan length: ${targetDays} days (table must have ${targetDays} rows)
${intent.studySubject ? `Detected subject: ${intent.studySubject}` : ""}
${parsed.due_date ? `Due date hint: ${parsed.due_date}` : ""}
${answersBlock ? `Qualifying answers:\n${answersBlock}` : ""}`;

  try {
    const maxTokens = targetDays <= 15 ? 4096 : targetDays <= 30 ? 8192 : 12000;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildGeminiSystemPrompt(targetDays, intent, input.category) }],
        },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini tracker generate failed:", await response.text());
      return fallbackPlan(rawPrompt, input.category, intent, input.qualifyingAnswers);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
    const parsedJson = parseJsonLoose(text);
    if (!parsedJson) {
      return fallbackPlan(rawPrompt, input.category, intent, input.qualifyingAnswers);
    }

    const result = normalizeAiPayload(
      parsedJson,
      rawPrompt,
      input.category,
      intent,
      input.qualifyingAnswers,
    );

    if (!rowsAreUsable(result.table_rows) || rowsLookGeneric(result.table_rows)) {
      return fallbackPlan(rawPrompt, input.category, intent, input.qualifyingAnswers);
    }

    return result;
  } catch (e) {
    console.error("generateLinosTrackerPlan:", e);
    return fallbackPlan(rawPrompt, input.category, intent, input.qualifyingAnswers);
  }
}
