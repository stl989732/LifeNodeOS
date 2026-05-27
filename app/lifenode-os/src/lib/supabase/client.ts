import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserSingleton: SupabaseClient | undefined;

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in app/lifenode-os/.env.local (base URL https://<ref>.supabase.co, no /rest/v1).",
    );
  }

  if (url.includes("/rest/")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL should be your project URL only (e.g. https://abcd.supabase.co), not /rest/v1.",
    );
  }

  return { url, anonKey };
}

/** Single browser-side client (safe for `'use client'` + public anon key). */
export function getSupabaseBrowserClient(): SupabaseClient {
  const { url, anonKey } = getEnv();
  if (!browserSingleton) {
    browserSingleton = createClient(url, anonKey);
  }
  return browserSingleton;
}

/**
 * Fresh client per call — use in Server Actions, Route Handlers, or RSC when cookie auth is not needed.
 */
export function createSupabaseServerAnonClient(): SupabaseClient {
  const { url, anonKey } = getEnv();
  return createClient(url, anonKey);
}
