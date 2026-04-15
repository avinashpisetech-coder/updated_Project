import { createClient, getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsDataPage() {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  // Fetch all accessible tickets with high-density detail
  // RLS on 'tickets' table automatically handles isolation
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(`
      id,
      ticket_number,
      subject,
      status,
      priority,
      created_at,
      sla_due_date,
      module:modules(name),
      category:ticket_categories(name),
      requester:profiles!requester_id(full_name, email),
      assignee:profiles!assigned_to_id(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Reports Fetch Error:", error);
  }

  // Also fetch metadata for filters
  const [{ data: modules }, { data: categories }] = await Promise.all([
    supabase.from("modules").select("id, name"),
    supabase.from("ticket_categories").select("id, name")
  ]);

  return (
    <ReportsClient 
      initialTickets={tickets || []} 
      modules={modules || []}
      categories={categories || []}
    />
  );
}
