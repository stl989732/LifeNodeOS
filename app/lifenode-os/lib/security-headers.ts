/**
 * HTTP security headers for Vercel / Next.js.
 * Tuned for LifeNode OS (Termly CMP, Sentry, Supabase browser client, OAuth).
 */
export function buildSecurityHeaders(): { key: string; value: string }[] {
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    // Next.js + Termly + Sentry + Vercel Speed Insights + Scale surveys.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.termly.io https://*.sentry.io https://va.vercel-scripts.com https://scale.verpexxsystems.dev",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://vitals.vercel-insights.com https://app.termly.io https://scale.verpexxsystems.dev",
    "frame-src 'self' https://app.termly.io https://scale.verpexxsystems.dev",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");

  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        // microphone=(self) — required for VANode EOD screen capture narration
        "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  ];

  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
