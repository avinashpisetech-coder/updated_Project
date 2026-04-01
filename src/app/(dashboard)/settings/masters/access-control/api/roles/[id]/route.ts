import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: roleId } = await context.params;
    const { name, description, permissionIds } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    // Check if role exists and is not system role
    const { data: existingRole, error: checkError } = await supabase
      .from("roles")
      .select("is_system_role")
      .eq("id", roleId)
      .single();

    if (checkError || !existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existingRole.is_system_role) {
      return NextResponse.json({ error: "Cannot modify system roles" }, { status: 403 });
    }

    // Update the role
    const { error: updateError } = await supabase
      .from("roles")
      .update({
        name: name.trim(),
        description: description?.trim() || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", roleId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    // Update permissions - delete existing and add new ones
    await supabase.from("role_permissions").delete().eq("role_id", roleId);

    if (permissionIds?.length > 0) {
      const rolePermissions = permissionIds.map((permId: string) => ({
        role_id: roleId,
        permission_id: permId,
      }));

      const { error: permError } = await supabase
        .from("role_permissions")
        .insert(rolePermissions);

      if (permError) {
        return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
      }
    }

    // Fetch the updated role with permissions
    const { data: updatedRole, error: fetchError } = await supabase
      .from("roles")
      .select(`
        id,
        name,
        description,
        is_system_role,
        permissions:role_permissions(
          permissions(
            id,
            name,
            description,
            resource,
            action
          )
        )
      `)
      .eq("id", roleId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Role updated but failed to fetch details" }, { status: 500 });
    }

    const transformedRole = {
      id: updatedRole.id,
      name: updatedRole.name,
      description: updatedRole.description,
      is_system_role: updatedRole.is_system_role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permissions: updatedRole.permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [],
    };

    return NextResponse.json(transformedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: roleId } = await context.params;

    // Check if role exists and is not system role
    const { data: existingRole, error: checkError } = await supabase
      .from("roles")
      .select("is_system_role")
      .eq("id", roleId)
      .single();

    if (checkError || !existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (existingRole.is_system_role) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 403 });
    }

    // Check if role is assigned to any users
    const { data: assignments, error: assignError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role_id", roleId)
      .limit(1);

    if (assignError) {
      return NextResponse.json({ error: "Failed to check role assignments" }, { status: 500 });
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json({ error: "Cannot delete role that is assigned to users" }, { status: 400 });
    }

    // Delete role permissions first (cascade should handle this, but being explicit)
    await supabase.from("role_permissions").delete().eq("role_id", roleId);

    // Delete the role
    const { error: deleteError } = await supabase
      .from("roles")
      .delete()
      .eq("id", roleId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}