import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { compressAudioPayload } from "@/lib/audioCompression";
import { sanitizeAndTruncate } from "@/lib/truncation";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  getGeminiMultimodalModel,
  getGeminiTextModel,
  geminiGenerateContentUrl,
} from "@/src/lib/geminiModels";

export const runtime = "nodejs";
export const maxDuration = 120;

type KitchenMode =
  | "recipe"
  | "chef_discover"
  | "chef_execute"
  | "categorize"
  | "chef_tip"
  | "vision_ingredients"
  | "transcribe_audio";

const DEFAULT_GEMINI_TEXT_MODEL = getGeminiTextModel();
const DEFAULT_GEMINI_CHEF_MODEL = getGeminiMultimodalModel();

const CHEF_MULTIMODAL_SYSTEM = `You are ChefNode for LifeNodeOS multimodal kitchen output.

MANDATORY RESPONSE CONTRACT (non-negotiable):
- You MUST produce BOTH modalities: TEXT (strict JSON only) AND at least one IMAGE.
- The IMAGE is required: one photorealistic plated hero shot of the finished dish (no overlaid text, no watermark, no logos).
- Never respond with TEXT-only when image generation is available.
- TEXT must be ONLY valid JSON matching the user schema — no markdown fences, no commentary outside JSON.
- Every recipe object MUST include a non-empty "imagePrompt" string (minimum 40 characters) describing lighting, plating, surface, and lens — even when the IMAGE modality succeeds.`;

const CHEF_IMAGE_JSON_RULES = `MANDATORY MODALITIES: Emit TEXT + IMAGE together in ONE response. IMAGE = photorealistic plated hero shot (required, non-negotiable). TEXT = ONLY the JSON object (no markdown).

JSON SCHEMA (required key order — imagePrompt MUST be first property you write):
{
  "imagePrompt": "<REQUIRED string, min 40 chars: lighting, plate, surface, lens, dish styling>",
  "title": "<string>",
  "prepTime": "<string>",
  "servings": "<string>",
  "ingredients": [...],
  "steps": [...],
  "caloriesPerServing": <integer>
}

RULES:
- Emit the IMAGE modality BEFORE finalizing JSON. A TEXT-only response wastes user credits and is invalid.
- "imagePrompt" must describe the SAME dish as "title".
- Never omit IMAGE. Never return empty imagePrompt.`;

const CHEF_IMAGE_RETRY_NUDGE = `CRITICAL RETRY: Your last reply violated ChefNode contract — you MUST emit BOTH (1) at least one IMAGE part (plated dish photo) AND (2) valid JSON with imagePrompt as the first key. Do not apologize; output IMAGE + JSON now.`;

/** Ensures Pollinations + client fallback always have a rich visual query. */
function ensureRecipeImagePrompt(title: string, imagePrompt: string): string {
  const t = imagePrompt.trim();
  if (t.length >= 40) return t;
  const name = title.trim() || "chef special plated dish";
  if (t.length > 0) {
    return `Photorealistic hero shot of ${name}, ${t}, soft natural window light, ceramic plate, 45-degree angle, editorial food magazine, no text, no watermark`;
  }
  return `Photorealistic hero shot of ${name}, plated on ceramic, soft natural window light, 45-degree angle, shallow depth of field, editorial food magazine styling, no text, no watermark`;
}

function geminiGenerateUrl(modelId: string) {
  return geminiGenerateContentUrl(modelId);
}

function extractGeminiText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = d?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p.text).filter(Boolean).join("").trim();
}

type GeminiImagePart = { mimeType: string; base64: string };

function pushInlineImageFromPart(
  images: GeminiImagePart[],
  pt: Record<string, unknown>,
) {
  const inline = (pt.inline_data ?? pt.inlineData) as
    | { mime_type?: string; mimeType?: string; data?: string }
    | undefined;
  if (!inline?.data || typeof inline.data !== "string") return;
  const mime =
    (typeof inline.mime_type === "string" && inline.mime_type) ||
    (typeof inline.mimeType === "string" && inline.mimeType) ||
    "image/png";
  if (!mime.startsWith("image/")) return;
  const data = inline.data.trim();
  if (!data) return;
  images.push({ mimeType: mime, base64: data });
}

