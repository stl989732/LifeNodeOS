import { defaultTableColumns } from "./qualifyingQuestions";
import { appendTravelTotalRow } from "./travelTotals";
import { newTableRowId } from "./tableRows";
import type { LifePulseCategoryId } from "./types";
import type { PlanIntent } from "./planIntent";
import { effectivePlanDays, resolveTargetPlanDays } from "./planIntent";
import { formatTravelDateRange } from "./travelDates";
import {
  estimateRoundTripFlights,
  estimateNightlyHotel,
  estimateEventTicket,
  estimateDailyMeals,
  parseLodgingStyle,
} from "./travelEventEstimates";

export type PlanTableRow = {
  id: string;
  cells: Record<string, string>;
  label?: string;
};

function isGenericBoilerplate(text: string): boolean {
  return /north-star|focused sprints|small win in the next 24 hours|target date when you'?re ready/i.test(
    text,
  );
}

export function rowsLookGeneric(rows: PlanTableRow[]): boolean {
  if (!rows.length) return true;
  const sample = rows
    .slice(0, 4)
    .map((r) => Object.values(r.cells).join(" "))
    .join(" ");
  return isGenericBoilerplate(sample);
}

const MATH_CURRICULUM: { topic: string; lesson: string }[] = [
  { topic: "Number systems & integers", lesson: "Order of operations, factors, primes" },
  { topic: "Algebra foundations", lesson: "Variables, expressions, simplifying" },
  { topic: "Linear equations", lesson: "One-variable equations & word problems" },
  { topic: "Inequalities", lesson: "Graphing on a number line" },
  { topic: "Polynomials", lesson: "Add, subtract, multiply polynomials" },
  { topic: "Factoring", lesson: "GCF, trinomials, difference of squares" },
  { topic: "Quadratic equations", lesson: "Factoring, formula, completing square" },
  { topic: "Functions", lesson: "Domain, range, function notation" },
  { topic: "Linear functions", lesson: "Slope-intercept form & graphing" },
  { topic: "Systems of equations", lesson: "Substitution & elimination" },
  { topic: "Exponents & radicals", lesson: "Rules of exponents, simplify radicals" },
  { topic: "Rational expressions", lesson: "Simplify and solve rational equations" },
  { topic: "Geometry: angles", lesson: "Parallel lines, triangle angle sums" },
  { topic: "Geometry: triangles", lesson: "Congruence, similarity, Pythagorean theorem" },
  { topic: "Circles", lesson: "Arc length, area, sector formulas" },
  { topic: "Coordinate geometry", lesson: "Distance, midpoint, slope applications" },
  { topic: "Trigonometry intro", lesson: "SOH-CAH-TOA, unit circle basics" },
  { topic: "Statistics", lesson: "Mean, median, mode, standard deviation" },
  { topic: "Probability", lesson: "Independent events, combinations intro" },
  { topic: "Review & practice test", lesson: "Mixed problem set + error log" },
];

const ENGLISH_CURRICULUM: { topic: string; lesson: string }[] = [
  { topic: "Grammar: parts of speech", lesson: "Nouns, verbs, adjectives review" },
  { topic: "Subject–verb agreement", lesson: "Rules + common errors" },
  { topic: "Tenses overview", lesson: "Present, past, future — when to use each" },
  { topic: "Sentence structure", lesson: "Simple, compound, complex sentences" },
  { topic: "Punctuation", lesson: "Commas, semicolons, apostrophes" },
  { topic: "Vocabulary building", lesson: "Root words, prefixes, 20 new words" },
  { topic: "Reading comprehension", lesson: "Skim, scan, annotate a short article" },
  { topic: "Idioms & phrasal verbs", lesson: "10 idioms in context sentences" },
  { topic: "Formal writing", lesson: "Paragraph structure & thesis statement" },
  { topic: "Essay planning", lesson: "Outline intro/body/conclusion" },
  { topic: "Listening practice", lesson: "Podcast clip + summary (15 min)" },
  { topic: "Speaking clarity", lesson: "Record 2-min answer to a prompt" },
  { topic: "Pronunciation", lesson: "Stress patterns & intonation drill" },
  { topic: "Email writing", lesson: "Professional tone & clarity" },
  { topic: "Review & mock quiz", lesson: "Self-test grammar + writing" },
];

