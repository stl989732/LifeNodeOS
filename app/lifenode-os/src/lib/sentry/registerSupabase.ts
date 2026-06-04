import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

const registered = new WeakSet<SupabaseClient>();

/** Attach Supabase error breadcrumbs when Sentry is configured. */
export function registerSupabaseWithSentry(client: SupabaseClient) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (registered.has(client)) return;
  registered.add(client);

  type SentryWithSupabase = typeof Sentry & {
    supabaseIntegration?: (opts: {
      supabaseClient: SupabaseClient;
    }) => { name: string };
  };

  const integration = (Sentry as SentryWithSupabase).supabaseIntegration?.({
    supabaseClient: client,
  });
  if (!integration) return;

  try {
    Sentry.addIntegration(integration);
  } catch {
    /* ignore duplicate registration */
  }
}
