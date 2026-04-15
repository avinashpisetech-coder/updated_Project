"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { MaintenanceClient } from "./MaintenanceClient";
import { ShieldCheck, Activity, Wrench, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  // 1. Fetch Asset Master (Catalog) as the primary source for names
  const { data: catalog, error: catalogError } = await supabase
    .from("asset_catalog")
    .select(`
      id,
      name,
      brand,
      model_number,
      sub_type:asset_sub_types(
        id,
        name,
        type:asset_types(name)
      )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  // 2. Fetch Physical Assets (Nodes) for the secondary selection
  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select(`
      *,
      sub_type:asset_sub_types(
        name,
        type:asset_types(name)
      ),
      custodian:profiles!current_holder_id(full_name)
    `)
    .order("asset_code", { ascending: true });

  if (assetsError || catalogError) {
    console.error("MAINTENANCE_LOG_ERROR [Data]:", assetsError || catalogError);
  }

  // 3. Fetch Maintenance Records
  const { data: records } = await supabase
    .from("asset_maintenance")
    .select(`
      *,
      asset:assets(asset_code, brand, model, sub_type:asset_sub_types(name)),
      performed_by_profile:profiles!reported_by(full_name)
    `)
    .order("created_at", { ascending: false });

  // 4. Fetch PM Schedules
  const { data: schedules } = await supabase
    .from("asset_pm_schedules")
    .select(`
        *,
        asset:assets(asset_code, brand, model, serial_number)
    `)
    .order("next_due_date", { ascending: true });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      
      {/* 1. Snow White: Global Maintenance Header */}
      <header className="h-[72px] shrink-0 bg-[#D9EAF7] border-b border-[#B5D1E8] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)]">
         <div className="flex items-center gap-6">
            <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-0.5">
                  <div className="h-4 w-1 bg-amber-500 rounded-full shadow-sm" />
                  <h1 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">HARDWARE_SERVICE_HUB</h1>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] opacity-60">Technical Resilience Protocol v3.8</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
               </div>
            </div>
            
            <div className="h-8 w-[1px] bg-[#B5D1E8] mx-2" />
            
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                 <Wrench size={14} className="text-primary/40" />
                 SERVICE_DOMAIN // IT_OPS
            </div>
         </div>

         <div className="flex items-center gap-4">
             <Button variant="outline" className="h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                Registry_Summary
             </Button>
         </div>
      </header>

      {/* 2. Unified Matrix Content */}
      <main className="flex-1 overflow-auto p-10 no-scrollbar">
        <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
          <MaintenanceClient 
            initialRecords={records || []} 
            initialSchedules={schedules || []}
            catalog={catalog || []}
            assets={assets || []} 
            role={role} 
          />
        </div>
      </main>

      {/* 3. Global Protocol Signal Footer */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> SVC_SYNCED: {format(new Date(), "HH:mm")}</span>
            <div className="h-3 w-[1px] bg-slate-100" />
            <span>AUTHORITY_DOMAIN: INFRA_RESILIENCE</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="hover:text-primary transition-colors cursor-help flex items-center gap-2"><Settings2 size={10} /> v3.8.0_EXEC</span>
            <span className="text-primary/40 flex items-center gap-2"><Activity size={10} /> SYSTEMS_DEPLOYED: 100%</span>
         </div>
      </footer>

    </div>
  );
}
