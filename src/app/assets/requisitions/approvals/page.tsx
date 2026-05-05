import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RequisitionApprovalClient } from "./RequisitionApprovalClient";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function RequisitionApprovalPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const permissions = await getUserPermissions(user.id);

    // HEAVY GATE: Matrix-backed security enforcement
    if (!hasPermission(permissions, RESOURCES.ASSETS, "manage") && 
        !hasPermission(permissions, RESOURCES.ASSETS, "*") &&
        !hasPermission(permissions, "*", "*")) {
        redirect("/assets");
    }

    const { data: requisitions } = await supabase.from("asset_requisitions")
        .select("*, requester:requested_by(full_name), recipient:on_behalf_of(full_name), project:projects(id, name), store:asset_stores(id, name, code), department:departments(id, name), items:asset_requisition_items(*, sub_type:asset_sub_types(name))")
        .order("created_at", { ascending: false });

    const { data: stores } = await supabase.from("asset_stores").select("*").eq("is_active", true);

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Operational Approval Desk</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 mt-2">IT Administrator Stage // Stock Verification Protocol</p>
            </header>

            <RequisitionApprovalClient 
                initialRequisitions={requisitions || []} 
                stores={stores || []}
            />
        </div>
    );
}
