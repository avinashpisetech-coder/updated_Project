import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RolePermission = { permissions: { id: string; name: string; description: string; resource: string; action: string } };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, permissionIds } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    // Create the role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name: name.trim(),
        description: description?.trim() || "",
        created_by: user.id,
      })
      .select()
      .single();

    if (roleError) {
      return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }

    // Add permissions to role
    if (permissionIds?.length > 0) {
      const rolePermissions = permissionIds.map((permId: string) => ({
        role_id: role.id,
        permission_id: permId,
      }));

      const { error: permError } = await supabase
        .from("role_permissions")
        .insert(rolePermissions);

      if (permError) {
        // Clean up the role if permissions failed
        await supabase.from("roles").delete().eq("id", role.id);
        return NextResponse.json({ error: "Failed to assign permissions" }, { status: 500 });
      }
    }

    // Fetch the complete role with permissions
    const { data: completeRole, error: fetchError } = await supabase
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
      .eq("id", role.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: "Role created but failed to fetch details" }, { status: 500 });
    }

    const transformedRole = {
      id: completeRole.id,
      name: completeRole.name,
      description: completeRole.description,
      is_system_role: completeRole.is_system_role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permissions: completeRole.permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [],
    };

    return NextResponse.json(transformedRole);
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: roles, error } = await supabase
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
      .order("name");

    if (error) {
      return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRoles = (roles as any[])?.map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      is_system_role: role.is_system_role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permissions: role.permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [],
    })) || [];

    return NextResponse.json(transformedRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}