function extractGeminiMultimodal(data: unknown): {
  text: string;
  images: GeminiImagePart[];
} {
  const d = data as {
    candidates?: Array<{
      content?: { parts?: Record<string, unknown>[] };
    }>;
  };
  const textParts: string[] = [];
  const images: GeminiImagePart[] = [];
  const candidates = d?.candidates;
  if (!Array.isArray(candidates)) return { text: "", images: [] };
  for (const cand of candidates) {
    const parts = cand?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const p of parts) {
      if (!p || typeof p !== "object") continue;
      const pt = p as Record<string, unknown>;
      if (pt.thought === true) continue;
      if (typeof pt.text === "string" && pt.text) textParts.push(pt.text);
      pushInlineImageFromPart(images, pt);
    }
  }
  return { text: textParts.join("\n").trim(), images };
}

function imageDataUrlsFromParts(images: GeminiImagePart[]): string[] {
  return images.map((im) => {
    const b64 = im.base64.replace(/\s/g, "");
    return `data:${im.mimeType};base64,${b64}`;
  });
}

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
    return null;
  }
}

function normalizeChefIngredients(ingRaw: unknown): { item: string; amount: string }[] {
  const chefIngredientRows: { item: string; amount: string }[] = [];
  if (Array.isArray(ingRaw)) {
    for (const row of ingRaw) {
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        const item =
          typeof r.item === "string"
            ? r.item.trim()
            : typeof r.name === "string"
              ? r.name.trim()
              : "";
        const amount =
          typeof r.amount === "string"
            ? r.amount.trim()
            : typeof r.qty === "string"
              ? r.qty.trim()
              : "";
        if (item) chefIngredientRows.push({ item, amount: amount || "as needed" });
      } else if (typeof row === "string" && row.trim()) {
        chefIngredientRows.push({ item: row.trim(), amount: "" });
      }
    }
  }
  return chefIngredientRows;
}

function normalizeCalories(rawCal: unknown): number {
  if (typeof rawCal === "number" && Number.isFinite(rawCal)) {
    return Math.max(80, Math.round(rawCal));
  }
  if (typeof rawCal === "string") {
    const n = parseInt(String(rawCal).replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) return Math.max(80, n);
  }
  return 450;
}

