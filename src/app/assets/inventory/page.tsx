"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  // Only staff can access full registry
  if (role === "end_user" && profile?.role !== "module_agent" && profile?.role !== "dept_admin" && profile?.role !== "super_admin") {
      redirect("/assets");
  }

  // Fetch complete asset registry with holder info and sub-type metadata
  const { data: assets } = await supabase
    .from("assets")
    .select(`
        *,
        holder:profiles!current_holder_id(full_name),
        sub_type:asset_sub_types(name, code_prefix),
        purchase:asset_purchases(po_number)
    `)
    .order("asset_code");

  // Fetch asset sub-types for the "Add Asset" modal
  const { data: subTypes } = await supabase
    .from("asset_sub_types")
    .select("*")
    .order("name");

  // Fetch completed purchases for linkage
  const { data: purchases } = await supabase
    .from("asset_purchases")
    .select("id, po_number")
    .order("created_at", { ascending: false });

  // Fetch profiles for assignment
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  // Fetch stores for allocation
  const { data: stores } = await supabase
    .from("asset_stores")
    .select("id, name")
    .order("name");

  return (
    <div className="w-full h-full min-h-screen">
        <InventoryClient 
            initialAssets={assets || []} 
            subTypes={subTypes || []} 
            purchases={purchases || []}
            profiles={profiles || []}
            stores={stores || []}
            role={role} 
        />
    </div>
  );
}
