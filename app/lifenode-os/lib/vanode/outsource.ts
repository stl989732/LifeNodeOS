import type { ClientProfile, EodLog, WaitingTask } from "./types";

function hourInTimezone(tz: string): number {
  const d = new Date();
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const part = h.find((p) => p.type === "hour");
  return parseInt(part?.value ?? "0", 10);
}

function circularHourDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 24 - d);
}

export function userTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export type OutsourceInsight = {
  shouldSuggest: boolean;
  headline: string;
  detail: string;
  score: number;
};

export function computeOutsourceInsight(
  clients: ClientProfile[],
  waiting: WaitingTask[],
  eodLogs: EodLog[]
): OutsourceInsight {
  const userTz = userTimezone();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentEod = eodLogs.filter((l) => new Date(l.createdAt).getTime() > weekAgo);
  const taskDensity = waiting.length + recentEod.length;

  let minOverlap = 12;
  for (const c of clients) {
    const diff = circularHourDiff(hourInTimezone(userTz), hourInTimezone(c.timezone));
    minOverlap = Math.min(minOverlap, diff);
  }

  const overlapPoor = clients.length > 0 && minOverlap >= 5;
  const overlapVeryPoor = clients.length > 0 && minOverlap >= 8;
  const highLoad = taskDensity >= 6;
  const veryHighLoad = taskDensity >= 10;

  const score = Math.min(
    100,
    taskDensity * 6 + (overlapPoor ? 25 : 0) + (overlapVeryPoor ? 15 : 0)
  );

  const shouldSuggest =
    (highLoad && overlapPoor) || veryHighLoad || (overlapVeryPoor && taskDensity >= 4);

  if (!shouldSuggest) {
    return {
      shouldSuggest: false,
      headline: "Capacity looks balanced",
      detail:
        clients.length === 0
          ? "Add client profiles to analyze timezone overlap and load."
          : "Keep logging EOD and waiting tasks so LifeNode can spot drift early.",
      score,
    };
  }

  return {
    shouldSuggest: true,
    headline: "Consider extra help for this roster",
    detail: `High activity (${taskDensity} signals in 7 days) ${
      overlapPoor ? "with wide timezone spread" : ""
    }. A fractional VA or specialist could protect turnaround times.`,
    score,
  };
}