function pickCurriculum(subject: string): { topic: string; lesson: string }[] {
  const s = subject.toLowerCase();
  if (s.includes("math")) return MATH_CURRICULUM;
  if (s.includes("english")) return ENGLISH_CURRICULUM;
  if (s.includes("physics")) {
    return [
      { topic: "Kinematics", lesson: "Displacement, velocity, acceleration" },
      { topic: "Forces & Newton's laws", lesson: "Free-body diagrams" },
      { topic: "Work & energy", lesson: "Conservation of energy problems" },
      { topic: "Momentum", lesson: "Collisions & impulse problems" },
      { topic: "Rotational motion", lesson: "Torque and angular velocity intro" },
      { topic: "Waves", lesson: "Frequency, wavelength, interference" },
      { topic: "Sound & light", lesson: "Reflection, refraction, Doppler effect" },
      { topic: "Electricity intro", lesson: "Ohm's law, series/parallel circuits" },
      { topic: "Magnetism", lesson: "Fields, motors, generators overview" },
      { topic: "Thermodynamics", lesson: "Heat transfer, specific heat problems" },
      { topic: "Fluids", lesson: "Pressure, buoyancy, Bernoulli intro" },
      { topic: "Modern physics intro", lesson: "Photoelectric effect, nuclear basics" },
      { topic: "Lab skills", lesson: "Graphing data, uncertainty, units" },
      { topic: "Problem-solving drill", lesson: "Mixed mechanics set (20 questions)" },
      { topic: "Mock exam", lesson: "Timed section + error log" },
    ];
  }
  if (s.includes("economics")) {
    return [
      { topic: "Scarcity & choice", lesson: "Opportunity cost examples" },
      { topic: "Supply & demand", lesson: "Shifts vs movement along curve" },
      { topic: "Elasticity", lesson: "Price elasticity calculations" },
      { topic: "Consumer theory", lesson: "Utility, indifference curves intro" },
      { topic: "Production & costs", lesson: "Fixed vs variable cost graphs" },
      { topic: "Market structures", lesson: "Perfect competition vs monopoly" },
      { topic: "Labor markets", lesson: "Wages, minimum wage debate case study" },
      { topic: "Market failure", lesson: "Externalities, public goods" },
      { topic: "GDP & indicators", lesson: "Read a simple economic report" },
      { topic: "Inflation & unemployment", lesson: "Phillips curve overview" },
      { topic: "Fiscal policy", lesson: "Government spending & taxation effects" },
      { topic: "Monetary policy", lesson: "Interest rates, central bank tools" },
      { topic: "International trade", lesson: "Comparative advantage, tariffs" },
      { topic: "Exchange rates", lesson: "Forex basics & balance of payments" },
      { topic: "Development economics", lesson: "Growth vs inequality metrics" },
      { topic: "Data interpretation", lesson: "Charts from FRED or textbook" },
      { topic: "Essay practice", lesson: "Outline a 25-mark economics essay" },
      { topic: "Review & practice test", lesson: "Mixed micro + macro questions" },
    ];
  }
  if (s.includes("chemistry")) {
    return [
      { topic: "Atomic structure", lesson: "Protons, neutrons, electrons, isotopes" },
      { topic: "Periodic trends", lesson: "Electronegativity, ionization energy" },
      { topic: "Chemical bonding", lesson: "Ionic, covalent, metallic bonds" },
      { topic: "Stoichiometry", lesson: "Mole calculations & balancing equations" },
      { topic: "Solutions", lesson: "Molarity, dilution problems" },
      { topic: "Acids & bases", lesson: "pH scale, neutralization" },
      { topic: "Thermochemistry", lesson: "Enthalpy, calorimetry intro" },
      { topic: "Reaction rates", lesson: "Factors affecting rate, collision theory" },
      { topic: "Equilibrium", lesson: "Le Chatelier's principle" },
      { topic: "Organic intro", lesson: "Hydrocarbons, functional groups" },
      { topic: "Lab safety & technique", lesson: "Read lab manual section" },
      { topic: "Practice test", lesson: "Mixed problems + error log" },
    ];
  }
  if (s.includes("biology")) {
    return [
      { topic: "Cell structure", lesson: "Organelles and their functions" },
      { topic: "Membranes & transport", lesson: "Diffusion, osmosis, active transport" },
      { topic: "Enzymes", lesson: "Lock-and-key, factors affecting activity" },
      { topic: "Photosynthesis", lesson: "Light-dependent & Calvin cycle overview" },
      { topic: "Cellular respiration", lesson: "Glycolysis, Krebs, electron transport" },
      { topic: "DNA & replication", lesson: "Base pairing, semi-conservative model" },
      { topic: "Protein synthesis", lesson: "Transcription & translation" },
      { topic: "Genetics", lesson: "Punnett squares, Mendelian inheritance" },
      { topic: "Evolution", lesson: "Natural selection, evidence for evolution" },
      { topic: "Ecology", lesson: "Food webs, energy pyramids" },
      { topic: "Human systems", lesson: "Pick one: circulatory or nervous system" },
      { topic: "Review & practice", lesson: "Past-paper style questions" },
    ];
  }
  return [
    { topic: "Core concepts", lesson: "Read textbook chapter + notes" },
    { topic: "Active recall", lesson: "Flashcards without looking at notes" },
    { topic: "Practice problems", lesson: "20 questions, check solutions" },
    { topic: "Teach-back", lesson: "Explain topic aloud in 5 minutes" },
    { topic: "Spaced review", lesson: "Revisit hardest items from prior days" },
  ];
}

