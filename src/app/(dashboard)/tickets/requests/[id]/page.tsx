import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/permissions-server";
import RequestDetailClient from "./RequestDetailClient";

export default async function RequestDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const user = await getCachedUser();

  // Validate UUID to prevent database errors (22P02)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

  if (!isUuid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900">Invalid Request ID</h2>
        <p className="mt-2 text-slate-500">The provided ID is not a valid identifier.</p>
        <p className="mt-4 text-sm text-slate-500 italic">ID attempted: {params.id}</p>
      </div>
    );
  }
  
  const [fullBundleRes, permissions, assignableRes] = await Promise.all([
    supabase.rpc("get_ticket_full_bundle_v2", { p_identifier: params.id }),
    getUserPermissions(user?.id || ""),
    supabase.rpc("get_assignable_profiles")
  ]);

  if (fullBundleRes.error) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold text-red-500 underline">Database Error</h1>
        <pre className="mt-4 p-4 bg-slate-100 rounded text-left text-xs">{JSON.stringify(fullBundleRes.error, null, 2)}</pre>
        <p className="mt-4 text-sm text-slate-500 italic">ID searched: {params.id}</p>
      </div>
    );
  }

  if (!fullBundleRes.data || !fullBundleRes.data.ticket) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-2xl font-bold text-orange-500">Ticket Not Found in Matrix</h1>
        <p className="mt-4 text-sm text-slate-500 italic">ID searched: {params.id}</p>
      </div>
    );
  }

  const { ticket, activities, attachments } = fullBundleRes.data;
  
  const [requirementRes, profileRes] = await Promise.all([
    supabase.from("ticket_requirements").select("*").eq("ticket_id", ticket.id).single(),
    supabase.from("profiles").select("*").eq("id", user?.id).single()
  ]);

  return (
    <div className="bg-slate-50/50 min-h-screen">
      <RequestDetailClient 
        ticket={ticket} 
        requirement={requirementRes.data} 
        activities={activities || []}
        user={profileRes.data} 
        attachments={attachments}
        permissions={permissions}
      />
    </div>
  );
}
