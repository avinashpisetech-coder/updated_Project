"use server";

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { PrintPageClient } from "./PrintPageClient";

export default async function PurchasePrintPage({
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

  // Fetch company info
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .limit(1)
    .single();

  return (
    <PrintPageClient 
      purchase={purchase} 
      items={items || []} 
      company={company}
    />
  );
}
