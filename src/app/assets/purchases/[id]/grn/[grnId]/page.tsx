"use server";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { GrnDetailClient } from "./GrnDetailClient";

export default async function GrnDetailPage({
  params,
}: {
  params: Promise<{ id: string; grnId: string }>;
}) {
  const { id, grnId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.role !== "super_admin" && profile?.role !== "it_admin") {
    redirect("/dashboard");
  }

  // Fetch GRN Detail
  const { data: grn } = await supabase
    .from("asset_grns")
    .select(`
      *,
      received_by_profile:profiles(full_name),
      purchase:asset_purchases(
        *,
        supplier:asset_suppliers(*)
      )
    `)
    .eq("id", grnId)
    .single();

  if (!grn) notFound();

  // Fetch GRN Items
  const { data: items } = await supabase
    .from("asset_grn_items")
    .select(`
      *,
      purchase_item:asset_purchase_items(*)
    `)
    .eq("grn_id", grnId);

  // Fetch activities (Procurement audit trail)
  // Initially we fetch by purchase_id, but the client will filter for GRN-specific logs
  const { data: activities } = await supabase
    .from('asset_activity_logs')
    .select('*, profile:performed_by(full_name)')
    .eq('purchase_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="w-full h-full bg-[#f8f9fc]">
      <GrnDetailClient 
        grn={grn} 
        items={items || []} 
        activities={activities || []}
        profile={profile}
      />
    </div>
  );
}
