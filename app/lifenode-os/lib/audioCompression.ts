import { sanitizeAndTruncate } from "@/lib/truncation";
import { getGeminiAudioModel } from "@/src/lib/geminiModels";

const TRANSCRIPTION_PROMPT =
  "Transcribe the audio exactly. If the speaker lists food or pantry items, output ONLY a clean comma-separated ingredient list with no bullets or numbering. Otherwise output the spoken words as plain text with no preamble.";

function geminiGenerateUrl(modelId: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

function extractGeminiText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = d?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => p.text).filter(Boolean).join("").trim();
}

/**
 * Transcribes raw audio to a compact text payload (voice compression).
 * One focused Gemini pass — downstream handlers receive text only, not binary.
 */
export async function compressAudioPayload(
  audioBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const data = audioBase64.replace(/\s/g, "").trim();
  if (!data) {
    throw new Error("Empty audio payload.");
  }

  const mime = mimeType?.trim() || "audio/webm";
  const model = getGeminiAudioModel();
  const url = geminiGenerateUrl(model);

  const response = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mime, data } },
            { text: TRANSCRIPTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Gemini transcription HTTP ${response.status}`);
  }

  const json = await response.json();
  const transcript = extractGeminiText(json);
  if (!transcript) {
    throw new Error("No transcript returned from audio compression.");
  }

  return sanitizeAndTruncate(transcript);
}
