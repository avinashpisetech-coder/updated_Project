"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { MovementsClient } from "./MovementsClient";
import { ShieldCheck, Activity, History } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default async function MovementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  const { data: movements } = await supabase
    .from("stock_movements")
    .select(`
        *,
        asset:assets(asset_code, brand, model, serial_number, sub_type:asset_sub_types(name)),
        from_user:profiles!from_user_id(full_name, email),
        to_user:profiles!to_user_id(full_name, email),
        performed_by_profile:profiles!performed_by(full_name, role)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      
      {/* 1. Snow White: Global Audit Header */}
      <header className="h-[72px] shrink-0 bg-[#D9EAF7] border-b border-[#B5D1E8] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)]">
         <div className="flex items-center gap-6">
            <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-0.5">
                  <div className="h-4 w-1 bg-primary rounded-full shadow-sm" />
                  <h1 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">GLOBAL_MOVEMENT_LEDGER</h1>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Audit Chronology Sync v4.1</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
               </div>
            </div>
            
            <div className="h-8 w-[1px] bg-[#B5D1E8] mx-2" />
            
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                 <ShieldCheck size={14} className="text-primary/40" />
                 IMMUTABLE_LOG // STAGE_4
            </div>
         </div>

         <div className="flex items-center gap-4">
             <Button variant="outline" className="h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                Export_Audit_CSV
             </Button>
         </div>
      </header>

      {/* 2. Unified Matrix Content */}
      <main className="flex-1 overflow-auto p-10 no-scrollbar">
        <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
          <MovementsClient initialMovements={movements || []} />
        </div>
      </main>

      {/* 3. Global Protocol Signal Footer */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> CHRONOLOGY_SYNCED: {format(new Date(), "HH:mm")}</span>
            <div className="h-3 w-[1px] bg-slate-100" />
            <span>AUTHORITY_DOMAIN: ITAM_AUDIT_LEDGER</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="hover:text-primary transition-colors cursor-help flex items-center gap-2"><History size={10} /> v4.1.0_PRO</span>
            <span className="text-primary/40 flex items-center gap-2"><Activity size={10} /> SYSTEM_INTEGRITY: 100%</span>
         </div>
      </footer>

    </div>
  );
}
