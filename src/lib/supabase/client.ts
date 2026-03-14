import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components.
 * Uses cookie storage; session is shared with server via middleware refresh.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
