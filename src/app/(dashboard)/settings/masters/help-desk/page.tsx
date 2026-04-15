"use server";

import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ModuleHeader } from "@/components/ModuleHeader";
import CategoryManager from "./CategoryManager";
import SoftwareSystemManager from "../SoftwareSystemManager";
import { Fingerprint } from "lucide-react";

export default async function HelpDeskMasterPage() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) redirect("/login");

  // Performance: Parallelize all lookups to eliminate the 4-step waterfall.
  const [profile, hdModuleRes, systemsRes] = await Promise.all([
    ensureProfile(supabase, user),
    supabase.from("modules").select("id").eq("slug", "help-desk").single(),
    supabase.from("software_systems").select("id, name, code, description, status").eq("scope", "it").order("name")
  ]);

  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  // Fetch categories using the module ID from the parallel turn.
  // Note: Since category fetch depends on hdModule.id, we do it after the parallel turn,
  // but we consolidate all other static lookups to the start.
  const hdModuleId = hdModuleRes.data?.id;
  const { data: initialCategories } = hdModuleId 
    ? await supabase.from("ticket_categories").select("id, name, description").eq("module_id", hdModuleId).order("name")
    : { data: [] };

  const softwareSystems = systemsRes.data || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-10 font-sans antialiased bg-slate-50/20">
      <ModuleHeader 
        title="HELP_DESK_PROTOCOL"
        subtitle="Support Governance Node"
      />

      <div className="space-y-12">
        <CategoryManager 
          moduleId={hdModuleId || ""} 
          initialCategories={(initialCategories || []) as any} 
        />
        
        <div className="pt-12 border-t border-border/40">
          <SoftwareSystemManager 
            scope="it" 
            title="Help Desk Software Systems" 
            initialSystems={softwareSystems || []} 
          />
        </div>
      </div>
    </div>
  );
}
