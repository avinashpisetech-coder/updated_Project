import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, roleNames } = body;

    if (!profileId || !Array.isArray(roleNames)) {
      return NextResponse.json({ error: "Missing profileId or roleNames" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasPermission, RESOURCES } = await import("@/lib/permissions");
    const { getUserPermissions } = await import("@/lib/permissions-server");
    const permissions = await getUserPermissions(user.id);

    if (!hasPermission(permissions, RESOURCES.ACCESS, "update")) {
      return NextResponse.json({ error: "Forbidden: Matrix Access Refused" }, { status: 403 });
    }

    // Preserve department scoping for designated admins
    if (currentProfile.role === "dept_admin") {
      const { data: targetProfile, error: targetError } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", profileId)
        .single();

      if (targetError || !targetProfile || targetProfile.department_id !== currentProfile.department_id) {
        return NextResponse.json({ error: "Forbidden: Department Scope Violation" }, { status: 403 });
      }
    }

    // Fetch role IDs
    const { data: roleRecords, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", roleNames);

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    type RoleRecord = { id: string; name: string };
    const validRoleNames = (roleRecords as RoleRecord[] || []).map((r: RoleRecord) => r.name);
    const invalidRoles = roleNames.filter((name: string) => !validRoleNames.includes(name));
    if (invalidRoles.length > 0) {
      return NextResponse.json({ error: `Invalid roles: ${invalidRoles.join(", ")}` }, { status: 400 });
    }

    // Remove existing mappings
    await supabase.from("user_roles").delete().eq("user_id", profileId);

    // Insert new mappings
    if (roleRecords && roleRecords.length > 0) {
      const insertRows = (roleRecords as RoleRecord[]).map((role: RoleRecord) => ({ user_id: profileId, role_id: role.id }));
      const { error: insertError } = await supabase.from("user_roles").insert(insertRows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Update profile.role to match assigned app role (legacy compatibility)
    const mapRoleNameToEnum = (roleName: string) => {
      const key = roleName.trim().toLowerCase();
      if (key === "super admin") return "super_admin";
      if (key === "department admin") return "dept_admin";
      if (key === "module agent") return "module_agent";
      if (key === "end user" || key === "user") return "end_user";
      if (["super_admin", "dept_admin", "module_agent", "end_user"].includes(key)) return key;
      return "end_user";
    };

    const defaultRole = roleNames.length > 0 ? mapRoleNameToEnum(roleNames[0]) : "end_user";
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ role: defaultRole, updated_at: new Date().toISOString() })
      .eq("id", profileId);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, roles: roleNames });
  } catch (err) {
    console.error("Failed to save user roles", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
