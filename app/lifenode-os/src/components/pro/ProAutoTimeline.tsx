"use client";

import { GitBranch, Loader2, Mail, MessageSquare, Palette, Radio, Video } from "lucide-react";
import type { TimelineEvent, TimelineSource } from "@/src/lib/proNode/types";

const SOURCE_META: Record<
  TimelineSource,
  { icon: typeof Mail; label: string; className: string }
> = {
  gmail: { icon: Mail, label: "Gmail", className: "text-rose-500" },
  slack: { icon: MessageSquare, label: "Slack", className: "text-violet-500" },
  github: { icon: GitBranch, label: "GitHub", className: "text-slate-700" },
  figma: { icon: Palette, label: "Figma", className: "text-fuchsia-500" },
  system: { icon: Radio, label: "System", className: "text-indigo-500" },
  zoom: { icon: Video, label: "Zoom / Loom", className: "text-sky-600" },
};

type ProAutoTimelineProps = {
  events: TimelineEvent[];
  loading?: boolean;
  compact?: boolean;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProAutoTimeline({ events, loading, compact }: ProAutoTimelineProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#1E293B]">Auto-Timeline</h3>
        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
          Supabase Realtime
        </span>
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Gmail & Slack webhooks via Edge Functions · scoped to your active workspace
      </p>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace timeline…
        </div>
      ) : (
        <ul
          className={`space-y-2 ${compact ? "max-h-48 overflow-y-auto" : "max-h-72 overflow-y-auto"}`}
        >
          {events.length === 0 ? (
            <li className="text-xs text-slate-400">No events visible at this point in time.</li>
          ) : (
            events.map((ev) => {
              const meta = SOURCE_META[ev.source];
              const Icon = meta.icon;
              return (
                <li
                  key={ev.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.className}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">{ev.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                        {ev.excerpt}
                      </p>
                      {ev.videoSnapshot ? (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 p-2 text-white">
                          <div className="relative flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-black/40">
                            <Video className="h-5 w-5 text-white/90" />
                            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 font-mono text-[8px]">
                              {ev.videoSnapshot.timestamp}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">
                              Video snapshot
                            </p>
                            <p className="truncate text-[11px] font-medium">
                              {ev.videoSnapshot.label}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {ev.fact ? (
                        <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900">
                          Fact: {ev.fact}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {formatWhen(ev.at)} · {meta.label}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
