"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveHandover(data: any, items: any[]) {
    const supabase = await createClient();
    
    // 1. Upsert Header
    const { data: handover, error: headerError } = await supabase
        .from("asset_handovers")
        .upsert({
            ...data,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (headerError) throw new Error(headerError.message);

    // 2. Clear existing items
    if (data.id) {
        await supabase.from("asset_handover_items").delete().eq("handover_id", data.id);
    }

    // 3. Insert new items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from("asset_handover_items")
            .insert(items.map(item => ({
                ...item,
                handover_id: handover.id
            })));
        
        if (itemsError) throw new Error(itemsError.message);
    }

    // 4. Log Activity
    await logHandoverActivity(supabase, handover.id, data.status || 'draft', "Handover Registry Updated");

    revalidatePath("/assets/handover");
    return handover;
}

export async function updateHandoverStatus(id: string, status: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("asset_handovers")
        .update({ status })
        .eq("id", id);
    if (error) throw new Error(error.message);

    await logHandoverActivity(supabase, id, status, `Manual Protocol Update to ${status.toUpperCase()}`);
    revalidatePath("/assets/handover");
}

export async function approveHandoverAction(id: string) {
    const supabase = await createClient();
    
    // Update status
    const { error: statusError } = await supabase
        .from("asset_handovers")
        .update({ status: 'approved' })
        .eq("id", id);

    if (statusError) throw new Error(statusError.message);

    // Fetch items to update asset statuses
    const { data: items } = await supabase
        .from("asset_handover_items")
        .select("asset_id, handover:asset_handovers(recipient_id)")
        .eq("handover_id", id);

    if (items) {
        for (const item of items) {
            await supabase.from("assets").update({
                status: 'assigned',
                current_holder_id: (item as any).handover.recipient_id,
                updated_at: new Date().toISOString()
            }).eq("id", item.asset_id);
        }
    }

    await logHandoverActivity(supabase, id, 'approved', "Handover Officially Verified & Assets Assigned");
    revalidatePath("/assets/handover");
}

export async function getHandoverAuditLogs(id: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("asset_handover_logs")
        .select("*, profile:profiles(full_name)")
        .eq("handover_id", id)
        .order("created_at", { ascending: false });
    
    if (error) return [];
    return data || [];
}

async function logHandoverActivity(supabase: any, handoverId: string, status: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("asset_handover_logs").insert({
        handover_id: handoverId,
        status: status,
        performed_by: user?.id,
        remarks: remarks
    });
}
