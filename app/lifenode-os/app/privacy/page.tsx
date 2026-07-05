import Link from "next/link";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

export const metadata = {
  title: "Privacy Policy | LifeNode OS",
  description: "Learn how LifeNode OS protects and handles your personal data.",
};

export default function PrivacyPolicy() {
  return (
    <div className={`min-h-screen bg-[#0B0F19] ${FONT_OUTFIT} text-slate-200 selection:bg-cyan-500/30 px-4 py-16 sm:px-6 lg:px-8`}>
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
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400">
            Effective Date: May 28, 2026 | Last Updated: May 28, 2026
          </p>
        </header>

        <div className="space-y-8 leading-relaxed text-slate-300">
          <p>
            At <strong className="text-white">LifeNode OS</strong>, accessible via{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-sm text-cyan-300">
              lifenodeos.com
            </code>
            , protecting your privacy is one of our main priorities. This Privacy
            Policy outlines the types of information we collect, how we use it, and
            how we keep your data secure.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              1. Information We Collect
            </h2>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                <strong className="text-slate-200">Account Information:</strong>{" "}
                When you register, we collect personal information such as your
                name, email address, and authentication credentials.
              </li>
              <li>
                <strong className="text-slate-200">User-Generated Data:</strong>{" "}
                We process the text, files, configurations, and workspace data you
                input into LifeNode OS to provide the orchestration and automation
                services.
              </li>
              <li>
                <strong className="text-slate-200">Log and Usage Data:</strong> We
                automatically collect standard information sent by your browser or
                device, including your IP address, browser type, pages visited, and
                timestamps.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              2. How We Use Your Information
            </h2>
            <p>We use the collected data to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Provide, operate, and maintain the features of LifeNode OS.</li>
              <li>
                Improve, personalize, and expand our application&apos;s
                functionality.
              </li>
              <li>
                Process transactions, manage user accounts, and handle password
                recovery.
              </li>
              <li>
                Communicate with you regarding updates, security alerts, and
                support.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              3. Data Sharing and Third-Party Services
            </h2>
            <p>
              We do not sell your personal data. We only share information with
              trusted third-party services necessary to run our platform,
              including:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                <strong className="text-slate-200">
                  Hosting &amp; Infrastructure:
                </strong>{" "}
                Cloud providers (e.g., Vercel, Google Cloud) and database
                management systems.
              </li>
              <li>
                <strong className="text-slate-200">
                  Authentication &amp; Email Providers:
                </strong>{" "}
                Services used to manage secure logins and dispatch system emails
                (e.g., transactional email APIs).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              4. Data Security
            </h2>
            <p>
              We implement industry-standard technical and organizational security
              measures to protect your data from unauthorized access, alteration, or
              disclosure. However, no method of transmission over the internet is
              100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              5. Your Rights
            </h2>
            <p>
              Depending on your location, you may have the right to access, update,
              correct, or delete your personal data. You can manage most account
              settings directly within the app interface or contact us for
              assistance.
            </p>
          </section>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
          <Link
            href="/terms"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
          >
            Terms of Use
          </Link>
          <Link
            href="/cookie-policy"
            className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400"
          >
            Cookie Policy
          </Link>
          <ConsentPreferencesLink className="underline decoration-slate-600 underline-offset-4 transition-colors hover:text-cyan-400" />
        </footer>
      </div>
    </div>
  );
}
