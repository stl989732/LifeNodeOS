"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

function readStoredPosition(key: string): Point | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Point;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function defaultBottomRight(elWidth = 360, elHeight = 120): Point {
  if (typeof window === "undefined") return { x: 16, y: 16 };
  return {
    x: Math.max(8, window.innerWidth - elWidth - 20),
    y: Math.max(8, window.innerHeight - elHeight - 20),
  };
}

export function useDraggableFloatingPosition(
  storageKey: string,
  estimate: { width: number; height: number } = { width: 360, height: 120 },
) {
  const [position, setPosition] = useState<Point>(() => {
    if (typeof window === "undefined") return { x: 16, y: 16 };
    return (
      readStoredPosition(storageKey) ??
      defaultBottomRight(estimate.width, estimate.height)
    );
  });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );

  useEffect(() => {
    const stored = readStoredPosition(storageKey);
    if (stored) setPosition(stored);
  }, [storageKey]);

  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(8, window.innerWidth - estimate.width - 8);
      const maxY = Math.max(8, window.innerHeight - estimate.height - 8);
      return {
        x: Math.min(Math.max(8, x), maxX),
        y: Math.min(Math.max(8, y), maxY),
      };
    },
    [estimate.height, estimate.width],
  );

  useEffect(() => {
    const reclamp = () => {
      setPosition((prev) => clamp(prev.x, prev.y));
    };
    window.addEventListener("resize", reclamp);
    const onVisible = () => {
      if (document.visibilityState === "visible") reclamp();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("resize", reclamp);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
      };
    },
    [position.x, position.y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition(
        clamp(dragRef.current.originX + dx, dragRef.current.originY + dy),
      );
    },
    [clamp],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(position));
      } catch {
        /* ignore */
      }
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [position, storageKey],
  );

  return {
    position,
    style: {
      left: position.x,
      top: position.y,
    } as const,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