export function buildStudyPlanRows(
  intent: PlanIntent,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("study");
  const days = effectivePlanDays(intent, "study");
  const level =
    Object.values(qualifyingAnswers ?? {})
      .join(" ")
      .match(/beginner|intermediate|advanced/i)?.[0] ?? "intermediate";
  const subject =
    intent.studySubject ??
    (answerText(qualifyingAnswers, "study_topic") ||
      detectSubjectFromAnswers(qualifyingAnswers) ||
      "General Studies");

  const curriculum = pickCurriculum(subject);
  const knownCurriculum =
    subject !== "General Studies" &&
    /mathematics|english|physics|chemistry|biology|economics/i.test(subject);
  if (!knownCurriculum) {
    return buildCustomStudyPlanRows(subject, days, level);
  }

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const block = curriculum[(d - 1) % curriculum.length];
    const cells: Record<string, string> = {
      Day: String(d),
      Topic: `${subject}: ${block.topic}`,
      "Lesson / Focus": `${block.lesson} (${level} — 45–60 min study block)`,
      Status: d === 1 ? "Start today" : "Planned",
    };
    rows.push({ id: newTableRowId(), cells });
  }

  return { table_columns: columns, table_rows: rows };
}

function detectSubjectFromAnswers(answers?: Record<string, string>): string | null {
  if (!answers) return null;
  const topic = answers.study_topic?.trim();
  if (topic) return topic;
  const text = Object.values(answers).join(" ");
  if (/\bmath/i.test(text)) return "Mathematics";
  if (/\benglish|grammar|idiom/i.test(text)) return "English";
  if (/\bphysics/i.test(text)) return "Physics";
  if (/\bchemistry|\bchem\b/i.test(text)) return "Chemistry";
  if (/\bbiology|\bbio\b/i.test(text)) return "Biology";
  if (/\beconomics?/i.test(text)) return "Economics";
  return null;
}

export function buildCustomStudyPlanRows(
  topic: string,
  days: number,
  level: string,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("study");
  const phases = [
    { topic: "Foundations", lesson: `Core concepts of ${topic} — vocabulary, frameworks, key definitions` },
    { topic: "Deep dive", lesson: `Applied ${topic} — case studies, worked examples, industry context` },
    { topic: "Practice", lesson: `Hands-on exercises and problem sets for ${topic}` },
    { topic: "Synthesis", lesson: `Connect ideas — mind map or teach-back session` },
    { topic: "Assessment", lesson: `Self-quiz or mini-project demonstrating ${topic} skills` },
    { topic: "Review", lesson: "Spaced repetition of weakest areas" },
  ];
  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const block = phases[(d - 1) % phases.length];
    rows.push({
      id: newTableRowId(),
      cells: {
        Day: String(d),
        Topic: `${topic}: ${block.topic}`,
        "Lesson / Focus": `${block.lesson} (${level} — 45–60 min)`,
        Status: d === 1 ? "Start today" : "Planned",
      },
    });
  }
  return { table_columns: columns, table_rows: rows };
}

