"use server";

import { createClient } from "@/lib/supabase/server";

export async function getHandoverRegistry() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("asset_handovers")
        .select(`
            *,
            recipient:profiles!recipient_id(full_name),
            project:projects(name),
            department:departments(name),
            store:asset_stores(name)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Handover fetch error:", error);
        return [];
    }
    return data || [];
}
