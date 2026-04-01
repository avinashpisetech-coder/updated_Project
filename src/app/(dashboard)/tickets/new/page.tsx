import { createClient } from "@/lib/supabase/server";
import TicketFormClient from "./TicketFormClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const supabase = await createClient();

  // 1. Parallel pre-fetching of initial data on the server
  // This eliminates the initial client-side network waterfall.
  const [
    { data: { user } },
    { data: initialModules }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("modules").select("id, name, slug")
  ]);

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch current profile role to determine if user is an agent
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return (
    <TicketFormClient 
      initialModules={initialModules || []} 
      userProfile={userProfile || null}
    />
  );
}
