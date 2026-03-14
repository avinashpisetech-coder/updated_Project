import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { deriveProfileFromUser } from "./profile";

export type ProfileRow = {
  id: string;
  force_password_change: boolean | null;
  [key: string]: unknown;
};

/**
 * Ensures a profiles row exists for the authenticated user (e.g. after first login).
 * Returns the profile; if missing, inserts a minimal row and returns it.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: User
): Promise<ProfileRow | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, force_password_change")
    .eq("id", user.id)
    .single();

  if (existing) return existing as ProfileRow;

  const { employee_id, full_name } = deriveProfileFromUser(user);
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    employee_id,
    full_name,
    status: "active",
    role: "end_user",
    force_password_change: false,
  });
  if (error) return null;
  const { data: inserted } = await supabase
    .from("profiles")
    .select("id, force_password_change")
    .eq("id", user.id)
    .single();
  return inserted as ProfileRow | null;
}
