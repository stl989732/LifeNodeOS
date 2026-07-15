import Link from "next/link";
import ConsentPreferencesLink from "@/src/components/legal/ConsentPreferencesLink";

const FONT_OUTFIT = "font-[family-name:var(--font-outfit)]";

export const metadata = {
  title: "Privacy Policy | LifeNode OS",
  description:
    "How LifeNode OS collects, uses, and protects personal data, including Google API / Limited Use disclosures.",
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
            Effective Date: May 28, 2026 | Last Updated: July 15, 2026
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
              <li>
                <strong className="text-slate-200">
                  Google Account Data (optional integrations):
                </strong>{" "}
                If you connect Google services through LifeNode OS, we access only
                the Google user data described in Section 6, and only after you
                grant consent on Google&apos;s OAuth screen.
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
              <li>
                Operate optional Google integrations (Calendar, Gmail, and Drive)
                as described in Section 6.
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
                management systems (e.g., Supabase / PostgreSQL).
              </li>
              <li>
                <strong className="text-slate-200">
                  Authentication &amp; Email Providers:
                </strong>{" "}
                Services used to manage secure logins and dispatch system emails
                (e.g., transactional email APIs).
              </li>
              <li>
                <strong className="text-slate-200">Google APIs:</strong> When you
                connect Google Calendar, Gmail, or Google Drive, LifeNode OS
                exchanges OAuth tokens with Google to provide those features. We
                do not sell Google user data to data brokers or advertisers.
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
            <p>
              OAuth access and refresh tokens for Google integrations are stored
              server-side (not in client-side localStorage), transmitted over HTTPS,
              and scoped to your LifeNode OS account. API routes that use those
              tokens authenticate your session before reading or writing data.
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
            <p>
              You may disconnect Google integrations at any time from Connected
              Apps / Inbox / Calendar surfaces in LifeNode OS, and you may revoke
              LifeNode OS access from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-cyan-400 underline decoration-slate-600 underline-offset-4 hover:text-cyan-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Account permissions
              </a>
              .
            </p>
          </section>

          <section id="google-api-data" className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight text-white">
              6. Google API User Data
            </h2>
            <p>
              LifeNode OS uses Google OAuth and Google APIs only when you
              explicitly connect an integration. Sign-in with Google (identity
              only) is separate from Calendar, Gmail, and Drive connectors.
            </p>

            <h3 className="text-lg font-medium text-slate-100">
              6.1 Data access (what we access)
            </h3>
            <p>
              Subject to the scopes you approve on Google&apos;s consent screen,
              LifeNode OS may access:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                <strong className="text-slate-200">Google Calendar:</strong>{" "}
                Calendar event data (such as titles, times, descriptions, and
                attendees as provided by the API) needed to sync and display your
                schedule in LifeNode OS, and to create events you initiate in the
                app.
              </li>
              <li>
                <strong className="text-slate-200">Gmail:</strong> Message
                metadata and content (and related labels/settings as needed) to
                power Inbox sync, unread/urgent monitoring, archiving/label
                updates you initiate, and compose/reply you initiate.
              </li>
              <li>
                <strong className="text-slate-200">Google Drive:</strong> File
                metadata and content available under the read-only Drive scopes you
                approve, when Drive is connected, so you can browse or link
                existing files to workspace items. We do not request full Drive
                or Google Docs edit/delete scopes for this product.
              </li>
              <li>
                <strong className="text-slate-200">Account email:</strong> Your
                Google account email address associated with a connection, when
                requested via userinfo scopes, so we can identify which Google
                account is linked.
              </li>
            </ul>
            <p>
              We may process both raw Google user data retrieved from these APIs
              and aggregated signals derived from it (for example, unread counts
              or schedule conflict counts) solely to operate those user-facing
              features.
            </p>

            <h3 className="text-lg font-medium text-slate-100">
              6.2 Data use (how we use it)
            </h3>
            <p>Google user data is used only to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                Provide and improve user-facing LifeNode OS features you enable
                (unified Calendar, Inbox productivity, optional Drive linking).
              </li>
              <li>
                Sync display state in your account (for example, inbox items and
                calendar events stored in your LifeNode OS workspace).
              </li>
              <li>
                Perform write-backs you explicitly trigger (for example, creating a
                Calendar event, archiving a Gmail message, or sending a reply).
              </li>
            </ul>
            <p>
              We do not use Google user data for targeted advertising, data
              brokerage, credit determination, or other purposes prohibited by the
              Google API Services User Data Policy.
            </p>

            <h3 className="text-lg font-medium text-slate-100">
              6.3 Data transfer &amp; sharing
            </h3>
            <p>
              We do not sell Google user data. We do not transfer Google user data
              to third parties for advertising or data-broker purposes. Google user
              data may be processed by infrastructure providers that host LifeNode
              OS (for example, application hosting and our database provider) solely
              to store and serve your connected workspace. Access is limited to
              operating the product for your account.
            </p>

            <h3 className="text-lg font-medium text-slate-100">
              6.4 Data protection
            </h3>
            <p>
              Tokens and synced payloads are stored on secured server-side systems,
              protected in transit with HTTPS, and associated with your
              authenticated LifeNode OS user ID. Client applications do not receive
              service-role database credentials. Additional operational controls are
              described on our{" "}
              <Link
                href="/docs/security"
                className="text-cyan-400 underline decoration-slate-600 underline-offset-4 hover:text-cyan-300"
              >
                Security documentation
              </Link>
              .
            </p>

            <h3 className="text-lg font-medium text-slate-100">
              6.5 Retention &amp; deletion
            </h3>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                <strong className="text-slate-200">While connected:</strong> Synced
                Google-derived workspace data (such as inbox items or calendar
                events synced into LifeNode OS) is retained in your account so the
                product can function.
              </li>
              <li>
                <strong className="text-slate-200">On disconnect:</strong> You may
                disconnect an integration in-app. We stop further Google API access
                with that connection and remove or invalidate stored OAuth tokens
                for that provider. You should also revoke access in Google Account
                permissions if desired.
              </li>
              <li>
                <strong className="text-slate-200">On account deletion:</strong>{" "}
                When your LifeNode OS account is deleted, we delete or irreversibly
                de-identify associated account data and integration credentials in
                line with our deletion practices and backup cycles.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-slate-100">
              6.6 Limited Use &amp; AI/ML
            </h3>
            <p>
              The use of raw or derived user data received from Google APIs will
              adhere to the Google API Services User Data Policy, including the
              Limited Use requirements.
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>
                Google API user data is used only to provide or improve
                user-facing features of LifeNode OS for that user (and limited
                cases allowed by Google&apos;s policy).
              </li>
              <li>
                We do not use Google Workspace API user data to develop, improve,
                or train generalized AI/ML models.
              </li>
              <li>
                We do not transfer Google Workspace API user data to third-party
                AI services for those services to train their models. Optional
                in-app assistants (such as Linos) process prompts you explicitly
                send in chat; we do not automatically pipe your full Gmail mailbox
                or Drive library into model-training pipelines.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium tracking-tight text-white">
              7. Contact
            </h2>
            <p>
              Questions about this Privacy Policy or Google API data handling may
              be sent through the support channels listed on{" "}
              <Link
                href="/"
                className="text-cyan-400 underline decoration-slate-600 underline-offset-4 hover:text-cyan-300"
              >
                lifenodeos.com
              </Link>
              .
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
