import { createClient, getCachedUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import LiveChat from "./LiveChat";
import ActivityLog from "./ActivityLog";
import ScheduleMeetingPanel from "./ScheduleMeetingPanel";
import TicketActions from "./TicketActions";
import AttachmentsPanel from "./AttachmentsPanel";
import InteractionQueue from "./InteractionQueue";
import ModifyTicketDialog from "./ModifyTicketDialog";
import { ArrowLeft, Clock, FolderOpen, History, Activity, Calendar, Zap, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export const dynamic = "force-dynamic";


export default async function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const routeId = decodeURIComponent(params.id);

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return <div>Unauthorized</div>;

  // ── Unified Performance Matrix ──
  // We fetch the full bundle (ticket, activities, attachments), user permissions, 
  // and assignable profiles in parallel to eliminate sequential waterfall delays.
  const [fullBundleRes, permissions, assignableRes] = await Promise.all([
    supabase.rpc("get_ticket_full_bundle_v2", { p_identifier: routeId }),
    getUserPermissions(user.id),
    supabase.rpc("get_assignable_profiles")
  ]);

  // ── Error Handling & Performance Debugging ──
  if (fullBundleRes.error) {
    console.error("❌ DATABASE_ERROR_DETAILS:", fullBundleRes.error.message);
    console.error("Error Code:", fullBundleRes.error.code);
    console.error("Error Hint:", fullBundleRes.error.hint);
    console.error("Identifier attempted:", routeId);
    return notFound();
  }

  if (!fullBundleRes.data || !fullBundleRes.data.ticket) {
    console.warn("⚠️ SECURITY_BLOCK: The RPC returned null data for identifier:", routeId);
    console.warn("   This typically means the visibility logic in get_ticket_full_bundle_v2 denied access or the ID is invalid.");
    return notFound();
  }

  const { ticket, activities, attachments } = fullBundleRes.data;

  // If this is a requirement, redirect to the specialized requirement view
  if (ticket.is_requirement) {
    const { redirect } = await import("next/navigation");
    redirect(`/tickets/requests/${ticket.id}`);
  }

  const isAgent = hasPermission(permissions, RESOURCES.TICKETS, "update");
  const assignableUsers = assignableRes.data || [];

  const canViewAttachments = isAgent || user.id === ticket.requester_id || user.id === ticket.assigned_to_id;


  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s === 'in_progress' || s === 'assigned') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (s === 'pending_user') return 'bg-orange-50 text-orange-600 border-orange-100';
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50/50">
      {/* ── Deployment-Style Header ── */}
      <header className="h-[72px] shrink-0 bg-white border-b border-border/40 flex items-center justify-between px-8 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted border border-border/40">
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight">
                {ticket.ticket_number}
              </h1>
              <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 rounded-md", getStatusColor(ticket.status))}>
                {ticket.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 px-2 rounded-md border-primary/20 bg-primary/5 text-primary">
                PROT-9.{ticket.id.slice(0, 3)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAgent && <ModifyTicketDialog ticket={ticket as any} />}
          {isAgent && (
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-[#E1F0F7] border-[#C5E1F0] text-slate-700 hover:bg-[#D4E9F4]">
              <Printer className="h-3.5 w-3.5 mr-2" /> Print Protocol
            </Button>
          )}
          {isAgent && (
            <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
              <Link href={`/workspace?action=createTask&ticketId=${ticket.id}`}>Convert to Task</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border-none">
            <Link href="/tickets">Close</Link>
          </Button>
        </div>
      </header>

      {/* ── Main content transition area ── */}
      <main className="flex-1 p-4 lg:p-6 bg-slate-50/50">
        <div className="w-full max-w-[98%] mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Section 1: Metadata Configuration (Deployment-style) */}
          <div className="bg-card/40 border border-border/40 p-6 rounded-3xl shadow-sm backdrop-blur-xl">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 1: Ticket Metadata Configuration
            </h3>
            
            <div className="grid grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Ingestion Date</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {format(new Date(ticket.created_at), 'dd MMM yyyy')}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Requester Node</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {ticket.requester?.full_name}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Operational Unit</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {ticket.requester?.department?.name || 'GENERIC'}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Core Module</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {ticket.module?.name}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Lead Operative</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {ticket.assigned_to?.full_name || 'Protocol Standby'}
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Initial Description / Narrative</label>
              <div className="min-h-[80px] rounded-xl bg-white border border-border/20 p-4 text-[13px] font-medium text-slate-600 leading-relaxed">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Section 2: Engagement Console (Interaction Queue) */}
          <div className="bg-white border border-border/40 rounded-3xl shadow-sm overflow-hidden flex flex-col relative z-10">
            <div className="p-4 border-b border-border/40 bg-card/10 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 2: Transaction Interaction Console
              </h3>
            </div>
            <div className="p-8">
              <TicketActions
                ticketId={ticket.id}
                currentStatus={ticket.status}
                currentAssigneeId={ticket.assigned_to_id}
                currentDeadline={ticket.sla_due_date}
                currentTeamMembers={ticket.metadata?.team_members || []}
                isAgent={isAgent}
                isRequester={user.id === ticket.requester_id}
                initialAssignableUsers={assignableUsers}
              />
              
              <div className="mt-12 pt-12 border-t border-slate-100">
                <InteractionQueue 
                  activities={[
                    ...(activities || []),
                    {
                      id: "initial-" + ticket.id,
                      actor_id: ticket.requester_id,
                      content: ticket.description,
                      created_at: ticket.created_at,
                      activity_type: "public_reply",
                      actor: ticket.requester
                    }
                  ] as any} 
                  ticketRequesterId={ticket.requester_id}
                  ticketId={ticket.id}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Professional Audit Trail (Deployment-style table) */}
          <div id="protocol-audit-trail" className="pt-8 mb-12">
            <ActivityLog ticketId={ticket.id} initialActivities={(activities || []) as any} />
          </div>

          {/* Section 4: Supplementary Matrix (Attachments, Chat, Schedule) */}
          <div className="grid grid-cols-3 gap-6 pt-12">
            <div className="col-span-1">
              <div className="bg-white border border-border/40 rounded-3xl p-6 shadow-sm">
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                   <FolderOpen className="h-3.5 w-3.5" /> Payload Vault
                 </h4>
                 <AttachmentsPanel
                    ticketId={ticket.id}
                    attachments={(attachments || []).map((a: any) => ({
                      id: a.id, 
                      file_name: a.file_name, 
                      file_size: a.file_size, 
                      content_type: a.content_type,
                      created_at: a.created_at, 
                      uploader: { full_name: a.uploader?.full_name ?? "System" }, 
                      storage_path: a.storage_path
                    }))}
                    canView={canViewAttachments}
                  />
              </div>
            </div>
            <div className="col-span-1">
              <div className="bg-white border border-border/40 rounded-3xl p-6 shadow-sm">
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Zap className="h-3.5 w-3.5" /> Live Comms
                 </h4>
                 <div className="h-[300px] overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                    <LiveChat ticketId={ticket.id} currentUserId={user.id} />
                 </div>
              </div>
            </div>
            <div className="col-span-1">
              <div className="bg-white border border-border/40 rounded-3xl p-6 shadow-sm">
                 <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
                   <Calendar className="h-3.5 w-3.5" /> Engagement Scheduler
                 </h4>
                 <ScheduleMeetingPanel ticketId={ticket.id} ticketSubject={ticket.subject} requesterId={ticket.requester_id} />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

