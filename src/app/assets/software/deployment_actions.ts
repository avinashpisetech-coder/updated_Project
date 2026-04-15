"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveSoftwareDeployment(data: any, items: any[]) {
    const supabase = await createClient();
    
    // 1. Upsert Header
    const { data: deployment, error: headerError } = await supabase
        .from("software_deployments")
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (headerError) throw new Error(headerError.message);

    // 2. Clear existing items
    if (data.id) {
        await supabase.from("software_deployment_items").delete().eq("deployment_id", data.id);
    }

    // 3. Insert new items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from("software_deployment_items")
            .insert(items.map(item => ({
                ...item,
                deployment_id: deployment.id
            })));
        
        if (itemsError) throw new Error(itemsError.message);
    }

    // 4. Log Activity
    await logSoftwareDeploymentActivity(supabase, deployment.id, data.status || 'draft', "Software Deployment Protocol Updated");

    revalidatePath("/assets/software");
    return deployment;
}

export async function approveSoftwareDeployment(id: string) {
    const supabase = await createClient();
    
    // 1. Update status
    const { error: statusError } = await supabase
        .from("software_deployments")
        .update({ status: 'approved' })
        .eq("id", id);
    if (statusError) throw new Error(statusError.message);

    // 2. Fetch items to update official assignments
    const { data: items } = await supabase
        .from("software_deployment_items")
        .select("product_id, license_id, deployment:software_deployments(recipient_id)")
        .eq("deployment_id", id);

    if (items) {
        for (const item of items) {
             // Create real seat allocation
             await supabase.from("software_assignments").insert({
                 license_id: item.license_id,
                 profile_id: (item.deployment as any).recipient_id,
                 software_asset_id: item.product_id
             });
        }
    }

    await logSoftwareDeploymentActivity(supabase, id, 'approved', "Software Deployment Officially Verified & Allocated");
    revalidatePath("/assets/software");
}

export async function getSoftwareDeploymentAuditLogs(id: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("software_deployment_logs")
        .select("*, profile:profiles(full_name)")
        .eq("deployment_id", id)
        .order("created_at", { ascending: false });
    
    if (error) return [];
    return data || [];
}

async function logSoftwareDeploymentActivity(supabase: any, deploymentId: string, status: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("software_deployment_logs").insert({
        deployment_id: deploymentId,
        status: status,
        performed_by: user?.id,
        remarks: remarks
    });
}

export async function getSoftwareDeploymentRegistry() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("software_deployments")
        .select(`
            *,
            recipient:profiles!recipient_id(full_name),
            project:projects(name),
            department:departments(name)
        `)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
}
