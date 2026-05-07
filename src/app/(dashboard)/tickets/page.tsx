import { createClient, getCachedUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ModuleHeader } from "@/components/ModuleHeader";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";
import TicketListClient from "./TicketListClient";

export const dynamic = "force-dynamic";

function normalizeRoleKey(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default async function TicketsPage(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 20; // Enterprise-standard page size
  const offset = (page - 1) * pageSize;
  const query = searchParams.q || "";
  const statusFilter = searchParams.status || "";
  const requesterFilter = searchParams.requester || "";
  const sortField = searchParams.sort || "created_at";
  const sortDir = searchParams.dir === "asc" ? "asc" : "desc";

  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const ticketSelect = `
    id,
    ticket_number,
    subject,
    status,
    priority,
    created_at,
    resolved_at,
    module:modules(name),
    category:ticket_categories(name),
    requester:profiles!tickets_requester_id_fkey(
      full_name,
      department:departments!profiles_department_id_fkey(name)
    )
  `;

  // Performance: fetch profile and permissions in parallel
  const [profile, permissions, { data, error }] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single()
      .then(res => res.data),
    getUserPermissions(user.id),
    supabase.rpc("get_tickets_matrix_v2", {
      p_query: query,
      p_status: statusFilter || 'all',
      p_sort_field: sortField,
      p_sort_dir: sortDir,
      p_offset: offset,
      p_limit: pageSize
    })
  ]);

  if (error) {
    console.error("Supabase RPC Error on Tickets Page:", error.message, error.details, error.hint);
  }

  // Map RPC result to local state format
  const tickets = (data || []).map((t: any) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    created_at: t.created_at,
    sla_due_date: t.sla_due_date,
    resolved_at: t.resolved_at,
    is_requirement: t.is_requirement,
    module: { name: t.module_name },
    category: { name: t.category_name },
    requester: {
      full_name: t.requester_name,
      department: { name: t.department_name }
    }
  }));

  const count = (data && data.length > 0) ? (data[0] as any).total_count : 0;

  const paginationMeta = {
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans antialiased text-slate-900">
      <ModuleHeader 
        title="Support_Registry"
        subtitle="Intelligence. Registry. Operations."
        actions={
          hasPermission(permissions, RESOURCES.TICKETS, "create") && (
            <Button
              asChild
              size="sm"
              className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95 group"
            >
              <Link href="/tickets/new" className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90" />
                Log_Ticket
              </Link>
            </Button>
          )
        }
      />

      {/* Main Registry Deck */}
      <main className="flex-1 overflow-hidden bg-slate-50/40">
        <TicketListClient 
           tickets={(tickets || []) as any} 
           pagination={paginationMeta} 
        />
      </main>
    </div>
  );
}
