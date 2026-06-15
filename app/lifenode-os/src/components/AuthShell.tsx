import type { ReactNode } from "react";

/**
 * Shared chrome for auth pages — matches LifeNode OS shell aesthetics.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F17] px-6 py-12 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.65),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.1),transparent_45%)]" />
      <main
        className="relative mx-auto w-full max-w-md"
        aria-labelledby="auth-shell-title"
      >
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            LifeNode OS
          </p>
          <h1
            id="auth-shell-title"
            className="mt-3 text-2xl font-bold tracking-tight text-slate-50 md:text-3xl"
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
