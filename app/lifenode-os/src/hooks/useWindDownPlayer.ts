"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  findTrack,
  type SleepTimerId,
  type WindDownTrack,
} from "@/src/lib/windDownMusicList";
import { startSynthBed } from "@/src/lib/windDownSynth";

const FADE_IN_SEC = 3;
const TARGET_VOLUME = 0.2;
const EXIT_FADE_SEC = 3;
const TIMER_END_FADE_SEC = 5;
const STREAM_LOAD_TIMEOUT_MS = 12000;

export function useWindDownPlayer() {
  const [nowPlaying, setNowPlaying] = useState<WindDownTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [sleepTimerId, setSleepTimerId] = useState<SleepTimerId>("until-exit");
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState<number | null>(null);
  const [currentBpm, setCurrentBpm] = useState(60);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const synthCleanupRef = useRef<(() => void) | null>(null);
  const sleepTimeoutRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);
  const sessionRef = useRef(0);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current != null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const clearSleepTimeout = useCallback(() => {
    if (sleepTimeoutRef.current != null) {
      window.clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
  }, []);

  const clearTickInterval = useCallback(() => {
    if (tickIntervalRef.current != null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  const getCtx = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new Ctx();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const ensureMaster = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return null;
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = 0;
      masterRef.current = master;
    }
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      masterRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }
    return { ctx, master: masterRef.current };
  }, [getCtx]);

  const releaseSynth = useCallback(() => {
    synthCleanupRef.current?.();
    synthCleanupRef.current = null;
  }, []);

  const releaseStream = useCallback(() => {
    clearLoadTimeout();
    const audio = streamAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      streamAudioRef.current = null;
    }
    if (streamSourceRef.current) {
      try {
        streamSourceRef.current.disconnect();
      } catch {
        /* noop */
      }
      streamSourceRef.current = null;
    }
  }, [clearLoadTimeout]);

  const fadeMasterTo = useCallback((target: number, seconds: number) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(target, now + seconds);
      window.setTimeout(resolve, seconds * 1000 + 50);
    });
  }, []);

  const stop = useCallback(
    async (fadeSeconds = EXIT_FADE_SEC) => {
      sessionRef.current += 1;
      clearSleepTimeout();
      clearTickInterval();
      clearLoadTimeout();
      setTimerEndsAt(null);
      setTimerRemainingMs(null);

      await fadeMasterTo(0, fadeSeconds);
      releaseSynth();
      releaseStream();

      setNowPlaying(null);
      setIsPlaying(false);
      setIsLoading(false);
      setLoadingTrackId(null);
    },
    [clearLoadTimeout, clearSleepTimeout, clearTickInterval, fadeMasterTo, releaseStream, releaseSynth],
  );

  const startSynth = useCallback(
    async (track: WindDownTrack) => {
      if (!track.synthKey) return;
      const chain = await ensureMaster();
      if (!chain) return;
      const { ctx, master } = chain;
      releaseSynth();
      releaseStream();
      synthCleanupRef.current = startSynthBed(ctx, master, track.synthKey, track.id);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(TARGET_VOLUME, now + FADE_IN_SEC);
      setCurrentBpm(track.bpm);
      setNowPlaying(track);
      setIsPlaying(true);
      setIsLoading(false);
      setLoadingTrackId(null);
    },
    [ensureMaster, releaseStream, releaseSynth],
  );

  const startStream = useCallback(
    async (track: WindDownTrack) => {
      if (!track.url) return;
      const chain = await ensureMaster();
      if (!chain) {
        if (track.synthKey) await startSynth(track);
        return;
      }
      const { ctx, master } = chain;
      releaseSynth();
      releaseStream();

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.preload = "auto";
      streamAudioRef.current = audio;

      const finishWithSynth = () => {
        clearLoadTimeout();
        if (track.synthKey) {
          void startSynth(track);
        } else {
          setIsLoading(false);
          setLoadingTrackId(null);
        }
      };

      const onCanPlay = async () => {
        clearLoadTimeout();
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
        try {
          streamSourceRef.current = ctx.createMediaElementSource(audio);
          streamSourceRef.current.connect(master);
          const now = ctx.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(0, now);
          master.gain.linearRampToValueAtTime(TARGET_VOLUME, now + FADE_IN_SEC);
          await audio.play();
          setCurrentBpm(track.bpm);
          setNowPlaying(track);
          setIsPlaying(true);
          setIsLoading(false);
          setLoadingTrackId(null);
        } catch {
          finishWithSynth();
        }
      };

      const onError = () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
        finishWithSynth();
      };

      loadTimeoutRef.current = window.setTimeout(() => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
        finishWithSynth();
      }, STREAM_LOAD_TIMEOUT_MS);

      audio.addEventListener("canplay", onCanPlay);
      audio.addEventListener("error", onError);
      audio.src = track.url;
      audio.load();
    },
    [clearLoadTimeout, ensureMaster, releaseStream, releaseSynth, startSynth],
  );

  const playTrack = useCallback(
    async (trackId: string) => {
      const track = findTrack(trackId);
      if (!track) return;
      if (nowPlaying?.id === trackId && isPlaying) {
        await stop(EXIT_FADE_SEC);
        return;
      }
      sessionRef.current += 1;
      setIsLoading(true);
      setLoadingTrackId(trackId);

      if (track.synthKey && !track.url) {
        await startSynth(track);
        return;
      }
      if (track.url) {
        await startStream(track);
        return;
      }
      if (track.synthKey) {
        await startSynth(track);
      } else {
        setIsLoading(false);
        setLoadingTrackId(null);
      }
    },
    [isPlaying, nowPlaying?.id, startStream, startSynth, stop],
  );

  const scheduleSleepTimer = useCallback(
    (id: SleepTimerId) => {
      clearSleepTimeout();
      setSleepTimerId(id);
      if (id === "until-exit") {
        setTimerEndsAt(null);
        setTimerRemainingMs(null);
        return;
      }
      const minutes = Number(id);
      const endsAt = Date.now() + minutes * 60 * 1000;
      setTimerEndsAt(endsAt);
      setTimerRemainingMs(minutes * 60 * 1000);
      sleepTimeoutRef.current = window.setTimeout(() => {
        void stop(TIMER_END_FADE_SEC);
      }, minutes * 60 * 1000);
    },
    [clearSleepTimeout, stop],
  );

  useEffect(() => {
    if (!timerEndsAt || !isPlaying) {
      clearTickInterval();
      if (!timerEndsAt) setTimerRemainingMs(null);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, timerEndsAt - Date.now());
      setTimerRemainingMs(rem);
      if (rem <= 0) clearTickInterval();
    };
    tick();
    tickIntervalRef.current = window.setInterval(tick, 1000);
    return clearTickInterval;
  }, [timerEndsAt, isPlaying, clearTickInterval]);

  useEffect(() => {
    return () => {
      clearSleepTimeout();
      clearTickInterval();
      clearLoadTimeout();
      releaseSynth();
      releaseStream();
      try {
        ctxRef.current?.close();
      } catch {
        /* noop */
      }
    };
  }, [clearLoadTimeout, clearSleepTimeout, clearTickInterval, releaseStream, releaseSynth]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const timerDimFactor = (() => {
    if (!timerEndsAt || timerRemainingMs == null) return 1;
    const fiveMin = 5 * 60 * 1000;
    if (timerRemainingMs > fiveMin) return 1;
    return Math.max(0.08, timerRemainingMs / fiveMin);
  })();

  return {
    nowPlaying,
    isPlaying,
    isLoading,
    loadingTrackId,
    currentBpm,
    sleepTimerId,
    timerRemainingMs,
    timerDimFactor,
    playTrack,
    stop,
    scheduleSleepTimer,
    getAnalyser,
    audioRef: streamAudioRef,
  };
}
