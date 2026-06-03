"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Mic, MicOff, Square } from "lucide-react";
import {
  pickScreenRecorderMime,
  saveScreenCapture,
} from "@/lib/vanode/screenCaptureStorage";
import type { ScreenCaptureRecord } from "@/lib/vanode/screenCaptureStorage";

type Props = {
  onComplete?: (payload: {
    blob: Blob;
    url: string;
    filename: string;
    includeMic: boolean;
    durationSec: number;
    record: ScreenCaptureRecord;
  }) => void;
  onError?: (message: string) => void;
  /** Called when a capture is persisted locally. */
  onSaved?: (record: ScreenCaptureRecord) => void;
};

async function buildRecordingStream(
  includeMic: boolean,
  onMicWarning?: (message: string) => void,
): Promise<{ stream: MediaStream; cleanup: () => void }> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const videoTracks = displayStream.getVideoTracks();
  const displayAudioTracks = displayStream.getAudioTracks();
  const combinedTracks: MediaStreamTrack[] = [...videoTracks];

  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;

  const cleanup = () => {
    displayStream.getTracks().forEach((t) => t.stop());
    micStream?.getTracks().forEach((t) => t.stop());
    void audioContext?.close();
  };

  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      if (displayAudioTracks.length > 0) {
        const displayAudioOnly = new MediaStream(displayAudioTracks);
        audioContext.createMediaStreamSource(displayAudioOnly).connect(dest);
      }

      micStream.getAudioTracks().forEach((track) => {
        audioContext!.createMediaStreamSource(new MediaStream([track])).connect(
          dest,
        );
      });

      dest.stream.getAudioTracks().forEach((t) => combinedTracks.push(t));
    } catch {
      displayAudioTracks.forEach((t) => combinedTracks.push(t));
      onMicWarning?.(
        "Microphone blocked — recording screen with system/tab audio only.",
      );
    }
  } else {
    displayAudioTracks.forEach((t) => combinedTracks.push(t));
  }

  return { stream: new MediaStream(combinedTracks), cleanup };
}

export function ScreenRecorder({ onComplete, onError, onSaved }: Props) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [includeMic, setIncludeMic] = useState(true);
  const [saving, setSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);
  const includeMicRef = useRef(includeMic);

  useEffect(() => {
    includeMicRef.current = includeMic;
  }, [includeMic]);

  const stopTracks = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    mediaRecorderRef.current?.stop();
    setActive(false);
    setSeconds(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { stream, cleanup } = await buildRecordingStream(
        includeMicRef.current,
        (msg) => onError?.(msg),
      );
      cleanupRef.current = cleanup;
      chunksRef.current = [];
      const { mimeType, ext } = pickScreenRecorderMime();
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        onError?.("Recording error.");
        stopTracks();
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `lifenode-capture-${stamp}.${ext}`;
        const url = URL.createObjectURL(blob);
        const durationSec = Math.max(1, durationRef.current || 1);
        const usedMic = includeMicRef.current;

        setSaving(true);
        try {
          const record = await saveScreenCapture(blob, {
            filename,
            mimeType,
            durationSec,
            includeMic: usedMic,
          });
          onSaved?.(record);
          onComplete?.({
            blob,
            url,
            filename,
            includeMic: usedMic,
            durationSec,
            record,
          });
        } catch {
          onError?.("Could not save capture locally — try downloading instead.");
          onComplete?.({
            blob,
            url,
            filename,
            includeMic: usedMic,
            durationSec,
            record: {
              id: "",
              filename,
              mimeType,
              createdAt: new Date().toISOString(),
              durationSec,
              includeMic: usedMic,
              sizeBytes: blob.size,
            },
          });
        } finally {
          setSaving(false);
        }

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        stopTracks();
      };

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopRecording();
      });

      rec.start(400);
      setActive(true);
      setSeconds(0);
      durationRef.current = 0;
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } catch {
      onError?.("Screen capture was cancelled or not permitted.");
      stopTracks();
    }
  }, [onComplete, onError, onSaved, stopRecording, stopTracks]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-teal-600"
          checked={includeMic}
          disabled={active || saving}
          onChange={(e) => setIncludeMic(e.target.checked)}
        />
        {includeMic ? (
          <Mic className="h-4 w-4 text-teal-600" aria-hidden />
        ) : (
          <MicOff className="h-4 w-4 text-slate-400" aria-hidden />
        )}
        <span>
          Include microphone{" "}
          <span className="text-xs text-slate-500">
            (narrate while you record)
          </span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => (active ? stopRecording() : startRecording())}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-500 disabled:opacity-50"
        >
          {active ? (
            <>
              <Square className="h-4 w-4 fill-current" strokeWidth={0} />
              Stop recording
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 fill-red-500 text-red-500" />
              {saving ? "Saving…" : "Record screen"}
            </>
          )}
        </button>
        {active && (
          <span className="text-xs font-medium tabular-nums text-slate-600">
            {Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}
            :{(seconds % 60).toString().padStart(2, "0")}
            {includeMic ? " · mic on" : " · screen only"}
          </span>
        )}
      </div>
      {active && (
        <div
          className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-2xl border border-white/25 bg-slate-900/75 px-4 py-3 text-white shadow-2xl backdrop-blur-xl"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <div className="text-sm font-medium">
            Recording{" "}
            <span className="tabular-nums text-white/80">
              {Math.floor(seconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(seconds % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs text-white/50">
            {includeMic ? "Screen + mic" : "Screen"} · LifeNode OS
          </span>
        </div>
      )}
    </div>
  );
}