export function buildSkincarePlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("skincare");
  const days = effectivePlanDays(intent, "skincare");
  const skinType = extractAnswer(qualifyingAnswers, /skin type|oily|dry|combination|sensitive/i) ?? "combination";
  const goal = rawPrompt.trim() || "Healthier, clearer skin";

  const amRoutine =
    skinType === "oily"
      ? "Gel cleanser → niacinamide serum → oil-free moisturizer → SPF 30+"
      : skinType === "dry"
        ? "Cream cleanser → hyaluronic serum → rich moisturizer → SPF 30+"
        : "Gentle cleanser → niacinamide → lightweight moisturizer → SPF 30+";

  const pmRoutine =
    skinType === "oily"
      ? "Double cleanse → BHA (2×/week) → niacinamide → gel moisturizer"
      : "Cream cleanse → gentle retinol (2×/week) → ceramide moisturizer";

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const isBha = d % 3 === 0 && skinType === "oily";
    const isRetinol = d % 4 === 0 && skinType !== "oily";
    rows.push({
      id: newTableRowId(),
      cells: {
        Step: String(d),
        Product: isBha
          ? "Salicylic acid (BHA) — patch test first"
          : isRetinol
            ? "Retinol night — pea-sized amount"
            : d <= 7
              ? "Niacinamide 10% serum"
              : "Maintain core actives",
        Routine: d % 2 === 1 ? `AM: ${amRoutine}` : `PM: ${pmRoutine}`,
        Days: `Day ${d} — consult a dermatologist for persistent breakouts`,
      },
    });
  }

  const introNote = `Goal: ${goal}. Skin type: ${skinType}. Always patch-test new products.`;

  return {
    table_columns: columns,
    table_rows: rows.length ? rows : [{
      id: newTableRowId(),
      cells: { Step: "1", Product: "See dermatologist", Routine: introNote, Days: "ASAP" },
    }],
  };
}

function extractAnswer(
  answers: Record<string, string> | undefined,
  pattern: RegExp,
): string | null {
  if (!answers) return null;
  for (const v of Object.values(answers)) {
    const m = v.match(pattern);
    if (m) return v;
    if (/oily/i.test(v)) return "oily";
    if (/dry/i.test(v)) return "dry";
    if (/combination/i.test(v)) return "combination";
  }
  return null;
}

const SOCIAL_CONTENT_IDEAS: {
  topic: string;
  idea: string;
  platform: string;
  time: string;
}[] = [
  { topic: "Intro to niche", idea: "Hook post: problem you solve in 30 seconds", platform: "Primary", time: "9–11 AM" },
  { topic: "Time-saving tip", idea: "Carousel: 3 workflows that save 1+ hour/day", platform: "Primary", time: "12–1 PM" },
  { topic: "Tool comparison", idea: "Zapier vs IFTTT — when to use each", platform: "Primary", time: "5–7 PM" },
  { topic: "Case study", idea: "Before/after automation for a small business", platform: "Primary", time: "9–11 AM" },
  { topic: "Personal finance", idea: "Automate bills & savings — app walkthrough", platform: "Primary", time: "12–1 PM" },
  { topic: "Smart home", idea: "Photo reel: one routine that runs on schedule", platform: "Primary", time: "7–9 PM" },
  { topic: "Myth busting", idea: "3 myths about automation — debunk with examples", platform: "Primary", time: "9–11 AM" },
  { topic: "AI vs automation", idea: "Short explainer: different jobs, same stack", platform: "Primary", time: "5–7 PM" },
  { topic: "Tutorial", idea: "Screen recording: build one simple workflow", platform: "Primary", time: "12–1 PM" },
  { topic: "Poll / engagement", idea: "Ask audience their biggest time-waster", platform: "Primary", time: "7–9 PM" },
  { topic: "User story", idea: "Quote + result metric from a follower/DM", platform: "Primary", time: "9–11 AM" },
  { topic: "Checklist", idea: "PDF-style post: weekly automation audit", platform: "Primary", time: "5–7 PM" },
  { topic: "Trend tie-in", idea: "Relate a trending topic to your niche", platform: "Primary", time: "12–1 PM" },
  { topic: "Behind the scenes", idea: "Your setup, desk, or stack screenshot", platform: "Primary", time: "7–9 PM" },
  { topic: "FAQ", idea: "Answer top 3 DMs you receive", platform: "Primary", time: "9–11 AM" },
  { topic: "Resource list", idea: "5 free tools + links in comments", platform: "Primary", time: "5–7 PM" },
  { topic: "Challenge", idea: "7-day mini-challenge announcement", platform: "Primary", time: "12–1 PM" },
  { topic: "Collaboration", idea: "Tag a creator for a joint tip swap", platform: "Primary", time: "7–9 PM" },
  { topic: "Stats / data", idea: "One surprising stat + your take", platform: "Primary", time: "9–11 AM" },
  { topic: "Live prep", idea: "Tease upcoming live/Q&A topic", platform: "Primary", time: "5–7 PM" },
  { topic: "Recap", idea: "Week in review: best post + lesson learned", platform: "Primary", time: "12–1 PM" },
  { topic: "Offer / CTA", idea: "Soft CTA: newsletter, lead magnet, or consult", platform: "Primary", time: "7–9 PM" },
  { topic: "Repurpose", idea: "Turn top post into Reel/Short script", platform: "Reels/Shorts", time: "6–8 PM" },
  { topic: "Community", idea: "Share group wins or member spotlight", platform: "Primary", time: "9–11 AM" },
  { topic: "Seasonal", idea: "Tie content to holiday or season", platform: "Primary", time: "5–7 PM" },
  { topic: "Controversial take", idea: "Respectful hot take + invite discussion", platform: "Primary", time: "12–1 PM" },
  { topic: "Template", idea: "Notion/Google Sheet template preview", platform: "Primary", time: "7–9 PM" },
  { topic: "Metrics", idea: "What you track weekly (reach, saves, leads)", platform: "Primary", time: "9–11 AM" },
  { topic: "Planning", idea: "Batch content for next week — outline", platform: "Primary", time: "5–7 PM" },
  { topic: "Celebrate", idea: "Milestone post + thank audience", platform: "Primary", time: "12–1 PM" },
];

