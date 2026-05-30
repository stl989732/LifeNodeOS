"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, X } from "lucide-react";
import {
  getQualifyingQuestions,
  type QualifyingQuestion,
} from "@/src/lib/lifePulse/qualifyingQuestions";
import { filterQuestionsForPrompt } from "@/src/lib/lifePulse/filterQuestions";
import { domainLabel } from "@/src/lib/lifePulse/detectDomain";
import {
  generateLifePulseTracker,
  postLinosChat,
  type LinosPlanBlueprintPayload,
} from "@/src/lib/lifePulse/trackers";
import type { LifePulseCategoryId, LifePulseTracker } from "@/src/lib/lifePulse/types";
import { LIFE_PULSE_CATEGORIES } from "@/src/lib/lifePulse/types";
import DateTimeField from "@/src/components/ui/DateTimeField";
import {
  AURA_BTN_PRIMARY,
  AURA_GLASS_CLASS,
  AURA_GLASS_STYLE,
  AURA_INPUT_CLASS,
  AURA_TEXT,
} from "./lifePulseAura";

type ChatMessage = { role: "user" | "linos"; content: string };

type Props = {
  rawPrompt: string;
  categoryHint: LifePulseCategoryId;
  dueDateHint: string | null;
  onCancel: () => void;
  onTrackerCreated: (tracker: LifePulseTracker, domain: LifePulseCategoryId) => void;
};

type ChatPhase = "loading_intake" | "questions" | "loading_breakdown" | "breakdown" | "saving";

