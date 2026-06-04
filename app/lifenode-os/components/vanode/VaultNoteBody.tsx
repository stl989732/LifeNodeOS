"use client";

import { useMemo } from "react";
import { parseVaultNoteParts } from "@/lib/vanode/renderVaultNote";

export function VaultNoteBody({ body }: { body: string }) {
  const parts = useMemo(() => parseVaultNoteParts(body), [body]);

  return (
    <div className="mt-2 space-y-2">
      {parts.map((part, i) =>
        part.type === "image" ? (
          <figure key={i} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            <img
              src={part.src}
              alt={part.alt}
              className="max-h-[min(420px,60vh)] w-full object-contain"
            />
            {part.alt ? (
              <figcaption className="px-3 py-1.5 text-[11px] text-slate-500">
                {part.alt}
              </figcaption>
            ) : null}
          </figure>
        ) : (
          <p key={i} className="whitespace-pre-wrap text-sm text-slate-700">
            {part.text}
          </p>
        ),
      )}
    </div>
  );
}
