import {
  getLinosDailyUsageRecord,
  incrementLinosDailyUsageRecord,
} from "@/lib/user-state-store";

const DAILY_LIMIT = 10;
const WARN_AT = 6;

export type LinosUsageStatus = {
  count: number;
  limit: number;
  locked: boolean;
  warning: string | null;
};

function toStatus(count: number): LinosUsageStatus {
  const locked = count >= DAILY_LIMIT;
  let warning: string | null = null;
  if (count >= WARN_AT && count < DAILY_LIMIT) {
    warning =
      "You only have 10 free to ask questions with answers and now you reached 6 questions with answers which means you only have 4 left.";
  }
  return { count, limit: DAILY_LIMIT, locked, warning };
}

export async function getLinosUsageStatus(userId: string): Promise<LinosUsageStatus> {
  const record = await getLinosDailyUsageRecord(userId);
  return toStatus(record.count);
}

/** Counts a full breakdown generation (phase 3). */
export async function incrementLinosUsage(userId: string): Promise<LinosUsageStatus> {
  const record = await incrementLinosDailyUsageRecord(userId);
  return toStatus(record.count);
}

export const LINOS_LOCK_MESSAGE =
  "There's a limit in using General Assistant, feel free to ask again tomorrow for another set of questions.";
