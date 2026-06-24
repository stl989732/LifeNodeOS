import fs from "fs/promises";
import path from "path";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { listAllNodeWidgetKeys } from "@/lib/all-node-widget-keys";
import { isNodeWidgetKey, type NodeWidgetKey } from "@/lib/node-widget-keys";

export type NodeWidgetRecord = {
  widgetKey: NodeWidgetKey;
  payload: unknown;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "node-widgets");

function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function sanitizeWidgetKey(widgetKey: string): string {
  return widgetKey.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

function widgetFilePath(userId: string, widgetKey: string): string {
  return path.join(
    DATA_DIR,
    sanitizeUserId(userId),
    `${sanitizeWidgetKey(widgetKey)}.json`,
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function isServerlessRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function shouldUseSupabaseWidgetStore(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_KEY?.trim()),
  );
}

function shouldUseFilesystemWidgetStore(): boolean {
  if (isServerlessRuntime()) return false;
  return !shouldUseSupabaseWidgetStore();
}

async function ensureWidgetDir(userId: string): Promise<void> {
  if (!shouldUseFilesystemWidgetStore()) return;
  try {
    await fs.mkdir(path.join(DATA_DIR, sanitizeUserId(userId)), {
      recursive: true,
    });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "EROFS" && code !== "EPERM") throw e;
  }
}

async function readWidgetFromSupabase(
  userId: string,
  widgetKey: NodeWidgetKey,
): Promise<NodeWidgetRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_node_widget_data")
    .select("widget_key, payload, updated_at")
    .eq("user_id", sanitizeUserId(userId))
    .eq("widget_key", widgetKey)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw error;
  }
  if (!data) return null;

  return {
    widgetKey,
    payload: data.payload,
    updatedAt:
      typeof data.updated_at === "string" ? data.updated_at : nowIso(),
  };
}

async function writeWidgetToSupabase(
  userId: string,
  widgetKey: NodeWidgetKey,
  payload: unknown,
): Promise<NodeWidgetRecord> {
  const supabase = createSupabaseAdminClient();
  const updatedAt = nowIso();
  const { error } = await supabase.from("user_node_widget_data").upsert(
    {
      user_id: sanitizeUserId(userId),
      widget_key: widgetKey,
      payload: payload ?? {},
      updated_at: updatedAt,
    },
    { onConflict: "user_id,widget_key" },
  );
  if (error) throw error;
  return { widgetKey, payload, updatedAt };
}

async function readWidgetFromFilesystem(
  userId: string,
  widgetKey: NodeWidgetKey,
): Promise<NodeWidgetRecord | null> {
  await ensureWidgetDir(userId);
  try {
    const raw = await fs.readFile(widgetFilePath(userId, widgetKey), "utf8");
    const parsed = JSON.parse(raw) as {
      payload?: unknown;
      updatedAt?: string;
    };
    return {
      widgetKey,
      payload: parsed.payload ?? parsed,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso(),
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeWidgetToFilesystem(
  userId: string,
  widgetKey: NodeWidgetKey,
  payload: unknown,
): Promise<NodeWidgetRecord> {
  await ensureWidgetDir(userId);
  const record: NodeWidgetRecord = {
    widgetKey,
    payload,
    updatedAt: nowIso(),
  };
  await fs.writeFile(
    widgetFilePath(userId, widgetKey),
    JSON.stringify(record, null, 2),
    "utf8",
  );
  return record;
}

export class NodeWidgetPersistenceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NodeWidgetPersistenceError";
  }
}

export async function getNodeWidget(
  userId: string,
  widgetKey: NodeWidgetKey,
): Promise<NodeWidgetRecord | null> {
  if (shouldUseSupabaseWidgetStore()) {
    try {
      return await readWidgetFromSupabase(userId, widgetKey);
    } catch (e) {
      console.error("[node-widget-data] Supabase read failed:", e);
      return null;
    }
  }

  if (shouldUseFilesystemWidgetStore()) {
    try {
      return await readWidgetFromFilesystem(userId, widgetKey);
    } catch (e) {
      console.error("[node-widget-data] file read failed:", e);
      return null;
    }
  }

  return null;
}

export async function getNodeWidgets(
  userId: string,
  widgetKeys: NodeWidgetKey[],
): Promise<Record<string, NodeWidgetRecord>> {
  const out: Record<string, NodeWidgetRecord> = {};
  await Promise.all(
    widgetKeys.map(async (key) => {
      const row = await getNodeWidget(userId, key);
      if (row) out[key] = row;
    }),
  );
  return out;
}

export async function upsertNodeWidget(
  userId: string,
  widgetKey: NodeWidgetKey,
  payload: unknown,
): Promise<NodeWidgetRecord> {
  if (shouldUseSupabaseWidgetStore()) {
    try {
      return await writeWidgetToSupabase(userId, widgetKey, payload);
    } catch (e) {
      console.error("[node-widget-data] Supabase write failed:", e);
      throw new NodeWidgetPersistenceError(
        "Could not save dashboard data. Apply the user_node_widget_data migration in Supabase.",
        e,
      );
    }
  }

  if (shouldUseFilesystemWidgetStore()) {
    try {
      return await writeWidgetToFilesystem(userId, widgetKey, payload);
    } catch (e) {
      throw new NodeWidgetPersistenceError(
        "Could not save dashboard data to disk.",
        e,
      );
    }
  }

  if (isServerlessRuntime()) {
    throw new NodeWidgetPersistenceError(
      "Dashboard persistence unavailable. Configure Supabase and apply user_node_widget_data migration.",
    );
  }

  throw new NodeWidgetPersistenceError("No persistence backend configured.");
}

export function parseWidgetKeysParam(raw: string | null): NodeWidgetKey[] {
  if (!raw?.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed === "all" || trimmed === "*") {
    return listAllNodeWidgetKeys();
  }
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(isNodeWidgetKey);
}
