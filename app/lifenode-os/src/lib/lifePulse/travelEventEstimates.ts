/** Baseline USD estimates for Travel & Events plan tables (from origin + destination + lodging). */

export type LodgingStyle = "venue" | "nearby" | "airbnb" | "unknown";

export function parseLodgingStyle(answer: string): LodgingStyle {
  const a = answer.toLowerCase();
  if (/venue|marriott|on-site|event hotel/.test(a)) return "venue";
  if (/airbnb|friends|local stay/.test(a)) return "airbnb";
  if (/nearby|belmont|savoy|budget|affordable/.test(a)) return "nearby";
  return "unknown";
}

function detectDestRegion(text: string): string {
  const t = text.toLowerCase();
  if (/manila|philippines|highlevel/.test(t)) return "manila";
  if (/singapore/.test(t)) return "singapore";
  if (/tokyo|japan/.test(t)) return "tokyo";
  if (/london|uk\b/.test(t)) return "london";
  if (/new york|nyc/.test(t)) return "nyc";
  if (/los angeles|la\b/.test(t)) return "la";
  if (/sydney|australia/.test(t)) return "sydney";
  if (/italy|rome|milan/.test(t)) return "italy";
  if (/switzerland/.test(t)) return "switzerland";
  return "general";
}

function detectOriginRegion(text: string): string {
  const t = text.toLowerCase();
  if (/los angeles|california|\bla\b|\busa\b|united states|america/.test(t)) return "us_west";
  if (/new york|nyc|east coast/.test(t)) return "us_east";
  if (/singapore/.test(t)) return "singapore";
  if (/sydney|melbourne|australia/.test(t)) return "australia";
  if (/london|uk\b|united kingdom|britain/.test(t)) return "uk";
  if (/toronto|vancouver|canada/.test(t)) return "canada";
  if (/europe|paris|frankfurt/.test(t)) return "europe";
  return "other";
}

export function estimateRoundTripFlights(origin: string, destinationText: string): string {
  const dest = detectDestRegion(destinationText);
  const orig = detectOriginRegion(origin);

  const matrix: Record<string, Record<string, string>> = {
    manila: {
      us_west: "$1,050–$1,400 USD",
      us_east: "$1,200–$1,650 USD",
      singapore: "$280–$480 USD",
      australia: "$650–$980 USD",
      uk: "$780–$1,100 USD",
      europe: "$720–$1,050 USD",
      other: "$750–$1,250 USD",
    },
    singapore: {
      us_west: "$850–$1,200 USD",
      us_east: "$950–$1,350 USD",
      australia: "$420–$680 USD",
      other: "$400–$900 USD",
    },
    tokyo: {
      us_west: "$750–$1,100 USD",
      europe: "$650–$950 USD",
      other: "$700–$1,150 USD",
    },
    italy: {
      us_east: "$550–$850 USD",
      uk: "$120–$280 USD",
      europe: "$80–$220 USD",
      other: "$500–$900 USD",
    },
    general: {
      other: "$450–$1,200 USD",
    },
  };

  return matrix[dest]?.[orig] ?? matrix[dest]?.other ?? matrix.general.other;
}

export function estimateNightlyHotel(
  lodging: LodgingStyle,
  destinationText: string,
): string {
  const dest = detectDestRegion(destinationText);
  if (dest === "manila") {
    if (lodging === "venue") return "$180–$250 USD/night (Marriott Manila area)";
    if (lodging === "nearby") return "$85–$130 USD/night (Belmont / Savoy nearby)";
    if (lodging === "airbnb") return "$45–$90 USD/night (Airbnb / local stay)";
    return "$120–$220 USD/night";
  }
  if (lodging === "venue") return "$160–$280 USD/night (venue or conference hotel)";
  if (lodging === "nearby") return "$75–$140 USD/night (3-star nearby)";
  if (lodging === "airbnb") return "$50–$110 USD/night (Airbnb)";
  return "$90–$180 USD/night";
}

export function estimateEventTicket(eventName: string): string {
  const t = eventName.toLowerCase();
  if (/highlevel|saas|agency/.test(t)) return "$299–$799 USD (conference pass — verify tier)";
  if (/concert|gala/.test(t)) return "$80–$250 USD";
  return "$150–$450 USD (estimate — confirm official site)";
}

export function estimateDailyMeals(): string {
  return "$35–$65 USD/day";
}

export function formatAnswersContext(answers?: Record<string, string>): string {
  if (!answers) return "";
  return Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}
