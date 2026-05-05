import { createClient } from "@/lib/supabase/server";
import TicketFormClient from "./TicketFormClient";
import { redirect } from "next/navigation";

import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Parallel pre-fetching of initial data on the server
  const [
    { data: initialModules },
    permissions,
    { data: assignableUsers }
  ] = await Promise.all([
    supabase.from("modules").select("id, name, slug"),
    getUserPermissions(user.id),
    supabase.rpc("get_assignable_profiles")
  ]);

  const canAssign = hasPermission(permissions, RESOURCES.TICKETS, "update") || 
                   hasPermission(permissions, RESOURCES.TICKETS, "manage");

  return (
    <TicketFormClient 
      initialModules={initialModules || []} 
      canAssign={canAssign}
      assignableUsers={assignableUsers || []}
    />
  );
}
