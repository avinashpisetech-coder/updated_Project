"use server";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { PurchaseDetailClient } from "./PurchaseDetailClient";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";


export default async function PurchaseDetailPage({
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

  const [profile, permissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  if (!hasPermission(permissions, RESOURCES.ASSETS, "manage") && 
      !hasPermission(permissions, RESOURCES.ASSETS, "*") &&
      !hasPermission(permissions, "*", "*")) {
    redirect("/dashboard");
  }

  // Fetch purchase header
  const { data: purchase } = await supabase
    .from("asset_purchases")
    .select(`
      *,
      supplier:asset_suppliers(*),
      project:projects(*)
    `)
    .eq("id", id)
    .single();

  if (!purchase) notFound();

  // Fetch purchase items
  const { data: items } = await supabase
    .from("asset_purchase_items")
    .select(`
      *,
      asset_type:asset_types(name)
    `)
    .eq("purchase_id", id)
    .order("created_at");

  // Fetch GRNs for this PO
  const { data: grns } = await supabase
    .from("asset_grns")
    .select(`
      *,
      received_by_profile:profiles(full_name),
      items:asset_grn_items(
        *,
        purchase_item:asset_purchase_items(asset_name, model_number)
      )
    `)
    .eq("purchase_id", id)
    .order("created_at", { ascending: false });

  // Fetch Invoices
  const { data: invoices } = await supabase
    .from("asset_invoices")
    .select("*")
    .eq("purchase_id", id)
    .order("created_at", { ascending: false });

  // Fetch company info (Assume first one for now)
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .limit(1)
    .single();

  // Fetch activities (All Procurement Scopes)
  const { data: activities } = await supabase
    .from('asset_activity_logs')
    .select('*, profile:performed_by(full_name)')
    .eq('purchase_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="w-full h-full">
    <PurchaseDetailClient 
      purchase={purchase} 
      items={items || []} 
      grns={grns || []}
      invoices={invoices || []}
      activities={activities || []}
      company={company}
    />
    </div>
  );
}
