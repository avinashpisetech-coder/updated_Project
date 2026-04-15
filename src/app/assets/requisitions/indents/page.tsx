import { createClient } from "@/lib/supabase/server";
import { IndentResolverClient } from "./IndentResolverClient";
import { redirect } from "next/navigation";

export default async function IndentManagementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== 'super_admin' && profile?.role !== 'it_admin' && profile?.role !== 'procurement_admin') {
        redirect("/assets");
    }

    const { data: indents } = await supabase.from("asset_indents")
        .select("*, sub_type:asset_sub_types(name), store:asset_stores(name, code), department:departments(name), project:projects(name)")
        .order("created_at", { ascending: false });

    const { data: stores } = await supabase.from("asset_stores").select("*").eq("is_active", true);

    return (
        <div className="w-full h-full min-h-screen p-10">
            <header className="mb-12">
                <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Indent Resolution Center</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40 mt-2">IT Administration // Procurement Fulfillment Protocol</p>
            </header>

            <IndentResolverClient 
                initialIndents={indents || []} 
                stores={stores || []}
            />
        </div>
    );
}
