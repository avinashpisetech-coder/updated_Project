import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { name, description, permissionIds } = await req.json();

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // 1. Create Role
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .insert([{ name, description, is_system_role: false }])
    .select()
    .single();

  if (roleError) return new NextResponse(roleError.message, { status: 500 });

  // 2. Assign Permissions if any
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    const rolePermissions = permissionIds.map(permId => ({
      role_id: role.id,
      permission_id: permId
    }));

    const { error: permError } = await supabase
      .from("role_permissions")
      .insert(rolePermissions);
    
    if (permError) return new NextResponse(permError.message, { status: 500 });
  }

  // Reload role with permissions for client state
  const { data: finalRole } = await supabase
    .from("roles")
    .select(`
      id, name, description, is_system_role,
      permissions:role_permissions(permissions(id, name, description, resource, action))
    `)
    .eq("id", role.id)
    .single();

  return NextResponse.json(finalRole);
}
