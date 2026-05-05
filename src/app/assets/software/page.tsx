"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { SoftwareClient } from "./SoftwareClient";
import { ShieldCheck, Activity, Layers, Monitor } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function SoftwareSAMPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, permissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  // HEAVY GATE: Matrix-backed security enforcement
  if (!hasPermission(permissions, RESOURCES.ASSETS, "read") && 
      !hasPermission(permissions, RESOURCES.ASSETS, "*") &&
      !hasPermission(permissions, "*", "*")) {
      redirect("/assets");
  }

  // Fetch software assets with their licenses and assignment counts
  const { data: software } = await supabase
    .from("software_assets")
    .select(`
        *,
        licenses:software_licenses(
            *,
            assignments:software_assignments(count)
        )
    `)
    .order("name");

  // Fetch profiles for assignment
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  // Fetch hardware assets for assignment
  const { data: hardware } = await supabase
    .from("assets")
    .select("id, asset_code, brand, model")
    .order("asset_code");

  // Fetch suppliers for license linking
  const { data: suppliers } = await supabase
    .from("asset_suppliers")
    .select("id, name")
    .order("name");

  // Fetch purchases for linkage
  const { data: purchases } = await supabase
    .from("asset_purchases")
    .select("id, po_number")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50 relative">
      <SoftwareClient 
          initialSoftware={software || []} 
          suppliers={suppliers || []}
          purchases={purchases || []}
          profiles={profiles || []}
          hardware={hardware || []}
      />
    </div>
  );
}
