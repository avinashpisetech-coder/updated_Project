"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { GrnSelectionClient } from "./GrnSelectionClient";


export default async function NewGrnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.role !== "super_admin" && profile?.role !== "it_admin") {
    redirect("/dashboard");
  }

  // Fetch projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  // Fetch approved purchases (POs) that can receive materials
  const { data: purchases } = await supabase
    .from("asset_purchases")
    .select(`
      id,
      po_number,
      project_id,
      supplier:asset_suppliers(name),
      purchase_items:asset_purchase_items(quantity, received_quantity)
    `)
    .eq("status", "approved")
    .order("po_number");

  return (
    <div className="w-full h-full bg-[#f8f9fc]">
      <GrnSelectionClient 
        projects={projects || []}
        purchases={purchases || []}
      />
    </div>
  );
}
