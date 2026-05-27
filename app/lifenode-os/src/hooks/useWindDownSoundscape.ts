"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

export type SoundscapeId = "rain" | "piano" | "violin" | "nature-jazz" | "blues-waves";

export const SOUNDSCAPE_OPTIONS: { id: SoundscapeId; label: string; icon: string }[] = [
  { id: "rain", label: "Rain", icon: "🌧️" },
  { id: "piano", label: "Piano", icon: "🎹" },
  { id: "violin", label: "Violin", icon: "🎻" },
  { id: "nature-jazz", label: "Nature Jazz", icon: "🎷" },
  { id: "blues-waves", label: "Blues & Waves", icon: "🌊" },
];

const TARGET_GAIN = 0.2;
const FADE_IN_SEC = 3;

function makeNoiseBuffer(ctx: AudioContext, seconds: number, brown = false) {
  const len = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white * 0.35;
      }
    }
  }
  return buffer;
}

function connectNoiseLoop(
  ctx: AudioContext,
  dest: GainNode,
  brown: boolean,
  filterHz: number,
  gain = 0.55,
) {
  const buffer = makeNoiseBuffer(ctx, 6, brown);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(0);
  return () => {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

function scheduleSoftTone(
  ctx: AudioContext,
  dest: GainNode,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.07,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const peak = Math.max(vol, 0.001);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.1);
}

async function ensureAudioContext(ctxRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  let ctx = ctxRef.current;
  if (!ctx || ctx.state === "closed") {
    ctx = new Ctx();
    ctxRef.current = ctx;
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

export function useWindDownSoundscape() {
  const [activeId, setActiveId] = useState<SoundscapeId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const cleanupsRef = useRef<(() => void)[]>([]);
  const timersRef = useRef<number[]>([]);
  const closeTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const releaseSources = useCallback(() => {
    timersRef.current.forEach((t) => window.clearInterval(t));
    timersRef.current = [];
    cleanupsRef.current.forEach((fn) => fn());
    cleanupsRef.current = [];
  }, []);

  const stop = useCallback(() => {
    cancelCloseTimer();
    sessionRef.current += 1;
    const session = sessionRef.current;
    releaseSources();

    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
      } catch {
        /* ignore */
      }
    }

    closeTimerRef.current = window.setTimeout(() => {
      if (sessionRef.current !== session) return;
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      masterRef.current = null;
      closeTimerRef.current = null;
    }, 450);

    setActiveId(null);
    setIsPlaying(false);
  }, [cancelCloseTimer, releaseSources]);

  const startSoundscape = useCallback(
    async (id: SoundscapeId) => {
      cancelCloseTimer();
      sessionRef.current += 1;
      releaseSources();

      const ctx = await ensureAudioContext(ctxRef);
      if (!ctx) return;

      let master = masterRef.current;
      if (!master) {
        master = ctx.createGain();
        master.connect(ctx.destination);
        masterRef.current = master;
      }

      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(TARGET_GAIN, now + FADE_IN_SEC);

      const cleanups: (() => void)[] = [];

      if (id === "rain") {
        cleanups.push(connectNoiseLoop(ctx, master, false, 1200, 0.7));
      } else if (id === "piano") {
        const notes = [261.63, 329.63, 392.0, 523.25, 440, 349.23];
        let i = 0;
        const tick = () => {
          if (!ctxRef.current || ctxRef.current.state === "closed") return;
          scheduleSoftTone(ctx, master, notes[i % notes.length], ctx.currentTime, 2.4, "triangle", 0.09);
          i += 1;
        };
        tick();
        const interval = window.setInterval(tick, 2400);
        timersRef.current.push(interval);
        cleanups.push(() => window.clearInterval(interval));
      } else if (id === "violin") {
        const notes = [196, 220, 246.94, 293.66];
        let i = 0;
        const tick = () => {
          if (!ctxRef.current || ctxRef.current.state === "closed") return;
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const f = ctx.createBiquadFilter();
          osc.type = "sawtooth";
          osc.frequency.value = notes[i % notes.length];
          f.type = "lowpass";
          f.frequency.value = 1400;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 0.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
          osc.connect(f);
          f.connect(g);
          g.connect(master);
          osc.start(t);
          osc.stop(t + 4);
          i += 1;
        };
        tick();
        const interval = window.setInterval(tick, 3800);
        timersRef.current.push(interval);
        cleanups.push(() => window.clearInterval(interval));
      } else if (id === "nature-jazz") {
        cleanups.push(connectNoiseLoop(ctx, master, true, 700, 0.35));
        const bass = [82.41, 98, 110, 123.47];
        let i = 0;
        const tick = () => {
          if (!ctxRef.current || ctxRef.current.state === "closed") return;
          scheduleSoftTone(ctx, master, bass[i % bass.length], ctx.currentTime, 1.9, "sine", 0.05);
          i += 1;
        };
        tick();
        const interval = window.setInterval(tick, 2000);
        timersRef.current.push(interval);
        cleanups.push(() => window.clearInterval(interval));
      } else if (id === "blues-waves") {
        cleanups.push(connectNoiseLoop(ctx, master, true, 500, 0.4));
        const chords = [146.83, 174.61, 196, 220];
        let i = 0;
        const tick = () => {
          if (!ctxRef.current || ctxRef.current.state === "closed") return;
          scheduleSoftTone(ctx, master, chords[i % chords.length], ctx.currentTime, 2.9, "triangle", 0.065);
          i += 1;
        };
        tick();
        const interval = window.setInterval(tick, 3000);
        timersRef.current.push(interval);
        cleanups.push(() => window.clearInterval(interval));
      }

      cleanupsRef.current = cleanups;
      setActiveId(id);
      setIsPlaying(true);
    },
    [cancelCloseTimer, releaseSources],
  );

  const toggle = useCallback(
    (id: SoundscapeId) => {
      if (activeId === id && isPlaying) {
        stop();
        return;
      }
      void startSoundscape(id);
    },
    [activeId, isPlaying, startSoundscape, stop],
  );

  useEffect(() => {
    return () => {
      cancelCloseTimer();
      releaseSources();
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      masterRef.current = null;
    };
  }, [cancelCloseTimer, releaseSources]);

  return { activeId, isPlaying, play: startSoundscape, stop, toggle };
}
