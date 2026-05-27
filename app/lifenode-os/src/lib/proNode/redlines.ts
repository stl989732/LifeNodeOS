import type { ProRoleId, RedlineIssue, TimelineEvent } from "./types";
import { contrastRatio, whiteTextFailsWcagAaOnBackground } from "./wcagContrast";

export function getDraftForRole(_role: ProRoleId): string {
  return "";
}

export function detectRedlines(
  role: ProRoleId,
  timeline: TimelineEvent[],
  draftText = "",
): RedlineIssue[] {
  const issues: RedlineIssue[] = [];

  if (role === "legal") {
    const cap = timeline.find((e) => e.fact?.includes("$42,000"));
    if (cap) {
      issues.push({
        id: "rl-legal-1",
        phrase: "$48,000",
        reason: `Contradicts timeline fact: "${cap.fact}" (${cap.title})`,
        timelineRef: cap.id,
        severity: "high",
      });
    }
  }

  if (role === "medical") {
    const allergy = timeline.find((e) => e.fact?.toLowerCase().includes("penicillin"));
    if (allergy) {
      issues.push({
        id: "rl-med-1",
        phrase: "amoxicillin",
        reason: `Contradicts allergy on file (${allergy.fact})`,
        timelineRef: allergy.id,
        severity: "high",
      });
    }
  }

  if (role === "engineering") {
    const permit = timeline.find((e) => e.fact?.includes("Permit"));
    if (permit) {
      issues.push({
        id: "rl-eng-1",
        phrase: "Permit status: pending",
        reason: `Timeline shows ${permit.fact}`,
        timelineRef: permit.id,
        severity: "medium",
      });
    }
  }

  if (role === "tech") {
    issues.push({
      id: "rl-tech-1",
      phrase: "bypass MFA",
      reason: "Violates security protocol: MFA required on all external routes (project docs).",
      timelineRef: "docs-security",
      severity: "high",
    });
  }

  if (role === "designer") {
    for (const m of draftText.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const phrase = m[0];
      const normalized = `#${m[1]}`.toUpperCase();
      if (whiteTextFailsWcagAaOnBackground(normalized)) {
        const ratio = contrastRatio("#FFFFFF", normalized);
        const rStr = ratio != null ? ratio.toFixed(2) : "?";
        issues.push({
          id: `rl-design-a11y-${normalized}`,
          phrase,
          reason: `Warning: White text on ${normalized} is ~${rStr}:1 — WCAG AA normal text requires ≥4.5:1.`,
          timelineRef: "contrast-check",
          severity: "medium",
        });
      }
    }
  }

  return issues;
}

export function applyRedlineHighlights(text: string, issues: RedlineIssue[]): string {
  let out = text;
  for (const issue of issues) {
    out = out.replace(
      issue.phrase,
      `⟦${issue.phrase}⟧`,
    );
  }
  return out;
}
