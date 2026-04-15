import { createClient } from "@/lib/supabase/server";
import { DispatcherHub } from "./DispatcherHub";
import { redirect } from "next/navigation";

export default async function RequisitionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    // Fetch data for the Dispatcher Hub
    const [
        { data: users },
        { data: bundles },
        { data: subTypes },
        { data: departments },
        { data: stores },
        { data: projects }
    ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, employee_id").order("full_name"),
        supabase.from("onboarding_asset_config").select("*, items:onboarding_asset_items(*, sub_type:asset_sub_types(name))").eq("is_active", true),
        supabase.from("asset_sub_types").select("*").eq("is_active", true),
        supabase.from("departments").select("*").order("name"),
        supabase.from("asset_stores").select("*").eq("is_active", true).order("name"),
        supabase.from("projects").select("*").order("name")
    ]);

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Requisition & Indent Hub</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 mt-2">IT Dispatcher Stage // Core Provisioning Protocol</p>
            </header>

            <DispatcherHub 
                users={users || []} 
                bundles={bundles || []} 
                subTypes={subTypes || []}
                departments={departments || []}
                stores={stores || []}
                projects={projects || []}
                currentUserRole={profile?.role || "end_user"}
            />
        </div>
    );
}
