import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-less client for public, anonymously readable content (categories,
 * published products and active offers). Using it instead of the cookie-aware
 * server client keeps the storefront statically renderable and revalidated
 * (see `revalidate` in app/page.tsx) and applies the anonymous RLS policies.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
