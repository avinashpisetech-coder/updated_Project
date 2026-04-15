"use server";

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { EditGrnClient } from "./EditGrnClient";

export default async function EditGrnPage({
  params,
}: {
  params: Promise<{ id: string; grnId: string }>;
}) {
  const { id, grnId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const profile = await ensureProfile(supabase, user);

  // Fetch GRN Data
  const { data: grn } = await supabase
    .from("asset_grns")
    .select(`
        *,
        items:asset_grn_items(
            *,
            purchase_item:asset_purchase_items(*)
        )
    `)
    .eq("id", grnId)
    .single();

  if (!grn) notFound();

  // Fetch PO for context
  const { data: purchase } = await supabase
    .from("asset_purchases")
    .select("po_number, id")
    .eq("id", id)
    .single();

  // Fetch activities (GRN Scope)
  const { data: activities } = await supabase
    .from('asset_activity_logs')
    .select('*, profile:performed_by(full_name)')
    .eq('grn_id', grnId)
    .order('created_at', { ascending: false });

  return (
    <EditGrnClient 
      grn={grn}
      purchase={purchase}
      activities={activities || []}
    />
  );
}
