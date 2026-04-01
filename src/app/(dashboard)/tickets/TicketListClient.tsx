"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Ticket as TicketIcon, 
  ShieldCheck, 
  Zap,
  Clock
} from "lucide-react";
import { EmptyTicketsIllustration } from "@/components/ui/illustrations";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at?: string | null;
  module?: { name?: string };
  category?: { name?: string };
  requester?: {
    full_name?: string;
    department?: { name?: string };
  };
};

// ── SLA age helpers ────────────────────────────────────────────────────────
type SlaFlag = "overdue" | "new" | "normal" | "resolved";

function normalizeStatus(status: string) {
  return String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function formatStatusLabel(status: string) {
  return normalizeStatus(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function computeAge(
  createdAt: string,
  resolvedAt: string | null | undefined,
  status: string,
): { displayText: string; slaFlag: SlaFlag } {
  const normalizedStatus = normalizeStatus(status);
  const isResolved = normalizedStatus === "resolved" || normalizedStatus === "closed";
  const base = new Date(createdAt).getTime();
  const end = isResolved && resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - base);
  const totalMins = Math.floor(diffMs / 60_000);
  const days  = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins  = totalMins % 60;
  const displayText = `${days}d ${hours}h ${mins}m`;

  let slaFlag: SlaFlag;
  if (isResolved)           slaFlag = "resolved";
  else if (totalMins > 2880) slaFlag = "overdue";   // > 48 h → Red
  else if (totalMins < 1440) slaFlag = "new";        // < 24 h → Green
  else                       slaFlag = "normal";

  return { displayText, slaFlag };
}

/** Hook: returns current time, ticking every 60 s so Time Pending refreshes. */
function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

export default function TicketListClient({ 
  tickets: initialTickets,
  pagination 
}: { 
  tickets: Ticket[],
  pagination: {
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }
}) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

  // Sync with props when they change (initial load or page revalidation)
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  // Tick every 60 s so "Time Pending" values refresh without a page reload
  useTick();

  // Real-time listener for updates to the current page's tickets
  useEffect(() => {
    const channel = supabase
      .channel("tickets-list-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          const row = payload.new as Partial<Ticket> & { id?: string };
          if (!row.id) return;

          setTickets((prev) =>
            prev.map((ticket) =>
              ticket.id === row.id
                ? {
                    ...ticket,
                    status: typeof row.status === "string" ? row.status : ticket.status,
                    priority: typeof row.priority === "string" ? row.priority : ticket.priority,
                  }
                : ticket,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    // Reset to page 1 on search/sort/filter changes
    if (!updates.page) params.set("page", "1");
    router.push(`/tickets?${params.toString()}`);
  };

  const toggleSort = (field: string) => {
    const currentSort = searchParams.get("sort") || "created_at";
    const currentDir = searchParams.get("dir") || "desc";
    
    let newDir = "asc";
    if (currentSort === field && currentDir === "asc") {
      newDir = "desc";
    }
    
    updateQueryParams({ sort: field, dir: newDir });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ q: searchTerm || null });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: String(newPage) });
  };

  return (
    <div className="space-y-4">
      {/* ── Stats Metric Nodes ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-2 flex flex-col gap-1 group hover:border-primary/30 transition-all duration-300">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Registry</span>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold tracking-tight text-foreground leading-none">{pagination.total}</span>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <TicketIcon className="h-3.5 w-3.5 text-primary opacity-60" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-2 flex flex-col gap-1 group">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Page Scope</span>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold tracking-tight text-foreground leading-none">{pagination.page} / {pagination.totalPages || 1}</span>
            <div className="h-7 w-7 rounded-lg bg-muted/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Matrix ── */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-card/40 p-3 rounded-2xl border border-border/40 backdrop-blur-sm">
        <form onSubmit={handleSearch} className="relative w-full md:w-1/2 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Zap className="h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID or Subject..."
            className="w-full h-10 pl-11 pr-4 rounded-xl border border-border/60 bg-background/50 text-xs font-medium tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </form>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setSearchTerm("");
              router.push("/tickets");
            }} 
            variant="outline"
            className="h-10 px-6 rounded-xl border-border/60 text-[10px] font-bold uppercase tracking-widest hover:bg-muted/50 transition-all active:scale-95"
          >
            Reset View
          </Button>
        </div>
      </div>


      {/* ── Ticket Grid ── */}
      <div className="technical-card !rounded-[2.5rem] overflow-hidden border-border/40">
        <div className="overflow-x-auto no-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border/40">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead onClick={() => toggleSort("ticket_number")} className="cursor-pointer h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                   ID {searchParams.get("sort") === "ticket_number" && (searchParams.get("dir") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead onClick={() => toggleSort("subject")} className="cursor-pointer h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                   Subject {searchParams.get("sort") === "subject" && (searchParams.get("dir") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">Requester</TableHead>
                <TableHead className="h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">Module</TableHead>
                <TableHead onClick={() => toggleSort("priority")} className="cursor-pointer h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">
                   Priority {searchParams.get("sort") === "priority" && (searchParams.get("dir") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead onClick={() => toggleSort("status")} className="cursor-pointer h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">
                   Status {searchParams.get("sort") === "status" && (searchParams.get("dir") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead onClick={() => toggleSort("created_at")} className="cursor-pointer h-12 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground text-right pr-8">
                   Created {searchParams.get("sort") === "created_at" && (searchParams.get("dir") === "asc" ? "↑" : "↓")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length ? (
                tickets.map((ticket) => {
                  const { displayText, slaFlag } = computeAge(
                    ticket.created_at,
                    ticket.resolved_at,
                    ticket.status,
                  );
                  return (
                    <TableRow key={ticket.id} className="border-border/10 hover:bg-primary/5 transition-colors group">
                      <TableCell className="h-14 py-2">
                        <Link href={`/tickets/${ticket.id}`} className="flex flex-col">
                          <span className="text-[13px] font-bold tracking-tight text-primary leading-none mb-1 group-hover:scale-[1.02] transition-transform origin-left underline-offset-4 hover:underline">
                            {ticket.ticket_number}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Ticket ID</span>
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {ticket.subject}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 opacity-60 italic">
                          {ticket.requester?.department?.name || "Global_Node"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[11px] font-black uppercase tracking-tight text-foreground/80">
                          {ticket.requester?.full_name?.split(' ')[0] || "System"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="h-6 rounded-lg border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider px-3">
                          {ticket.module?.name || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "h-6 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3",
                          ticket.priority === "critical" 
                            ? "bg-red-500/10 text-red-600 border-red-500/20" 
                            : "bg-muted/50 text-muted-foreground border-border/40"
                        )}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="h-6 rounded-lg border-primary/40 text-primary bg-background text-[10px] font-bold uppercase tracking-wider px-3">
                          {formatStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-bold text-foreground">
                            {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                          </span>
                          <span className="text-[9px] font-medium text-muted-foreground uppercase opacity-40">
                             {format(new Date(ticket.created_at), "HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground py-12">
                      <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center border border-border/40 mb-2 shadow-inner">
                        <EmptyTicketsIllustration width={48} height={48} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">No tickets found in registry</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination Controls ── */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Showing {Math.min(pagination.total, (pagination.page - 1) * pagination.pageSize + 1)} - {Math.min(pagination.total, pagination.page * pagination.pageSize)} of {pagination.total} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest px-4"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum = pagination.page;
                if (pagination.page <= 3) pageNum = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = pagination.page - 2 + i;

                if (pageNum <= 0 || pageNum > pagination.totalPages) return null;

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      "h-9 w-9 rounded-xl text-[10px] font-bold transition-all",
                      pagination.page === pageNum ? "shadow-lg shadow-primary/20" : ""
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest px-4"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
