import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import AssetMasterClient from "@/components/assets/AssetMasterClient";

export default async function AssetsMasterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const { data: suppliers } = await supabase
    .from("asset_suppliers")
    .select("*")
    .order("name");

  // Fetch budgets
  const { data: budgets } = await supabase
    .from("asset_budgets")
    .select(`
      *,
      asset_type:asset_types(name)
    `)
    .order("fiscal_year", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="flex justify-between items-end pb-6 border-b border-border/40">
        <div className="technical-heading-node mb-0 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Master Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none m-0">Asset & Onboarding Masters</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-2">
            Configure IT inventory categories and automated employee onboarding bundles.
          </p>
        </div>
      </div>

      <AssetMasterClient 
        subTypes={subTypes || []} 
        onboardingConfigs={onboardingConfigs || []}
        departments={departments || []}
        assetTypes={assetTypes || []}
        suppliers={suppliers || []}
        budgets={budgets || []}
      />
    </div>
  );
}
