import type { ClauseBlock, ProRoleId } from "./types";

export const CLAUSE_LIBRARY: ClauseBlock[] = [
  {
    id: "c-legal-1",
    role: "legal",
    title: "Indemnification (Standard)",
    category: "Contracts",
    body: "Party A shall indemnify and hold harmless Party B from claims arising out of...",
  },
  {
    id: "c-legal-2",
    role: "legal",
    title: "Termination for Convenience",
    category: "Contracts",
    body: "Either party may terminate upon thirty (30) days written notice...",
  },
  {
    id: "c-med-1",
    role: "medical",
    title: "SOAP — Assessment",
    category: "Clinical",
    body: "Assessment: Patient presents with... Differential includes... Plan follows guideline...",
  },
  {
    id: "c-med-2",
    role: "medical",
    title: "Prescription Safety Block",
    category: "Clinical",
    body: "Verify allergies and interactions before finalizing medication orders.",
  },
  {
    id: "c-eng-1",
    role: "engineering",
    title: "Permit Dependency Note",
    category: "Project",
    body: "Work shall not commence until Permit PX-___ is recorded in the project ledger.",
  },
  {
    id: "c-teach-1",
    role: "teacher",
    title: "Lesson Objective (CCSS)",
    category: "Curriculum",
    body: "Students will analyze how an author develops point of view (CCSS.ELA-LITERACY.RL.7.6).",
  },
  {
    id: "c-teach-2",
    role: "teacher",
    title: "Differentiation Block",
    category: "Curriculum",
    body: "Scaffold: visual model + pair share. Extension: cross-text comparison.",
  },
  {
    id: "c-teach-hw",
    role: "teacher",
    title: "Homework Assignment (Smart-Chain)",
    category: "Curriculum",
    body:
      "Homework: Independent practice aligned to today’s objective — short response (3–5 sentences) + two text evidence citations. Due: next class. Scaffold version: sentence stems provided.",
  },
  {
    id: "c-tech-1",
    role: "tech",
    title: "Deploy Checklist",
    category: "DevOps",
    body: "Pre-deploy: migrations, feature flags, rollback tag. Post-deploy: smoke tests, latency SLO.",
  },
  {
    id: "c-coach-1",
    role: "coach",
    title: "Session Reflection",
    category: "Coaching",
    body: "What felt in your control this week? What boundary would make next week 10% easier?",
  },
  {
    id: "c-design-1",
    role: "designer",
    title: "Design Critique Response",
    category: "UX",
    body: "Feedback incorporated: hierarchy, contrast ratio ≥ 4.5:1, primary CTA above fold.",
  },
  {
    id: "c-uni-1",
    role: "universal",
    title: "Next Action",
    category: "Universal",
    body: "Next action: [owner] by [date] — linked to timeline event.",
  },
];

export function clausesForRole(role: ProRoleId): ClauseBlock[] {
  return CLAUSE_LIBRARY.filter(
    (c) =>
      (c.role === role || c.role === "universal") &&
      c.id !== "c-teach-hw",
  );
}
