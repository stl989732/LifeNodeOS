import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { meterDeniedResponse } from "@/src/lib/ai-metering/errors";
import { meterAiUsage } from "@/src/lib/ai-metering/meterAiUsage";
import { enforceAiRateLimit } from "@/src/lib/rateLimit/enforceRateLimit";
import { getChefTextModelId } from "@/src/lib/chefKitchenConfig";
import { geminiGenerateContentUrl } from "@/src/lib/geminiModels";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type VanodeAiMode =
  | "email_assist"
  | "video_sop"
  | "live_summary"
  | "eod_client_email"
  | "eod_weekly_digest";

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
    const senderName =
      session.user.name?.trim() ||
      session.user.email?.split("@")[0]?.trim() ||
      "Your VA";

    const rateLimited = await enforceAiRateLimit(userId);
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as {
      mode?: VanodeAiMode;
      thread?: string;
      videoUrl?: string;
      transcript?: string;
      sessionTitle?: string;
      clientName?: string;
      accomplishments?: string;
      timeSpent?: string;
      blockers?: string;
      logs?: Array<{
        date: string;
        accomplishments: string;
        timeSpent: string;
        blockers: string;
      }>;
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
    if (mode === "eod_client_email") {
      const accomplishments = (body.accomplishments ?? "").trim();
      if (!accomplishments && !(body.timeSpent ?? "").trim()) {
        return NextResponse.json(
          { error: "Add accomplishments or time spent first." },
          { status: 400 },
        );
      }
    }
    if (
      mode !== "email_assist" &&
      mode !== "video_sop" &&
      mode !== "live_summary" &&
      mode !== "eod_client_email" &&
      mode !== "eod_weekly_digest"
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

    if (mode === "eod_client_email") {
      const clientName = (body.clientName ?? "the client").trim();
      const accomplishments = (body.accomplishments ?? "").trim();
      const timeSpent = (body.timeSpent ?? "").trim();
      const blockers = (body.blockers ?? "").trim();
      const text = await callGeminiText(
        `Draft an end-of-day client email on behalf of ${senderName}. The sender is the authenticated LifeNode OS account owner—not Linos or an AI assistant.

Client: ${clientName}
Sender: ${senderName}

Today's work notes:
"""
${accomplishments.slice(0, 8000)}
"""

Time spent today:
${timeSpent || "Not specified"}

Blockers / asks:
${blockers || "None reported"}

Write a complete, send-ready email that:
- Opens with a warm, professional greeting using the client name when natural
- Highlights specific wins and deliverables (not generic summaries)
- Mentions time investment only when it adds context
- Surfaces blockers as clear asks with suggested next steps
- Closes with confidence and a concrete next touchpoint
- Signs off as ${senderName}
- Never signs as Linos and never mentions Linos, AI, or automated generation
- Sounds human-written, not like a bullet dump or AI template

Return ONLY valid JSON:
{
  "draft": "Full email with Subject: line at the top, then blank line, then body"
}`,
        32_000,
      );
      const parsed = parseJsonLoose(text);
      const draft = typeof parsed?.draft === "string" ? parsed.draft.trim() : text.trim();
      if (!draft) {
        return NextResponse.json(
          { error: "Could not parse email draft.", raw: text },
          { status: 422 },
        );
      }
      return NextResponse.json({ draft });
    }

    if (mode === "eod_weekly_digest") {
      const clientName = (body.clientName ?? "clients").trim();
      const logs = Array.isArray(body.logs) ? body.logs : [];
      const logText =
        logs.length > 0
          ? logs
              .map(
                (l, i) =>
                  `Day ${i + 1} (${l.date}):\nAccomplishments: ${l.accomplishments}\nTime: ${l.timeSpent}\nBlockers: ${l.blockers}`,
              )
              .join("\n\n")
          : "No EOD logs in the selected window.";
      const text = await callGeminiText(
        `Draft a weekly EOD digest on behalf of ${senderName}, the authenticated LifeNode OS account owner, to send internally or to ${clientName}.

Sender: ${senderName}
EOD logs (last 7 days):
"""
${logText.slice(0, 12000)}
"""

Write a polished weekly recap that:
- Opens with a one-line week theme tied to real work in the logs
- Groups wins by theme (delivery, ops, comms) with specific references
- Calls out patterns, risks, and carry-over items
- Ends with priorities for next week
- Ends with a brief sign-off from ${senderName}
- Never signs as Linos and never mentions Linos, AI, or automated generation
- Professional tone — executive briefing, not a truncated list

Return ONLY valid JSON:
{
  "draft": "Full digest text ready to paste into email or Slack"
}`,
        32_000,
      );
      const parsed = parseJsonLoose(text);
      const draft = typeof parsed?.draft === "string" ? parsed.draft.trim() : text.trim();
      if (!draft) {
        return NextResponse.json(
          { error: "Could not parse weekly digest.", raw: text },
          { status: 422 },
        );
      }
      return NextResponse.json({ draft });
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
