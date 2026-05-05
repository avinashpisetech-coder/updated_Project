"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ReturnClient } from "./ReturnClient";
import { getReturnRegistry } from "./actions";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function ReturnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, permissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  // HEAVY GATE: Matrix-backed security enforcement
  if (!hasPermission(permissions, RESOURCES.ASSETS, "manage") && 
      !hasPermission(permissions, RESOURCES.ASSETS, "*") &&
      !hasPermission(permissions, "*", "*")) {
      redirect("/assets");
  }

  // 1. Fetch assets that are currently assigned (can be returned)
  const { data: assets } = await supabase
    .from("assets")
    .select(`
      *,
      sub_type:asset_sub_types!sub_type_id(name),
      custodian:profiles!current_holder_id(full_name, email)
    `)
    .eq("status", "assigned")
    .order("asset_code", { ascending: true });

  // 2. Fetch destination stores
  const { data: stores } = await supabase.from("asset_stores").select("id, name, code").order("name");

  // 3. Fetch users, projects, departments for the form headers
  const { data: users } = await supabase.from("profiles").select("id, full_name").order("full_name");
  const { data: projects } = await supabase.from("projects").select("id, name").order("name");
  const { data: departments } = await supabase.from("departments").select("id, name").order("name");

  // 4. Fetch initial registry
  const initialRegistry = await getReturnRegistry();

  return (
    <ReturnClient 
        assets={assets || []} 
        stores={stores || []} 
        users={users || []}
        projects={projects || []}
        departments={departments || []}
        initialData={initialRegistry}
    />
  );
}
