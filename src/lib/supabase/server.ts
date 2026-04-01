import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Wrapped in React cache() to ensure a single client instance per request.
 * This prevents redundant Auth calls when multiple components call createClient().
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components; middleware will handle refresh
          }
        },
      },
    }
  );
});

/**
 * Optimized helper to get the current authenticated user.
 * Memoized across the entire request lifecycle.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