function resolveAnswers(
  questions: QualifyingQuestion[],
  answers: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const q of questions) {
    const raw = answers[q.id]?.trim();
    if (!raw) continue;
    if (q.type === "choice" && q.options) {
      if (q.allowMultiple) {
        const labels = raw
          .split(",")
          .map((id) => q.options!.find((o) => o.id === id)?.label ?? id)
          .filter(Boolean);
        resolved[q.prompt] = labels.join(", ");
      } else {
        const opt = q.options.find((o) => o.id === raw);
        resolved[q.prompt] = opt?.label ?? raw;
      }
    } else {
      resolved[q.prompt] = raw;
    }
    resolved[q.id] = raw;
  }
  return resolved;
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
  if (question.type === "date" || question.type === "datetime") {
    return (
      <DateTimeField
        label={question.prompt}
        value={question.type === "datetime" ? value : value ? `${value}T09:00` : ""}
        onChange={(next) => {
          if (question.type === "datetime") {
            onChange(next);
            return;
          }
          onChange(next ? next.slice(0, 10) : "");
        }}
        disabled={disabled}
        inputClassName={AURA_INPUT_CLASS}
        labelClassName={`text-sm font-medium normal-case tracking-normal ${AURA_TEXT.title}`}
      />
    );
  }

  if (question.type === "choice" && question.options?.length) {
    const selectedIds = value ? value.split(",").filter(Boolean) : [];
    return (
      <fieldset className="space-y-2">
        <legend className={`text-sm font-medium ${AURA_TEXT.title}`}>{question.prompt}</legend>
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
                onClick={() => {
                  if (question.allowMultiple) {
                    const next = selectedIds.includes(opt.id)
                      ? selectedIds.filter((id) => id !== opt.id)
                      : [...selectedIds, opt.id];
                    onChange(next.join(","));
                  } else {
                    onChange(opt.id);
                  }
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-950"
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
      <span className={`text-sm font-medium ${AURA_TEXT.title}`}>{question.prompt}</span>
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

export default function LinosChatPanel({
  rawPrompt,
  categoryHint,
  dueDateHint,
  onCancel,
  onTrackerCreated,
}: Props) {
  const [phase, setPhase] = useState<ChatPhase>("loading_intake");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeDomain, setActiveDomain] = useState<LifePulseCategoryId | null>(null);
  const [questions, setQuestions] = useState<QualifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [blueprint, setBlueprint] = useState<LinosPlanBlueprintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBreakdown = useCallback(
    async (domain: LifePulseCategoryId, resolvedAnswers: Record<string, string>) => {
      setPhase("loading_breakdown");
      setError(null);
      try {
        const data = (await postLinosChat({
          phase: "breakdown",
          rawPrompt,
          domain,
          qualifyingAnswers: resolvedAnswers,
        })) as {
          messages: ChatMessage[];
          blueprint: LinosPlanBlueprintPayload;
          ready_to_save: boolean;
        };

        setMessages((prev) => {
          const linosMsg = data.messages?.find((m) => m.role === "linos");
          if (linosMsg) return [...prev, linosMsg];
          return prev;
        });
        setBlueprint(data.blueprint);
        setPhase("breakdown");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Breakdown failed.");
        setPhase("questions");
      }
    },
    [rawPrompt],
  );

  const startIntake = useCallback(async () => {
    setPhase("loading_intake");
    setError(null);
    try {
      const data = (await postLinosChat({
        phase: "intake",
        rawPrompt,
        categoryHint,
      })) as {
        domain: LifePulseCategoryId;
        messages: ChatMessage[];
        questions: QualifyingQuestion[];
      };

      setActiveDomain(data.domain);
      setMessages(data.messages ?? []);
      const qs = filterQuestionsForPrompt(
        data.questions?.length
          ? data.questions
          : getQualifyingQuestions(data.domain, rawPrompt),
        rawPrompt,
      ).slice(0, 3);
      setQuestions(qs);
      setPhase(qs.length > 0 ? "questions" : "loading_breakdown");
      if (qs.length === 0) {
        await runBreakdown(data.domain, {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach Linos.");
      setPhase("questions");
    }
  }, [rawPrompt, categoryHint, runBreakdown]);

  useEffect(() => {
    void startIntake();
  }, [startIntake]);

  function canAnswerSubmit(): boolean {
    return questions.every((q) => {
      if (!q.required) return true;
      return Boolean(answers[q.id]?.trim());
    });
  }

  async function handleContinue() {
    if (!activeDomain) return;
    const resolved = resolveAnswers(questions, answers);
    await runBreakdown(activeDomain, resolved);
  }

  async function handleSaveToTable() {
    if (!activeDomain || !blueprint) return;
    setPhase("saving");
    setError(null);
    try {
      const resolved = resolveAnswers(questions, answers);
      const tracker = await generateLifePulseTracker({
        rawPrompt,
        category: activeDomain,
        due_date: blueprint.due_date_iso ?? dueDateHint,
        qualifyingAnswers: resolved,
        planBlueprint: blueprint,
      });
      onTrackerCreated(tracker, activeDomain);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save plan.");
      setPhase("breakdown");
    }
  }

  const domainEmoji =
    LIFE_PULSE_CATEGORIES.find((c) => c.id === activeDomain)?.emoji ?? "✨";

  return (
    <div
      className={`mt-3 flex flex-col ${AURA_GLASS_CLASS}`}
      style={AURA_GLASS_STYLE}
      role="region"
      aria-label="Linos conversation"
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/15 p-4">
        <div>
          <p className={`text-xs font-bold uppercase tracking-widest ${AURA_TEXT.label}`}>
            Linos · Your planning companion
          </p>
          {activeDomain ? (
            <p className={`mt-1 text-sm ${AURA_TEXT.body}`}>
              {domainEmoji} Focus: <span className="font-semibold">{domainLabel(activeDomain)}</span>
              {" "}— only relevant questions below.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-500 hover:bg-white/30"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-slate-800/90 text-white"
                  : "border border-white/20 bg-white/25 text-slate-900"
              }`}
            >
              {m.role === "linos" ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    h2: ({ children }) => (
                      <h2 className="mb-2 mt-3 text-base font-bold text-slate-900">{children}</h2>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {(phase === "loading_intake" || phase === "loading_breakdown") && (
          <div className={`flex items-center gap-2 text-sm ${AURA_TEXT.muted}`}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {phase === "loading_intake" ? "Linos is reading your goal…" : "Linos is writing your plan…"}
          </div>
        )}

        {error ? (
          <p className="rounded-lg border border-rose-200/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}

        {phase === "questions" && activeDomain && questions.length > 0 ? (
          <div
            className="space-y-4 rounded-xl border border-violet-200/30 bg-violet-500/5 p-4 transition-opacity duration-300"
          >
            <p className={`text-xs font-bold uppercase tracking-wide text-violet-900/80`}>
              {activeDomain === "events" || activeDomain === "travel"
                ? "Trip & event details for your plan"
                : `A few details for your ${domainLabel(activeDomain)} plan`}
            </p>
            {questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.id] ?? ""}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                disabled={phase !== "questions"}
              />
            ))}
            <button
              type="button"
              disabled={!canAnswerSubmit() || phase !== "questions"}
              onClick={() => void handleContinue()}
              className={`${AURA_BTN_PRIMARY} w-full justify-center`}
            >
              <Sparkles className="h-4 w-4" />
              Create / Continue — show my full plan
            </button>
          </div>
        ) : null}

        {phase === "breakdown" && blueprint ? (
          <div className="border-t border-white/15 pt-4">
            <button
              type="button"
              onClick={() => void handleSaveToTable()}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-violet-500 hover:to-indigo-500"
            >
              ✨ Generate &amp; Save to LifeNode OS Plan Table
            </button>
            <p className={`mt-2 text-center text-[10px] ${AURA_TEXT.muted}`}>
              Your plan table will populate only after you confirm — nothing is saved until then.
            </p>
          </div>
        ) : null}

        {phase === "saving" ? (
          <div className={`flex items-center justify-center gap-2 py-4 text-sm ${AURA_TEXT.body}`}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving to your Plan Table…
          </div>
        ) : null}
      </div>
    </div>
  );
}
