import { createClient, getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UserManager from "./UserManager";
import DepartmentManager from "./DepartmentManager";
import DesignationManager from "./DesignationManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function UserMasterPage() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) redirect("/login");

  // --- Tier 1: Parallel High-Performance Identity & Metadata Fetch ---
  // Collapsing the identity check + all static master data into a single parallel block.
  const [
    profileResponse,
    profilesResponse,
    departmentsResponse,
    companiesResponse,
    projectsResponse,
    designationsResponse,
    rolesResponse
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
    supabase.from("roles").select("id, name, is_system_role").order("name")
  ]);

  const currentProfile = profileResponse.data;
  if (!currentProfile || (currentProfile.role !== "super_admin" && currentProfile.role !== "dept_admin")) {
    redirect("/dashboard");
  }

  const role = currentProfile.role;
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
      company: effectiveCompanyIds.map(id => companyMap[id]).filter(Boolean).join(", "),
      department: (Array.isArray(p.department) ? p.department[0]?.name : p.department?.name) || "",
      department_id: p.department_id || "",
      project: effectiveProjectIds.map(id => projectMap[id]).filter(Boolean).join(", "),
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
    <div className="p-8 max-w-7xl mx-auto space-y-10 font-sans antialiased">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">User Management Hub</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Users <span className="text-primary/60 font-medium">Master</span>
          </h1>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-60">
            Manage system users, departments, and role designations
          </p>
        </div>
      </div>

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
              currentUserRole={role}
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
