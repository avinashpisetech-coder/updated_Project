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

  // authorization should be enforced by RLS; keep higher-level guard as well.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Unauthorized");

  if (profile.role !== "super_admin" && profile.role !== "dept_admin") {
    throw new Error("Forbidden");
  }

  // For dept_admin fallback: allow only same department
  if (profile.role === "dept_admin") {
    const { data: target } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", profileId)
      .single();
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", user.id)
      .single();
    if (!target || target.department_id !== currentUserProfile?.department_id) {
      throw new Error("Forbidden");
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
