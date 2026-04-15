"use server";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { NewGrnClient } from "./NewGrnClient";

export default async function NewGrnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.role !== "super_admin" && profile?.role !== "it_admin") {
    redirect("/dashboard");
  }

  // Fetch purchase header
  const { data: purchase } = await supabase
    .from("asset_purchases")
    .select(`
      *,
      supplier:asset_suppliers(*)
    `)
    .eq("id", id)
    .single();

  if (!purchase) notFound();

  // Step 1: Fetch purchase items WITHOUT the indent join (which may fail due to RLS)
  // This is the core data that must always load.
  const { data: items, error: itemsError } = await supabase
    .from("asset_purchase_items")
    .select(`
      *,
      asset_type:asset_types(name),
      catalog:asset_catalog(brand)
    `)
    .eq("purchase_id", id)
    .order("created_at");

  if (itemsError) console.error("Binding Failure [GRN]:", itemsError);

  if (itemsError) {
    console.error("Error fetching purchase items:", itemsError);
  }

  // Step 2: Fetch indent links separately — graceful degradation if unavailable
  let indentsByItemId: Record<string, { indent: any; allocated_quantity: number }[]> = {};
  if (items && items.length > 0) {
    const itemIds = items.map((i: any) => i.id);
    const { data: poIndents } = await supabase
      .from("po_item_indents")
      .select(`
        po_item_id,
        allocated_quantity,
        indent:asset_indents(
          id,
          indent_number,
          quantity,
          project_id,
          store_id,
          department_id,
          sub_type_id
        )
      `)
      .in("po_item_id", itemIds);

    // Group indents by purchase item id
    if (poIndents) {
      for (const link of poIndents) {
        if (!indentsByItemId[link.po_item_id]) indentsByItemId[link.po_item_id] = [];
        indentsByItemId[link.po_item_id].push({ indent: link.indent, allocated_quantity: link.allocated_quantity });
      }
    }
  }

  // Step 3: Merge — attach indent links to each item
  const enrichedItems = (items || []).map((item: any) => ({
    ...item,
    brand: item.catalog?.brand || "",
    po_item_indents: indentsByItemId[item.id] || [],
  }));

  // Step 4: Fetch all sub-types for fallback mapping
  const { data: allSubTypes } = await supabase.from("asset_sub_types").select("id, type_id, name");

  return (
    <NewGrnClient 
      purchase={purchase} 
      items={enrichedItems} 
      allSubTypes={allSubTypes || []}
    />
  );
}
