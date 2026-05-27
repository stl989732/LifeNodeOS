const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_PRELOAD_MS = 16000;

const PROMPT_VARIANTS = [
  (raw: string) =>
    `Photorealistic plated dish: ${raw}, soft daylight, food magazine, sharp focus, no text, no watermark`,
  (raw: string) =>
    `Professional food photography, ${raw}, hero shot on ceramic plate, studio lighting, appetizing, 8k, no text`,
  (raw: string) =>
    `Overhead photograph of ${raw}, plated dish centered, neutral table, natural light, editorial food styling, no watermark`,
];

/** ChefNode render fallback — matches Pollinations path suffix format for 1500² output. */
export function buildPollinationsChefPlatingUrl(title: string): string {
  const dishTitle = String(title || "gourmet dish").trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `${dishTitle} photorealistic gourmet culinary plating`,
  )}_1500_1500_53_true`;
}

/** Gemini inline image when present; otherwise instant Pollinations plating from title. */
export function chefRecipeImageSrc(recipeData: {
  imageDataUrl?: string | null;
  title?: string;
}): string {
  if (recipeData.imageDataUrl) {
    return recipeData.imageDataUrl;
  }
  return buildPollinationsChefPlatingUrl(recipeData.title ?? "");
}

/** Build a Pollinations.ai URL; `attempt` rotates prompt wording and seed for retries. */
export function buildPollinationsDishUrl(
  promptOrTitle: string,
  attempt = 0,
): string {
  const raw = String(promptOrTitle || "").trim();
  if (!raw) return "";
  const variant = PROMPT_VARIANTS[Math.min(attempt, PROMPT_VARIANTS.length - 1)];
  const q = variant(raw);
  const seed = Date.now() + attempt * 7919;
  return `${POLLINATIONS_BASE}/${encodeURIComponent(q)}?width=768&height=768&nologo=true&seed=${seed}`;
}

export function preloadKitchenImage(
  url: string,
  timeoutMs = DEFAULT_PRELOAD_MS,
): Promise<void> {
  if (!url || typeof url !== "string") {
    return Promise.reject(new Error("INVALID_IMAGE_URL"));
  }
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("IMAGE_LOAD_TIMEOUT"));
    }, timeoutMs);
    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    img.src = url;
  });
}

/** Visual query for Pollinations — prefers server-normalized pollinationsQuery. */
export function pickDishImageQuery(options: {
  pollinationsQuery?: string;
  imagePrompt?: string;
  title?: string;
}): string {
  const server = (options.pollinationsQuery || "").trim();
  if (server.length >= 10) return server;
  const ip = (options.imagePrompt || "").trim();
  if (ip.length >= 40) return ip;
  const title = (options.title || "").trim();
  if (title) return title;
  if (ip) return ip;
  return "gourmet plated dinner";
}

/**
 * Prefer Gemini inline image; on skip/failure, Pollinations with preload retries.
 */
export async function resolveKitchenDishImageUrl(options: {
  apiImageUrl?: string | null;
  pollinationsQuery?: string;
  imagePrompt?: string;
  title?: string;
  imageGenerationSkipped?: boolean;
  maxAttempts?: number;
}): Promise<string> {
  const {
    apiImageUrl,
    pollinationsQuery,
    imagePrompt,
    title,
    imageGenerationSkipped,
    maxAttempts = DEFAULT_ATTEMPTS,
  } = options;

  const query = pickDishImageQuery({ pollinationsQuery, imagePrompt, title });

  if (
    !imageGenerationSkipped &&
    typeof apiImageUrl === "string" &&
    apiImageUrl.startsWith("data:image") &&
    apiImageUrl.length < 900_000
  ) {
    try {
      await preloadKitchenImage(apiImageUrl);
      return apiImageUrl;
    } catch {
      /* fall through to Pollinations */
    }
  }

  for (let i = 0; i < maxAttempts; i++) {
    const url = buildPollinationsDishUrl(query, i);
    if (!url) break;
    try {
      await preloadKitchenImage(url);
      return url;
    } catch {
      await new Promise((r) => window.setTimeout(r, 350 * (i + 1)));
    }
  }

  return buildPollinationsDishUrl(query, maxAttempts);
}

/** After <img> onError — retry Pollinations with alternate seeds/prompts. */
export async function retryPollinationsDishImage(
  promptOrTitle: string,
  fromAttempt = 1,
  maxAttempts = DEFAULT_ATTEMPTS,
): Promise<string> {
  const prompt = String(promptOrTitle || "").trim() || "plated dinner";
  for (let i = 0; i < maxAttempts; i++) {
    const url = buildPollinationsDishUrl(prompt, fromAttempt + i);
    try {
      await preloadKitchenImage(url);
      return url;
    } catch {
      await new Promise((r) => window.setTimeout(r, 400 * (i + 1)));
    }
  }
  return buildPollinationsDishUrl(prompt, fromAttempt);
}
