import { createClient, getCachedUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/ActivityFeed";
import { Suspense } from "react";
import {
  Ticket,
  Zap,
  Users2,
  ArrowRight,
  Clock,
  PlusCircle,
  BarChart3,
  Activity,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function normalizeRoleKey(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  // --- Parallel Primary Fetch ---
  // Performance: fetch profile and counts simultaneously.
  const [profileResponse, countsResponse] = await Promise.all([
    supabase.from("profiles").select("role, department_id").eq("id", user.id).single(),
    supabase.rpc("get_ticket_status_counts")
  ]);

  const profile = profileResponse.data;
  const countsData = countsResponse.data || {};
  
  const roleLower = normalizeRoleKey(profile?.role);
  const isEndUser = ["end_user", "enduser", "user"].includes(roleLower);

  const statusCounts = countsData as Record<string, number>;

  // Valid ENUM values for open/active statuses (matches ticket_status ENUM in DB)
  // Included 'replied' in the active calculation as it's a pending state.
  const OPEN_STATUSES = ["new", "assigned", "in_progress", "pending_user", "replied", "scheduled"];
  const openTickets = OPEN_STATUSES.reduce((acc, s) => acc + (statusCounts[s] || 0), 0);

  // --- All Statuses Labels (for reference) ---
  const ALL_STATUSES = [
    "new", "assigned", "in_progress", 
    "pending_user", "replied", "pending_dept", "pending_third_party", 
    "scheduled", "escalated", "resolved", "closed", "cancelled"
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "assigned": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      case "in_progress": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "pending_user":
      case "pending_dept":
      case "pending_third_party": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "scheduled": return "text-indigo-500 bg-indigo-500/10 border-indigo-500/20";
      case "escalated": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case "resolved": return "text-slate-400 bg-slate-400/10 border-slate-400/20";
      case "closed": return "text-slate-500 bg-slate-500/10 border-slate-500/20";
      case "cancelled": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-muted-foreground bg-muted/10 border-border/40";
    }
  };

  const statusLabels: Record<string, string> = {
    new: "New",
    assigned: "Assigned",
    in_progress: "In Progress",
    pending_user: "Pending (User)",
    pending_dept: "Pending (Dept)",
    pending_third_party: "Pending (3rd Party)",
    scheduled: "Scheduled",
    escalated: "Escalated",
    resolved: "Resolved",
    closed: "Closed",
    cancelled: "Cancelled"
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-6 font-sans overflow-hidden">
      {/* Overview Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pb-6 border-b border-border/40 relative">
        <div className="technical-heading-node mb-0 border-primary/40">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
              System Live
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none m-0">
            {isEndUser ? "User Workspace" : "Operations Overview"}
          </h1>
          <p className="text-sm font-medium text-muted-foreground/60 max-w-2xl mt-2">
            {isEndUser
              ? "Monitor and manage your active support requests and service history."
              : "Real-time telemetry and performance metrics for the enterprise support infrastructure."}
          </p>
        </div>
        <div className="flex items-center gap-4 pb-2">
          <Button
            asChild
            size="sm"
            className="rounded-xl h-10 px-6 text-[11px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95 group"
          >
            <Link href="/tickets/new" className="flex items-center gap-2">
              <PlusCircle className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
              Create Request
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
           <BarChart3 className="h-4 w-4 text-primary" />
           <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0">Operational State Matrix</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {/* Active Tickets "Hero" Badge */}
          <Link 
            href="/tickets"
            className={cn(
              "group relative overflow-hidden rounded-2xl border p-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
              "text-primary bg-primary/5 border-primary/20 hover:border-primary/40"
            )}
          >
            <div className="flex flex-col gap-0.5 relative z-10">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                {isEndUser ? "My Requests" : "Active Tickets"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black tabular-nums tracking-tighter text-primary">
                  {openTickets || 0}
                </span>
                <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </div>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <Zap className="h-10 w-10 rotate-12" />
            </div>
          </Link>

          {/* Status Specific Badges */}
          {ALL_STATUSES.map((status) => (
            <Link 
              key={status} 
              href={`/tickets?status=${status}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-2 transition-all hover:scale-[1.02] active:scale-[0.98]",
                getStatusColor(status)
              )}
            >
              <div className="flex flex-col gap-0.5 relative z-10">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                  {statusLabels[status]}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black tabular-nums tracking-tighter">
                    {statusCounts[status]}
                  </span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                 <Ticket className="h-10 w-10 rotate-12" />
              </div>
            </Link>
          ))}
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-12">
        {/* Navigation Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0 text-[11px]">Quick Access</h2>
          </div>
          
          <Card className="technical-card border-border/40 bg-card/40 rounded-2xl">
            <CardContent className="p-3 space-y-2">
              <Button
                asChild
                variant="ghost"
                 className="w-full h-11 justify-between items-center rounded-xl border border-border/40 bg-muted/10 hover:bg-primary/5 hover:text-primary hover:border-primary/20 text-[10px] font-bold uppercase tracking-wider group transition-all"
              >
                <Link href="/tickets">
                  <span className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-colors">
                      <Ticket className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    View All Tickets
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                 className="w-full h-11 justify-between items-center rounded-xl border border-border/40 bg-muted/10 hover:bg-primary/5 hover:text-primary hover:border-primary/20 text-[10px] font-bold uppercase tracking-wider group transition-all"
              >
                <Link href="/tickets/new">
                  <span className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-colors">
                      <PlusCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    Create New Ticket
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </Button>
              {!isEndUser && (
                <>
                  <Button
                    asChild
                    variant="ghost"
                     className="w-full h-11 justify-between items-center rounded-xl border border-border/40 bg-muted/10 hover:bg-primary/5 hover:text-primary hover:border-primary/20 text-[10px] font-bold uppercase tracking-wider group transition-all"
                  >
                    <Link href="/tickets/unassigned">
                      <span className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-colors">
                          <Users2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        Unassigned Queue
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                     className="w-full h-11 justify-between items-center rounded-xl border border-border/40 bg-muted/10 hover:bg-primary/5 hover:text-primary hover:border-primary/20 text-[10px] font-bold uppercase tracking-wider group transition-all"
                  >
                    <Link href="/settings/masters">
                      <span className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-colors">
                          <Settings2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        System Settings
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/80 m-0 text-[11px]">Recent Activity</h2>
          </div>

          <Card className="technical-card overflow-hidden border-border/40 bg-card/40 rounded-2xl">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto no-scrollbar">
                <Suspense fallback={<ActivityFeedSkeleton />}>
                  <ActivityFeed />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
