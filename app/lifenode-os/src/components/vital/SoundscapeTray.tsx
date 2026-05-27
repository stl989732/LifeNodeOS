"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Clock, Loader2, Minus, X } from "lucide-react";
import {
  SLEEP_TIMER_OPTIONS,
  SOUNDSCAPE_CATEGORIES,
  tracksForCategory,
  tracksForClassical,
  type ClassicalSubcategory,
  type SoundscapeCategoryId,
  type WindDownTrack,
} from "@/src/lib/windDownMusicList";
import { toTitleCaseWords } from "@/src/components/vital/titleCase";
import type { SleepTimerId } from "@/src/lib/windDownMusicList";

type SoundscapeTrayProps = {
  open: boolean;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  nowPlaying: WindDownTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  loadingTrackId: string | null;
  sleepTimerId: SleepTimerId;
  timerRemainingMs: number | null;
  onPlayTrack: (trackId: string) => void;
  onSetTimer: (id: SleepTimerId) => void;
};

function formatRemaining(ms: number | null) {
  if (ms == null) return null;
  const m = Math.ceil(ms / 60000);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

export default function SoundscapeTray({
  open,
  minimized,
  onMinimize,
  onExpand,
  onClose,
  nowPlaying,
  isPlaying,
  isLoading,
  loadingTrackId,
  sleepTimerId,
  timerRemainingMs,
  onPlayTrack,
  onSetTimer,
}: SoundscapeTrayProps) {
  const [activeCategory, setActiveCategory] = useState<SoundscapeCategoryId | null>(null);
  const [classicalSub, setClassicalSub] = useState<ClassicalSubcategory>("Piano");
  const [timerOpen, setTimerOpen] = useState(false);

  useEffect(() => {
    if (open && activeCategory == null) {
      setActiveCategory("rain-nature");
    }
    if (!open) {
      setActiveCategory(null);
      setTimerOpen(false);
    }
  }, [open, activeCategory]);

  if (!open) return null;

  const tracks =
    activeCategory === "classical"
      ? tracksForClassical(classicalSub)
      : activeCategory
        ? tracksForCategory(activeCategory)
        : [];

  if (minimized) {
    return (
      <div
        className="pointer-events-auto fixed right-4 top-1/2 z-[70] -translate-y-1/2"
        role="region"
        aria-label={toTitleCaseWords("Soundscape minimized")}
      >
        <button
          type="button"
          onClick={onExpand}
          className="flex max-w-[11rem] items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/90 px-3 py-3 text-left shadow-2xl backdrop-blur-xl transition hover:border-amber-300/30"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-amber-300/80" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-200/60">
              🎵 {toTitleCaseWords("Soundscape")}
            </span>
            {nowPlaying ? (
              <span className="mt-0.5 block truncate text-xs text-amber-50/90">{nowPlaying.name}</span>
            ) : (
              <span className="mt-0.5 block text-xs text-amber-100/50">
                {toTitleCaseWords("Tap to expand")}
              </span>
            )}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-auto fixed right-3 top-20 z-[70] flex w-[min(calc(100vw-1.5rem),20rem)] flex-col sm:right-5 sm:top-24"
      style={{ maxHeight: "calc(100vh - 7rem)" }}
      role="dialog"
      aria-label={toTitleCaseWords("Soundscape selection tray")}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/92 shadow-2xl backdrop-blur-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/70">
            {toTitleCaseWords("Soundscape tray")}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={toTitleCaseWords("Minimize tray")}
              onClick={onMinimize}
              className="rounded-lg p-1.5 text-amber-200/60 transition hover:bg-white/10 hover:text-amber-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={toTitleCaseWords("Close tray")}
              onClick={onClose}
              className="rounded-lg p-1.5 text-amber-200/60 transition hover:bg-white/10 hover:text-amber-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {nowPlaying && isPlaying ? (
          <p className="shrink-0 truncate border-b border-white/5 px-3 py-2 text-xs text-amber-100/75">
            {toTitleCaseWords("Now playing")}: {nowPlaying.name}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {SOUNDSCAPE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setTimerOpen(false);
                }}
                className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  activeCategory === cat.id
                    ? "border-amber-300/50 bg-amber-400/15 text-amber-50"
                    : "border-white/15 bg-white/5 text-amber-100/80 hover:bg-white/10"
                }`}
              >
                {cat.icon} {toTitleCaseWords(cat.label)}
              </button>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setTimerOpen((v) => !v)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  timerOpen || sleepTimerId !== "until-exit"
                    ? "border-amber-300/50 bg-amber-400/15 text-amber-50"
                    : "border-white/15 bg-white/5 text-amber-100/80 hover:bg-white/10"
                }`}
              >
                <Clock className="h-3 w-3" />
                {toTitleCaseWords("Timer")}
                {timerRemainingMs != null ? (
                  <span className="text-[10px] opacity-80">({formatRemaining(timerRemainingMs)})</span>
                ) : null}
              </button>
              {timerOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 flex min-w-[7rem] flex-col gap-1 rounded-xl border border-white/15 bg-slate-900/95 p-1.5 shadow-xl">
                  {SLEEP_TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSetTimer(opt.id);
                        setTimerOpen(false);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-left text-xs font-semibold ${
                        sleepTimerId === opt.id
                          ? "bg-amber-400/20 text-amber-50"
                          : "text-amber-100/80 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {activeCategory === "classical" ? (
            <div className="mb-2 flex gap-2">
              {(["Piano", "Violin"] as ClassicalSubcategory[]).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setClassicalSub(sub)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    classicalSub === sub
                      ? "bg-white/15 text-amber-50"
                      : "text-amber-200/50 hover:text-amber-100/80"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          ) : null}

          {activeCategory ? (
            <ul className="space-y-1">
              {tracks.map((track) => {
                const loading = isLoading && loadingTrackId === track.id;
                const active = nowPlaying?.id === track.id && isPlaying;
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(track.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-amber-400/15 text-amber-50 ring-1 ring-amber-300/30"
                          : "text-amber-100/85 hover:bg-white/10"
                      }`}
                    >
                      <span className="font-medium">{track.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-amber-200/45">
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                        ) : null}
                        {track.bpm} BPM
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-amber-200/45">
              {toTitleCaseWords("Choose a category to browse tracks")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
