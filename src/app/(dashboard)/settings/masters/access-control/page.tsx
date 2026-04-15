"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ModuleHeader } from "@/components/ModuleHeader";
import AccessControlManager from "./AccessControlManager";
import { Cpu, ShieldCheck, Fingerprint } from "lucide-react";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function AccessControlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, userPermissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  if (!hasPermission(userPermissions, RESOURCES.ACCESS, "manage")) {
    redirect("/dashboard");
  }

  if (!profile) {
    redirect("/dashboard");
  }

  // Get base query for users
  const usersQuery = supabase
    .from("profiles")
    .select("id, full_name, personal_email, department_id, role")
    .order("full_name");

  // Apply scope
  const userScope =
    profile.role === "dept_admin" && profile.department_id
      ? usersQuery.eq("department_id", profile.department_id)
      : usersQuery;

  // Execute first bulk fetch
  const [
    { data: users, error: usersError },
    { data: modules, error: modulesError },
    { data: erpModules },
    { data: erpTransactions },
  ] = await Promise.all([
    userScope,
    supabase.from("modules").select("id, name, slug").order("name"),
    supabase.from("erp_modules").select("id, name").order("name"),
    supabase
      .from("erp_sub_modules")
      .select("id, name, erp_module_id, parent:erp_modules(name)")
      .order("name"),
  ]);

  if (usersError || modulesError || !users || !modules) {
    console.error("Error loading users/modules:", usersError, modulesError);
    return <div>Error loading users or modules.</div>;
  }

  // SECOND BATCH: Fetch roles and permissions for the manager using the fetched users
  const [
    { data: userRolesData, error: userRolesError },
    { data: rolesData, error: rolesError },
    { data: permissionsData, error: permissionsError },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, role:roles(name)")
      .in("user_id", users.map((u) => u.id)),
    supabase
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
      .order("name"),
    supabase
      .from("permissions")
      .select("*")
      .order("resource"),
  ]);

  if (errored(userRolesError) || errored(rolesError) || errored(permissionsError)) {
    console.warn("Security data partially missing:", userRolesError, rolesError, permissionsError);
  }

  const baseModules = modules || [];
  const ADIOS_WHITELIST = [
    "help-desk", "support-queue",
    "users_master", "help_desk_master", "access_control", "organizations",
    "dashboard", "intelligence_hub", "reports", "mail", "themes"
  ];

  const systemNodes = [
    { id: "node_support_queue", name: "Support Queue", slug: "support-queue" },
    { id: "node_dashboard", name: "Executive Dashboard", slug: "dashboard" },
    { id: "node_intel", name: "Intelligence Hub", slug: "intelligence_hub" },
    { id: "node_reports", name: "Analytical Reports", slug: "reports" },
    { id: "node_mail", name: "Mail Infrastructure", slug: "mail" },
    { id: "node_themes", name: "Settings & Themes", slug: "themes" },
    { id: "node_users_master", name: "Users Master", slug: "users_master" },
    { id: "node_help_desk_master", name: "Help Desk Master", slug: "help_desk_master" },
    { id: "node_access", name: "Security & IAM", slug: "access_control" },
    { id: "node_organizations", name: "Organization Registry", slug: "organizations" },
  ];

  const mergedModules = [
    ...(modules || []),
    ...systemNodes
  ].filter((m, index, self) => 
    index === self.findIndex((t) => t.slug === m.slug)
  ).filter(m => ADIOS_WHITELIST.includes(m.slug.toLowerCase().trim()));

  // Prepare roles and permissions for client
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

  function errored(e: any) { return !!e; }

  return (
    <div className="mx-auto max-w-7xl space-y-12 p-8 font-sans antialiased">
      <ModuleHeader 
        title="USER_PERMISSIONS"
        subtitle="Access Control Management"
      />

      <AccessControlManager
        initialProfiles={users.map((u) => ({
          id: u.id,
          full_name: u.full_name || u.personal_email || "",
          email: u.personal_email ?? "",
          department_id: u.department_id,
          role: u.role,
        }))}
        initialModules={mergedModules}
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