const GEMINI_FETCH_TIMEOUT_MS = Number(process.env.KITCHEN_GEMINI_TIMEOUT_MS ?? 55_000);

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = GEMINI_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Gemini request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiText(apiKey: string, contents: unknown[]) {
  const url = geminiGenerateUrl(DEFAULT_GEMINI_TEXT_MODEL);
  const res = await fetchWithTimeout(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return extractGeminiText(data);
}

async function callGeminiChefMultimodal(
  apiKey: string,
  contents: unknown[],
): Promise<{ text: string; images: GeminiImagePart[] }> {
  const url = geminiGenerateUrl(DEFAULT_GEMINI_CHEF_MODEL);
  const body = {
    systemInstruction: { parts: [{ text: CHEF_MULTIMODAL_SYSTEM }] },
    contents,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  };
  const res = await fetchWithTimeout(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  return extractGeminiMultimodal(data);
}

/** One reinforcement call when Gemini returns JSON but skips IMAGE. */
async function callGeminiChefMultimodalWithImageRetry(
  apiKey: string,
  contents: unknown[],
): Promise<{ text: string; images: GeminiImagePart[]; imageRetried: boolean }> {
  let first: { text: string; images: GeminiImagePart[] };
  try {
    first = await callGeminiChefMultimodal(apiKey, contents);
  } catch (err) {
    throw err;
  }
  if (first.images.length > 0) {
    return { ...first, imageRetried: false };
  }
  try {
    const retryContents = [
      ...contents,
      {
        role: "user",
        parts: [{ text: CHEF_IMAGE_RETRY_NUDGE }],
      },
    ];
    const second = await callGeminiChefMultimodal(apiKey, retryContents);
    if (second.images.length > 0) {
      return {
        text: second.text || first.text,
        images: second.images,
        imageRetried: true,
      };
    }
  } catch {
    /* Return text-only first pass — client uses Pollinations for hero image. */
  }
  return { ...first, imageRetried: true };
}

function recipeImageFields(title: string, imagePrompt: string) {
  const pollinationsQuery = ensureRecipeImagePrompt(title, imagePrompt);
  return { imagePrompt: pollinationsQuery, pollinationsQuery };
}

function buildImageApiExtras(
  title: string,
  rawImagePrompt: string,
  images: GeminiImagePart[],
  imageRetried: boolean,
) {
  const fields = recipeImageFields(title, rawImagePrompt);
  const skipped = images.length === 0;
  return {
    imagePrompt: fields.imagePrompt,
    pollinationsQuery: fields.pollinationsQuery,
    ...(skipped ? { imageGenerationSkipped: true as const } : {}),
    ...(imageRetried && skipped ? { imageGenerationRetried: true as const } : {}),
  };
}

const DEFAULT_CHEF_TIP =
  "Mise en place: always have ingredients prepped and tools within reach before you turn on the heat.";

const RECIPE_TAGS = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;

const IMAGE_GENERATION_MODES = new Set<KitchenMode>(["recipe", "chef_execute"]);

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const body = (await request.json()) as {
    mode?: KitchenMode;
    ingredients?: string;
    userRequest?: string;
    selectedMeal?: string;
    pantryHints?: string;
    extraContext?: string;
    recipeTitle?: string;
    recipeText?: string;
    imageBase64?: string;
    mimeType?: string;
    audioBase64?: string;
  };

  const sanitizeTextField = (value?: string) => {
    const trimmed = (value ?? "").trim();
    return trimmed ? sanitizeAndTruncate(trimmed) : "";
  };

  body.userRequest = sanitizeTextField(body.userRequest);
  body.ingredients = sanitizeTextField(body.ingredients);
  body.selectedMeal = sanitizeTextField(body.selectedMeal);
  body.pantryHints = sanitizeTextField(body.pantryHints);
  body.extraContext = sanitizeTextField(body.extraContext);
  body.recipeTitle = sanitizeTextField(body.recipeTitle);
  body.recipeText = sanitizeTextField(body.recipeText);

  const mode = body.mode;
  if (!mode) {
    return NextResponse.json({ error: "Missing mode." }, { status: 400 });
  }

  if (!apiKey) {
    if (mode === "chef_tip") {
      return NextResponse.json({ tip: DEFAULT_CHEF_TIP, fallback: true });
    }
    return NextResponse.json(
      {
        error: "Missing GOOGLE_API_KEY.",
        fallback: true,
      },
      { status: 503 },
    );
  }

  if (IMAGE_GENERATION_MODES.has(mode)) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const skipCap =
      process.env.SKIP_KITCHEN_IMAGE_CAP === "1" ||
      process.env.NEXT_PUBLIC_SKIP_KITCHEN_IMAGE_CAP === "1";

    if (!skipCap) {
      const maxCap = Number(process.env.KITCHEN_IMAGE_DAILY_CAP ?? 50);
      const supabase = createSupabaseAdminClient();
      const { data: isAllowed, error: rpcError } = await supabase.rpc(
        "check_and_increment_image_cap",
        {
          user_id: userId,
          max_cap: Number.isFinite(maxCap) && maxCap > 0 ? maxCap : 50,
        },
      );

      if (rpcError) {
        console.error("[kitchen-ai] image cap RPC failed:", rpcError.message);
        // Do not block recipe generation when the cap service is misconfigured or down.
      } else if (isAllowed === false) {
        return NextResponse.json(
          {
            error:
              "Daily safe operational limit reached for image generation.",
          },
          { status: 429 },
        );
      }
    }
  }

  try {
    if (mode === "chef_tip") {
      const text = await callGeminiText(apiKey, [
        {
          role: "user",
          parts: [
            {
              text: "Give me one short, professional, and inspiring chef's tip for a home cook. It should be one sentence long and focus on technique, flavor, or kitchen safety. Do not use emojis.",
            },
          ],
        },
      ]);
      return NextResponse.json({
        tip: text || DEFAULT_CHEF_TIP,
        fallback: !text,
      });
    }

    if (mode === "categorize") {
      const title = (body.recipeTitle ?? "").trim();
      const recipeText = (body.recipeText ?? "").trim();
      const text = await callGeminiText(apiKey, [
        {
          role: "user",
          parts: [
            {
              text: `Categorize this recipe into a single tag from this list: ${RECIPE_TAGS.join(", ")}. Output only the tag, nothing else.\n\nTitle: ${title}\n\nRecipe:\n${recipeText}`,
            },
          ],
        },
      ]);
      const raw = text.trim().replace(/\.$/, "");
      const lower = raw.toLowerCase();
      const matched =
        RECIPE_TAGS.find((t) => lower.includes(t.toLowerCase())) ?? "Dinner";
      return NextResponse.json({ category: matched });
    }

    if (mode === "vision_ingredients") {
      const data = body.imageBase64?.trim();
      if (!data) {
        return NextResponse.json(
          { error: "Missing imageBase64." },
          { status: 400 },
        );
      }
      const mime = body.mimeType?.trim() || "image/jpeg";
      const text = await callGeminiText(apiKey, [
        {
          role: "user",
          parts: [
            {
              inline_data: { mime_type: mime, data },
            },
            {
              text: "List recognizable food ingredients visible in this meal photo. Output ONLY a comma-separated list of ingredient names, no other text.",
            },
          ],
        },
      ]);
      return NextResponse.json({ ingredients: text });
    }

    if (mode === "transcribe_audio") {
      const data = body.audioBase64?.trim();
      if (!data) {
        return NextResponse.json(
          { error: "Missing audioBase64." },
          { status: 400 },
        );
      }
      const mime = body.mimeType?.trim() || "audio/webm";
      const transcript = await compressAudioPayload(data, mime, apiKey);
      return NextResponse.json({ transcript });
    }

    if (mode === "chef_discover") {
      const userRequest = (body.userRequest ?? body.ingredients ?? "").trim();
      if (!userRequest) {
        return NextResponse.json(
          { error: "Missing userRequest." },
          { status: 400 },
        );
      }
      const text = await callGeminiText(apiKey, [
        {
          role: "user",
          parts: [
            {
              text: `You are ChefNode for LifeNodeOS. The user said: "${userRequest}"

If they already named ONE very specific dish (e.g. "Turkey Lasagna recipe", exact restaurant dish name), return JSON:
{ "phase": "direct", "message": "one short minimalist sentence", "mealTitle": "the exact dish name to cook" }

Otherwise Phase 1 only — do NOT give a recipe. Return JSON:
{ "phase": "discovery", "message": "one short warm minimalist line", "options": [ {"title": "Short meal name", "tagline": "6 words max vibe"}, x3 ] }

Exactly 3 options in discovery. No markdown, no code fences, JSON only.`,
            },
          ],
        },
      ]);
      const parsed = parseJsonLoose(text);
      const phase =
        parsed?.phase === "direct" ? "direct" : "discovery";
      const message = typeof parsed?.message === "string" ? parsed.message : "";
      if (phase === "direct") {
        const mealTitle =
          typeof parsed?.mealTitle === "string" ? parsed.mealTitle.trim() : "";
        if (!mealTitle) {
          return NextResponse.json(
            { error: "Could not parse discovery JSON.", raw: text },
            { status: 422 },
          );
        }
        return NextResponse.json({ phase: "direct", message, mealTitle });
      }
      const rawOpts = parsed?.options;
      const options: { title: string; tagline: string }[] = [];
      if (Array.isArray(rawOpts)) {
        for (const o of rawOpts.slice(0, 5)) {
          if (typeof o === "string" && o.trim()) {
            options.push({ title: o.trim(), tagline: "" });
          } else if (o && typeof o === "object") {
            const ob = o as Record<string, unknown>;
            const t = typeof ob.title === "string" ? ob.title.trim() : "";
            const tag =
              typeof ob.tagline === "string"
                ? ob.tagline.trim()
                : typeof ob.subtitle === "string"
                  ? ob.subtitle.trim()
                  : "";
            if (t) options.push({ title: t, tagline: tag });
          }
        }
      }
      if (options.length < 3) {
        return NextResponse.json(
          { error: "Could not parse three options.", raw: text },
          { status: 422 },
        );
      }
      return NextResponse.json({
        phase: "discovery",
        message: message || "Here are three directions you could take.",
        options: options.slice(0, 3),
      });
    }

    if (mode === "chef_execute") {
      const selectedMeal = (body.selectedMeal ?? "").trim();
      if (!selectedMeal) {
        return NextResponse.json(
          { error: "Missing selectedMeal." },
          { status: 400 },
        );
      }
      const pantry = (body.pantryHints ?? body.ingredients ?? "").trim();
      const extra = (body.extraContext ?? "").trim();
      const mmResult = await callGeminiChefMultimodalWithImageRetry(apiKey, [
        {
          role: "user",
          parts: [
            {
              text: `You are ChefNode for LifeNodeOS (multimodal image + recipe pipeline).

The user chose this meal focus: "${selectedMeal}".
${pantry ? `Pantry / hints: ${pantry}.` : ""}${extra ? ` Notes: ${extra}` : ""}

${CHEF_IMAGE_JSON_RULES}

STRICT ORDER inside the JSON — obey before emitting recipe prose:
1) First compose an internal photorealistic food-photo brief for "imagePrompt" on EACH recipe object (not marketing copy) — a detailed string for a plated dish render (lighting, lens, surface).
2) Only after imagePrompt is fully specified for each dish, output ingredients and steps.

If the user clearly asked for MULTIPLE DISTINCT finished dishes in one request (e.g. "fresh salad and ice cream" as two separate items), return ONLY valid JSON:
{ "recipes": [ /* 2 to 4 full recipe objects, each with */ "title", "prepTime", "servings", "imagePrompt", "ingredients", "steps", "caloriesPerServing" ] }

Otherwise return ONLY valid JSON for ONE dish:
{ "recipe": { "title", "prepTime", "servings", "imagePrompt", "ingredients", "steps", "caloriesPerServing" } }

Each recipe: ingredients = array of 6-14 objects { "item", "amount" }; steps = array of 5-10 instruction strings; caloriesPerServing = integer. imagePrompt MUST be the first key in every recipe object.`,
            },
          ],
        },
      ]);
      const mm = mmResult;
      const text = mm.text;
      const imageDataUrls = imageDataUrlsFromParts(mm.images);
      const imageDataUrl = imageDataUrls[0] ?? null;
      const parsed = parseJsonLoose(text);
      const multiRaw = parsed?.recipes;
      if (Array.isArray(multiRaw) && multiRaw.length >= 2) {
        const recipesOut: Record<string, unknown>[] = [];
        for (const raw of multiRaw.slice(0, 4)) {
          if (!raw || typeof raw !== "object") continue;
          const r = raw as Record<string, unknown>;
          const title = typeof r.title === "string" ? r.title.trim() : "";
          const steps = Array.isArray(r.steps)
            ? (r.steps as unknown[]).filter((s) => typeof s === "string")
            : [];
          if (!title || steps.length === 0) continue;
          const ing = normalizeChefIngredients(r.ingredients);
          const rawImagePrompt =
            typeof r.imagePrompt === "string" ? r.imagePrompt.trim() : "";
          const imgFields = recipeImageFields(title, rawImagePrompt);
          recipesOut.push({
            title,
            prepTime: typeof r.prepTime === "string" ? r.prepTime : "30 min",
            servings: typeof r.servings === "string" ? r.servings : "4",
            steps,
            ingredients: ing,
            caloriesPerServing: normalizeCalories(r.caloriesPerServing),
            ...imgFields,
          });
        }
        if (recipesOut.length >= 2) {
          const heroTitle =
            typeof recipesOut[0]?.title === "string"
              ? String(recipesOut[0].title)
              : selectedMeal;
          const heroPrompt =
            typeof recipesOut[0]?.imagePrompt === "string"
              ? String(recipesOut[0].imagePrompt)
              : "";
          return NextResponse.json({
            recipes: recipesOut,
            imageDataUrl,
            ...(imageDataUrls.length > 1 ? { imageDataUrls } : {}),
            ...buildImageApiExtras(
              heroTitle,
              heroPrompt,
              mm.images,
              mmResult.imageRetried,
            ),
          });
        }
      }

      const rootRecipe = parsed?.recipe && typeof parsed.recipe === "object"
        ? (parsed.recipe as Record<string, unknown>)
        : parsed;
      const title =
        typeof rootRecipe?.title === "string" ? rootRecipe.title.trim() : null;
      const prepTime =
        typeof rootRecipe?.prepTime === "string" ? rootRecipe.prepTime : "30 min";
      const servings =
        typeof rootRecipe?.servings === "string" ? rootRecipe.servings : "4";
      const steps = Array.isArray(rootRecipe?.steps)
        ? (rootRecipe.steps as unknown[]).filter((s) => typeof s === "string")
        : [];
      const chefIngredientRows = normalizeChefIngredients(rootRecipe?.ingredients);
      const caloriesPerServing = normalizeCalories(rootRecipe?.caloriesPerServing);
      const rawImagePrompt =
        typeof rootRecipe?.imagePrompt === "string"
          ? rootRecipe.imagePrompt.trim()
          : "";
      if (!title || steps.length === 0) {
        return NextResponse.json(
          { error: "Could not parse recipe JSON.", raw: text },
          { status: 422 },
        );
      }
      const imgExtras = buildImageApiExtras(
        title,
        rawImagePrompt,
        mm.images,
        mmResult.imageRetried,
      );
      return NextResponse.json({
        recipe: {
          title,
          prepTime,
          servings,
          steps,
          ingredients: chefIngredientRows,
          caloriesPerServing,
          imagePrompt: imgExtras.imagePrompt,
          pollinationsQuery: imgExtras.pollinationsQuery,
        },
        imageDataUrl,
        ...(imageDataUrls.length > 1 ? { imageDataUrls } : {}),
        pollinationsQuery: imgExtras.pollinationsQuery,
        ...(imgExtras.imageGenerationSkipped
          ? { imageGenerationSkipped: true }
          : {}),
        ...(imgExtras.imageGenerationRetried
          ? { imageGenerationRetried: true }
          : {}),
      });
    }

    if (mode === "recipe") {
      const ingredientsText = (body.ingredients ?? "").trim();
      if (!ingredientsText) {
        return NextResponse.json(
          { error: "Missing ingredients." },
          { status: 400 },
        );
      }
      const extra = (body.extraContext ?? "").trim();
      const mmResult = await callGeminiChefMultimodalWithImageRetry(apiKey, [
        {
          role: "user",
          parts: [
            {
              text: `You are a home cooking assistant. Ingredients on hand: "${ingredientsText}".${extra ? ` Additional context: ${extra}` : ""}

${CHEF_IMAGE_JSON_RULES}

STRICT: Write "imagePrompt" as the FIRST key in your JSON (required, ≥40 characters), then all other fields. Emit IMAGE + JSON together.

Return ONLY valid JSON with keys (imagePrompt first):
- imagePrompt (REQUIRED string, detailed photorealistic food photo brief, min 40 chars)
- title (string)
- prepTime (string)
- servings (string)
- steps (array of 4-6 short instruction strings)
- ingredients (optional array of { "item": string, "amount": string })
- caloriesPerServing (optional integer)`,
            },
          ],
        },
      ]);
      const mm = mmResult;
      const text = mm.text;
      const imageDataUrls = imageDataUrlsFromParts(mm.images);
      const imageDataUrl = imageDataUrls[0] ?? null;
      const parsed = parseJsonLoose(text);
      const title = typeof parsed?.title === "string" ? parsed.title : null;
      const prepTime =
        typeof parsed?.prepTime === "string" ? parsed.prepTime : "25 min";
      const servings =
        typeof parsed?.servings === "string" ? parsed.servings : "4";
      const steps = Array.isArray(parsed?.steps)
        ? (parsed.steps as unknown[]).filter((s) => typeof s === "string")
        : [];
      const ingRaw = parsed?.ingredients;
      const recipeIngredients = normalizeChefIngredients(ingRaw);
      const rawCal = parsed?.caloriesPerServing;
      let caloriesPerServing: number | null = null;
      if (typeof rawCal === "number" && Number.isFinite(rawCal)) {
        caloriesPerServing = Math.max(50, Math.round(rawCal));
      } else if (typeof rawCal === "string") {
        const n = parseInt(String(rawCal).replace(/[^\d]/g, ""), 10);
        if (Number.isFinite(n)) caloriesPerServing = Math.max(50, n);
      }
      const rawImagePrompt =
        typeof parsed?.imagePrompt === "string" ? parsed.imagePrompt.trim() : "";
      if (!title || steps.length === 0) {
        return NextResponse.json(
          { error: "Could not parse recipe JSON.", raw: text },
          { status: 422 },
        );
      }
      const imgExtras = buildImageApiExtras(
        title,
        rawImagePrompt,
        mm.images,
        mmResult.imageRetried,
      );
      return NextResponse.json({
        recipe: {
          title,
          prepTime,
          servings,
          steps,
          ingredients: recipeIngredients,
          caloriesPerServing,
          imagePrompt: imgExtras.imagePrompt,
          pollinationsQuery: imgExtras.pollinationsQuery,
        },
        imageDataUrl,
        ...(imageDataUrls.length > 1 ? { imageDataUrls } : {}),
        pollinationsQuery: imgExtras.pollinationsQuery,
        ...(imgExtras.imageGenerationSkipped
          ? { imageGenerationSkipped: true }
          : {}),
        ...(imgExtras.imageGenerationRetried
          ? { imageGenerationRetried: true }
          : {}),
      });
    }

    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Kitchen AI request failed.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
