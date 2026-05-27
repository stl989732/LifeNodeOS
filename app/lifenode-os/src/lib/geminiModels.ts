/**
 * Central Gemini model IDs for LifeNodeOS.
 *
 * Text: GOOGLE_GEMINI_TEXT_MODEL (default gemini-3.1-flash-lite — low latency)
 * Multimodal image+recipe: GOOGLE_GEMINI_MODEL (default gemini-3.1-flash-image-preview)
 * Audio: GOOGLE_GEMINI_AUDIO_MODEL → falls back to text model
 */

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.1-flash-lite";

export const DEFAULT_GEMINI_MULTIMODAL_MODEL = "gemini-3.1-flash-image-preview";

export function getGeminiTextModel(): string {
  return process.env.GOOGLE_GEMINI_TEXT_MODEL?.trim() || DEFAULT_GEMINI_TEXT_MODEL;
}

export function getGeminiMultimodalModel(): string {
  return (
    process.env.GOOGLE_GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MULTIMODAL_MODEL
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
