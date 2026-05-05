"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { NewPurchaseClient } from "./NewPurchaseClient";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function NewPurchasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, permissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  if (!hasPermission(permissions, RESOURCES.ASSETS, "manage") && 
      !hasPermission(permissions, RESOURCES.ASSETS, "*") &&
      !hasPermission(permissions, "*", "*")) {
    redirect("/dashboard");
  }

  // Fetch suppliers for select
  const { data: suppliers } = await supabase
    .from("asset_suppliers")
    .select("id, name")
    .order("name");

  // Fetch projects for select
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  // Fetch asset types
  const { data: assetTypes } = await supabase
    .from("asset_types")
    .select("id, name")
    .order("name");

  // Fetch sub-types
  const { data: subTypes } = await supabase
    .from("asset_sub_types")
    .select("id, name, type_id")
    .order("name");

  // Fetch Asset Catalog (The "Asset" level)
  const { data: catalog } = await supabase
    .from("asset_catalog")
    .select("id, name, sub_type_id, hsn_code_id, brand, model_number, uom:asset_uom(name, symbol), asset_sub_types(type_id)")
    .order("name");

  // Fetch HSN Codes with nested Tax Groups and individual Taxes
  const { data: hsnCodes } = await supabase
    .from("asset_hsn_codes")
    .select(`
      id, 
      hsn_code, 
      tax_group:asset_tax_groups(
        id, 
        name, 
        taxes:asset_taxes(name, percentage)
      )
    `)
    .eq("is_active", true);

  // Fetch Budgets
  const { data: budgets } = await supabase
    .from("asset_budgets")
    .select("*");

  // Fetch Authorized Indents (Status: po_conversion)
  const { data: indents } = await supabase
    .from("asset_indents")
    .select("*, sub_type:asset_sub_types(name), store:asset_stores(name), project:projects(name)")
    .eq("status", "po_conversion");

  return (
    <NewPurchaseClient 
      suppliers={suppliers || []} 
      projects={projects || []}
      assetTypes={assetTypes || []}
      subTypes={subTypes || []}
      catalog={catalog || []}
      hsnCodes={hsnCodes || []}
      budgets={budgets || []}
      indents={indents || []}
    />
  );
}
