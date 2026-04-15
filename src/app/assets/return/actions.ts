"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveReturn(data: any, items: any[]) {
    const supabase = await createClient();
    
    // 1. Upsert Header
    const { data: returnRec, error: headerError } = await supabase
        .from("asset_returns")
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (headerError) throw new Error(headerError.message);

    // 2. Clear existing items
    if (data.id) {
        await supabase.from("asset_return_items").delete().eq("return_id", data.id);
    }

    // 3. Insert new items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from("asset_return_items")
            .insert(items.map(item => ({
                ...item,
                return_id: returnRec.id
            })));
        
        if (itemsError) throw new Error(itemsError.message);
    }

    // 4. Log Activity
    await logReturnActivity(supabase, returnRec.id, data.status || 'draft', "Recovery Protocol Updated");

    revalidatePath("/assets/return");
    return returnRec;
}

export async function updateReturnStatus(id: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("asset_returns")
        .update({ status })
        .eq("id", id);
    if (error) throw new Error(error.message);

    await logReturnActivity(supabase, id, status, `Manual Protocol Update to ${status.toUpperCase()}`);
    revalidatePath("/assets/return");
}

export async function approveReturnAction(id: string) {
    const supabase = await createClient();
    
    // 1. Update status
    const { error: statusError } = await supabase
        .from("asset_returns")
        .update({ status: 'approved' })
        .eq("id", id);
    if (statusError) throw new Error(statusError.message);

    // 2. Get destination store
    const { data: retHeader } = await supabase.from("asset_returns").select("store_id").eq("id", id).single();

    // 3. Fetch items to RESTORE stock
    const { data: items } = await supabase
        .from("asset_return_items")
        .select("asset_id")
        .eq("return_id", id);

    if (items) {
        for (const item of items) {
            await supabase.from("assets").update({
                status: 'in_stock',
                current_holder_id: null,
                store_id: retHeader?.store_id, // Move back to central store
                updated_at: new Date().toISOString()
            }).eq("id", item.asset_id);
        }
    }

    await logReturnActivity(supabase, id, 'approved', "Recovery Officially Verified & Stock Restored");
    revalidatePath("/assets/return");
}

export async function getReturnAuditLogs(id: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("asset_return_logs")
        .select("*, profile:profiles(full_name)")
        .eq("return_id", id)
        .order("created_at", { ascending: false });
    
    if (error) return [];
    return data || [];
}

async function logReturnActivity(supabase: any, returnId: string, status: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("asset_return_logs").insert({
        return_id: returnId,
        status: status,
        performed_by: user?.id,
        remarks: remarks
    });
}

export async function getReturnRegistry() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("asset_returns")
        .select(`
            *,
            original_holder:profiles!original_holder_id(full_name),
            project:projects(name),
            department:departments(name),
            store:asset_stores(name)
        `)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
}
