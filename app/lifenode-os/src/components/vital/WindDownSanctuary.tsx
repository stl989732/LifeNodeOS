"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Lamp, Moon, X } from "lucide-react";
import ArchitectMarkdown from "@/src/components/vital/ArchitectMarkdown";
import SoundscapeTray from "@/src/components/vital/SoundscapeTray";
import WaveformVisualizer from "@/src/components/vital/WaveformVisualizer";
import { useWindDownPlayer } from "@/src/hooks/useWindDownPlayer";
import { toTitleCaseWords } from "@/src/components/vital/titleCase";
import { generateHealthArchitectGuidance } from "@/src/lib/healthArchitect";

const FONT_PLAYFAIR = "font-[family-name:var(--font-playfair)]";

type WindDownSanctuaryProps = {
  open: boolean;
  onExit: () => void;
  flareActive: boolean;
  resilience: number;
  readiness: number;
  recentSymptoms: { label: string; at: string }[];
  momentumMode: string;
  onLogRestless: (text: string) => void;
};

type BreathPhase = "inhale" | "hold" | "exhale" | "idle";

const BREATH_CYCLE_MS: Record<Exclude<BreathPhase, "idle">, number> = {
  inhale: 4000,
  hold: 2000,
  exhale: 6000,
};
const BREATH_DURATION_MS = 3 * 60 * 1000;

