import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service_role key.
 * Only use in server-side code (Server Actions, Route Handlers).
 * NEVER expose this client or key to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
