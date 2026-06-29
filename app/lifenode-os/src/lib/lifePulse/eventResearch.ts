/** Optional Tavily search for event dates, venues, and performers. */

export type EventResearchSnippet = {
  title: string;
  url: string;
  content: string;
};

export async function fetchEventResearchContext(input: {
  eventName?: string;
  city?: string;
  rawPrompt: string;
}): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return "";

  const queryParts = [
    input.eventName,
    input.city,
    input.rawPrompt.slice(0, 120),
    "event date time venue tickets performers",
  ].filter(Boolean);

  const query = queryParts.join(" ").slice(0, 240);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!res.ok) return "";

    const data = (await res.json()) as {
      answer?: string;
      results?: { title?: string; url?: string; content?: string }[];
    };

    const snippets: EventResearchSnippet[] = (data.results ?? [])
      .slice(0, 5)
      .map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 400),
      }))
      .filter((s) => s.title || s.content);

    if (!snippets.length && !data.answer) return "";

    const lines = [
      "EVENT RESEARCH (from ticket sites, blogs, and listings — verify before booking):",
      data.answer ? `Summary: ${data.answer}` : "",
      ...snippets.map(
        (s) => `- **${s.title}** (${s.url}): ${s.content}`,
      ),
    ].filter(Boolean);

    return lines.join("\n");
  } catch (e) {
    console.error("[eventResearch] Tavily failed:", e);
    return "";
  }
}
