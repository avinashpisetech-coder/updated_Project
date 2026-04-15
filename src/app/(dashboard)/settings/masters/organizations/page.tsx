"use server";

import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ModuleHeader } from "@/components/ModuleHeader";
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
    <div className="mx-auto max-w-7xl space-y-8 p-10 font-sans antialiased bg-slate-50/20">
      <ModuleHeader 
        title="CORPORATE_ENTITIES"
        subtitle="Organizational Structure Protocol"
      />

      <OrganizationManager initialCompanies={companies || []} initialProjects={projects || []} />
    </div>
  );
}