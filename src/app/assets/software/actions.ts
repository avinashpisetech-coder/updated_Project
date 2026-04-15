"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveSoftwareProduct(formData: any) {
    const supabase = await createClient();
    
    // 1. Split Product Metadata
    const productData = {
        name: formData.name,
        publisher: formData.publisher,
        category: formData.category,
        description: formData.description,
        version: formData.version,
        edition: formData.edition,
        publisher_part_number: formData.publisher_part_number
    };

    // 2. Insert Asset Card
    const { data: product, error: pError } = await supabase
        .from("software_assets")
        .insert(productData)
        .select()
        .single();
    
    if (pError) throw pError;

    // 3. Insert Initial License/Entitlement
    const licenseData = {
        software_id: product.id,
        transaction_id: formData.transaction_id,
        transaction_type: formData.transaction_type,
        purchase_date: formData.purchase_date,
        license_metric: formData.license_metric,
        seat_count: formData.seat_count,
        status: formData.status,
        cost: formData.cost,
        currency: formData.currency,
        maintenance_cost: formData.maintenance_cost,
        contract_reference: formData.contract_reference,
        expiry_date: formData.expiry_date || null,
        compliance_status: formData.compliance_status,
        has_downgrade_rights: formData.has_downgrade_rights,
        has_upgrade_rights: formData.has_upgrade_rights,
        is_reclaimable: formData.is_reclaimable,
        reclamation_status: formData.reclamation_status,
        location: formData.location
    };

    const { error: lError } = await supabase
        .from("software_licenses")
        .insert(licenseData);

    if (lError) throw lError;

    revalidatePath("/assets/software");
    return product;
}

export async function saveLicenseEntry(data: any) {
    const supabase = await createClient();
    const { data: license, error } = await supabase.from("software_licenses").upsert({
        ...data,
        updated_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    await logLicenseActivity(supabase, license.id, data.status || 'approved', "License Agreement Synchronized");
    revalidatePath("/assets/software");
    return license;
}

export async function assignSeatAction(data: any) {
    const supabase = await createClient();
    const { data: assignment, error } = await supabase.from("software_assignments").insert(data).select().single();
    if (error) throw error;

    await logAssignmentActivity(supabase, assignment.id, "ALLOCATED", `Seat assigned to ${data.profile_id ? 'User' : 'Asset'}`);
    revalidatePath("/assets/software");
}

export async function revokeSeatAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("software_assignments").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/assets/software");
}

export async function getSoftwareAuditLogs(type: 'license' | 'assignment', targetId: string) {
    const supabase = createAdminClient();
    const table = type === 'license' ? 'software_license_logs' : 'software_assignment_logs';
    const fk = type === 'license' ? 'license_id' : 'assignment_id';
    
    const { data, error } = await supabase
        .from(table)
        .select("*, profile:profiles(full_name)")
        .eq(fk, targetId)
        .order("created_at", { ascending: false });
    
    if (error) return [];
    return data || [];
}

async function logLicenseActivity(supabase: any, licenseId: string, status: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("software_license_logs").insert({
        license_id: licenseId,
        status: status,
        performed_by: user?.id,
        remarks: remarks
    });
}

async function logAssignmentActivity(supabase: any, assignmentId: string, action: string, remarks: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("software_assignment_logs").insert({
        assignment_id: assignmentId,
        action: action,
        performed_by: user?.id,
        remarks: remarks
    });
}
