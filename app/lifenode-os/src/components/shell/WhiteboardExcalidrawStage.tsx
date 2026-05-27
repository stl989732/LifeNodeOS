"use client";

import type { MutableRefObject } from "react";
import { useRef } from "react";
import { Excalidraw, restore } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  persistWhiteboardScene,
  WB_SCENE_KEY,
} from "./whiteboardExcalidrawActions";

function loadInitialData() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WB_SCENE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, unknown>;
    const r = restore(data, null, null, { refreshDimensions: true });
    return { elements: r.elements, appState: r.appState, files: r.files };
  } catch {
    return {};
  }
}

export default function WhiteboardExcalidrawStage({
  excalidRef,
}: {
  excalidRef: MutableRefObject<ExcalidrawImperativeAPI | null>;
}) {
  const initialRef = useRef(loadInitialData());
  const debounceRef = useRef<number | null>(null);

  return (
    <div className="h-full min-h-0 w-full flex-1 [&_.excalidraw]:h-full [&_.excalidraw-container]:h-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidRef.current = api;
          api.onChange(() => {
            if (debounceRef.current !== null) {
              window.clearTimeout(debounceRef.current);
            }
            debounceRef.current = window.setTimeout(() => {
              void persistWhiteboardScene(api);
              debounceRef.current = null;
            }, 600);
          });
        }}
        initialData={initialRef.current}
      />
    </div>
  );
}
