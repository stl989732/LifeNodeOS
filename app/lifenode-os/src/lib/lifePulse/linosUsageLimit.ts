import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "life-pulse-linos-usage");
const DAILY_LIMIT = 10;
const WARN_AT = 6;

type UsageRecord = {
  date: string;
  count: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function filePath(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return path.join(DATA_DIR, `${safe}.json`);
}

async function readRecord(userId: string): Promise<UsageRecord> {
  try {
    const raw = await fs.readFile(filePath(userId), "utf8");
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.date === todayKey()) return parsed;
  } catch {
    /* new day or missing file */
  }
  return { date: todayKey(), count: 0 };
}

async function writeRecord(userId: string, record: UsageRecord): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath(userId), JSON.stringify(record, null, 2), "utf8");
}

export type LinosUsageStatus = {
  count: number;
  limit: number;
  locked: boolean;
  warning: string | null;
};

export async function getLinosUsageStatus(userId: string): Promise<LinosUsageStatus> {
  const record = await readRecord(userId);
  const count = record.count;
  const locked = count >= DAILY_LIMIT;
  let warning: string | null = null;
  if (count >= WARN_AT && count < DAILY_LIMIT) {
    warning =
      "You only have 10 free to ask questions with answers and now you reached 6 questions with answers which means you only have 4 left.";
  }
  return { count, limit: DAILY_LIMIT, locked, warning };
}

/** Counts a full breakdown generation (phase 3). */
export async function incrementLinosUsage(userId: string): Promise<LinosUsageStatus> {
  const record = await readRecord(userId);
  const next: UsageRecord = {
    date: todayKey(),
    count: record.count + 1,
  };
  await writeRecord(userId, next);
  return getLinosUsageStatus(userId);
}

export const LINOS_LOCK_MESSAGE =
  "There's a limit in using General Assistant, feel free to ask again tomorrow for another set of questions.";
