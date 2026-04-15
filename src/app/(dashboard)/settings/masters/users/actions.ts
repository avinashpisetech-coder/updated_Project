"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ProfileRecord = {
  id: string;
  role: string;
  department_id?: string;
  status?: string;
};

async function getCurrentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, department_id")
    .eq("id", user.id)
    .single();
  return profile as ProfileRecord | null;
}

import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

// Map UI role labels/values to valid user_role enum values.
function mapRoleNameToEnum(roleName: string): string | null {
  const raw = String(roleName || "").trim();
  if (!raw) return null;

  const roleMap: Record<string, string> = {
    "Super Admin": "super_admin",
    "Department Admin": "dept_admin",
    "Module Agent": "module_agent",
    "End User": "end_user",
    "User": "end_user",
    "super_admin": "super_admin",
    "dept_admin": "dept_admin",
    "module_agent": "module_agent",
    "end_user": "end_user",
    "user": "end_user",
  };

  const mapped = roleMap[raw] ?? raw.toLowerCase().replace(/\s+/g, "_");
  const allowed = new Set(["super_admin", "dept_admin", "module_agent", "end_user"]);
  return allowed.has(mapped) ? mapped : null;
}

async function authorizeProfileManagement(
  userId: string,
  options: { requireSuperAdmin?: boolean } = {}
) {
  const supabase = await createClient();
  const currentProfile = await getCurrentProfile(supabase);

  if (!currentProfile) {
    throw new Error("Unauthorized");
  }

  const permissions = await getUserPermissions(currentProfile.id);

  if (options.requireSuperAdmin && !hasPermission(permissions, RESOURCES.ACCESS, "manage")) {
    throw new Error("Forbidden: Governance Management Protocol Required");
  }

  const canManageAll = hasPermission(permissions, RESOURCES.USERS, "update");
  const isDeptLead = currentProfile.role === "dept_admin"; // Preserving scoping trigger, but check is permissions based below

  const { data: targetProfile, error: targetErr } = await supabase
    .from("profiles")
    .select("id, role, department_id")
    .eq("id", userId)
    .single();

  if (targetErr || !targetProfile) {
    throw new Error("Target profile not found");
  }

  if (targetProfile.role === "super_admin") {
    throw new Error("Forbidden: cannot manage super admin");
  }

  if (targetProfile.department_id !== currentProfile.department_id) {
    throw new Error("Forbidden: can only manage users in own department");
  }

  return { supabase, currentProfile, targetProfile };
}

export async function updateUserStatus(userId: string, newStatus: string) {
  const { supabase } = await authorizeProfileManagement(userId);

  const { data: existingUser } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error("Failed to update user status");

  await supabase.from("profile_activity_log").insert({
    profile_id: userId,
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    action: newStatus === "active" ? "activate_user" : "deactivate_user",
    old_data: existingUser || null,
    new_data: { status: newStatus },
    metadata: null,
  });

  revalidatePath("/settings/masters/users");
}

export async function updateUserProfile(userId: string, formData: FormData) {
  const { supabase } = await authorizeProfileManagement(userId);

  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("full_name, company_id, project_id, department_id, designation_id, role")
    .eq("id", userId)
    .single();

  const selectedRoleName = (formData.get("role") as string) ?? "";
  const enumRole = selectedRoleName ? mapRoleNameToEnum(selectedRoleName) : null;

  const currentProfile = await getCurrentProfile(supabase);

  // Build the update payload. Never include `role` directly in the SET clause:
  // the DB trigger trg_force_super_admin_role (v018) overwrites it to super_admin
  // on every update anyway, and passing an enum-incompatible string crashes the
  // statement before the trigger fires.
  // We only write role when the actor is super_admin AND a valid enum value
  // was resolved, to allow future role management when the trigger is removed.
  // Multi-assign: company_ids[] and project_ids[] from form; fall back to singular
  const companyIds = (formData.getAll("company_ids[]") as string[]).filter(Boolean);
  const projectIds = (formData.getAll("project_ids[]") as string[]).filter(Boolean);
  const primaryCompanyId = companyIds[0] ?? (formData.get("company_id") as string) ?? null;
  const primaryProjectId = projectIds[0] ?? (formData.get("project_id") as string) ?? null;

  const updates: Record<string, unknown> = {
    full_name: formData.get("fullName") as string,
    company_id: primaryCompanyId || null,
    project_id: primaryProjectId || null,
    department_id: (formData.get("department_id") as string) || null,
    designation_id: (formData.get("designation_id") as string) || null,
    updated_at: new Date().toISOString(),
  };

  const permissions = await getUserPermissions(currentProfile?.id || "");

  if (hasPermission(permissions, RESOURCES.USERS, "update") && enumRole) {
    updates.role = enumRole;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (!error) {
    // Sync multi-assign junction tables (best-effort, non-fatal)
    try {
      await supabase.from("profile_companies").delete().eq("profile_id", userId);
      if (companyIds.length > 0) {
        await supabase.from("profile_companies").insert(
          companyIds.map((company_id) => ({ profile_id: userId, company_id }))
        );
      }
      await supabase.from("profile_projects").delete().eq("profile_id", userId);
      if (projectIds.length > 0) {
        await supabase.from("profile_projects").insert(
          projectIds.map((project_id) => ({ profile_id: userId, project_id }))
        );
      }
    } catch (junctionErr) {
      console.warn("Junction table sync failed (table may not exist yet):", junctionErr);
    }

    // Handle RBAC role assignment
    if (selectedRoleName) {
      // Find the role ID
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("name", selectedRoleName)
        .single();

      if (roleData) {
        // Clear existing role assignments for this user
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Assign the new role
        await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role_id: roleData.id,
          });
      }
    }

    await supabase.from("profile_activity_log").insert({
      profile_id: userId,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: "admin_update_profile",
      old_data: oldProfile || null,
      new_data: updates,
      metadata: null,
    });
  }

  if (error) {
    console.error("Failed to update user profile:", error.message, error.details, error.hint);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  revalidatePath("/settings/masters/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const { supabase, currentProfile } = await authorizeProfileManagement(userId);
  const permissions = await getUserPermissions(currentProfile.id);

  if (!hasPermission(permissions, RESOURCES.USERS, "delete")) {
    throw new Error("Forbidden: Destructive Action Unauthorized");
  }

  if (currentProfile.id === userId) {
    throw new Error("Cannot delete your own account");
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) throw new Error("Failed to delete user");

  await supabase.from("profile_activity_log").insert({
    profile_id: userId,
    actor_id: currentProfile.id,
    action: "delete_user",
    old_data: null,
    new_data: null,
    metadata: null,
  });

  revalidatePath("/settings/masters/users");
  return { success: true };
}
