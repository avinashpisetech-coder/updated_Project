"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveDeployment(data: any, items: any[]) {
    const supabase = await createClient();
    
    // 1. Upsert Header
    const { data: deployment, error: headerError } = await supabase
        .from("asset_deployments")
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (headerError) throw new Error(headerError.message);

    // 2. Clear existing items if updating
    if (data.id) {
        await supabase.from("asset_deployment_items").delete().eq("deployment_id", data.id);
    }

    // 3. Insert new items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from("asset_deployment_items")
            .insert(items.map(item => ({
                ...item,
                deployment_id: deployment.id
            })));
        
        if (itemsError) throw new Error(itemsError.message);
    }

    revalidatePath("/assets/deployment");
    
    // 4. Log Activity
    await logDeploymentActivity(supabase, deployment.id, data.status || 'draft', "Transaction Registered/Updated");

    return deployment;
}

export async function approveDeploymentAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_deployment", { p_id: id });
    if (error) throw new Error(error.message);
    
    // Log Activity
    await logDeploymentActivity(supabase, id, 'approved', "Deployment Approved & Assets Assigned");
    
    revalidatePath("/assets/deployment");
}

export async function createAmendmentAction(id: string, summary: string) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_deployment_amendment", { 
        p_id: id, 
        p_summary: summary 
    });
    if (error) throw new Error(error.message);
    revalidatePath("/assets/deployment");
}

export async function updateStatusAction(id: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("asset_deployments")
        .update({ status })
        .eq("id", id);
    if (error) throw new Error(error.message);

    // Log Activity
    await logDeploymentActivity(supabase, id, status, `Manual Protocol Update to ${status.toUpperCase()}`);

    revalidatePath("/assets/deployment");
}

export async function deleteDeploymentAction(id: string) {
    const supabase = await createClient();
    
    // First set to requested_for_delete
    const { error: statusError } = await supabase
        .from("asset_deployments")
        .update({ status: 'requested_for_delete' })
        .eq("id", id);

    if (statusError) throw new Error(statusError.message);

    // Then actually mark as deleted (soft delete logic as per user requirement)
    const { error: finalError } = await supabase
        .from("asset_deployments")
        .update({ status: 'deleted' })
        .eq("id", id);

    if (finalError) throw new Error(finalError.message);
    
    revalidatePath("/assets/deployment");
}

export async function getLiveStock(subTypeId: string, storeId?: string) {
    const supabase = await createClient();
    let query = supabase
        .from("assets")
        .select("id", { count: 'exact', head: true })
        .eq("sub_type_id", subTypeId)
        .eq("status", "in_stock");

    if (storeId) {
        query = query.eq("store_id", storeId);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
}

export async function getDeploymentAmendments(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("asset_deployment_amendments")
        .select("*")
        .eq("deployment_id", id)
        .order("version_number", { ascending: false });
    
    if (error) return [];
    return data || [];
}

import { createAdminClient } from "@/lib/supabase/admin";

export async function getDeploymentAuditLogs(id: string) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
        .from("asset_deployment_logs")
        .select("*, profile:profiles(full_name)")
        .eq("deployment_id", id)
        .order("created_at", { ascending: false });
    
    if (error) {
        console.error("Audit fetch error:", error);
        return [];
    }
    return data || [];
}

async function logDeploymentActivity(supabase: any, deploymentId: string, status: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("asset_deployment_logs").insert({
        deployment_id: deploymentId,
        status: status,
        performed_by: user?.id,
        remarks: remarks
    });
}

export async function seedAuditLogsAction(id: string) {
    const supabase = createAdminClient();
    const { data: deployment } = await supabase
        .from("asset_deployments")
        .select("*")
        .eq("id", id)
        .single();

    if (!deployment) return;

    // Get current user for attribution
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("asset_master_logs")
        .insert([
            {
                table_name: 'asset_deployments',
                record_id: id,
                action: 'INSERT',
                new_data: deployment,
                changed_by: user?.id || null,
                created_at: new Date().toISOString()
            },
            {
                table_name: 'asset_deployment_items',
                record_id: id,
                action: 'UPDATE',
                new_data: { status: 'mock_audit_entry', message: 'Manual Protocol Verification' },
                changed_by: user?.id || null,
                created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
            }
        ]);

    if (error) throw new Error(error.message);
    revalidatePath("/assets/deployment");
}
