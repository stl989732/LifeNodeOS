"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Excalidraw, restore } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  hydrateWhiteboardSceneFromServer,
  loadWhiteboardSceneLocal,
  persistWhiteboardScene,
} from "./whiteboardExcalidrawActions";

function restoreScene(data: Record<string, unknown>) {
  if (!Object.keys(data).length) return {};
  try {
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
  const { data: session, status } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;
  const [initialData, setInitialData] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    void (async () => {
      const local = loadWhiteboardSceneLocal(userId);
      if (!cancelled) {
        setInitialData(restoreScene(local));
        setReady(true);
      }

      if (status === "authenticated" && userId) {
        const remote = await hydrateWhiteboardSceneFromServer(userId);
        if (!cancelled && Object.keys(remote).length) {
          setInitialData(restoreScene(remote));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  if (!ready) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-sm text-slate-500">
        Loading whiteboard…
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex-1 [&_.excalidraw]:h-full [&_.excalidraw-container]:h-full">
      <Excalidraw
        key={userId ?? "guest"}
        excalidrawAPI={(api) => {
          excalidRef.current = api;
          api.onChange(() => {
            if (debounceRef.current !== null) {
              window.clearTimeout(debounceRef.current);
            }
            debounceRef.current = window.setTimeout(() => {
              void persistWhiteboardScene(api, userId);
              debounceRef.current = null;
            }, 600);
          });
        }}
        initialData={initialData}
      />
    </div>
  );
}
