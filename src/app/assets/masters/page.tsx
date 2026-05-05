"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { AssetMastersClient } from "./AssetMastersClient";

import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function AssetsMastersPage() {
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

    // Parallel fetching for high-density initialization
    const [
        { data: types },
        { data: subTypes },
        { data: catalog },
        { data: hsnCodes },
        { data: taxGroups },
        { data: uom },
        { data: suppliers },
        { data: budgets },
        { data: onboardingConfigs },
        { data: departments },
        { data: companies },
        { data: projects },
        { data: auditLogs },
        { data: stores }
    ] = await Promise.all([
        supabase.from("asset_types").select("*").order("name"),
        supabase.from("asset_sub_types").select("*, type:type_id(name)").order("name"),
        supabase.from("asset_catalog").select("*, sub_type:sub_type_id(*, type:type_id(name)), hsn:hsn_code_id(*), store:store_id(*)").order("name"),
        supabase.from("asset_hsn_codes").select("*, tax_group:tax_group_id(*)").order("hsn_code"),
        supabase.from("asset_tax_groups").select("*, taxes:asset_taxes(*)").order("name"),
        supabase.from("asset_uom").select("*").order("name"),
        supabase.from("asset_suppliers").select("*").order("name"),
        supabase.from("asset_budgets").select("*, asset_type:asset_types(name), asset_sub_type:asset_sub_types(name), tax_group:asset_tax_groups(*), company:companies(name), project:projects(name)").order("fiscal_year", { ascending: false }),
        supabase.from("onboarding_asset_config").select("*, items:onboarding_asset_items(*, sub_type:asset_sub_types(name))").order("title"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("companies").select("*").order("name"),
        supabase.from("projects").select("*").order("name"),
        supabase.from("asset_master_logs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("asset_stores").select("*, project:projects(id, name), company:companies(id, name)").order("name")
    ]);

    return (
        <AssetMastersClient 
            types={types || []}
            subTypes={subTypes || []}
            catalog={catalog || []}
            hsnCodes={hsnCodes || []}
            taxGroups={taxGroups || []}
            uom={uom || []}
            suppliers={suppliers || []}
            budgets={budgets || []}
            onboardingConfigs={onboardingConfigs || []}
            departments={departments || []}
            companies={companies || []}
            projects={projects || []}
            auditLogs={auditLogs || []}
            stores={stores || []}
            role={profile?.role || "member"}
            fullName={profile?.full_name || "Authorized User"}
        />
    );
}
