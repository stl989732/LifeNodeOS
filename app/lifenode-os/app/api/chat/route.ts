import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sanitizeAndTruncate } from "@/lib/truncation";
import { meterDeniedResponse } from "@/src/lib/ai-metering/errors";
import {
  meterAiUsage,
  resolveChatMeterEvent,
} from "@/src/lib/ai-metering/meterAiUsage";
import { enforceAiRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";

export const runtime = "nodejs";
import { getGeminiTextModel, geminiGenerateContentUrl } from "@/src/lib/geminiModels";
import { LINOS_MARKDOWN_STYLE_SYSTEM, prependFormattingBlock } from "@/src/lib/linos/linosFormatting";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

type InlinePart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  /** Optional Gemini multimodal parts for this turn (typically last user message). */
  geminiParts?: InlinePart[];
};

function getGenerateContentUrl() {
  return geminiGenerateContentUrl(getGeminiTextModel());
}

function toGeminiPayload(messages: ChatMessage[]) {
  const systemTexts = prependFormattingBlock(
    messages
      .filter((m) => m.role === "system")
      .map((m) => sanitizeAndTruncate((m.content ?? "").trim()))
      .filter(Boolean),
  );

  const systemInstruction =
    systemTexts.length > 0
      ? { parts: [{ text: systemTexts.join("\n\n") }] }
      : { parts: [{ text: LINOS_MARKDOWN_STYLE_SYSTEM }] };

  const contents: { role: string; parts: InlinePart[] }[] = [];

  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const trimmed = (m.content ?? "").trim();
    const textContent = trimmed ? sanitizeAndTruncate(trimmed) : "";

    const parts =
      role === "user" && Array.isArray(m.geminiParts) && m.geminiParts.length > 0
        ? [...m.geminiParts, ...(textContent ? [{ text: textContent } as InlinePart] : [])]
        : textContent
          ? [{ text: textContent }]
          : [];

    if (parts.length === 0) continue;
    contents.push({ role, parts });
  }

  return {
    systemInstruction,
    contents,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return unauthorized();

    const rateLimited = await enforceAiRateLimit(userId);
    if (rateLimited) return rateLimited;

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY in environment variables." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      meterContext?: string;
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty messages array." },
        { status: 400 },
      );
    }

    const nonSystem = messages.filter((m) => m.role !== "system");
    if (nonSystem.length === 0) {
      return NextResponse.json(
        { error: "Include at least one user or assistant message." },
        { status: 400 },
      );
    }

    const meterEvent = resolveChatMeterEvent(body);
    const meterResult = await meterAiUsage(userId, meterEvent);
    if (!meterResult.allowed) {
      return meterDeniedResponse(meterResult);
    }

    const geminiBody = toGeminiPayload(messages);

    const response = await fetch(`${getGenerateContentUrl()}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Google API request failed.", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No response content returned.";

    return NextResponse.json({ reply: text });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error in chat route.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
