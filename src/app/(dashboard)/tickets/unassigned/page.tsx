import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  module: { name: string } | { name: string }[] | null;
  category: { name: string } | { name: string }[] | null;
}

export default async function UnassignedQueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile to check their role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // End users should not have access to the unassigned queue
  if (profile?.role === "end_user") {
    redirect("/dashboard");
  }

  // Fetch tickets that are unassigned and 'new' or 'open'
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(`
      id,
      ticket_number,
      subject,
      status,
      priority,
      created_at,
      module:modules(name),
      category:ticket_categories(name)
    `)
    .is("assigned_to_id", null)
    .in("status", ["new", "open"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching unassigned tickets:", error);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Unassigned Queue</h1>
          <p className="mt-2 text-muted-foreground">Tickets awaiting assignment in your module(s).</p>
        </div>
        <div className="flex gap-4 items-center">
          <Badge className="text-base px-4 py-1 bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
            {tickets?.length || 0} Open
          </Badge>
          <Button asChild className="font-semibold shadow-lg shadow-primary/25">
            <Link href="/tickets/new">+ New Ticket</Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-xl shadow-black/5">
        <Table>
          <TableHeader className="bg-muted/35">
            <TableRow className="border-border/70 hover:bg-muted/25">
              <TableHead className="text-muted-foreground">Ticket ID</TableHead>
              <TableHead className="text-muted-foreground">Subject</TableHead>
              <TableHead className="text-muted-foreground">Module</TableHead>
              <TableHead className="text-muted-foreground">Priority</TableHead>
              <TableHead className="text-muted-foreground">Created</TableHead>
              <TableHead className="text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? (
              tickets.map((ticket: Ticket) => (
                <TableRow key={ticket.id} className="border-border/70 hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <Link href={`/tickets/${ticket.id}`} className="text-primary hover:underline">
                      {ticket.ticket_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-foreground">{ticket.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {Array.isArray(ticket.module) ? ticket.module[0]?.name : ticket.module?.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge className={ticket.priority === 'critical' ? 'bg-red-500/15 text-red-700 dark:text-red-300 hover:bg-red-500/25' : 'bg-muted text-foreground hover:bg-muted/70'}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(ticket.created_at), 'MMM dd, p')}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild className="border-primary/40 text-primary hover:bg-primary/10">
                      <Link href={`/tickets/${ticket.id}`}>Review & Assign</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  The unassigned queue is empty. Great job!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
