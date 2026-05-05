import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { deriveProfileFromUser } from "./profile";

export type ProfileRow = {
  id: string;
  force_password_change: boolean | null;
  full_name?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

/**
 * Ensures a profiles row exists for the authenticated user (e.g. after first login).
 * Returns the profile; if missing, inserts a minimal row and returns it.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
  existingProfile?: ProfileRow | null
): Promise<ProfileRow | null> {
  const existing = existingProfile || (await supabase
    .from("profiles")
    .select("id, force_password_change, role, full_name")
    .eq("id", user.id)
    .single()).data;

  if (existing) {
    const { full_name: derivedFullName } = deriveProfileFromUser(user);
    const currentName =
      typeof existing.full_name === "string" ? existing.full_name.trim() : "";
    const shouldRepairName =
      currentName.length === 0 || currentName.toLowerCase() === "user";

    if (shouldRepairName) {
      const updatePayload: { full_name?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      if (shouldRepairName) {
        updatePayload.full_name = derivedFullName;
      }

      await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      return {
        ...existing,
        ...(shouldRepairName ? { full_name: derivedFullName } : {}),
      } as ProfileRow;
    }

    return existing as ProfileRow;
  }

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
    .select("id, force_password_change, role, full_name")
    .eq("id", user.id)
    .single();
  return inserted as ProfileRow | null;
}
