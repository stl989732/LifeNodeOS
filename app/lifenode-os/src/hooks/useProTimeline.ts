"use client";

import { useEffect, useState } from "react";
import {
  fetchTimelineEvents,
  filterTimelineByDate,
} from "@/src/lib/proNode/timeline";
import type { TimelineEvent } from "@/src/lib/proNode/types";

export function useProTimeline(nodeTypes: string[], asOf: Date) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const typesKey = nodeTypes.join("\0");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchTimelineEvents(nodeTypes).then((rows) => {
      if (cancelled) return;
      setEvents(filterTimelineByDate(rows, asOf));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [typesKey, asOf.getTime()]);

  return { events, loading };
}
