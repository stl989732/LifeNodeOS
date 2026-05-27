import { sanitizeAndTruncate } from "@/lib/truncation";
import { detectDomainFromPrompt, domainLabel } from "./detectDomain";
import { filterQuestionsForPrompt } from "./filterQuestions";
import {
  getLinosUsageStatus,
  incrementLinosUsage,
  LINOS_LOCK_MESSAGE,
  type LinosUsageStatus,
} from "./linosUsageLimit";
import { getGeminiTextModel, geminiGenerateContentUrl } from "@/src/lib/geminiModels";
import { buildBreakdownSystemPrompt, buildIntakeSystemPrompt } from "./linosConversationPrompt";
import {
  parsePlanDurationDays,
  resolvePlanIntent,
  detectStudySubject,
  effectivePlanDays,
} from "./planIntent";
import {
  getQualifyingQuestions,
  type QualifyingQuestion,
} from "./qualifyingQuestions";
import {
  extractTableRowsFromAiPayload,
  extractSummaryFromAiPayload,
  rowsAreUsable,
} from "./linosTableNormalize";
import { buildCategoryPlanRows } from "./structuredPlans";
import { defaultTableColumns } from "./qualifyingQuestions";
import type { LifePulseCategoryId } from "./types";
import type { PlanTableRow } from "./structuredPlans";

export type LinosChatMessage = {
  role: "user" | "linos";
  content: string;
};

export type LinosPlanBlueprint = {
  title: string;
  summary_text: string;
  linos_intro: string;
  due_date_iso: string | null;
  table_columns: string[];
  table_data: PlanTableRow[];
  breakdown_markdown: string;
};

export type LinosIntakeResult = {
  phase: "questions";
  domain: LifePulseCategoryId;
  messages: LinosChatMessage[];
  questions: QualifyingQuestion[];
  usage: LinosUsageStatus;
};

