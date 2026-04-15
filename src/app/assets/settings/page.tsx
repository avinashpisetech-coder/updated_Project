"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { AssetGovernanceClient } from "./AssetGovernanceClient";

export default async function AssetSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const profile = await ensureProfile(supabase, user);
    // Restrict access to Admins only
    if (!profile || (profile.role !== "super_admin" && profile.role !== "dept_admin")) {
        redirect("/assets");
    }

    // 1. Fetch Users
    const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, personal_email, department_id, role")
        .order("full_name");

    // 2. Fetch ASSET Modules ONLY
    const { data: modules } = await supabase
        .from("modules")
        .select("id, name, slug")
        .like("slug", "asset_%")
        .order("name");

    // 3. Fetch Roles & Permissions
    const { data: rolesData } = await supabase
        .from("roles")
        .select(`
            id,
            name,
            description,
            is_system_role,
            permissions:role_permissions(
                permissions(id, name, description, resource, action)
            )
        `)
        .order("name");

    const { data: permissionsData } = await supabase
        .from("permissions")
        .select("*")
        .like("resource", "module_asset_%")
        .order("resource");

    const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("user_id, role:roles(name)");

    const roles = (rolesData || []).map((role: any) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role,
        permissions: role.permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [],
    }));

    const permissions = (permissionsData || []).map((perm: any) => ({
        id: perm.id,
        name: perm.name,
        description: perm.description,
        resource: perm.resource,
        action: perm.action,
    }));

    const initialUserRoles: Record<string, string[]> = {};
    (userRolesData || []).forEach((entry: any) => {
        if (!initialUserRoles[entry.user_id]) initialUserRoles[entry.user_id] = [];
        if (entry.role?.name) initialUserRoles[entry.user_id].push(entry.role.name);
    });

    return (
        <div className="flex flex-col gap-8 h-full">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2 opacity-60">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Security_Protocol_Module</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground">ASSET_<span className="text-emerald-500/60">GOVERNANCE</span></h1>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Manage Roles, Permissions and Module-wise CRUD for AssetGard Personnel</p>
            </header>

            <AssetGovernanceClient 
                users={users || []}
                modules={modules || []}
                roles={roles}
                permissions={permissions}
                initialUserRoles={initialUserRoles}
                currentUserId={user.id}
            />
        </div>
    );
}
