"use client";

import { useState } from "react";
import Link from "next/link";
import ScaleSurveyEmbed from "@/src/components/settings/ScaleSurveyEmbed";
import {
  SUPPORT_FEEDBACK_SURVEY_ID,
  SUPPORT_TICKET_SURVEY_ID,
  supportSurveyResponsesUrl,
} from "@/lib/support/routes";

type Tab = "feedback" | "ticket";

export default function AdminSupportSection() {
  const [tab, setTab] = useState<Tab>("feedback");

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Feedback, Complaints & Feature Requests
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Same GoHighLevel / Verpexx survey embeds users see under Support. New
            submissions appear in your survey dashboard — enable email alerts there
            so you are notified without checking this page daily.
          </p>
        </div>
        <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("feedback")}
            className={`rounded-full px-3 py-1.5 transition ${
              tab === "feedback"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Feedback & features
          </button>
          <button
            type="button"
            onClick={() => setTab("ticket")}
            className={`rounded-full px-3 py-1.5 transition ${
              tab === "ticket"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tickets & complaints
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a
          href={supportSurveyResponsesUrl(
            tab === "feedback"
              ? SUPPORT_FEEDBACK_SURVEY_ID
              : SUPPORT_TICKET_SURVEY_ID,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-teal-800 underline-offset-2 hover:underline"
        >
          Open survey responses in Verpexx →
        </a>
        <Link
          href={tab === "feedback" ? "/support/feedback" : "/support/ticket"}
          className="text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Preview public page
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {tab === "feedback" ? (
          <ScaleSurveyEmbed
            surveyId={SUPPORT_FEEDBACK_SURVEY_ID}
            title="LifeNode OS feedback survey"
            minHeight={720}
          />
        ) : (
          <ScaleSurveyEmbed
            surveyId={SUPPORT_TICKET_SURVEY_ID}
            title="LifeNode OS support ticket"
            minHeight={720}
          />
        )}
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold text-slate-900">
          What to configure in GoHighLevel (your side)
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Log into your GoHighLevel / Verpexx Scale account (forms host:{" "}
            <code className="rounded bg-white px-1 text-xs">scale.verpexxsystems.dev</code>
            ).
          </li>
          <li>
            Open the survey with ID{" "}
            <code className="rounded bg-white px-1 text-xs">
              {SUPPORT_FEEDBACK_SURVEY_ID}
            </code>{" "}
            (feedback) or{" "}
            <code className="rounded bg-white px-1 text-xs">
              {SUPPORT_TICKET_SURVEY_ID}
            </code>{" "}
            (tickets) — these match the public Support menu links.
          </li>
          <li>
            Turn on <strong>email notifications</strong> (or Slack/webhook) for new
            submissions so complaints and feature requests reach you immediately.
          </li>
          <li>
            Optional: set{" "}
            <code className="rounded bg-white px-1 text-xs">
              LIFENODE_SUPPORT_SURVEY_HOST
            </code>{" "}
            in Vercel if your embed domain changes; no code deploy needed for new
            survey IDs — update{" "}
            <code className="rounded bg-white px-1 text-xs">lib/support/routes.ts</code>.
          </li>
        </ol>
      </details>
    </section>
  );
}