export type LinosBreakdownResult = {
  phase: "breakdown";
  domain: LifePulseCategoryId;
  messages: LinosChatMessage[];
  ready_to_save: boolean;
  blueprint: LinosPlanBlueprint;
  usage: LinosUsageStatus;
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

function maxQualifyingQuestions(domain: LifePulseCategoryId): number {
  return domain === "travel" || domain === "events" ? 4 : 3;
}

function fallbackIntakeMessage(domain: LifePulseCategoryId, rawPrompt: string): string {
  const overviewByDomain: Partial<Record<LifePulseCategoryId, string>> = {
    events:
      "Industry events like **HighLevel Live** often run 2–3 days with keynotes, networking, and onsite support. If your event is in **Manila**, expect international flights in the **$900–$1,400 USD** range from the US, venue hotels around **$180–$250/night**, and nearby options (Belmont, Savoy) closer to **$85–$130/night**.",
    travel:
      "A strong trip plan balances flights, lodging style, and daily itinerary. From the US to Southeast Asia, economy round-trips often land **$900–$1,400 USD**; central hotels **$150–$250/night**; budget nearby or Airbnb can cut nightly cost significantly.",
    skincare:
      "For concerns like **pimple scars**, dermatologists often layer actives: **Niacinamide** (barrier, redness), **BHA/Salicylic Acid** (pores), **Vitamin C** (hyperpigmentation), and retinoids (texture) — introduced slowly with patch tests.",
    study:
      "A focused study plan spreads fundamentals, practice, and review across your timeline so each day has one clear learning target.",
  };

  const snippets: Partial<Record<LifePulseCategoryId, string>> = {
    study:
      "That's awesome that you want to sharpen your language and learning skills! I'm excited to map out something clear and effective with you.",
    events:
      "That's exciting — events are a powerful way to learn and connect! I'd love to help you prepare with a step-by-step plan.",
    travel:
      "A great trip starts with a solid plan — I'm glad you're thinking ahead! Let's build something practical together.",
    skincare:
      "Healthy skin is absolutely worth investing in — let's design a routine that fits you.",
    pets: "Your pet's wellbeing matters — let's organize care, food, and reminders in one place.",
    social_media:
      "Consistency wins on social — let's line up content ideas that match your niche and audience.",
    life: "That's a meaningful goal — breaking it into daily steps makes it achievable.",
    business_goals: "Building a business takes clarity — let's structure your next moves.",
    project_management: "Let's get your tasks organized so nothing slips through the cracks.",
  };
  const open = snippets[domain] ?? "I'm here to help you turn that idea into a clear plan.";
  const overview =
    overviewByDomain[domain] ??
    `Here's a quick look at **${rawPrompt.slice(0, 120)}** and what a solid ${domainLabel(domain)} plan usually includes.`;
  return `${open}\n\n${overview}\n\nTo map this exactly into your personal LifeNodeOS schedule, tell me a few details below.`;
}

async function callGemini(system: string, user: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;

  const url = `${geminiGenerateContentUrl(getGeminiTextModel())}?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 10240,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    console.error("Linos chat Gemini error:", await response.text());
    return null;
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
  return parseJsonLoose(text);
}

export async function runLinosIntake(input: {
  userId: string;
  rawPrompt: string;
  categoryHint?: LifePulseCategoryId;
}): Promise<LinosIntakeResult> {
  const rawPrompt = sanitizeAndTruncate(input.rawPrompt.trim());
  const usage = await getLinosUsageStatus(input.userId);

  if (usage.locked) {
    return {
      phase: "questions",
      domain: detectDomainFromPrompt(rawPrompt, input.categoryHint),
      messages: [
        { role: "user", content: rawPrompt },
        { role: "linos", content: LINOS_LOCK_MESSAGE },
      ],
      questions: [],
      usage,
    };
  }

  const domain = detectDomainFromPrompt(rawPrompt, input.categoryHint);
  const allQuestions = filterQuestionsForPrompt(
    getQualifyingQuestions(domain, rawPrompt),
    rawPrompt,
  ).slice(0, maxQualifyingQuestions(domain));

  const system = buildIntakeSystemPrompt(domain);
  const parsed = await callGemini(system, `User spark: ${rawPrompt}`);

  let linosText = fallbackIntakeMessage(domain, rawPrompt);
  if (parsed) {
    const overview =
      typeof parsed.knowledge_overview === "string" ? parsed.knowledge_overview.trim() : "";
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (message) {
      linosText = message;
    } else if (overview) {
      linosText = `${overview}\n\nTo map this exactly into your personal LifeNodeOS schedule, tell me a few details below.`;
    }
  }

  if (usage.warning) {
    linosText = `${linosText}\n\n---\n\n*${usage.warning}*`;
  }

  return {
    phase: "questions",
    domain,
    messages: [
      { role: "user", content: rawPrompt },
      { role: "linos", content: linosText },
    ],
    questions: allQuestions,
    usage,
  };
}

function blueprintFromParsed(
  parsed: Record<string, unknown>,
  domain: LifePulseCategoryId,
  rawPrompt: string,
  qualifyingAnswers: Record<string, string>,
): LinosPlanBlueprint {
  const intent = resolvePlanIntent(rawPrompt, domain, null, qualifyingAnswers);
  const targetDays = Math.max(
    parsePlanDurationDays(rawPrompt) || intent.durationDays || 7,
    1,
  );

  const table_rows = extractTableRowsFromAiPayload(parsed, domain);
  const summary =
    extractSummaryFromAiPayload(parsed) ??
    (typeof parsed.summary_text === "string" ? parsed.summary_text : null) ??
    `Your ${targetDays}-day ${domainLabel(domain)} plan`;

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : `${targetDays}-Day ${domainLabel(domain)} Plan`;

  const breakdown =
    typeof parsed.breakdown_markdown === "string" && parsed.breakdown_markdown.trim()
      ? parsed.breakdown_markdown.trim()
      : summary;

  const due =
    typeof parsed.due_date_iso === "string" ? parsed.due_date_iso : intent.dueDateIso;

  const table_columns = Array.isArray(parsed.table_columns)
    ? (parsed.table_columns as string[])
    : table_rows.length
      ? Object.keys(table_rows[0]?.cells ?? {})
      : [];

  let rows = table_rows;
  let cols = table_columns.length ? table_columns : defaultTableColumns(domain);

  if (!rowsAreUsable(rows)) {
    const built = buildCategoryPlanRows(domain, intent, rawPrompt, qualifyingAnswers);
    rows = built.table_rows;
    cols = built.table_columns;
  }

  let md = breakdown;
  if (domain === "skincare" && !md.includes("dermatologist")) {
    md =
      `> **Medical disclaimer:** This plan is educational only. Consult a certified dermatologist before new actives.\n\n${md}`;
  }
  if (!md || md.length < 80) {
    md = rows
      .map((r, i) => {
        const parts = Object.entries(r.cells)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => `**${k}:** ${v}`)
          .join(" · ");
        return `## Day ${i + 1}\n${parts || "_Details in your plan table._"}`;
      })
      .join("\n\n");
  }

  return {
    title,
    summary_text: summary,
    linos_intro: summary,
    due_date_iso: due,
    table_columns: cols,
    table_data: rows,
    breakdown_markdown: md,
  };
}

