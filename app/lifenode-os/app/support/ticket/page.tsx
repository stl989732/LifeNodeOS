import Link from "next/link";
import ScaleSurveyEmbed from "@/src/components/settings/ScaleSurveyEmbed";
import { SUPPORT_TICKET_SURVEY_ID } from "@/lib/support/routes";

export const metadata = {
  title: "Ticket Escalation | LifeNode OS",
  description: "Submit a support ticket for LifeNode OS.",
};

export default function SupportTicketPage() {
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
            LifeNode OS Support
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Ticket escalation
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Submit a ticket for bugs, billing, or account issues. Our team will
            follow up by email.
          </p>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ScaleSurveyEmbed
            surveyId={SUPPORT_TICKET_SURVEY_ID}
            title="LifeNode OS support ticket"
            minHeight={960}
          />
        </div>
      </div>
    </div>
  );
}
