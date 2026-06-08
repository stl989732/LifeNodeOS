"use client";

import { useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJI_GROUPS = [
  ["😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😍", "🥰", "😘"],
  ["👍", "👏", "🙌", "💪", "🎉", "✨", "🔥", "⭐", "💯", "✅"],
  ["❤️", "💙", "💚", "💛", "💜", "🧡", "🖤", "🤍", "💕", "💖"],
  ["📅", "⏰", "📝", "📌", "🎯", "🚀", "💼", "🏠", "✈️", "🍽️"],
  ["☕", "🍷", "🥂", "🍕", "🍔", "🌮", "🍰", "🎂", "🍎", "🥗"],
];

type Props = {
  onPick: (emoji: string) => void;
  className?: string;
};

export default function EmojiPickerButton({ onPick, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Insert emoji"
        title="Insert emoji"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300/80 bg-white/60 text-slate-700 shadow-sm transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-900"
        onClick={() => setOpen((v) => !v)}
      >
        <Smile className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-transparent"
            aria-label="Close emoji picker"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full right-0 z-[121] mb-2 w-[min(240px,calc(100vw-2rem))] rounded-xl border border-slate-200/90 bg-white p-2 shadow-xl">
            {EMOJI_GROUPS.map((row, idx) => (
              <div key={idx} className="flex flex-wrap gap-1">
                {row.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition hover:bg-slate-100"
                    onClick={() => {
                      onPick(emoji);
                      setOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
