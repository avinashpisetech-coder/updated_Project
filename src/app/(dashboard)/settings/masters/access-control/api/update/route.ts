import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, moduleId, access } = body;
    if (!profileId || !moduleId || !access) {
      return NextResponse.json({ error: "Missing body parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", profileId)
        .single();
      if (!targetProfile || targetProfile.department_id !== currentProfile.department_id) {
        return NextResponse.json({ error: "Forbidden: Department Scope Violation" }, { status: 403 });
      }
    }

    const { error: upsertError } = await supabase
      .from("profile_module_access")
      .upsert(
        {
          profile_id: profileId,
          module_id: moduleId,
          can_view: !!access.can_view,
          can_create: !!access.can_create,
          can_update: !!access.can_update,
          can_delete: !!access.can_delete,
          access_scope: access.access_scope || "global",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,module_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed access-control update", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
