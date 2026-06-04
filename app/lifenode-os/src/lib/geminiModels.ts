/**
 * Central Gemini model IDs for LifeNodeOS.
 *
 * Text: GOOGLE_GEMINI_TEXT_MODEL (default gemini-3.1-flash-lite — low latency)
 * Chef image (Nano Banana 2): GOOGLE_GEMINI_CHEF_IMAGE_MODEL (default gemini-3.1-flash-image-preview)
 * Legacy GOOGLE_GEMINI_MODEL is only used when it is an *image* model id.
 * Audio: GOOGLE_GEMINI_AUDIO_MODEL → falls back to text model
 */

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.0-flash";

export const DEFAULT_GEMINI_MULTIMODAL_MODEL = "gemini-3.1-flash-image-preview";

export function getGeminiTextModel(): string {
  return process.env.GOOGLE_GEMINI_TEXT_MODEL?.trim() || DEFAULT_GEMINI_TEXT_MODEL;
}

/** @deprecated Prefer getChefImageModelId() from chefKitchenConfig for ChefNode. */
export function getGeminiMultimodalModel(): string {
  const generic = process.env.GOOGLE_GEMINI_MODEL?.trim();
  if (generic && /image|imagen/i.test(generic)) return generic;
  return (
    process.env.GOOGLE_GEMINI_CHEF_IMAGE_MODEL?.trim() ||
    DEFAULT_GEMINI_MULTIMODAL_MODEL
  );
}

export function getGeminiAudioModel(): string {
  return (
    process.env.GOOGLE_GEMINI_AUDIO_MODEL?.trim() ||
    process.env.GOOGLE_GEMINI_TEXT_MODEL?.trim() ||
    DEFAULT_GEMINI_TEXT_MODEL
  );
}

export function geminiGenerateContentUrl(modelId: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}
