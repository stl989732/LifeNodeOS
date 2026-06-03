/**
 * ChefNode / kitchen-ai configuration.
 * Nano Banana 2 = Gemini 3.1 Flash Image (`gemini-3.1-flash-image-preview`).
 */

export const NANO_BANANA_2_MODEL_ID = "gemini-3.1-flash-image-preview";

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off", ""]);

/** Server-only. CHEF_MULTIMODAL_IMAGES=0 must disable slow image+recipe Gemini calls. */
export function isChefMultimodalImagesEnabled(): boolean {
  const raw = (process.env.CHEF_MULTIMODAL_IMAGES ?? "").trim().toLowerCase();
  if (FALSY.has(raw)) return false;
  return TRUTHY.has(raw);
}

export function isLikelyImageCapableModel(modelId: string): boolean {
  const m = modelId.toLowerCase();
  return m.includes("image") || m.includes("imagen");
}

/** Model used only when multimodal ChefNode image generation is enabled. */
export function getChefImageModelId(): string {
  const dedicated =
    process.env.GOOGLE_GEMINI_CHEF_IMAGE_MODEL?.trim() ||
    process.env.CHEF_GEMINI_IMAGE_MODEL?.trim();
  if (dedicated) return dedicated;

  const generic = process.env.GOOGLE_GEMINI_MODEL?.trim();
  if (generic && isLikelyImageCapableModel(generic)) return generic;

  return NANO_BANANA_2_MODEL_ID;
}

export function getChefKitchenPublicConfig() {
  return {
    multimodalEnabled: isChefMultimodalImagesEnabled(),
    textModelEnv: "GOOGLE_GEMINI_TEXT_MODEL",
    imageModelEnv: "GOOGLE_GEMINI_CHEF_IMAGE_MODEL",
    nanoBanana2ModelId: NANO_BANANA_2_MODEL_ID,
    defaultPathway: isChefMultimodalImagesEnabled()
      ? "multimodal-nano-banana-2"
      : "text-fast-pollinations",
  };
}
