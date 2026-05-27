/** Web Audio synth beds for Wind Down — per-track variation when streams fail. */

import type { WindDownTrack } from "@/src/lib/windDownMusicList";

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
  gain: number,
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
      /* noop */
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

function startPianoPattern(
  ctx: AudioContext,
  master: GainNode,
  notes: number[],
  intervalMs: number,
  vol = 0.09,
) {
  let i = 0;
  const tick = () => {
    scheduleSoftTone(ctx, master, notes[i % notes.length], ctx.currentTime, 2.4, "triangle", vol);
    i += 1;
  };
  tick();
  const id = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(id);
}

function startViolinPattern(
  ctx: AudioContext,
  master: GainNode,
  notes: number[],
  intervalMs: number,
) {
  let i = 0;
  const tick = () => {
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
  const id = window.setInterval(tick, intervalMs);
  return () => window.clearInterval(id);
}

const PIANO_PROFILES: Record<string, { notes: number[]; interval: number; vol?: number }> = {
  "clair-de-lune": { notes: [329.63, 392, 440, 523.25, 587.33, 659.25], interval: 3100, vol: 0.08 },
  "gymnopedie-1": { notes: [392, 349.23, 329.63, 293.66, 261.63], interval: 2700, vol: 0.085 },
  "prelude-e-minor": { notes: [329.63, 311.13, 293.66, 277.18, 261.63], interval: 2500, vol: 0.09 },
  "moonlight-1st": { notes: [220, 246.94, 261.63, 293.66, 329.63], interval: 3400, vol: 0.075 },
  "piano-synth-fallback": { notes: [261.63, 329.63, 392, 523.25, 440, 349.23], interval: 2400 },
};

const VIOLIN_PROFILES: Record<string, { notes: number[]; interval: number }> = {
  "canon-in-d": { notes: [196, 220, 246.94, 293.66, 329.63], interval: 3600 },
  "air-on-g": { notes: [174.61, 196, 220, 246.94, 293.66], interval: 4000 },
  "vivaldi-winter-largo": { notes: [146.83, 164.81, 196, 220, 246.94], interval: 4200 },
  "violin-synth-fallback": { notes: [196, 220, 246.94, 293.66], interval: 3800 },
};

export function startSynthBed(
  ctx: AudioContext,
  master: GainNode,
  key: NonNullable<WindDownTrack["synthKey"]>,
  trackId?: string,
): () => void {
  const cleanups: (() => void)[] = [];

  if (key === "rain") {
    cleanups.push(connectNoiseLoop(ctx, master, false, 1200, 0.65));
  } else if (key === "forest") {
    cleanups.push(connectNoiseLoop(ctx, master, true, 800, 0.4));
    const birds = () =>
      scheduleSoftTone(ctx, master, 1800 + Math.random() * 400, ctx.currentTime, 0.15, "sine", 0.02);
    birds();
    const id = window.setInterval(birds, 4200);
    cleanups.push(() => window.clearInterval(id));
  } else if (key === "ocean") {
    cleanups.push(connectNoiseLoop(ctx, master, true, 450, 0.5));
  } else if (key === "night") {
    cleanups.push(connectNoiseLoop(ctx, master, true, 600, 0.25));
    const chirp = () =>
      scheduleSoftTone(ctx, master, 3200 + Math.random() * 800, ctx.currentTime, 0.08, "sine", 0.015);
    chirp();
    const id = window.setInterval(chirp, 2800);
    cleanups.push(() => window.clearInterval(id));
  } else if (key === "piano") {
    const profile = (trackId && PIANO_PROFILES[trackId]) || PIANO_PROFILES["piano-synth-fallback"];
    cleanups.push(startPianoPattern(ctx, master, profile.notes, profile.interval, profile.vol));
  } else if (key === "violin") {
    const profile = (trackId && VIOLIN_PROFILES[trackId]) || VIOLIN_PROFILES["violin-synth-fallback"];
    cleanups.push(startViolinPattern(ctx, master, profile.notes, profile.interval));
  } else if (key === "nature-jazz") {
    cleanups.push(connectNoiseLoop(ctx, master, true, 700, 0.3));
    const bass = trackId === "jazz-mixkit" ? [73.42, 87.31, 98, 110] : [82.41, 98, 110, 123.47];
    let i = 0;
    const tick = () => {
      scheduleSoftTone(ctx, master, bass[i % bass.length], ctx.currentTime, 1.9, "sine", 0.05);
      i += 1;
    };
    tick();
    const id = window.setInterval(tick, trackId === "jazz-mixkit" ? 1800 : 2000);
    cleanups.push(() => window.clearInterval(id));
  }

  return () => cleanups.forEach((fn) => fn());
}
