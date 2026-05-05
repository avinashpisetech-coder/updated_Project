"use server";

import { redirect } from "next/navigation";
import ErpModuleManager from "./ErpModuleManager";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import SoftwareSystemManager from "../SoftwareSystemManager";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Database, Hexagon, Fingerprint, Box } from "lucide-react";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function ErpMasterPage() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) redirect("/login");

  // --- Parallel High-Performance Fetch ---
  // Collapsing sequential calls into a single parallel block
  const [profile, permissions, modulesRes, systemsRes] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id),
    supabase.from("erp_modules").select("id, name, sub_modules:erp_sub_modules(id, name)").order("name"),
    supabase.from("software_systems").select("id, name, code, description, status").eq("scope", "erp").order("name")
  ]);

  if (!hasPermission(permissions, RESOURCES.ERP, "manage") && 
      !hasPermission(permissions, RESOURCES.ERP, "*") &&
      !hasPermission(permissions, "*", "*")) {
    redirect("/dashboard");
  }

  const initialModules = modulesRes.data || [];
  const softwareSystems = systemsRes.data || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-10 font-sans antialiased bg-slate-50/20">
      <ModuleHeader 
        title="ERP_ECOSYSTEM"
        subtitle="Global_Structure_Protocol"
      />

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