const ITALY_TRAVEL_DAYS: { item: string; dest: string; cost: string; notes: string }[] = [
  { item: "Day 1", dest: "Rome — Arrival", cost: "€150", notes: "Pantheon, Trevi, Spanish Steps; verify flights on Google Flights / Expedia" },
  { item: "Day 2", dest: "Rome — Colosseum & Vatican", cost: "€180", notes: "Book skip-the-line tickets; hotel ~€90–140/night on Hotels.com" },
  { item: "Day 3", dest: "Train to Florence", cost: "€160", notes: "High-speed train €40–70; Uffizi timed entry" },
  { item: "Day 4", dest: "Florence — Duomo & Accademia", cost: "€140", notes: "Climb Duomo; sunset at Piazzale Michelangelo" },
  { item: "Day 5", dest: "Train to Venice", cost: "€190", notes: "St. Mark's, Doge's Palace; check Trip.com packages" },
  { item: "Day 6", dest: "Venice — Islands", cost: "€170", notes: "Murano & Burano day trip; vaporetto pass" },
  { item: "Day 7", dest: "Venice — Departure", cost: "€100", notes: "Buffer for airport transfer & souvenirs" },
];

function answerText(answers?: Record<string, string>, key?: string): string {
  if (!answers) return "";
  if (key && answers[key]) return answers[key];
  return Object.values(answers).join(" ");
}

export function buildTravelPlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("travel");
  const days = effectivePlanDays(intent, "travel");
  const destination =
    answerText(qualifyingAnswers, "destination") ||
    rawPrompt.match(/\b(italy|switzerland|japan|france|spain|thailand)\b/i)?.[0] ||
    "your destination";
  const travelDate = formatTravelDateRange(qualifyingAnswers);
  const dateNote = travelDate;
  const origin = answerText(qualifyingAnswers, "fly_from") || "your origin";
  const lodging = parseLodgingStyle(
    answerText(qualifyingAnswers, "accommodation_preference"),
  );
  const destText = `${destination} ${rawPrompt}`;
  const flights = estimateRoundTripFlights(origin, destText);
  const nightly = estimateNightlyHotel(lodging, destText);
  const meals = estimateDailyMeals();

  const template = /italy/i.test(destText) ? ITALY_TRAVEL_DAYS : null;

  const itineraryLabels = [
    "Book flights",
    "Reserve lodging",
    "Arrival & local transit",
    "Sightseeing block A",
    "Sightseeing block B",
    "Food & experiences",
    "Buffer / departure",
  ];

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    if (template && d <= template.length) {
      const t = template[d - 1];
      const amount = d === 1 ? flights : d === 2 ? nightly : t.cost;
      rows.push({
        id: newTableRowId(),
        cells: {
          Item: t.item,
          "Destination / Cost": `${t.dest} — ${t.cost}`,
          Amount: amount,
          Notes: `${dateNote}${t.notes} Verify on Expedia & Hotels.com.`,
        },
      });
      continue;
    }

    const label = itineraryLabels[(d - 1) % itineraryLabels.length];
    let amount = meals;
    let destLine = `${destination} — ${label}`;
    if (d === 1) {
      amount = flights;
      destLine = `${origin} → ${destination} (round-trip flights)`;
    } else if (d === 2) {
      amount = nightly;
      destLine = `${destination} — ${nightly}`;
    } else if (d === 3) {
      amount = "$25–$60 USD (airport transfer / Grab)";
    }

    rows.push({
      id: newTableRowId(),
      cells: {
        Item: `Day ${d}`,
        "Destination / Cost": destLine,
        Amount: amount,
        Notes: `${dateNote}From ${origin}. Confirm live prices on Expedia, Hotels.com, or Google Flights.`,
      },
    });
  }

  return {
    table_columns: columns,
    table_rows: appendTravelTotalRow(rows, columns),
  };
}

