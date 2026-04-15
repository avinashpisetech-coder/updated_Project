import { createClient } from "@/lib/supabase/server";
import { GatePassClient } from "./GatePassClient";
import { redirect } from "next/navigation";

export default async function GatePassRegistryPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    // Fetch existing gate passes
    const { data: gatePasses } = await supabase
        .from("asset_gate_passes")
        .select("*, source:asset_stores(name), issuer:profiles!issued_by(full_name)")
        .order("created_at", { ascending: false });

    // Fetch stores for source selection
    const { data: stores } = await supabase.from("asset_stores").select("id, name");

    // Fetch assets for movement selection
    const { data: assets } = await supabase.from("assets").select("id, asset_code, brand, model, sub_type:asset_sub_types(name)").eq("status", "in_stock");

    return (
        <div className="p-10 max-w-[1400px] mx-auto min-h-screen bg-[#f8fafc]/50">
            <header className="mb-12 flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Logistics & Gate Pass Registry</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mt-2">Physical Security Protocol // Authorization Registry</p>
                </div>
            </header>

            <GatePassClient 
                initialGatePasses={gatePasses || []} 
                stores={stores || []}
                assets={assets || []}
            />
        </div>
    );
}
