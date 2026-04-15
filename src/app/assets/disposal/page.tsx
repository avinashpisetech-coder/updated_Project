"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { DisposalClient } from "./DisposalClient";

export default async function DisposalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  // Only IT/Super Admin can access disposal protocols
  if (role === "end_user" && profile?.role !== "dept_admin" && profile?.role !== "super_admin") {
      redirect("/assets");
  }

  // Fetch Disposal Requests
  const { data: disposals } = await supabase
    .from("asset_disposals")
    .select(`
        *,
        requestor:profiles!requested_by(full_name),
        items:asset_disposal_items(
            *,
            asset:assets(asset_code, brand, model, serial_number)
        )
    `)
    .order("created_at", { ascending: false });

  // Fetch Assets that are 'damaged' or 'in_stock' (ready for scrap)
  const { data: assets } = await supabase
    .from("assets")
    .select(`
        id, asset_code, brand, model, status,
        sub_type:asset_sub_types(name)
    `)
    .in("status", ["damaged", "in_stock", "under_repair"])
    .order("asset_code");

  // Fetch Profiles for approvals/requests
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20 animate-in fade-in duration-1000">
        <div className="flex justify-between items-end pb-8 border-b border-white/5 relative">
            <div className="technical-heading-node mb-0 border-red-500/40">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary tracking-[0.4em]">Protocol: Terminal Lifecycle</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white leading-none m-0 uppercase tracking-tight">Asset Disposal Protocol</h1>
                <p className="text-[10px] font-bold text-white/20 mt-3 uppercase tracking-[0.3em] leading-relaxed max-w-2xl">
                    Managed E-Waste, scrap, and hardware write-off authorization matrix.
                </p>
            </div>
            <div className="flex flex-col items-end gap-1 opacity-20">
                <span className="text-[10px] font-black uppercase tracking-widest">ASM_DISPOSAL_V1</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Hazard: Scrapped</span>
            </div>
        </div>

        <DisposalClient 
            initialDisposals={disposals || []} 
            assets={assets || []} 
            profiles={profiles || []}
            role={role} 
        />
    </div>
  );
}