export function buildSocialMediaPlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("social_media");
  const days = effectivePlanDays(intent, "social_media");
  const niche =
    answerText(qualifyingAnswers, "niche") || rawPrompt.slice(0, 40) || "your niche";
  const platform =
    answerText(qualifyingAnswers, "platform").match(/instagram|tiktok|linkedin|youtube|facebook/i)?.[0] ??
    "Facebook";

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const block = SOCIAL_CONTENT_IDEAS[(d - 1) % SOCIAL_CONTENT_IDEAS.length];
    rows.push({
      id: newTableRowId(),
      cells: {
        Day: String(d),
        "Content Idea": `${block.idea} (${niche})`,
        Platform: platform,
        "Best Time": block.time,
      },
    });
  }

  return { table_columns: columns, table_rows: rows };
}

export function buildLifePlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("life");
  const days = effectivePlanDays(intent, "life");
  const goal = answerText(qualifyingAnswers, "life_goal") || rawPrompt.slice(0, 80);

  const milestones: { milestone: string; action: string; timeline: string }[] = [
    { milestone: "Clarify outcome", action: `Write one sentence: "${goal}"`, timeline: "Day 1" },
    { milestone: "Financial snapshot", action: "Net worth, income, expenses spreadsheet", timeline: "Day 2" },
    { milestone: "Budget & savings", action: "Set monthly savings target; cut 1–2 expenses", timeline: "Day 3" },
    { milestone: "Credit & debt", action: "Pull credit reports; list debts & rates", timeline: "Day 4" },
    { milestone: "Down payment plan", action: "Research % needed; set savings sub-account", timeline: "Day 5" },
    { milestone: "Skills / career", action: "List 3 skills or certs toward your goal", timeline: "Day 6" },
    { milestone: "5-year timeline", action: "Draft milestones by year on one page", timeline: "Day 7" },
    { milestone: "Weekly habit", action: "Block 2× 30 min/week for goal work", timeline: "Ongoing" },
    { milestone: "Accountability", action: "Tell one person or join a community", timeline: "Week 2" },
    { milestone: "Review", action: "Monthly check-in: progress vs timeline", timeline: "Monthly" },
  ];

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const m = milestones[(d - 1) % milestones.length];
    rows.push({
      id: newTableRowId(),
      cells: {
        Milestone: m.milestone,
        Action: m.action,
        Timeline: d <= 7 ? `Day ${d}` : m.timeline,
        Notes: d === 1 ? "Start today" : "",
      },
    });
  }

  return { table_columns: columns, table_rows: rows };
}

export function buildEventsPlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("events");
  const days = effectivePlanDays(intent, "events");
  const eventName = answerText(qualifyingAnswers, "event_name") || rawPrompt.slice(0, 60);
  const origin = answerText(qualifyingAnswers, "fly_from") || "your origin";
  const lodging = parseLodgingStyle(
    answerText(qualifyingAnswers, "accommodation_preference"),
  );
  const destText = `${eventName} ${rawPrompt}`;
  const flights = estimateRoundTripFlights(origin, destText);
  const nightly = estimateNightlyHotel(lodging, destText);
  const ticket = estimateEventTicket(eventName);
  const meals = estimateDailyMeals();

  const steps: { item: string; detail: string; budget: string }[] = [
    { item: "Research event", detail: `Confirm dates, venue & agenda: ${eventName}`, budget: "$0" },
    { item: "Book flights", detail: `${origin} → event city`, budget: flights },
    { item: "Reserve hotel", detail: lodging === "venue" ? "Venue / conference hotel" : lodging === "nearby" ? "Belmont / Savoy area" : "Airbnb or local stay", budget: nightly },
    { item: "Event ticket", detail: "Official registration or tier", budget: ticket },
    { item: "Local transport", detail: "Airport ↔ hotel ↔ venue (Grab/taxi)", budget: "$40–$90 USD" },
    { item: "Meals & networking", detail: "Per diem during event days", budget: meals },
    { item: "Attend & follow-up", detail: "Sessions, contacts, action items", budget: "$0" },
  ];

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    const s = steps[(d - 1) % steps.length];
    rows.push({
      id: newTableRowId(),
      cells: {
        Item: `Step ${d}`,
        "Event / Guest": s.detail,
        Budget: s.budget,
        Notes: d === 1 ? "Start research" : "",
      },
    });
  }

  return { table_columns: columns, table_rows: rows };
}

