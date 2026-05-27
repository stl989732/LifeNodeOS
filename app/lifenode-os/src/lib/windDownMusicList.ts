/**
 * Wind Down soundscape catalog — public-domain / royalty-free stream URLs.
 * Add Free-scores.com MP3 paths here using their direct-link pattern when available.
 * @see https://www.free-scores.com
 */

export type SoundscapeCategoryId = "rain-nature" | "classical" | "nature-jazz";

export type ClassicalSubcategory = "Piano" | "Violin";

export type WindDownTrack = {
  id: string;
  name: string;
  category: SoundscapeCategoryId;
  subcategory?: ClassicalSubcategory;
  /** Stream URL (hidden <audio>). Omit when `synthKey` is set. */
  url?: string;
  /** Built-in Web Audio loop — always available offline. */
  synthKey?: "rain" | "forest" | "ocean" | "night" | "piano" | "violin" | "nature-jazz";
  bpm: number;
  /** Attribution / source note for curation */
  source: string;
};

export const SOUNDSCAPE_CATEGORIES: {
  id: SoundscapeCategoryId;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "rain-nature",
    label: "Rain & Nature",
    icon: "🌧️",
    description: "Ambient loops — rain, forest, ocean",
  },
  {
    id: "classical",
    label: "Classical",
    icon: "🎹",
    description: "Piano & violin — public domain archive",
  },
  {
    id: "nature-jazz",
    label: "Nature Jazz",
    icon: "🎷",
    description: "Smooth jazz with soft nature beds",
  },
];

/** Curated tracks — expand toward 20 per category as you add Free-scores.com links. */
export const WIND_DOWN_TRACKS: WindDownTrack[] = [
  // —— Rain & Nature (synth + streams) ——
  { id: "rain-soft", name: "Soft Rain", category: "rain-nature", synthKey: "rain", bpm: 60, source: "LifeNode synth" },
  { id: "forest-dawn", name: "Forest Dawn", category: "rain-nature", synthKey: "forest", bpm: 62, source: "LifeNode synth" },
  { id: "ocean-tide", name: "Ocean Tide", category: "rain-nature", synthKey: "ocean", bpm: 58, source: "LifeNode synth" },
  {
    id: "rain-mixkit",
    name: "Rain On Window",
    category: "rain-nature",
    url: "https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3",
    synthKey: "rain",
    bpm: 60,
    source: "Mixkit (royalty-free)",
  },
  {
    id: "forest-mixkit",
    name: "Forest Ambience",
    category: "rain-nature",
    url: "https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3",
    synthKey: "forest",
    bpm: 64,
    source: "Mixkit (royalty-free)",
  },
  {
    id: "night-crickets",
    name: "Night Crickets",
    category: "rain-nature",
    synthKey: "night",
    bpm: 55,
    source: "LifeNode synth",
  },

  // —— Classical · Piano (Free-scores / archive style URLs) ——
  {
    id: "clair-de-lune",
    name: "Clair De Lune",
    category: "classical",
    subcategory: "Piano",
    synthKey: "piano",
    bpm: 66,
    source: "LifeNode · Debussy-style bed",
  },
  {
    id: "gymnopedie-1",
    name: "Gymnopédie No. 1",
    category: "classical",
    subcategory: "Piano",
    synthKey: "piano",
    bpm: 68,
    source: "LifeNode · Satie-style bed",
  },
  {
    id: "prelude-e-minor",
    name: "Prelude In E Minor",
    category: "classical",
    subcategory: "Piano",
    synthKey: "piano",
    bpm: 64,
    source: "LifeNode · Chopin-style bed",
  },
  {
    id: "moonlight-1st",
    name: "Moonlight Sonata (1st Mvt)",
    category: "classical",
    subcategory: "Piano",
    synthKey: "piano",
    bpm: 60,
    source: "LifeNode · Beethoven-style bed",
  },
  {
    id: "piano-synth-fallback",
    name: "Solo Piano (Gentle)",
    category: "classical",
    subcategory: "Piano",
    synthKey: "piano",
    bpm: 62,
    source: "LifeNode synth fallback",
  },

  // —— Classical · Violin ——
  {
    id: "canon-in-d",
    name: "Canon In D",
    category: "classical",
    subcategory: "Violin",
    synthKey: "violin",
    bpm: 64,
    source: "LifeNode · Pachelbel-style bed",
  },
  {
    id: "air-on-g",
    name: "Air On The G String",
    category: "classical",
    subcategory: "Violin",
    synthKey: "violin",
    bpm: 60,
    source: "LifeNode · Bach-style bed",
  },
  {
    id: "vivaldi-winter-largo",
    name: "Winter (Largo)",
    category: "classical",
    subcategory: "Violin",
    synthKey: "violin",
    bpm: 58,
    source: "LifeNode · Vivaldi-style bed",
  },
  {
    id: "violin-synth-fallback",
    name: "Soft Strings",
    category: "classical",
    subcategory: "Violin",
    synthKey: "violin",
    bpm: 60,
    source: "LifeNode synth fallback",
  },

  // —— Nature Jazz ——
  {
    id: "jazz-synth",
    name: "Smooth Nature Jazz",
    category: "nature-jazz",
    synthKey: "nature-jazz",
    bpm: 68,
    source: "LifeNode synth",
  },
  {
    id: "jazz-mixkit",
    name: "Evening Jazz Loop",
    category: "nature-jazz",
    url: "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3",
    synthKey: "nature-jazz",
    bpm: 70,
    source: "Mixkit (royalty-free)",
  },
];

export type SleepTimerId = "15" | "30" | "60" | "120" | "until-exit";

export const SLEEP_TIMER_OPTIONS: { id: SleepTimerId; label: string; minutes: number | null }[] = [
  { id: "15", label: "15m", minutes: 15 },
  { id: "30", label: "30m", minutes: 30 },
  { id: "60", label: "1h", minutes: 60 },
  { id: "120", label: "2h", minutes: 120 },
  { id: "until-exit", label: "Until Exit", minutes: null },
];

export function tracksForCategory(category: SoundscapeCategoryId): WindDownTrack[] {
  return WIND_DOWN_TRACKS.filter((t) => t.category === category);
}

export function tracksForClassical(sub: ClassicalSubcategory): WindDownTrack[] {
  return WIND_DOWN_TRACKS.filter((t) => t.category === "classical" && t.subcategory === sub);
}

export function findTrack(id: string): WindDownTrack | undefined {
  return WIND_DOWN_TRACKS.find((t) => t.id === id);
}
