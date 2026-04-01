"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import AccessControlManager from "./AccessControlManager";
import { Cpu, ShieldCheck, Fingerprint } from "lucide-react";

export default async function AccessControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (
    !profile ||
    (profile.role !== "super_admin" && profile.role !== "dept_admin")
  ) {
    redirect("/dashboard");
  }

  const usersQuery = supabase
    .from("profiles")
    .select("id, full_name, personal_email, department_id, role, company:companies!company_id(name), project:projects!project_id(name)")
    .order("full_name");

  const modulesQuery = supabase
    .from("modules")
    .select("id, name, slug")
    .order("name");

  const userScope =
    profile.role === "dept_admin" && profile.department_id
      ? usersQuery.eq("department_id", profile.department_id)
      : usersQuery;

  const [
    { data: users, error: usersError },
    { data: modules, error: modulesError },
    { data: erpModules },
    { data: erpTransactions },
  ] = await Promise.all([
    userScope,
    modulesQuery,
    supabase.from("erp_modules").select("id, name").order("name"),
    supabase
      .from("erp_sub_modules")
      .select("id, name, erp_module_id, parent:erp_modules(name)")
      .order("name"),
  ]);

  if (usersError || modulesError || !users || !modules) {
    console.error("Error loading users/modules:", usersError, modulesError);
    return <div>Error loading users or modules. Please check the logs.</div>;
  }

  const baseModules = modules as { id: string; name: string; slug: string }[];
  const masterModules = [
    { id: "masters_users", name: "Users Master", slug: "masters_users" },
    { id: "masters_erp", name: "ERP Master", slug: "masters_erp" },
    {
      id: "masters_help_desk",
      name: "Help Desk Master",
      slug: "masters_help_desk",
    },
    {
      id: "masters_access_control",
      name: "Access Control",
      slug: "masters_access_control",
    },
  ];

  const mergedModules = [
    ...baseModules,
    ...masterModules.filter(
      (md) => !baseModules.some((m) => m.slug === md.slug)
    ),
  ];

  const normSlug = (input: string) =>
    input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");

  const dynamicPermissions: Array<{
    name: string;
    description: string;
    resource: string;
    action: string;
  }> = [];

  for (const m of mergedModules) {
    const resourceKey = `module_${normSlug(m.slug)}`;
    dynamicPermissions.push(
      {
        name: `create_${resourceKey}`,
        description: `Create records for ${m.name} module`,
        resource: resourceKey,
        action: "create",
      },
      {
        name: `view_${resourceKey}`,
        description: `View records for ${m.name} module`,
        resource: resourceKey,
        action: "read",
      },
      {
        name: `update_${resourceKey}`,
        description: `Update records for ${m.name} module`,
        resource: resourceKey,
        action: "update",
      },
      {
        name: `delete_${resourceKey}`,
        description: `Delete records for ${m.name} module`,
        resource: resourceKey,
        action: "delete",
      },
    );
  }

  for (const em of erpModules || []) {
    const resourceKey = `erp_module_${normSlug(em.name)}`;
    dynamicPermissions.push(
      {
        name: `create_${resourceKey}`,
        description: `Create records for ${em.name} ERP module`,
        resource: resourceKey,
        action: "create",
      },
      {
        name: `view_${resourceKey}`,
        description: `View records for ${em.name} ERP module`,
        resource: resourceKey,
        action: "read",
      },
      {
        name: `update_${resourceKey}`,
        description: `Update records for ${em.name} ERP module`,
        resource: resourceKey,
        action: "update",
      },
      {
        name: `delete_${resourceKey}`,
        description: `Delete records for ${em.name} ERP module`,
        resource: resourceKey,
        action: "delete",
      },
    );
  }

  type ErpTxnEntry = {
    name: string;
    parent?: { name?: string } | Array<{ name?: string }>;
  };

  for (const tx of (erpTransactions || []) as ErpTxnEntry[]) {
    const parentRel = tx.parent;
    const parentName = Array.isArray(parentRel)
      ? parentRel[0]?.name || "erp"
      : parentRel?.name || "erp";
    const resourceKey = `erp_txn_${normSlug(parentName)}_${normSlug(tx.name)}`;
    dynamicPermissions.push(
      {
        name: `create_${resourceKey}`,
        description: `Create records for ${parentName} - ${tx.name} transaction`,
        resource: resourceKey,
        action: "create",
      },
      {
        name: `view_${resourceKey}`,
        description: `View records for ${parentName} - ${tx.name} transaction`,
        resource: resourceKey,
        action: "read",
      },
      {
        name: `update_${resourceKey}`,
        description: `Update records for ${parentName} - ${tx.name} transaction`,
        resource: resourceKey,
        action: "update",
      },
      {
        name: `delete_${resourceKey}`,
        description: `Delete records for ${parentName} - ${tx.name} transaction`,
        resource: resourceKey,
        action: "delete",
      },
    );
  }

  if (dynamicPermissions.length > 0) {
    await supabase.from("permissions").upsert(dynamicPermissions, { onConflict: "name" });
  }

  const { data: accessData, error: accessError } = await supabase
    .from("profile_module_access")
    .select("profile_id, module_id, can_view, can_create, can_update, can_delete, access_scope");

  const { data: userRolesData, error: userRolesError } = await supabase
    .from("user_roles")
    .select("user_id, role:roles(name)")
    .in("user_id", users.map((u) => u.id));

  if (accessError) {
    console.error("Error fetching access data:", accessError);
    return <div>Error loading access data.</div>;
  }

  if (userRolesError) {
    console.error("Error fetching user role assignments:", userRolesError);
    return <div>Error loading role assignments.</div>;
  }

  type AccessMap = Record<
    string,
    Record<
      string,
      {
        can_view: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
        access_scope: "global" | "department" | "self";
      }
    >
  >;

  const byUser: AccessMap = {};
  accessData?.forEach((row) => {
    byUser[row.profile_id] = byUser[row.profile_id] || {};
    byUser[row.profile_id][row.module_id] = {
      can_view: row.can_view,
      can_create: row.can_create,
      can_update: row.can_update,
      can_delete: row.can_delete,
      access_scope: row.access_scope || "global",
    };
  });

  const { data: rolesData, error: rolesError } = await supabase
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

  const { data: permissionsData, error: permissionsError } = await supabase
    .from("permissions")
    .select("*")
    .order("resource");

  if (rolesError || permissionsError) {
    console.error("Error fetching roles/permissions:", rolesError, permissionsError);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = (rolesData || []).map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    is_system_role: role.is_system_role,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    permissions: role.permissions?.map((rp: any) => rp.permissions).filter(Boolean) || [],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions = (permissionsData || []).map((perm: any) => ({
    id: perm.id,
    name: perm.name,
    description: perm.description,
    resource: perm.resource,
    action: perm.action,
  }));

  const initialUserRoles: Record<string, string[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (userRolesData || []).forEach((entry: any) => {
    if (!initialUserRoles[entry.user_id]) initialUserRoles[entry.user_id] = [];
    if (entry.role?.name) initialUserRoles[entry.user_id].push(entry.role.name);
  });

  type UserEntry = {
    id: string;
    full_name: string;
    personal_email: string;
    department_id?: string;
    company?: { name?: string } | Array<{ name?: string }> | null;
    project?: { name?: string } | Array<{ name?: string }> | null;
    role: string;
  };
  type ModuleEntry = { id: string; name: string; slug: string };

  return (
    <div className="mx-auto max-w-7xl space-y-12 p-8 font-sans antialiased">
      {/* Header Matrix */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Access Control Management</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            User <span className="text-primary/60">Permissions</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium opacity-80">
            Manage user roles and individual module access permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 px-4 rounded-xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Administrator Access</p>
          </div>
        </div>
      </div>

      <AccessControlManager
        initialProfiles={(users as UserEntry[]).map((u) => ({
          id: u.id,
          full_name: u.full_name || u.personal_email || "",
          email: u.personal_email ?? "",
          department_id: u.department_id,
          company: u.company,
          project: u.project,
          role: u.role,
        }))}
        initialModules={mergedModules as ModuleEntry[]}
        initialAccess={byUser}
        initialRoles={roles}
        initialPermissions={permissions}
        initialUserRoles={initialUserRoles}
        isSuperAdmin={profile.role === "super_admin"}
        isDeptAdmin={profile.role === "dept_admin"}
        userDeptId={profile.department_id as string | undefined}
      />
    </div>
  );
}