export async function runLinosBreakdown(input: {
  userId: string;
  rawPrompt: string;
  domain: LifePulseCategoryId;
  qualifyingAnswers: Record<string, string>;
}): Promise<LinosBreakdownResult | { error: string; usage: LinosUsageStatus }> {
  const usageBefore = await getLinosUsageStatus(input.userId);
  if (usageBefore.locked) {
    return { error: LINOS_LOCK_MESSAGE, usage: usageBefore };
  }

  const rawPrompt = sanitizeAndTruncate(input.rawPrompt.trim());
  const domain = input.domain;
  const intent = resolvePlanIntent(rawPrompt, domain, null, input.qualifyingAnswers);
  const targetDays = Math.max(
    effectivePlanDays(intent, domain),
    parsePlanDurationDays(rawPrompt) || 7,
  );

  const answersBlock = Object.entries(input.qualifyingAnswers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const system = buildBreakdownSystemPrompt(
    domain,
    targetDays,
    intent.studySubject ?? detectStudySubject(rawPrompt),
  );

  const travelEventHint =
    domain === "travel" || domain === "events"
      ? "\nUse origin + accommodation answers to put realistic USD amounts in every Budget/Amount field (no 'Research cost' or TBD)."
      : "";

  const userText = `Original request: ${rawPrompt}\nDomain: ${domain}\nPlan length: ${targetDays} days/steps\nAnswers:\n${answersBlock}${travelEventHint}`;

  const parsed = await callGemini(system, userText);
  const usage = await incrementLinosUsage(input.userId);

  if (!parsed) {
    return {
      error: "Linos could not generate your breakdown. Check GOOGLE_API_KEY and try again.",
      usage,
    };
  }

  let blueprint = blueprintFromParsed(
    parsed,
    domain,
    rawPrompt,
    input.qualifyingAnswers,
  );

  let breakdownText = blueprint.breakdown_markdown;
  if (usage.warning && !breakdownText.includes("only have 4 left")) {
    breakdownText = `${breakdownText}\n\n---\n\n*${usage.warning}*`;
  }

  const linosMessage =
    breakdownText +
    "\n\n---\n\nWhen you're ready, save this plan to your **LifePulse Plan Table** using the button below.";

  return {
    phase: "breakdown",
    domain,
    messages: [
      { role: "user", content: rawPrompt },
      { role: "linos", content: linosMessage },
    ],
    ready_to_save: blueprint.table_data.length > 0,
    blueprint: { ...blueprint, breakdown_markdown: breakdownText },
    usage,
  };
}
