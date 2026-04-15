"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { DeploymentHubClient } from "./DeploymentHubClient";

export default async function DeploymentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const profile = await ensureProfile(supabase, user);
    const role = profile?.role || "end_user";

    // 1. Fetch Masters
    const results = await Promise.all([
        supabase.from("companies").select("id, name"),
        supabase.from("projects").select("id, name, company_id"),
        supabase.from("departments").select("id, name"),
        supabase.from("asset_stores").select("id, name, code"),
        supabase.from("asset_catalog").select(`
            id, 
            name, 
            brand, 
            model_number, 
            hsn:asset_hsn_codes(hsn_code),
            sub_type:asset_sub_types(
                id,
                name,
                allow_negative_stock,
                asset_type:asset_types(name)
            )
        `).eq("is_active", true),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("asset_deployments").select(`
            *,
            project:projects(name),
            company:companies(name),
            recipient:profiles!asset_deployments_recipient_id_fkey(full_name),
            department:departments(name),
            store:asset_stores(name),
            asset_deployment_items(*)
        `).order("created_at", { ascending: false })
    ]);

    const [
        companiesRes, projectsRes, departmentsRes, storesRes, assetsRes, usersRes, deploymentsRes
    ] = results;

    if (assetsRes.error) {
        console.error("ASSETS QUERY ERROR:", assetsRes.error);
    }
    if (deploymentsRes.error) {
        console.error("DEPLOYMENTS QUERY ERROR:", deploymentsRes.error);
    }

    const companies = companiesRes.data;
    const projects = projectsRes.data;
    const departments = departmentsRes.data;
    const stores = storesRes.data;
    const assets = assetsRes.data;
    const users = usersRes.data;
    const deployments = deploymentsRes.data;

    return (
        <DeploymentHubClient 
            companies={companies || []}
            projects={projects || []}
            departments={departments || []}
            stores={stores || []}
            assets={assets || []}
            users={users || []}
            deployments={deployments || []}
            role={role}
            currentUserId={user.id}
        />
    );
}