export default function WindDownSanctuary({
  open,
  onExit,
  flareActive,
  resilience,
  readiness,
  recentSymptoms,
  momentumMode,
  onLogRestless,
}: WindDownSanctuaryProps) {
  const player = useWindDownPlayer();
  const [soundTrayOpen, setSoundTrayOpen] = useState(false);
  const [trayMinimized, setTrayMinimized] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [circadianOn, setCircadianOn] = useState(false);
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("idle");
  const [restlessOpen, setRestlessOpen] = useState(false);
  const [restlessDraft, setRestlessDraft] = useState("");
  const [flyingThought, setFlyingThought] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const breathEndRef = useRef<number | null>(null);

  const flareSummary = useMemo(() => {
    if (!flareActive) return "";
    return generateHealthArchitectGuidance({
      resilience,
      readiness,
      recentSymptoms,
      prompt: "Why am I resting tonight during flare recovery?",
      flareActive: true,
    });
  }, [flareActive, resilience, readiness, recentSymptoms]);

  useEffect(() => {
    if (!open) {
      void player.stop(3);
      setSoundTrayOpen(false);
      setTrayMinimized(false);
      setBreathActive(false);
      setBreathPhase("idle");
      setRestlessOpen(false);
      setRestlessDraft("");
      setFlyingThought(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, player]);

  const handlePlayTrack = useCallback(
    async (trackId: string) => {
      setLoadingTrackId(trackId);
      await player.playTrack(trackId);
      setLoadingTrackId(null);
    },
    [player],
  );

  const handleExit = useCallback(async () => {
    await player.stop(3);
    onExit();
  }, [onExit, player]);

  useEffect(() => {
    if (!breathActive) {
      setBreathPhase("idle");
      if (breathEndRef.current) window.clearTimeout(breathEndRef.current);
      return;
    }
    const order: Exclude<BreathPhase, "idle">[] = ["inhale", "hold", "exhale"];
    let idx = 0;
    let cancelled = false;

    const runPhase = () => {
      if (cancelled) return;
      const phase = order[idx % order.length];
      setBreathPhase(phase);
      const delay = BREATH_CYCLE_MS[phase];
      idx += 1;
      breathEndRef.current = window.setTimeout(runPhase, delay);
    };

    runPhase();
    const endAt = window.setTimeout(() => {
      setBreathActive(false);
      setBreathPhase("idle");
    }, BREATH_DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(endAt);
      if (breathEndRef.current) window.clearTimeout(breathEndRef.current);
    };
  }, [breathActive]);

  const handleCircadianToggle = () => {
    const next = !circadianOn;
    setCircadianOn(next);
    if (next) {
      // Mock smart-home bridge
      console.info(
        "set_home_lighting",
        JSON.stringify({ temp: "2700K", brightness: "10%" }),
      );
    }
  };

  const submitRestless = useCallback(() => {
    const text = restlessDraft.trim();
    if (!text) return;
    setFlyingThought(text.slice(0, 80));
    setRestlessOpen(false);
    setRestlessDraft("");
    window.setTimeout(() => {
      onLogRestless(text);
      setFlyingThought(null);
    }, 1400);
  }, [restlessDraft, onLogRestless]);

  if (!open) return null;

  const bpmPeriodSec = 60 / Math.max(50, Math.min(80, player.currentBpm));
  const shellClass = [
    "vital-winddown-sanctuary",
    circadianOn ? "vital-winddown-sanctuary--circadian" : "",
    flareActive ? "vital-winddown-sanctuary--flare" : "",
    player.isPlaying ? "vital-winddown-sanctuary--music-pulse" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellStyle = {
    ["--winddown-bpm-period" as string]: `${bpmPeriodSec}s`,
    opacity: player.timerDimFactor,
  } as CSSProperties;

  const breathLabel =
    breathPhase === "inhale"
      ? `${toTitleCaseWords("Inhale")}…`
      : breathPhase === "hold"
        ? `${toTitleCaseWords("Hold")}…`
        : breathPhase === "exhale"
          ? `${toTitleCaseWords("Exhale")}…`
          : "";

  return (
  <>
    <div className="vital-winddown-backdrop" aria-hidden />
    <div
      className={shellClass}
      style={shellStyle}
      onMouseMove={(e) => {
        setMouse({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        });
      }}
      role="dialog"
      aria-modal
      aria-label="Wind down sanctuary"
    >
      <div
        className="vital-winddown-stars"
        style={{
          transform: `translate(${(mouse.x - 0.5) * 12}px, ${(mouse.y - 0.5) * 8}px)`,
        }}
      />
      <div
        className="vital-winddown-moon"
        style={{
          transform: `translate(${(mouse.x - 0.5) * -18}px, ${(mouse.y - 0.5) * -10}px)`,
        }}
      />

      <header className="relative z-20 flex w-full max-w-2xl items-start justify-between gap-4 px-6 pt-8">
        <Moon className="h-8 w-8 text-amber-200/70" strokeWidth={1.25} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-100/70">
            {toTitleCaseWords("Circadian mode")}
          </span>
          <button
            type="button"
            aria-pressed={circadianOn}
            aria-label="Smart lighting toggle"
            onClick={handleCircadianToggle}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
              circadianOn
                ? "border-amber-300/60 bg-amber-400/20 text-amber-50"
                : "border-white/15 bg-white/5 text-amber-100/80 hover:bg-white/10"
            }`}
          >
            <Lamp className="h-4 w-4" />
            <span className="text-xs font-semibold">{circadianOn ? "On" : "Off"}</span>
          </button>
        </div>
      </header>

      <div className="relative z-20 flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        {flareActive ? (
          <div className="mb-6 max-h-32 w-full overflow-y-auto rounded-2xl border border-rose-300/25 bg-rose-950/40 p-4 text-left backdrop-blur-md">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-rose-200/90">
              {toTitleCaseWords("Health architect · flare recovery")}
            </p>
            <ArchitectMarkdown text={flareSummary} />
          </div>
        ) : null}

        <h1 className={`${FONT_PLAYFAIR} text-4xl font-bold italic text-amber-50 sm:text-5xl`}>
          {toTitleCaseWords("Time to disconnect.")}
        </h1>
        <p className="mt-3 text-sm text-amber-100/60">
          {toTitleCaseWords("Restful sanctuary · biophilic calm")}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!soundTrayOpen) {
                setSoundTrayOpen(true);
                setTrayMinimized(false);
                return;
              }
              if (trayMinimized) {
                setTrayMinimized(false);
                return;
              }
              setTrayMinimized(true);
            }}
            className="relative rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-amber-50/90 backdrop-blur-sm transition hover:bg-white/10"
          >
            {player.isLoading ? (
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            ) : null}
            🎵 {toTitleCaseWords("Soundscape")}
          </button>

          <button
            type="button"
            onClick={() => setBreathActive(true)}
            disabled={breathActive}
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-amber-50/90 backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-50"
          >
            🧘 {toTitleCaseWords("3-Minute Breathwork")}
          </button>

          <button
            type="button"
            onClick={() => setRestlessOpen(true)}
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-amber-50/90 backdrop-blur-sm transition hover:bg-white/10"
          >
            🌙 {toTitleCaseWords("Log restless thought")}
          </button>
        </div>

        {breathActive ? (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div
              key={breathPhase}
              className={`vital-winddown-breath-ring vital-winddown-breath-ring--${breathPhase}`}
            />
            <p className="text-lg font-medium tracking-wide text-amber-100/90">{breathLabel}</p>
            <button
              type="button"
              onClick={() => setBreathActive(false)}
              className="text-xs text-amber-200/50 underline-offset-2 hover:text-amber-100/80 hover:underline"
            >
              {toTitleCaseWords("End session")}
            </button>
          </div>
        ) : null}

        {restlessOpen ? (
          <div className="mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-100/60">
                {toTitleCaseWords("Release the thought")}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setRestlessOpen(false)}
                className="rounded-lg p-1 text-amber-200/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={restlessDraft}
              onChange={(e) => setRestlessDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitRestless();
                }
              }}
              rows={3}
              autoFocus
              placeholder="What’s on your mind? Press Enter to send it to BizNode…"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/30 focus:border-amber-300/30 focus:outline-none"
            />
          </div>
        ) : null}

        <p className="mt-auto max-w-md pt-10 text-xs leading-relaxed text-amber-100/45">
          Rest well. I&apos;ve already organized your{" "}
          <span className="text-amber-100/70">{momentumMode}</span> for tomorrow. You have nothing
          to worry about tonight.
        </p>
      </div>

      <SoundscapeTray
        open={soundTrayOpen}
        minimized={trayMinimized}
        onMinimize={() => setTrayMinimized(true)}
        onExpand={() => setTrayMinimized(false)}
        onClose={() => {
          setSoundTrayOpen(false);
          setTrayMinimized(false);
        }}
        nowPlaying={player.nowPlaying}
        isPlaying={player.isPlaying}
        isLoading={player.isLoading}
        loadingTrackId={loadingTrackId ?? player.loadingTrackId}
        sleepTimerId={player.sleepTimerId}
        timerRemainingMs={player.timerRemainingMs}
        onPlayTrack={(id) => void handlePlayTrack(id)}
        onSetTimer={player.scheduleSleepTimer}
      />

      <footer className="relative z-20 flex w-full flex-col items-center gap-3 px-6 pb-10 pt-4">
        <WaveformVisualizer
          active={player.isPlaying}
          getAnalyser={player.getAnalyser}
          className={soundTrayOpen && !trayMinimized ? "max-w-md" : undefined}
        />
        <button
          type="button"
          onClick={() => void handleExit()}
          className="mx-auto block rounded-full border border-white/10 bg-white/[0.04] px-10 py-3.5 text-sm font-medium text-amber-100/55 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-amber-50/80"
        >
          {toTitleCaseWords("Exit protocol")}
        </button>
      </footer>

      {flyingThought ? (
        <div className="vital-winddown-fly-thought" aria-hidden>
          {flyingThought}
        </div>
      ) : null}
    </div>
  </>
  );
}
