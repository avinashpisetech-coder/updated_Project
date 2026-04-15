"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertModuleAccess(
  profileId: string,
  moduleId: string,
  access: {
    can_view: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { hasPermission, RESOURCES } = await import("@/lib/permissions");
  const { getUserPermissions } = await import("@/lib/permissions-server");
  const permissions = await getUserPermissions(user.id);

  if (!hasPermission(permissions, RESOURCES.ACCESS, "update")) {
    throw new Error("Forbidden: Unauthorized Governance Management");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, department_id")
    .eq("id", user.id)
    .single();

  // For dept_admin fallback: allow only same department
  if (currentProfile && currentProfile.role === "dept_admin") {
    const { data: target } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", profileId)
      .single();
    
    if (!target || target.department_id !== currentProfile.department_id) {
      throw new Error("Forbidden: Departmental isolation breach");
    }
  }

  const { error } = await supabase
    .from("profile_module_access")
    .upsert({
      profile_id: profileId,
      module_id: moduleId,
      ...access,
      updated_at: new Date().toISOString(),
    }, { onConflict: "profile_id,module_id" });

  if (error) throw new Error("Failed to save access rights");

  revalidatePath("/settings/masters/access-control");
  return { success: true };
}

export async function updateRolePermissionMatrix(
  roleId: string,
  permissionId: string,
  grant: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { hasPermission, RESOURCES } = await import("@/lib/permissions");
  const { getUserPermissions } = await import("@/lib/permissions-server");
  const permissions = await getUserPermissions(user.id);

  if (!hasPermission(permissions, RESOURCES.ACCESS, "update")) {
    throw new Error("Forbidden: Super Admin Matrix Access Required");
  }

  if (grant) {
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: "role_id,permission_id" });
    if (error) throw new Error("Failed to grant permission");
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .match({ role_id: roleId, permission_id: permissionId });
    if (error) throw new Error("Failed to revoke permission");
  }

  revalidatePath("/settings/masters/access-control");
  return { success: true };
}
