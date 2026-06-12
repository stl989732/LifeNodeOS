import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { meterDeniedResponse } from "@/src/lib/ai-metering/errors";
import { meterAiUsage } from "@/src/lib/ai-metering/meterAiUsage";
import { getChefTextModelId } from "@/src/lib/chefKitchenConfig";
import { geminiGenerateContentUrl } from "@/src/lib/geminiModels";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type VanodeAiMode = "email_assist" | "video_sop" | "live_summary";

async function callGeminiText(prompt: string, timeoutMs = 28_000): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY.");

  const model = getChefTextModelId();
  const url = geminiGenerateContentUrl(model);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.55 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Gemini HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((p) => p.text).filter(Boolean).join("").trim();
  } finally {
    clearTimeout(timer);
  }
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

async function fetchUrlHint(url: string): Promise<string> {
  const u = url.trim();
  if (u.includes("youtube.com") || u.includes("youtu.be")) {
    try {
      const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`;
      const res = await fetch(oembed, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const j = (await res.json()) as { title?: string; author_name?: string };
        return [j.title, j.author_name].filter(Boolean).join(" · ");
      }
    } catch {
      /* ignore */
    }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return unauthorized();

    const body = (await request.json()) as {
      mode?: VanodeAiMode;
      thread?: string;
      videoUrl?: string;
      transcript?: string;
      sessionTitle?: string;
    };

    const mode = body.mode;
    if (!mode) {
      return NextResponse.json({ error: "Missing mode." }, { status: 400 });
    }

    const thread = (body.thread ?? "").trim();
    const videoUrl = (body.videoUrl ?? "").trim();
    const transcript = (body.transcript ?? "").trim();
    const sessionTitle = (body.sessionTitle ?? "Live session").trim();

    if (mode === "email_assist" && !thread) {
      return NextResponse.json({ error: "Missing thread." }, { status: 400 });
    }
    if (mode === "video_sop" && !videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl." }, { status: 400 });
    }
    if (mode === "live_summary" && !transcript) {
      return NextResponse.json({ error: "Missing transcript." }, { status: 400 });
    }
    if (
      mode !== "email_assist" &&
      mode !== "video_sop" &&
      mode !== "live_summary"
    ) {
      return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
    }

    const meterResult = await meterAiUsage(userId, "vanode_ai");
    if (!meterResult.allowed) {
      return meterDeniedResponse(meterResult);
    }

    if (mode === "email_assist") {
      const text = await callGeminiText(
        `You are a professional virtual assistant drafting client email replies.

EMAIL THREAD:
"""
${thread.slice(0, 12000)}
"""

Return ONLY valid JSON:
{
  "summary": "3-5 bullet points: situation, key facts, decisions needed, deadlines (do NOT paste the full email)",
  "draft": "A complete, contextual reply email the VA can send (proper greeting, specific references to the thread, professional tone, clear next steps)"
}`,
      );

      const parsed = parseJsonLoose(text);
      const summary =
        typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
      const draft = typeof parsed?.draft === "string" ? parsed.draft.trim() : "";
      if (!summary || !draft) {
        return NextResponse.json(
          { error: "Could not parse AI response.", raw: text },
          { status: 422 },
        );
      }
      return NextResponse.json({ summary, draft });
    }

    if (mode === "video_sop") {
      const hint = await fetchUrlHint(videoUrl);
      const text = await callGeminiText(
        `You are creating a Standard Operating Procedure from a client video link.

URL: ${videoUrl}
${hint ? `Video metadata hint: ${hint}` : ""}

You cannot watch the video — infer a plausible professional SOP a VA would use after reviewing this type of recording (meeting walkthrough, tutorial, or demo). Be specific to the title/hint when available.

Return ONLY valid JSON:
{
  "title": "Short SOP title",
  "objective": "2-4 sentences on purpose and outcome",
  "steps": ["step 1", "step 2", ... 5-8 actionable steps],
  "sourceUrl": "${videoUrl}"
}`,
        32_000,
      );

      const parsed = parseJsonLoose(text);
      const title = typeof parsed?.title === "string" ? parsed.title.trim() : "";
      const objective =
        typeof parsed?.objective === "string" ? parsed.objective.trim() : "";
      const stepsRaw = parsed?.steps;
      const steps = Array.isArray(stepsRaw)
        ? stepsRaw.filter((s) => typeof s === "string").map((s) => String(s).trim())
        : [];
      if (!title || !objective || steps.length < 3) {
        return NextResponse.json(
          { error: "Could not parse SOP JSON.", raw: text },
          { status: 422 },
        );
      }

      const md = [
        `## ${title}`,
        "",
        "### Objective",
        objective,
        "",
        "### Steps",
        ...steps.map((s, i) => `${i + 1}. ${s}`),
        "",
        "### Source",
        videoUrl,
        hint ? `\n_Video hint: ${hint}_` : "",
      ].join("\n");

      return NextResponse.json({ title, objective, steps, markdown: md });
    }

    if (mode === "live_summary") {
      const text = await callGeminiText(
        `Summarize this live meeting/webinar/interview transcript for a VA handoff.

Session: ${sessionTitle}

Transcript:
"""
${transcript.slice(0, 14000)}
"""

Return plain text with sections:
Key decisions (bullets)
Action items (bullets with owners if mentioned)
Follow-ups`,
      );

      return NextResponse.json({ summary: text || "No summary generated." });
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { feature: "vanode-ai" } });
    return NextResponse.json(
      {
        error: "VANode AI request failed.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
