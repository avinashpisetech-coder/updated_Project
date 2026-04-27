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
        purchase:asset_purchases(po_number),
        company:certifying_company_id(name),
        supplier:supplier_id(name),
        store:store_id(name),
        department:department_id(name)
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
    .select(`
        id, 
        po_number,
        supplier_id,
        purchase_date,
        total_raw_amount,
        gst_amount,
        grand_total,
        project:projects(company_id)
    `)
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

  // Fetch companies for certifying company selection
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  // Fetch suppliers
  const { data: suppliers } = await supabase
    .from("asset_suppliers")
    .select("id, name")
    .order("name");

  // Fetch departments 
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  // Fetch Asset Catalog (Master Register)
  const { data: catalog } = await supabase
    .from("asset_catalog")
    .select("*, sub_type:asset_sub_types(name, type_id)")
    .order("name");

  // Fetch UOMs
  const { data: uoms } = await supabase
    .from("asset_uom")
    .select("*")
    .order("name");

  return (
    <div className="w-full h-full min-h-screen">
        <InventoryClient 
            initialAssets={assets || []} 
            subTypes={subTypes || []} 
            purchases={purchases || []}
            profiles={profiles || []}
            stores={stores || []}
            companies={companies || []}
            suppliers={suppliers || []}
            departments={departments || []}
            catalog={catalog || []}
            uoms={uoms || []}
            role={role} 
        />
    </div>
  );
}
