/** Mindful Health Architect — concierge copy from vitals + symptoms (client-side). */

export type ArchitectContext = {
  resilience: number;
  readiness: number;
  recentSymptoms: { label: string; at: string }[];
  prompt: string;
  flareActive?: boolean;
};

function symptomSnippet(logs: ArchitectContext["recentSymptoms"]): string {
  if (!logs.length) return "no recent symptom logs";
  const labels = logs.slice(0, 3).map((s) => s.label.replace(/^[\p{Emoji}\s]+/u, "").trim() || s.label);
  return labels.join(", ");
}

export function generateHealthArchitectGuidance(ctx: ArchitectContext): string {
  const { resilience, readiness, recentSymptoms, prompt, flareActive } = ctx;
  const symptoms = symptomSnippet(recentSymptoms);
  const lowRes = resilience < 55;
  const midRes = resilience >= 55 && resilience < 80;

  let opening: string;
  if (flareActive) {
    opening = `I see you're in **recovery protocol** with resilience at **${resilience}%** and readiness **${readiness}/100**.`;
  } else if (lowRes) {
    opening = `Given your **${resilience}% resilience** score and ${symptoms}, I'm pacing today's guidance conservatively.`;
  } else if (midRes) {
    opening = `Your resilience sits at **${resilience}%** with readiness **${readiness}/100** — solid, but not a "empty the tank" day.`;
  } else {
    opening = `You're showing **${resilience}% resilience** and **${readiness}/100** readiness — a strong window for intentional work.`;
  }

  const p = prompt.toLowerCase();
  let body: string;

  if (p.includes("hypertrophy") || p.includes("plan")) {
    body = lowRes
      ? `---

### Your tailored hypertrophy pivot

Instead of a maximal-volume block, we're using **low-volume, high-intensity** work (2–3 hard sets per pattern) so you don't crash tomorrow. Keep rest intervals honest (2–3 min on compounds).

**This week:** 3 sessions, full-body emphasis, stop 1–2 reps shy of failure on accessories. Pair with 7–8h sleep and steady hydration — your logs suggest your system is already carrying load.`
      : `---

### Your hypertrophy roadmap

We'll run a **4-week progressive block**: week 1 establishes movement quality; weeks 2–3 add sets or load; week 4 deloads at ~60% volume.

**Split suggestion:** upper / lower / full, with one optional conditioning day only if readiness stays above 70.`;
  } else if (p.includes("blood") || p.includes("lab")) {
    body = `---

### Lab & biomarker framing

Bring any PDFs into **Vitals Vault** so we can track trends — single numbers matter less than direction over 6–12 months.

**For your question:** focus on the markers your clinician flagged; use plain-language summaries here for education only, not diagnosis.`;
  } else if (p.includes("magnesium") || p.includes("sleep")) {
    body = `---

### Sleep & magnesium note

**Magnesium threonate** is often discussed for sleep latency and cognitive calm — evidence is mixed but generally favorable for some users.

**Practical stack:** consistent bedtime, dim light after 8 PM, and avoid heavy Kitchen meals within 3h of bed — your symptom history (${symptoms}) is what we'll keep watching.`;
  } else {
    body = `---

### Guidance for your request

**"${ctx.prompt.trim().slice(0, 120)}${ctx.prompt.length > 120 ? "…" : ""}"**

I've weighted this answer against today's vitals. If symptoms worsen, favor recovery over optimization — and loop your care team in for anything acute.`;
  }

  return `${opening}\n\n${body}\n\n---\n\n*This is educational coaching, not medical advice. Adjust with your clinician when in doubt.*`;
}
