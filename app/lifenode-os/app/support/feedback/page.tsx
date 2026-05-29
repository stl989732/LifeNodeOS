import Link from "next/link";
import ScaleSurveyEmbed from "@/src/components/settings/ScaleSurveyEmbed";
import { SUPPORT_FEEDBACK_SURVEY_ID } from "@/lib/support/routes";

export const metadata = {
  title: "Feedback & Suggestions | LifeNodeOS",
  description: "Share feedback to help improve LifeNodeOS.",
};

export default function SupportFeedbackPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-10 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/shell"
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to hub
        </Link>
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">
            LifeNodeOS Support
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Feedback & suggestions
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Tell us what would make LifeNodeOS better for your workflow. Your
            responses help us prioritize what we build next.
          </p>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ScaleSurveyEmbed
            surveyId={SUPPORT_FEEDBACK_SURVEY_ID}
            title="LifeNodeOS feedback survey"
            minHeight={520}
          />
        </div>
      </div>
    </div>
  );
}
