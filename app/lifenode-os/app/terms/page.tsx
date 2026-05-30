import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions | LifeNode OS",
  description: "Read the terms of service governing the usage of LifeNode OS.",
};

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#0B0F19] font-sans text-slate-200 selection:bg-cyan-500/30 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="group mb-12 inline-flex items-center text-sm text-slate-400 transition-colors hover:text-white"
        >
          <span className="mr-2 transition-transform group-hover:-translate-x-1">
            ←
          </span>{" "}
          Back to app
        </Link>

        <header className="mb-12 border-b border-slate-800 pb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
            LifeNode OS
          </p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
            Terms and Conditions
          </h1>
          <p className="text-sm text-slate-400">Effective Date: May 28, 2026</p>
        </header>

        <div className="space-y-8 leading-relaxed text-slate-300">
          <p>
            Welcome to <strong className="text-white">LifeNode OS</strong>! By
            accessing or using our web application located at{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              lifenodeos.com
            </code>
            , you agree to be bound by these Terms and Conditions. If you do not
            agree to all terms, please do not use the service.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              1. Account Registration &amp; Security
            </h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                To use certain features, you must create an account. You agree to
                provide accurate, complete information.
              </li>
              <li>
                You are entirely responsible for maintaining the confidentiality of
                your login credentials and for all activities that occur under your
                account.
              </li>
              <li>
                You must notify us immediately of any unauthorized use or security
                breaches.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              2. Acceptable Use Policy
            </h2>
            <p>
              You agree <strong className="font-medium text-white">not</strong> to
              use LifeNode OS to:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                Violate any applicable local, state, national, or international
                laws.
              </li>
              <li>
                Upload, transmit, or distribute malicious code, viruses, or software
                intended to damage or alter computer systems.
              </li>
              <li>
                Interfere with, disrupt, or create an undue burden on the servers or
                networks connected to the application.
              </li>
              <li>
                Attempt to gain unauthorized access to other users&apos; accounts or
                data.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              3. Intellectual Property
            </h2>
            <p>
              <strong className="text-slate-200">Our Property:</strong> LifeNode OS,
              including its branding, original software code, user interface designs,
              logos, and visual elements, is the exclusive intellectual property of
              LifeNode OS and is protected by copyright and trademark laws.
            </p>
            <p>
              <strong className="text-slate-200">Your Property:</strong> You retain
              all ownership rights to the data, content, and workspace configurations
              you upload or create within the platform. By using the app, you grant
              us a worldwide, non-exclusive license to process your data solely for
              the purpose of providing the service to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              4. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, LifeNode OS shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, including loss of profits, data, use, goodwill, or other
              intangible losses resulting from your access to or inability to use the
              service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              5. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your access to LifeNode OS
              at our sole discretion, without notice, for conduct that we believe
              violates these Terms or is harmful to other users or our business
              interests.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              6. Modifications to the Service and Terms
            </h2>
            <p>
              We reserve the right to modify or discontinue LifeNode OS (or any part
              thereof) at any time. We may also update these Terms periodically.
              Continued use of the platform after updates implies acceptance of the
              revised Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
