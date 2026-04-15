"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { MyAssetsClient } from "./MyAssetsClient";
import { ShieldCheck, Activity, Award, UserCheck } from "lucide-react";
import { format } from "date-fns";

export default async function MyAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  
  // Fetch only assets assigned to the CURRENT user
  const { data: assets } = await supabase
    .from("assets")
    .select(`
      *,
      sub_type:asset_sub_types(name, category:asset_categories(name))
    `)
    .eq("custodian_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      
      {/* 1. Snow White: Personal Portfolio Header */}
      <header className="h-[72px] shrink-0 bg-[#D9EAF7] border-b border-[#B5D1E8] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)]">
         <div className="flex items-center gap-6">
            <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-0.5">
                  <div className="h-4 w-1 bg-emerald-500 rounded-full shadow-sm" />
                  <h1 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">MY_HARDWARE_PORTFOLIO</h1>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] opacity-60">Digital Asset Custodianship v2.1</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
               </div>
            </div>
            
            <div className="h-8 w-[1px] bg-[#B5D1E8] mx-2" />
            
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans">
                 <UserCheck size={14} className="text-primary/40" />
                 IDENTIFIED: {profile?.full_name?.toUpperCase() || user.email?.toUpperCase()}
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 px-6 h-10 rounded-xl bg-white/50 border border-white/50 shadow-sm mr-2 font-sans">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-primary/40" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Policy: CUSTODIAN_SECURE</span>
                </div>
            </div>
         </div>
      </header>

      {/* 2. Unified Matrix Content */}
      <main className="flex-1 overflow-auto p-10 no-scrollbar">
        <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
          <MyAssetsClient assets={assets || []} />
        </div>
      </main>

      {/* 3. Global Protocol Signal Footer */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 font-sans"><div className="h-1 w-1 rounded-full bg-emerald-500 shadow-sm" /> PORTFOLIO_SYNCED: {format(new Date(), "HH:mm")}</span>
            <div className="h-3 w-[1px] bg-slate-100" />
            <span>AUTHORITY_DOMAIN: EMPLOYEE_SELF_SERVICE</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="hover:text-primary transition-colors cursor-help flex items-center gap-2 font-sans"><Award size={10} /> v2.1.0_PRO</span>
            <span className="text-primary/40 flex items-center gap-2 font-sans"><Activity size={10} /> SYSTEM_READY: 100%</span>
         </div>
      </footer>

    </div>
  );
}