export function buildPetsPlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("pets");
  const days = effectivePlanDays(intent, "pets");
  const petTypes = answerText(qualifyingAnswers, "pet_type") || "pet";
  const petName = answerText(qualifyingAnswers, "pet_name") || "your pet";
  const needs = answerText(qualifyingAnswers, "pet_needs").toLowerCase();
  const isVet = /vet|vaccine|spay|neuter|check-up/i.test(needs);
  const vetAppt =
    qualifyingAnswers?.vet_appointment_date?.trim() ||
    answerText(qualifyingAnswers, "vet_appointment_date");
  const medStart =
    qualifyingAnswers?.med_schedule_start?.trim() ||
    answerText(qualifyingAnswers, "med_schedule_start");
  const medFreq = answerText(qualifyingAnswers, "med_frequency") || "daily";

  const rows: PlanTableRow[] = [];
  for (let d = 1; d <= days; d++) {
    let task = `Daily care check for ${petName} (${petTypes})`;
    let schedule = "Morning";
    let food = "Fresh water + measured meal";
    let notes = "";

    if (isVet) {
      if (d === 1) {
        task = "Find vet clinic";
        schedule = medStart || "This week";
        food = "—";
        notes = answerText(qualifyingAnswers, "vet_clinic") || "Search local vets; check reviews";
      } else if (d === 2) {
        task = "Book appointment";
        schedule = vetAppt ? "Confirm slot" : "Call or online";
        food = "—";
        notes = vetAppt ? `Target: ${vetAppt}` : "Spay/neuter, vaccines, or check-up";
      } else if (d === 3) {
        task = "Pre-visit checklist";
        schedule = vetAppt ? "Day before appointment" : "Day before";
        food = "Light meal if fasting required";
        notes = "Bring records, carrier, questions list";
      } else if (d === 4) {
        task = "Vet visit";
        schedule = vetAppt || "Appointment day";
        food = "Per vet instructions";
        notes = "Note follow-up meds & next vaccine dates in this table";
      } else {
        task = "Post-visit care";
        schedule = "Daily";
        food = "Recovery diet if prescribed";
        notes = "Watch for side effects; Linos will remind you";
      }
    } else if (/vitamin|medication|reminder/i.test(needs)) {
      task = d % 2 === 1 ? "Give vitamins / meds" : "Log dose in table";
      schedule =
        medFreq === "twice"
          ? d % 2 === 1
            ? "8:00 AM"
            : "8:00 PM"
          : medFreq === "weekly"
            ? `Week ${d} — ${medStart || "start date"}`
            : medStart
              ? `${medStart} — daily`
              : "8:00 AM";
      notes = "Set phone alarm; mark Status when done";
    } else if (/food/i.test(needs)) {
      task = `Meal plan day ${d}`;
      schedule = "Breakfast & dinner";
      food = "Age-appropriate portions; avoid toxic foods list";
      notes = "Rotate protein + vet-approved treats";
    }

    rows.push({
      id: newTableRowId(),
      cells: { Task: task, Schedule: schedule, "Food / Care": food, Notes: notes },
    });
  }

  return { table_columns: columns, table_rows: rows };
}

function parseIsoDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDueDate(d: Date): string {
  return d.toISOString();
}

