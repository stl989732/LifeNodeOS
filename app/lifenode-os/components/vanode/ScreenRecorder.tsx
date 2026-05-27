"use client";

import { useCallback, useRef, useState } from "react";
import { Circle, Square } from "lucide-react";

type Props = {
  onComplete: (payload: { blob: Blob; url: string; filename: string }) => void;
  onError?: (message: string) => void;
};

export function ScreenRecorder({ onComplete, onError }: Props) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        onError?.("Recording error.");
        stopTracks();
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const filename = `lifenode-screen-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.webm`;
        onComplete({ blob, url, filename });
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        stopTracks();
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });
      rec.start(400);
      setActive(true);
      setSeconds(0);
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      onError?.("Screen capture was cancelled or not permitted.");
      stopTracks();
    }
  }, [onComplete, onError, stopRecording, stopTracks]);

  return (
    <>
      <button
        type="button"
        onClick={() => (active ? stopRecording() : startRecording())}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-500"
      >
        {active ? (
          <>
            <Square className="h-4 w-4 fill-current" strokeWidth={0} />
            Stop recording
          </>
        ) : (
          <>
            <Circle className="h-4 w-4 fill-red-500 text-red-500" />
            Record screen
          </>
        )}
      </button>
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
          <span className="text-xs text-white/50">Drag-free · LifeNode OS</span>
        </div>
      )}
    </>
  );
}
