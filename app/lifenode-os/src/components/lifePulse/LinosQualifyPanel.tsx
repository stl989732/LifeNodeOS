"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  getQualifyingQuestions,
  type QualifyingQuestion,
} from "@/src/lib/lifePulse/qualifyingQuestions";
import type { LifePulseCategoryId } from "@/src/lib/lifePulse/types";
import { AURA_BTN_PRIMARY, AURA_GLASS_CLASS, AURA_GLASS_STYLE, AURA_INPUT_CLASS, AURA_TEXT } from "./lifePulseAura";

type Props = {
  rawPrompt: string;
  category: LifePulseCategoryId;
  generating: boolean;
  onCancel: () => void;
  onSubmit: (answers: Record<string, string>) => void;
};

export default function LinosQualifyPanel({
  rawPrompt,
  category,
  generating,
  onCancel,
  onSubmit,
}: Props) {
  const questions = useMemo(
    () => getQualifyingQuestions(category, rawPrompt),
    [category, rawPrompt],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function canSubmit(): boolean {
    return questions.every((q) => {
      if (!q.required) return true;
      return Boolean(answers[q.id]?.trim());
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit()) return;
    onSubmit(answers);
  }

  return (
    <div
      className={`mt-3 p-4 ${AURA_GLASS_CLASS}`}
      style={AURA_GLASS_STYLE}
      role="dialog"
      aria-label="Linos qualifying questions"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest ${AURA_TEXT.label}`}>
            Linos needs a bit more context
          </p>
          <p className={`mt-1 text-sm ${AURA_TEXT.body}`}>
            Answer these so your plan fits your goal — then Linos will fill your plan
            table automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={generating}
          className="rounded-lg p-1 text-slate-500 hover:bg-white/30"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(v) => setAnswer(q.id, v)}
            disabled={generating}
          />
        ))}
        <button
          type="submit"
          disabled={generating || !canSubmit()}
          className={`${AURA_BTN_PRIMARY} w-full justify-center`}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? "Building your plan…" : "Generate plan with Linos"}
        </button>
      </form>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QualifyingQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  if (question.type === "date") {
    return (
      <label className="block space-y-1.5">
        <span className={`text-sm font-semibold ${AURA_TEXT.title}`}>
          {question.prompt}
        </span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={question.required}
          className={AURA_INPUT_CLASS}
        />
      </label>
    );
  }

  if (question.type === "choice" && question.options?.length) {
    const selectedIds = value ? value.split(",").filter(Boolean) : [];

    function toggleOption(optId: string) {
      if (question.allowMultiple) {
        const next = selectedIds.includes(optId)
          ? selectedIds.filter((id) => id !== optId)
          : [...selectedIds, optId];
        onChange(next.join(","));
      } else {
        onChange(optId);
      }
    }

    return (
      <fieldset className="space-y-2">
        <legend className={`text-sm font-semibold ${AURA_TEXT.title}`}>
          {question.prompt}
        </legend>
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => {
            const selected = question.allowMultiple
              ? selectedIds.includes(opt.id)
              : value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleOption(opt.id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                  selected
                    ? "border-teal-500/60 bg-teal-500/15 text-teal-900"
                    : "border-white/25 bg-white/20 text-slate-800 hover:bg-white/35"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="block space-y-1.5">
      <span className={`text-sm font-semibold ${AURA_TEXT.title}`}>
        {question.prompt}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        disabled={disabled}
        className={AURA_INPUT_CLASS}
      />
    </label>
  );
}