export function buildProjectManagementPlanRows(
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  const columns = defaultTableColumns("project_management");
  const days = resolveTargetPlanDays(
    intent,
    "project_management",
    rawPrompt,
    qualifyingAnswers,
  );
  const projectName =
    answerText(qualifyingAnswers, "project_name") || rawPrompt.slice(0, 60);
  const deadline = parseIsoDate(qualifyingAnswers?.project_deadline);
  const start =
    parseIsoDate(qualifyingAnswers?.project_start) ?? new Date();

  const tasks: { task: string; label: string; pct: number; notes: string }[] = [
    { task: "Kickoff & stakeholder alignment", label: "Planning", pct: 0.05, notes: "Confirm scope with team" },
    { task: "Requirements & discovery", label: "Planning", pct: 0.12, notes: "$0 cost" },
    { task: "Architecture / design decisions", label: "Technical", pct: 0.2, notes: "Document key choices" },
    { task: "Core build sprint 1", label: "Internal", pct: 0.35, notes: "First deliverable milestone" },
    { task: "Core build sprint 2", label: "Internal", pct: 0.5, notes: "Feature-complete target" },
    { task: "Integrations & API wiring", label: "Integration", pct: 0.62, notes: "$20–$50 for premium tools" },
    { task: "Content & documentation", label: "Content", pct: 0.72, notes: "User-facing docs" },
    { task: "QA & bug bash", label: "Quality Assurance", pct: 0.82, notes: "Regression checklist" },
    { task: "UAT / stakeholder review", label: "Client", pct: 0.9, notes: "Sign-off before launch" },
    { task: "Launch & monitoring", label: "Deployment", pct: 0.98, notes: "Go-live + first-week watch" },
  ];

  const spanMs = deadline
    ? Math.max(deadline.getTime() - start.getTime(), 24 * 60 * 60 * 1000)
    : days * 24 * 60 * 60 * 1000;

  const rows: PlanTableRow[] = [];
  const useCount = Math.min(days, tasks.length);
  for (let i = 0; i < useCount; i++) {
    const t = tasks[i];
    let dueIso = "";
    if (deadline) {
      const due = new Date(start.getTime() + spanMs * t.pct);
      dueIso = formatDueDate(due);
    }
    rows.push({
      id: newTableRowId(),
      cells: {
        Task: `${projectName}: ${t.task}`,
        Label: t.label,
        Due: dueIso,
        Status: "Pending",
        Notes: t.notes,
      },
    });
  }

  return { table_columns: columns, table_rows: rows };
}

export function buildCategoryPlanRows(
  category: LifePulseCategoryId,
  intent: PlanIntent,
  rawPrompt: string,
  qualifyingAnswers?: Record<string, string>,
): { table_columns: string[]; table_rows: PlanTableRow[] } {
  switch (category) {
    case "study":
      return buildStudyPlanRows(intent, qualifyingAnswers);
    case "skincare":
      return buildSkincarePlanRows(intent, rawPrompt, qualifyingAnswers);
    case "travel":
      return buildTravelPlanRows(intent, rawPrompt, qualifyingAnswers);
    case "social_media":
      return buildSocialMediaPlanRows(intent, rawPrompt, qualifyingAnswers);
    case "life":
      return buildLifePlanRows(intent, rawPrompt, qualifyingAnswers);
    case "events":
      return buildEventsPlanRows(intent, rawPrompt, qualifyingAnswers);
    case "pets":
      return buildPetsPlanRows(intent, rawPrompt, qualifyingAnswers);
    case "project_management":
      return buildProjectManagementPlanRows(intent, rawPrompt, qualifyingAnswers);
    default:
      break;
  }

  const columns = defaultTableColumns(category);
  const days = effectivePlanDays(intent, category);
  const rows: PlanTableRow[] = [];

  for (let d = 1; d <= days; d++) {
    rows.push({
      id: newTableRowId(),
      cells: buildGenericDayCells(category, d, days, rawPrompt, qualifyingAnswers),
    });
  }

  return { table_columns: columns, table_rows: rows };
}

function buildGenericDayCells(
  category: LifePulseCategoryId,
  day: number,
  total: number,
  rawPrompt: string,
  _answers?: Record<string, string>,
): Record<string, string> {
  const cols = defaultTableColumns(category);
  const cells: Record<string, string> = {};
  const phase =
    day <= Math.ceil(total / 3)
      ? "Research & setup"
      : day <= Math.ceil((2 * total) / 3)
        ? "Execute"
        : "Review";

  cells[cols[0] ?? "Day"] = String(day);
  cells[cols[1] ?? "Topic"] = `${phase} — ${rawPrompt.slice(0, 50)}`;
  cells[cols[2] ?? "Detail"] = `Complete step ${day} of ${total} with specific actions in this cell.`;
  const statusCol = cols.find((c) => /status/i.test(c));
  if (statusCol) cells[statusCol] = day === 1 ? "Start today" : "";
  return cells;
}

export function studyIntro(
  intent: PlanIntent,
  days: number,
  qualifyingAnswers?: Record<string, string>,
): string {
  const subject = intent.studySubject ?? "your subject";
  const level = Object.values(qualifyingAnswers ?? {}).join(" ") || "your level";
  return `Here is your **${days}-day ${subject} study plan**, built from your request — not generic productivity tips. Each day has a topic, a focused lesson, and a realistic 45–60 minute block. Adjust pace if needed; consistency beats perfection. (${level})`;
}

export function skincareIntro(rawPrompt: string, days: number): string {
  return `This **${days}-day skincare plan** targets: “${rawPrompt.slice(0, 120)}”. Steps include AM/PM routines with niacinamide and targeted actives. **Always patch-test** and see a **dermatologist** for persistent breakouts or prescription needs.`;
}
