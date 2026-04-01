"use server";

import { redirect } from "next/navigation";
import ErpModuleManager from "./ErpModuleManager";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import SoftwareSystemManager from "../SoftwareSystemManager";
import { Database, Hexagon, Fingerprint, Box } from "lucide-react";

export default async function ErpMasterPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) redirect("/login");

  // --- Parallel High-Performance Fetch ---
  // Collapsing sequential calls into a single parallel block
  const [profile, modulesRes, systemsRes] = await Promise.all([
    ensureProfile(supabase, user),
    supabase.from("erp_modules").select("id, name, sub_modules:erp_sub_modules(id, name)").order("name"),
    supabase.from("software_systems").select("id, name, code, description, status").eq("scope", "erp").order("name")
  ]);

  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const initialModules = modulesRes.data || [];
  const softwareSystems = systemsRes.data || [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 p-8 font-sans antialiased">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Hexagon className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">System Configuration</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            ERP <span className="text-primary/60">Module Management</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium opacity-80">
            Configure ERP modules, sub-modules and software system visibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 px-4 rounded-xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Administrator Access</p>
          </div>
        </div>
      </div>

      <ErpModuleManager initialModules={initialModules || []} />
      
      <div className="pt-12 border-t border-border/40">
        <SoftwareSystemManager 
          scope="erp" 
          title="ERP Software Systems" 
          initialSystems={softwareSystems || []} 
        />
      </div>
    </div>
  );
}
