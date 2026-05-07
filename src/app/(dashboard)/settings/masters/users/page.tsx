import { createClient, getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ModuleHeader } from "@/components/ModuleHeader";
import UserManager from "./UserManager";
import DepartmentManager from "./DepartmentManager";
import DesignationManager from "./DesignationManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function UserMasterPage() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) redirect("/login");

  // --- Tier 1: Parallel High-Performance Identity & Metadata Fetch ---
  const [
    profileResponse,
    profilesResponse,
    departmentsResponse,
    companiesResponse,
    projectsResponse,
    designationsResponse,
    rolesResponse,
    permissions
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, department_id").eq("id", user.id).single(),
    supabase.from("profiles").select(`
      *,
      department:departments!department_id(name),
      designation:designations!designation_id(name)
    `).order("created_at", { ascending: false }).limit(200),
    supabase.from("departments").select("*").order("name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("projects").select("id, name, company_id").order("name"),
    supabase.from("designations").select("*").order("name"),
    supabase.from("roles").select("id, name, is_system_role").order("name"),
    getUserPermissions(user.id)
  ]);

  const currentProfile = profileResponse.data;
  if (!currentProfile) {
    redirect("/dashboard");
    return null;
  }

  const canManageGlobal = hasPermission(permissions, "*", "*");
  const canManageDept = hasPermission(permissions, RESOURCES.USERS, "manage");

  if (!canManageGlobal && !canManageDept) {
    redirect("/dashboard");
    return null;
  }

  const departmentId = currentProfile.department_id || "";

  const profiles = profilesResponse.data || [];
  const departments = departmentsResponse.data || [];
  const companies = companiesResponse.data || [];
  const projects = projectsResponse.data || [];
  const designations = designationsResponse.data || [];
  const roles = rolesResponse.data || [];

  // --- Tier 2: Junction Data Fetch (Parallel) ---
  const profileIds = profiles.map((p: { id: string }) => p.id);
  const [profileCompaniesRes, profileProjectsRes] = profileIds.length > 0 
    ? await Promise.all([
        supabase.from("profile_companies").select("profile_id, company_id").in("profile_id", profileIds),
        supabase.from("profile_projects").select("profile_id, project_id").in("profile_id", profileIds)
      ])
    : [{ data: [] }, { data: [] }];

  const profileCompanies = profileCompaniesRes.data || [];
  const profileProjects = profileProjectsRes.data || [];

  // --- Optimization: Pre-group junction data by profile_id to avoid O(N*M) filtration ---
  const companiesByProfile = (profileCompanies || []).reduce((acc: any, pc) => {
    if (!acc[pc.profile_id]) acc[pc.profile_id] = [];
    acc[pc.profile_id].push(pc.company_id);
    return acc;
  }, {});

  const projectsByProfile = (profileProjects || []).reduce((acc: any, pp) => {
    if (!acc[pp.profile_id]) acc[pp.profile_id] = [];
    acc[pp.profile_id].push(pp.project_id);
    return acc;
  }, {});

  const companyMap = (companies || []).reduce((acc: any, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  const projectMap = (projects || []).reduce((acc: any, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  type ProfileEntry = { id: string; full_name: string; employee_id: string; personal_email: string; department?: { name: string } | Array<{ name: string }>; department_id?: string; designation?: { name: string } | Array<{ name: string }>; designation_id?: string; company_id?: string; project_id?: string; role: string; status: string; created_at: string };
  
  const mappedProfiles = (profiles as ProfileEntry[] || []).map((p: ProfileEntry) => {
    const assignedCompanyIds = companiesByProfile[p.id] || [];
    const assignedProjectIds = projectsByProfile[p.id] || [];
    
    const effectiveCompanyIds = assignedCompanyIds.length > 0 ? assignedCompanyIds : (p.company_id ? [p.company_id] : []);
    const effectiveProjectIds = assignedProjectIds.length > 0 ? assignedProjectIds : (p.project_id ? [p.project_id] : []);

    return {
      id: p.id,
      full_name: p.full_name,
      employee_id: p.employee_id,
      email: p.personal_email || "",
      company: effectiveCompanyIds.map((id: string) => companyMap[id]).filter(Boolean).join(", "),
      department: (Array.isArray(p.department) ? p.department[0]?.name : p.department?.name) || "",
      department_id: p.department_id || "",
      project: effectiveProjectIds.map((id: string) => projectMap[id]).filter(Boolean).join(", "),
      designation: (Array.isArray(p.designation) ? p.designation[0]?.name : p.designation?.name) || "",
      designation_id: p.designation_id || "",
      company_id: p.company_id || "",
      project_id: p.project_id || "",
      company_ids: effectiveCompanyIds,
      project_ids: effectiveProjectIds,
      role: p.role,
      roles: "",
      status: p.status,
      created_at: p.created_at
    };
  });

  return (
    <div className="w-full space-y-6 p-6 font-sans antialiased bg-slate-50/20">
      <ModuleHeader 
        title="USER_DIRECTORY"
        subtitle="Identity Lifecycle Node"
      />

      <Tabs defaultValue="users" className="space-y-8">
        <div className="flex items-center justify-between bg-muted/20 p-1.5 rounded-2xl border border-border/40 w-fit">
          <TabsList className="bg-transparent h-10 gap-1">
            <TabsTrigger
              value="users"
              className="px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all"
            >
              Departments
            </TabsTrigger>
            <TabsTrigger
              value="designations"
              className="px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all"
            >
              Designations
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="transition-all duration-300">
          <TabsContent value="users" className="mt-0 focus-visible:outline-none">
            <UserManager
              initialUsers={mappedProfiles}
              departments={departments || []}
              designations={designations || []}
              companies={companies || []}
              projects={projects || []}
              roles={roles || []}
              canManageGlobal={canManageGlobal}
              canManageDept={canManageDept}
              currentUserDepartmentId={departmentId}
            />
          </TabsContent>
          <TabsContent value="departments" className="mt-0 focus-visible:outline-none">
            <DepartmentManager initialDepartments={departments || []} />
          </TabsContent>
          <TabsContent value="designations" className="mt-0 focus-visible:outline-none">
            <DesignationManager initialDesignations={designations || []} departments={departments || []} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
