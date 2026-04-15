"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { HandoverHubClient } from "./HandoverHubClient";
import { getHandoverRegistry } from "./registry_actions";

export default async function HandoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  const staffRoles = ['super_admin', 'it_admin', 'procurement_admin', 'module_agent', 'dept_admin'];
  if (!staffRoles.includes(role)) {
      redirect("/assets");
  }

  // 1. Fetch available assets (In Stock)
  const { data: availableAssets, error: assetError } = await supabase
    .from("assets")
    .select(`
        id,
        asset_code,
        brand,
        model,
        serial_number,
        sub_type:asset_sub_types!sub_type_id (
            name,
            asset_type:asset_types!type_id (name)
        )
    `)
    .eq("status", "in_stock")
    .order("asset_code");

  if (assetError) {
      console.error("HANDOVER_ASSET_FETCH_ERROR:", assetError);
  }

  // 2. Fetch all users for assignment
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  // 3. Fetch Provisioning Targets
  const { data: requisitions } = await supabase
    .from("asset_requisitions")
    .select("id, requisition_number, recipient:profiles!recipient_id(full_name), project:projects(name), department:departments(name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // 4. Fetch Meta Nodes
  const { data: departments } = await supabase.from("departments").select("id, name").order("name");
  const { data: projects } = await supabase.from("projects").select("id, name, company_id").order("name");
  const { data: stores } = await supabase.from("asset_stores").select("id, name, code").order("name");

  // 5. Fetch Initial Registry
  const initialRegistry = await getHandoverRegistry();

  return (
    <HandoverHubClient 
        assets={availableAssets || []} 
        users={users || []} 
        requisitions={requisitions || []}
        departments={departments || []}
        projects={projects || []}
        stores={stores || []}
        initialData={initialRegistry}
    />
  );
}
