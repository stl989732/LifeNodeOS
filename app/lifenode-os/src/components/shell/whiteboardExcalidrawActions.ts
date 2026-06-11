"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { NODE_WIDGET_KEYS } from "@/lib/node-widget-keys";
import { userScopedStorageKey } from "@/src/lib/userScopedStorage";
import {
  fetchNodeWidgetsWithMeta,
  readLocalWidgetUpdatedAt,
  resolveWidgetBootstrap,
  scheduleNodeWidgetSave,
  touchLocalWidgetUpdatedAt,
} from "@/src/lib/nodeWidgetSync";

export const WB_SCENE_BASE_KEY = "lifenode_excalidraw_global_v1";

export function whiteboardStorageKey(userId: string | null | undefined): string {
  return userScopedStorageKey(WB_SCENE_BASE_KEY, userId);
}

function parseWhiteboardScene(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object" && "scene" in payload) {
    const scene = (payload as { scene?: unknown }).scene;
    if (typeof scene === "string" && scene.trim()) return scene;
  }
  return null;
}

function hasMeaningfulWhiteboardScene(scene: string | null): boolean {
  if (!scene?.trim()) return false;
  try {
    const parsed = JSON.parse(scene) as { elements?: unknown[] };
    return Array.isArray(parsed.elements) && parsed.elements.length > 0;
  } catch {
    return scene.trim().length > 20;
  }
}

export function loadWhiteboardSceneLocal(
  userId: string | null | undefined,
): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const storageKey = whiteboardStorageKey(userId);
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, unknown>;
    return data;
  } catch {
    return {};
  }
}

export async function hydrateWhiteboardSceneFromServer(
  userId: string | null | undefined,
): Promise<Record<string, unknown>> {
  if (typeof window === "undefined" || !userId) {
    return loadWhiteboardSceneLocal(userId);
  }

  const storageKey = whiteboardStorageKey(userId);
  const localScene = window.localStorage.getItem(storageKey);

  const remote = await fetchNodeWidgetsWithMeta([NODE_WIDGET_KEYS.shell.whiteboard]);
  const { value, pushLocal } = resolveWidgetBootstrap({
    local: localScene,
    localUpdatedAt: readLocalWidgetUpdatedAt(storageKey),
    remote: remote[NODE_WIDGET_KEYS.shell.whiteboard],
    parseRemote: (payload) => parseWhiteboardScene(payload),
    hasMeaningfulLocal: (scene) => hasMeaningfulWhiteboardScene(scene),
    remoteHasData: (payload) => hasMeaningfulWhiteboardScene(parseWhiteboardScene(payload)),
  });

  if (!value) return {};

  try {
    window.localStorage.setItem(storageKey, value);
    touchLocalWidgetUpdatedAt(storageKey);
    if (pushLocal && hasMeaningfulWhiteboardScene(value)) {
      scheduleNodeWidgetSave(
        NODE_WIDGET_KEYS.shell.whiteboard,
        { scene: value },
        200,
      );
    }
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Loads Excalidraw only when called (client), so parent modules stay SSR-safe. */
export async function persistWhiteboardScene(
  api: ExcalidrawImperativeAPI,
  userId: string | null | undefined,
) {
  const { serializeAsJSON } = await import("@excalidraw/excalidraw");
  const elements = api.getSceneElements();
  const appState = api.getAppState();
  const files = api.getFiles();
  const json = serializeAsJSON(elements, appState, files, "local");
  const storageKey = whiteboardStorageKey(userId);
  localStorage.setItem(storageKey, json);
  touchLocalWidgetUpdatedAt(storageKey);
  if (userId && hasMeaningfulWhiteboardScene(json)) {
    scheduleNodeWidgetSave(NODE_WIDGET_KEYS.shell.whiteboard, { scene: json });
  }
}

export async function captureWhiteboardPngDataUrl(
  api: ExcalidrawImperativeAPI,
): Promise<string> {
  const { exportToBlob, getNonDeletedElements } = await import(
    "@excalidraw/excalidraw"
  );
  const blob = await exportToBlob({
    elements: getNonDeletedElements(api.getSceneElements()),
    appState: { ...api.getAppState(), exportBackground: true },
    files: api.getFiles(),
    mimeType: "image/png",
    quality: 0.92,
    maxWidthOrHeight: 2000,
  });
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });
}
