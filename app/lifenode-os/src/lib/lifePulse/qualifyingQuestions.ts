import type { LifePulseCategoryId } from "./types";
import { detectStudySubject, parsePlanDurationDays } from "./planIntent";

export type QualifyingQuestion = {
  id: string;
  prompt: string;
  type: "choice" | "text" | "date";
  options?: { id: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  /** Allow selecting multiple options (stored comma-separated). */
  allowMultiple?: boolean;
};

/** Category-aware questions Linos asks before generating a tracker plan. */
export function getQualifyingQuestions(
  category: LifePulseCategoryId,
  rawPrompt: string,
): QualifyingQuestion[] {
  const p = rawPrompt.toLowerCase();

  switch (category) {
    case "study": {
      const subject = detectStudySubject(rawPrompt);
      const duration = parsePlanDurationDays(rawPrompt);
      const focusPrompt = subject
        ? `You asked for **${subject}**${duration ? ` over ${duration} days` : ""}. Which areas should we emphasize?`
        : "Which subject and areas should this study plan focus on?";

      const questions: QualifyingQuestion[] = [];

      if (!duration) {
        questions.push({
          id: "study_duration",
          prompt: "How many days should this study plan cover?",
          type: "choice",
          options: [
            { id: "7", label: "7 days" },
            { id: "14", label: "14 days" },
            { id: "20", label: "20 days" },
            { id: "30", label: "30 days" },
          ],
          required: true,
        });
      }

      if (!subject) {
        questions.push({
          id: "study_subject",
          prompt: "Which subject is this study plan for?",
          type: "choice",
          options: [
            { id: "math", label: "Mathematics" },
            { id: "english", label: "English" },
            { id: "physics", label: "Physics" },
            { id: "chemistry", label: "Chemistry" },
            { id: "economics", label: "Economics" },
            { id: "biology", label: "Biology" },
          ],
          required: true,
        });
      }

      questions.push(
        {
          id: "study_focus",
          prompt: focusPrompt,
          type: "choice",
          options: getStudyFocusOptions(subject ?? "General"),
          required: true,
        },
        {
          id: "study_level",
          prompt: "What is your current level?",
          type: "choice",
          options: [
            { id: "beginner", label: "Beginner" },
            { id: "intermediate", label: "Intermediate" },
            { id: "advanced", label: "Advanced" },
          ],
        },
      );

      return questions;
    }

    case "events": {
      const questions: QualifyingQuestion[] = [
        {
          id: "fly_from",
          prompt: "Where will you be flying from?",
          type: "text",
          placeholder: "e.g. Los Angeles, USA or Singapore",
          required: true,
        },
        {
          id: "accommodation_preference",
          prompt: "What is your preferred accommodation style?",
          type: "choice",
          options: [
            { id: "venue", label: "Venue hotel (e.g. Marriott Manila)" },
            { id: "nearby", label: "Affordable hotels nearby (Belmont / Savoy)" },
            { id: "airbnb", label: "Local Airbnb / stay with friends" },
          ],
          required: true,
        },
      ];
      if (!/\b(highlevel|philippines|conference|summit|event|gala|manila)\b/i.test(p)) {
        questions.unshift({
          id: "event_name",
          prompt: "Which event are you planning to attend?",
          type: "text",
          placeholder: "e.g. HighLevel Philippines, industry summit…",
          required: true,
        });
      }
      questions.push({
        id: "event_budget",
        prompt: "Total budget cap for travel + tickets (optional)",
        type: "text",
        placeholder: "e.g. $2,500 total",
      });
      return questions;
    }

    case "travel":
      return [
        {
          id: "destination",
          prompt: "Where would you like to travel?",
          type: "text",
          placeholder: "e.g. Manila, Italy, Switzerland",
          required: true,
        },
        {
          id: "travel_date",
          prompt: "When is your travel date?",
          type: "date",
          required: true,
        },
        {
          id: "fly_from",
          prompt: "Where will you be flying from?",
          type: "text",
          placeholder: "e.g. Los Angeles, USA or Singapore",
          required: true,
        },
        {
          id: "accommodation_preference",
          prompt: "What is your preferred accommodation style?",
          type: "choice",
          options: [
            { id: "venue", label: "Venue / central hotel (4-star)" },
            { id: "nearby", label: "Budget hotels nearby" },
            { id: "airbnb", label: "Airbnb / apartment" },
          ],
          required: true,
        },
        {
          id: "duration",
          prompt: "How long is the trip?",
          type: "choice",
          options: [
            { id: "3d", label: "3–5 days" },
            { id: "1w", label: "1 week" },
            { id: "2w", label: "2 weeks" },
          ],
          required: true,
        },
      ];

    case "skincare":
      return [
        {
          id: "skin_type",
          prompt: "What is your skin type?",
          type: "choice",
          options: [
            { id: "oily", label: "Oily" },
            { id: "dry", label: "Dry" },
            { id: "combination", label: "Combination" },
            { id: "sensitive", label: "Sensitive" },
          ],
          required: true,
        },
        {
          id: "skin_goal",
          prompt: "What is your main skin goal?",
          type: "text",
          placeholder: "e.g. smooth, even tone, reduce breakouts",
          required: true,
        },
        {
          id: "routine_window",
          prompt: "Preferred results timeline?",
          type: "choice",
          options: [
            { id: "15", label: "15 days" },
            { id: "30", label: "30 days" },
            { id: "60", label: "60+ days" },
          ],
        },
      ];

    case "life":
      return [
        {
          id: "life_goal",
          prompt: "What specific life goal would you like to achieve?",
          type: "text",
          placeholder:
            "e.g. automation specialist career, home & car in 10 years, healthy & slim",
          required: true,
        },
        {
          id: "life_horizon",
          prompt: "What timeline are you thinking?",
          type: "choice",
          options: [
            { id: "months", label: "A few months" },
            { id: "1y", label: "Within 1 year" },
            { id: "5y", label: "3–5 years" },
            { id: "10y", label: "10+ years" },
          ],
        },
      ];

    case "business_goals":
      return [
        {
          id: "business_idea",
          prompt: "What business do you have in mind?",
          type: "text",
          placeholder: "e.g. café, agency, e-commerce, SaaS",
          required: true,
        },
        {
          id: "business_budget",
          prompt: "How much budget can you invest to start?",
          type: "text",
          placeholder: "e.g. $5,000",
          required: true,
        },
      ];

    case "social_media":
      return [
        {
          id: "niche",
          prompt: "What niche are you creating content for?",
          type: "text",
          placeholder: "e.g. fitness, SaaS, beauty, finance",
          required: true,
        },
        {
          id: "audience",
          prompt: "Which demographic are you trying to influence?",
          type: "text",
          placeholder: "e.g. women 25–40, startup founders",
        },
        {
          id: "platform",
          prompt: "Primary platform?",
          type: "choice",
          options: [
            { id: "instagram", label: "Instagram" },
            { id: "tiktok", label: "TikTok" },
            { id: "linkedin", label: "LinkedIn" },
            { id: "youtube", label: "YouTube" },
            { id: "multi", label: "Multiple platforms" },
          ],
        },
      ];

    case "pets":
      return [
        {
          id: "pet_type",
          prompt: "What kind of pet(s) do you have? (select all that apply)",
          type: "choice",
          allowMultiple: true,
          options: [
            { id: "dog", label: "Dog" },
            { id: "cat", label: "Cat" },
            { id: "bird", label: "Bird" },
            { id: "other", label: "Other" },
          ],
          required: true,
        },
        {
          id: "pet_needs",
          prompt: "What do you need help with?",
          type: "choice",
          options: [
            { id: "vitamins", label: "Daily vitamins / medication reminders" },
            { id: "food", label: "Food & nutrition ideas" },
            { id: "both", label: "Reminders + food ideas" },
            {
              id: "vet",
              label: "Veterinary appointment (spay/neuter, vaccines, check-up, etc.)",
            },
          ],
          required: true,
        },
        {
          id: "pet_name",
          prompt: "Pet name (optional)",
          type: "text",
          placeholder: "e.g. Luna",
        },
      ];

    case "project_management":
      return [
        {
          id: "project_name",
          prompt: "What is this project called?",
          type: "text",
          placeholder: "e.g. Website launch Q3",
          required: true,
        },
        {
          id: "project_scope",
          prompt: "Briefly describe deliverables",
          type: "text",
          placeholder: "Key tasks or outcomes you need tracked",
        },
      ];

    default:
      if (/\b\d+\s*days?\b/.test(p) || category === "travel") {
        return [
          {
            id: "extra",
            prompt: "Anything else Linos should factor into your plan?",
            type: "text",
            placeholder: "Constraints, budget, preferences…",
          },
        ];
      }
      return [
        {
          id: "clarify",
          prompt: "Tell Linos one detail that will make this plan more useful:",
          type: "text",
          placeholder: "Timeline, budget, or priority…",
          required: true,
        },
      ];
  }
}

export function defaultTableColumns(
  category: LifePulseCategoryId,
): string[] {
  const map: Record<LifePulseCategoryId, string[]> = {
    study: ["Day", "Topic", "Lesson / Focus", "Status"],
    events: ["Item", "Event / Guest", "Budget", "Notes"],
    travel: ["Item", "Destination / Cost", "Amount", "Notes"],
    skincare: ["Step", "Product", "Routine", "Days"],
    life: ["Milestone", "Action", "Timeline", "Notes"],
    business_goals: ["Step", "Action", "Budget", "Timeline"],
    social_media: ["Day", "Content Idea", "Platform", "Best Time"],
    pets: ["Task", "Schedule", "Food / Care", "Notes"],
    project_management: ["Task", "Label", "Due", "Status", "Notes"],
  };
  return map[category] ?? ["Item", "Detail", "Notes"];
}

export function formatQualifyingAnswersForAi(
  answers: Record<string, string>,
): string {
  return Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function getStudyFocusOptions(subject: string): { id: string; label: string }[] {
  const s = subject.toLowerCase();
  if (s.includes("math")) {
    return [
      { id: "algebra", label: "Algebra & equations" },
      { id: "geometry", label: "Geometry & trigonometry" },
      { id: "calculus_prep", label: "Pre-calculus / calculus prep" },
      { id: "statistics", label: "Statistics & probability" },
      { id: "exam", label: "Exam prep (mixed topics)" },
    ];
  }
  if (s.includes("english")) {
    return [
      { id: "grammar", label: "Grammar & sentence structure" },
      { id: "idioms", label: "Idiomatic phrases & vocabulary" },
      { id: "writing", label: "Writing & essays" },
      { id: "speaking", label: "Speaking & pronunciation" },
      { id: "reading", label: "Reading comprehension" },
    ];
  }
  if (s.includes("physics")) {
    return [
      { id: "mechanics", label: "Mechanics & forces" },
      { id: "energy", label: "Energy & waves" },
      { id: "electricity", label: "Electricity & magnetism intro" },
      { id: "exam", label: "Exam review (mixed)" },
    ];
  }
  if (s.includes("economics")) {
    return [
      { id: "micro", label: "Microeconomics" },
      { id: "macro", label: "Macroeconomics" },
      { id: "graphs", label: "Supply, demand & graphs" },
      { id: "exam", label: "Exam prep" },
    ];
  }
  return [
    { id: "fundamentals", label: "Core fundamentals" },
    { id: "practice", label: "Practice problems" },
    { id: "exam", label: "Exam / test preparation" },
    { id: "projects", label: "Project-based learning" },
  ];
}
