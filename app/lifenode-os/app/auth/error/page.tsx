import Link from "next/link";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const code = error ?? "Default";

  const isConfiguration = code === "Configuration";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          LifeNode OS · Sign-in
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {isConfiguration ? "Auth is not configured yet" : "Sign-in error"}
        </h1>
        {isConfiguration ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
            <p>
              Google sign-in needs these <strong>Production</strong> environment
              variables on Vercel (Project → Settings → Environment Variables):
            </p>
            <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-slate-700">
              <li>AUTH_SECRET</li>
              <li>AUTH_URL = https://lifenodeos.com</li>
              <li>GOOGLE_CLIENT_ID</li>
              <li>GOOGLE_CLIENT_SECRET</li>
              <li>NEXT_PUBLIC_SUPABASE_URL</li>
              <li>SUPABASE_SERVICE_ROLE_KEY</li>
            </ul>
            <p>
              After saving, <strong>redeploy</strong>. In Google Cloud, confirm
              redirect URI{" "}
              <code className="rounded bg-slate-100 px-1">
                https://lifenodeos.com/api/auth/callback/google
              </code>{" "}
              and JavaScript origin{" "}
              <code className="rounded bg-slate-100 px-1">
                https://lifenodeos.com
              </code>
              .
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Error code: <span className="font-mono">{code}</span>. Try again or use
            email sign-up.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/signin"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
