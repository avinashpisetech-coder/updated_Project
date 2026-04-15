"use server";

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { EditPurchaseClient } from "./EditPurchaseClient";


export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);

  // Fetch PO Data
  const { data: purchase } = await supabase
    .from("asset_purchases")
    .select("*")
    .eq("id", id)
    .single();

  if (!purchase) notFound();

  // Fetch PO Items
  const { data: items, error: itemsError } = await supabase
    .from("asset_purchase_items")
    .select(`
      *,
      asset_type:asset_types(name)
    `)
    .eq("purchase_id", id)
    .order("created_at");

  if (itemsError) console.error("Binding Failure [Edit]:", itemsError);

  const [
    { data: suppliers }, 
    { data: projects }, 
    { data: assetTypes }, 
    { data: subTypes }, 
    { data: catalog }, 
    { data: hsnCodes },
    { data: budgets },
    { count: grnCount },
    { data: indents },
    { data: initialMappings }
  ] = await Promise.all([
    supabase.from("asset_suppliers").select("*").order("name"),
    supabase.from("projects").select("*").order("name"),
    supabase.from("asset_types").select("*").order("name"),
    supabase.from("asset_sub_types").select("*").order("name"),
    supabase.from("asset_catalog").select("*, uom:asset_uom(name, symbol), asset_sub_types(type_id)").order("name"),
    supabase.from("asset_hsn_codes").select("*, tax_group:asset_tax_groups(*, taxes:asset_taxes(*))"),
    supabase.from("asset_budgets").select("*"),
    supabase.from("asset_grns").select("id", { count: 'exact', head: true }).eq("purchase_id", id),
    // Fetch Authorized Indents (Status: po_conversion) OR indents already linked to this PO
    supabase.from("asset_indents").select("*, sub_type:asset_sub_types(name), store:asset_stores(name), project:projects(name)").or(`status.eq.po_conversion, status.eq.po_linked`),
    // Fetch Current Mappings
    supabase.from("po_item_indents").select("*, indent:asset_indents(*)").in("po_item_id", (items || []).map(i => i.id))
  ]);

  return (
    <EditPurchaseClient 
      purchase={purchase}
      initialItems={items || []}
      suppliers={suppliers || []}
      projects={projects || []}
      assetTypes={assetTypes || []}
      subTypes={subTypes || []}
      catalog={catalog || []}
      hsnCodes={hsnCodes || []}
      budgets={budgets || []}
      grnExists={(grnCount || 0) > 0}
      indents={indents || []}
      initialMappings={initialMappings || []}
    />
  );
}
