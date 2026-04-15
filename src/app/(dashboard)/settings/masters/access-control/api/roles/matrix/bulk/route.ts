import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { roleId, permissionIds, grant } = await req.json();

  if (!roleId || !Array.isArray(permissionIds) || permissionIds.length === 0) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (grant) {
    const rolePermissions = permissionIds.map(permId => ({
      role_id: roleId,
      permission_id: permId
    }));

    const { error } = await supabase
      .from("role_permissions")
      .upsert(rolePermissions, { onConflict: "role_id,permission_id" });
    
    if (error) return new NextResponse(error.message, { status: 500 });
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_id", permissionIds);
    
    if (error) return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
