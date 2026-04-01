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
  const atIndex = email.indexOf("@");
  const emailPrefix = atIndex > 0 ? email.slice(0, atIndex) : "";
  const base = emailPrefix || user.id.slice(0, 8);
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  return {
    employee_id: base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || user.id.slice(0, 8),
    full_name: metadataFullName || emailPrefix || "User",
  };
}
