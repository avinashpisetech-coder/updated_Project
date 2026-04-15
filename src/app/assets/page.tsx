import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ModuleHeader } from "@/components/ModuleHeader";
import { AssetDashboardClient } from "./AssetDashboardClient";
import { format } from "date-fns";
import { ShieldCheck, Activity, Layers } from "lucide-react";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function AssetsDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const permissions = await getUserPermissions(user.id);

  // HEAVY GATE: Matrix-backed security enforcement
  if (!hasPermission(permissions, RESOURCES.ASSETS)) {
    redirect("/dashboard");
  }

  const role = profile?.role || "end_user";

  // Fetch summary stats using the RPC defined in v079
  const [
    { data: stats },
    { data: movements },
    { data: lowStock },
    { data: budgets }
  ] = await Promise.all([
    supabase.rpc("get_asset_summary_stats"),
    supabase.from("stock_movements")
      .select(`
          *,
          asset:assets(asset_code, sub_type:asset_sub_types(name)),
          performed_by_profile:profiles(full_name),
          to_user_profile:profiles(full_name)
      `)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_low_stock_alerts"),
    supabase.from("asset_budgets")
      .select("*, asset_type:asset_types(name)")
      .eq("fiscal_year", "2026-27")
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <ModuleHeader 
        title="ITAM_GLOBAL_DASHBOARD"
        subtitle="Operations Intelligence Node v6.0.4"
      />

      {/* 2. Unified Matrix Content */}
      <main className="flex-1 overflow-auto p-10 no-scrollbar">
        <div className="w-full animate-in fade-in duration-500">
          <AssetDashboardClient 
            stats={stats || { total: 0, active: 0, in_store: 0, retired: 0 }} 
            movements={movements || []} 
            lowStock={lowStock || []}
            budgets={budgets || []}
            role={profile?.role || "end_user"}
          />
        </div>
      </main>


    </div>
  );
}
