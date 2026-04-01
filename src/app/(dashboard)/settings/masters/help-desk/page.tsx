"use server";

import { redirect } from "next/navigation";
import CategoryManager from "./CategoryManager";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import SoftwareSystemManager from "../SoftwareSystemManager";
import { LifeBuoy, Fingerprint, Activity, Layers, ShieldCheck } from "lucide-react";

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
    <div className="mx-auto max-w-7xl space-y-12 p-8 font-sans antialiased">
      {/* Governance Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Support Configuration</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Help Desk <span className="text-primary/60">Management</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium opacity-80">
            Configure ticket categories and support software system visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 px-4 rounded-xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Administrator Access</p>
          </div>
        </div>
      </div>

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
