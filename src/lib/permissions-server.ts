import { createClient } from "./supabase/server";
import { Permission } from "./permissions";

/**
 * Server-side utility to fetch all flattened permissions for a user.
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_permissions", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Critical Permission Resolution Failure:", error);
    return [];
  }

  return (data as Permission[]) || [];
}
