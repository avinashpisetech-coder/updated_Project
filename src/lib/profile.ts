import type { User } from "@supabase/supabase-js";

/**
 * Derives a minimal display name and employee_id from auth user for first-time profile creation.
 * Admin-created users will have proper profile fields set later.
 */
export function deriveProfileFromUser(user: User): {
  employee_id: string;
  full_name: string;
} {
  const email = user.email ?? "";
  const base = email.split("@")[0] ?? user.id.slice(0, 8);
  return {
    employee_id: base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || user.id.slice(0, 8),
    full_name: user.user_metadata?.full_name ?? email.slice(0, email.indexOf("@")) ?? "User",
  };
}
