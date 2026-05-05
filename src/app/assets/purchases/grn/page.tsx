"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { GrnClient } from "./GrnClient";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function GrnRegistryPage() {
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

  // Fetch GRNs with related data (Purchase Order number and supplier)
  const { data: grns } = await supabase
    .from("asset_grns")
    .select(`
      *,
      purchase:asset_purchases(po_number, supplier:asset_suppliers(name))
    `)
    .order("received_date", { ascending: false });

  return (
    <div className="w-full h-full bg-[#f8f9fc]">
      <GrnClient initialGrns={grns || []} />
    </div>
  );
}
