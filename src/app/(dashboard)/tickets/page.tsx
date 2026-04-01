import { createClient, getCachedUser } from "@/lib/supabase/server";
import TicketListClient from "./TicketListClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ensureProfile } from "@/lib/ensure-profile";

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

  // Build high-performance query.
  // Security scoping is now handled entirely at the Database RLS layer for 100% performance.
  // Optimization: use 'estimated' count for large organizational datasets to avoid full scans.
  let ticketQuery = supabase
    .from("tickets")
    .select(ticketSelect, { count: 'estimated' });

  // Apply Filters (Search & State)
  if (query) {
    ticketQuery = ticketQuery.or(`subject.ilike.%${query}%,ticket_number.ilike.%${query}%`);
  }
  if (statusFilter) {
    ticketQuery = ticketQuery.eq("status", statusFilter);
  }

  // Apply Ordering & Pagination
  ticketQuery = ticketQuery
    .order(sortField, { ascending: sortDir === "asc" })
    .range(offset, offset + pageSize - 1);

  const { data: tickets, count, error } = await ticketQuery;

  if (error) {
    console.error("Supabase Error on Tickets Page:", error.message, error.details, error.hint);
  }

  const paginationMeta = {
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 font-sans overflow-hidden">
      {/* Queue Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pb-6 border-b border-border/40 relative">
        <div className="technical-heading-node mb-0 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Live Queue Stream</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none m-0">Support Queue</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-2">
            Comprehensive audit trail and operational state management for all system requests.
          </p>
        </div>
        <div className="flex items-center gap-4 pb-2">
          <Button
            asChild
            size="sm"
            className="rounded-xl h-10 px-6 text-[11px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95 group"
          >
            <Link href="/tickets/new" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Create Ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="technical-card overflow-hidden border-border/40 bg-card/40">
        <TicketListClient 
           tickets={(tickets || []) as any} 
           pagination={paginationMeta} 
        />
      </div>
    </div>
  );
}
