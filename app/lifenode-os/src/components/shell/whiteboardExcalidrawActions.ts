"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export const WB_SCENE_KEY = "lifenode_excalidraw_global_v1";

/** Loads Excalidraw only when called (client), so parent modules stay SSR-safe. */
export async function persistWhiteboardScene(api: ExcalidrawImperativeAPI) {
  const { serializeAsJSON } = await import("@excalidraw/excalidraw");
  const elements = api.getSceneElements();
  const appState = api.getAppState();
  const files = api.getFiles();
  const json = serializeAsJSON(elements, appState, files, "local");
  localStorage.setItem(WB_SCENE_KEY, json);
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
