import {
  Code2,
  GraduationCap,
  HeartPulse,
  Palette,
  Scale,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ProRoleId } from "./types";

export type ProRoleConfig = {
  id: ProRoleId;
  label: string;
  nodeName: string;
  icon: LucideIcon;
  cases: string[];
  knowledgeSignals: string[];
  specialtyTitle: string;
  specialtyFeatures: { title: string; description: string }[];
  /** Integration Mapping Logic — hooks for connectors */
  integrationHooks: string[];
};

export const PRO_ROLES: ProRoleConfig[] = [
  {
    id: "legal",
    label: "Attorney",
    nodeName: "Legal Pro",
    icon: Scale,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Compliance & matter logic",
    specialtyFeatures: [
      { title: "Redline Ghost", description: "Flags draft text that contradicts agreed facts in the Auto-Timeline." },
      { title: "Clause Library", description: "Drag contract blocks into the editor with one click." },
    ],
    integrationHooks: ["Clio", "LexisNexis", "Gmail"],
  },
  {
    id: "medical",
    label: "Doctor",
    nodeName: "DoctorNode",
    icon: HeartPulse,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Healthcare",
    specialtyFeatures: [
      { title: "Ambient Scribing", description: "Auto-draft SOAP notes from visit audio (Subjective → Plan)." },
      { title: "Redline Ghost", description: "Flags prescriptions that contradict allergy history on file." },
    ],
    integrationHooks: ["Epic Systems", "MyChart", "Patient Portals"],
  },
  {
    id: "engineering",
    label: "Engineer",
    nodeName: "EngineerNode",
    icon: Wrench,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Technical / project",
    specialtyFeatures: [
      { title: "Dependency Watcher", description: "Permit-approved emails update the Connected Stack timeline." },
      { title: "Spec-Checker", description: "Compares drafts against Standard Codes in the Knowledge Hub." },
    ],
    integrationHooks: ["GitHub", "Jira", "AWS CloudWatch"],
  },
  {
    id: "teacher",
    label: "Teacher",
    nodeName: "TeacherNode",
    icon: GraduationCap,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Education",
    specialtyFeatures: [
      { title: "Curriculum Aligner", description: "Clause Library lesson plans map to state/national standards." },
      { title: "Student Pulse", description: "Summarizes parent emails and class notes into sentiment scores." },
    ],
    integrationHooks: ["Google Classroom", "Canvas", "ParentSquare"],
  },
  {
    id: "tech",
    label: "IT / Comp Eng",
    nodeName: "TechNode",
    icon: Code2,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "CompEng / IT",
    specialtyFeatures: [
      { title: "Deployment Ledger", description: "Timeline shows commits beside server outage events." },
      { title: "Architecture Auditor", description: "Redlines diagrams that violate security protocols in docs." },
      { title: "Cost Watcher", description: "Surfaces estimated cloud cost for active deploy/API surfaces." },
    ],
    integrationHooks: ["GitHub", "GitLab", "PagerDuty"],
  },
  {
    id: "coach",
    label: "Coach",
    nodeName: "CoachNode",
    icon: Sparkles,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Life / business coaching",
    specialtyFeatures: [
      { title: "Mindset Radar", description: "Analyzes client Slack/email tone (positive vs. frustrated)." },
      { title: "Reflection Prompts", description: "Auto-generates follow-up questions from session timeline." },
      { title: "Video Snapshot", description: "Timeline shows Zoom/Loom clip markers for important client moments." },
    ],
    integrationHooks: ["Zoom", "Loom", "Slack"],
  },
  {
    id: "designer",
    label: "Designer",
    nodeName: "DesignerNode",
    icon: Palette,
    cases: [],
    knowledgeSignals: [],
    specialtyTitle: "Creative / UX",
    specialtyFeatures: [
      { title: "Asset Pulse", description: "Timeline thumbnails for Figma/Canva edits." },
      { title: "Feedback Aggregator", description: "Groups comments from Slack, Gmail, and Figma into one to-do list." },
      {
        title: "Contrast / Accessibility Check",
        description: "Redline Ghost flags hex colors that fail WCAG AA with white text.",
      },
    ],
    integrationHooks: ["Figma API", "Adobe Creative Cloud", "Slack"],
  },
];

export function getRoleConfig(id: ProRoleId): ProRoleConfig {
  return PRO_ROLES.find((r) => r.id === id) ?? PRO_ROLES[0];
}
