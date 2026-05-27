import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminSingleton: SupabaseClient | undefined;

/**
 * Server-only Supabase client (service role bypasses RLS).
 * Set SUPABASE_SERVICE_ROLE_KEY in app/lifenode-os/.env.local (never expose to the browser).
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (adminSingleton) return adminSingleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to app/lifenode-os/.env.local (Supabase Dashboard → Project Settings → API → service_role).",
    );
  }

  adminSingleton = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminSingleton;
}
