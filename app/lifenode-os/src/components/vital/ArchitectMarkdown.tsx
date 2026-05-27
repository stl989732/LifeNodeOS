"use client";

/** Minimal markdown for Health Architect output (bold, headers, hr). */
export default function ArchitectMarkdown({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-xs text-slate-500">No output yet.</p>;
  }

  const blocks = text.split(/\n---\n/);

  return (
    <div className="max-h-52 space-y-3 overflow-y-auto text-sm leading-relaxed text-slate-800">
      {blocks.map((block, bi) => (
        <div key={bi} className="space-y-2">
          {block.split("\n").map((line, li) => {
            const t = line.trim();
            if (!t) return null;
            if (t.startsWith("### ")) {
              return (
                <h4 key={li} className="text-sm font-bold text-slate-900">
                  {inlineBold(t.slice(4))}
                </h4>
              );
            }
            if (t.startsWith("*") && t.endsWith("*") && !t.startsWith("**")) {
              return (
                <p key={li} className="text-xs italic text-slate-500">
                  {t.replace(/^\*|\*$/g, "")}
                </p>
              );
            }
            return (
              <p key={li} className="text-sm text-slate-700">
                {inlineBold(t)}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function inlineBold(text: string) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
