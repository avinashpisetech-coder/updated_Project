"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { PurchasesClient } from "./PurchasesClient";

export default async function PurchasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.role !== "super_admin" && profile?.role !== "it_admin") {
    redirect("/dashboard");
  }

  // Fetch purchases with related data
  const { data: purchases } = await supabase
    .from("asset_purchases")
    .select(`
      *,
      supplier:asset_suppliers(name, state),
      project:projects(name),
      purchase_items:asset_purchase_items(asset_name, quantity, received_quantity)
    `)
    .order("purchase_date", { ascending: false });

  // Fetch suppliers for select
  const { data: suppliers } = await supabase
    .from("asset_suppliers")
    .select("id, name")
    .order("name");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  // Fetch Budgets for Monitoring HUD
  const { data: budgets } = await supabase
    .from("asset_budgets")
    .select(`
      id, 
      fiscal_year, 
      allocated_amount, 
      spent_amount, 
      asset_type:asset_types(name)
    `)
    .order("fiscal_year", { ascending: false });

  return (
    <div className="w-full h-full bg-[#f8f9fc]">
      <PurchasesClient 
        initialPurchases={purchases || []} 
        suppliers={suppliers || []} 
        projects={projects || []}
        budgets={budgets || []}
      />
    </div>
  );
}
