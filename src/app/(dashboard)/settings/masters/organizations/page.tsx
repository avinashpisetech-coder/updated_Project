"use server";

import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import OrganizationManager from "./OrganizationManager";
import { Globe, Fingerprint } from "lucide-react";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) redirect("/login");

  // --- Parallel High-Performance Fetch ---
  // Collapsing sequential calls into a single parallel block
  const [profile, companiesRes, projectsRes] = await Promise.all([
    ensureProfile(supabase, user),
    supabase.from("companies").select("id, name, code, status").order("name"),
    supabase.from("projects").select("id, name, code, status, company_id, company:companies!company_id(name)").order("name")
  ]);

  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const companies = companiesRes.data || [];
  const projects = projectsRes.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Organizational Hierarchy</p>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Organization <span className="text-primary/60">Master</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-70 max-w-lg">
            Manage companies and projects to define user assignment and access context.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 px-4 rounded-xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Administrator Access</p>
          </div>
        </div>
      </div>

      <OrganizationManager initialCompanies={companies || []} initialProjects={projects || []} />
    </div>
  );
}