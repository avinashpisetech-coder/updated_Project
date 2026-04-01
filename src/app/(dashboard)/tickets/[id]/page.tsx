import { createClient, getCachedUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import LiveChat from "./LiveChat";
import ActivityLog from "./ActivityLog";
import ScheduleMeetingPanel from "./ScheduleMeetingPanel";
import TicketActions from "./TicketActions";
import RequesterWorkflowPanel from "./RequesterWorkflowPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import PlannedInterventions from "./PlannedInterventions";
import RequesterReplyPanel from "./RequesterReplyPanel";
import InteractionQueue from "./InteractionQueue";
import CollapsibleStrategicCard from "./CollapsibleStrategicCard";
import { ArrowRight, ArrowLeft, Calendar, History, PlusCircle, Clock, User, Zap, FolderOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const TICKET_ATTACHMENTS_BUCKET = process.env.NEXT_PUBLIC_TICKET_ATTACHMENTS_BUCKET ?? "ticket-attachments";

export const dynamic = "force-dynamic";

function normalizeRoleKey(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatStatusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function TicketDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const routeId = decodeURIComponent(params.id);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(routeId);
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return <div>Unauthorized</div>;

  // --- Organizational Scale Solution: Direct Identity & Branching Fetch ---
  // 1. Resolve UUID Identity first (<20ms) only if needed.
  let ticketId = routeId;
  if (!isUuid) {
    const { data: idRes } = await supabase.from("tickets").select("id").eq("ticket_number", routeId).maybeSingle();
    if (!idRes) return notFound();
    ticketId = idRes.id;
  }

  // 2. Resolve User Profile & Role early to avoid unnecessary heavy RPC calls.
  const { data: profileResponse } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const normalizedRole = normalizeRoleKey(profileResponse?.role);
  const isAgent = ["super_admin", "dept_admin", "module_agent"].includes(normalizedRole);

  const ticketSelect = `
    id, ticket_number, subject, description, status, priority, 
    created_at, resolved_at, sla_due_date, requester_id, assigned_to_id, 
    module_id, category_id, metadata,
    module:modules(name),
    category:ticket_categories(name),
    requester:profiles!tickets_requester_id_fkey(full_name),
    assigned_to:profiles!tickets_assigned_to_id_fkey(full_name)
  `;

  // 3. Execute Core Data Fetches in Parallel.
  // We limit the activity log and attachments to prevent 10s+ delays on long-running tickets.
  const [
    ticketResponse,
    meetingsResponse,
    activitiesResponse,
    attachmentsResponse,
    assignableResponse
  ] = await Promise.all([
    supabase.from("tickets").select(ticketSelect).eq("id", ticketId).maybeSingle(),
    supabase.from("ticket_meetings")
      .select("id, title, meeting_type, starts_at, duration_minutes, status, location, meeting_link, interaction_id")
      .eq("ticket_id", ticketId)
      .order("starts_at", { ascending: true }),
    supabase.from("ticket_activity_log")
      .select("id, actor_id, activity_type, content, created_at, metadata, actor:profiles(full_name)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(100), // Protect against large organizational history depth
    supabase.from("ticket_attachments")
      .select("id, file_name, file_size, content_type, storage_path, uploaded_by, created_at, uploader:profiles(full_name)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(50), // Standard architectural limit for initial load payloads
    isAgent ? supabase.rpc("get_assignable_profiles") : Promise.resolve({ data: [] }) // Only fetch for Agents
  ]);

  const ticket = ticketResponse.data;
  if (!ticket) return notFound();

  const meetings = meetingsResponse.data || [];
  const recentActivities = activitiesResponse.data || [];
  const ticketAttachments = attachmentsResponse.data || [];
  const assignableUsers = assignableResponse.data || [];

  const canViewAttachments = isAgent || user.id === ticket.requester_id || user.id === ticket.assigned_to_id;

  const sanitizedActivities = (recentActivities || []).map(a => ({
    ...a,
    actor: Array.isArray(a.actor) ? a.actor[0] : a.actor
  }));


  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 font-sans">
      {/* Navigation & Header Context */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/tickets"
          className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-950 transition-all w-fit"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          Back to Ticket Registry
        </Link>

        {/* Strategic Command Header */}
        <div className="flex flex-col gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-950 animate-pulse" />
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Official Service Protocol</p>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 p-0 transition-all">
              <span className="text-[10px] font-bold text-indigo-950/40 uppercase tracking-[0.2em]">Ticket Subject</span>
              <h1 className="text-xl font-normal tracking-tight text-slate-900 underline decoration-indigo-200 underline-offset-8 leading-tight m-0 break-words max-w-4xl capitalize">
                {ticket.subject}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3 pt-1">
              <Link 
                href={`/tickets/${ticket.id}/audit`}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-950 transition-all flex items-center gap-2 group"
              >
                System Audit Ledger
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="h-8 rounded-lg border-slate-200 bg-white text-slate-900 text-[11px] font-bold px-4 shadow-sm">
                  #{ticket.ticket_number}
                </Badge>
                <Badge className={cn(
                  "h-8 rounded-lg border-transparent text-white shadow-md text-[11px] font-bold px-4",
                  ticket.status === 'replied' ? 'bg-amber-600 shadow-amber-50' : 'bg-indigo-950 shadow-indigo-50'
                )}>
                  {formatStatusLabel(ticket.status)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-stretch">
        {/* Left Span: Essential Context */}
        <div className="lg:col-span-2 flex flex-col gap-10">
          {/* Narrative Overview */}
          <div className="space-y-4">
             <p className="text-[11px] font-semibold text-slate-500 tracking-wider pl-1 uppercase">Official Narrative</p>
             <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm h-full max-h-[450px] overflow-y-auto no-scrollbar">
                <div className="whitespace-pre-wrap text-[16px] font-medium leading-relaxed text-slate-800 selection:bg-indigo-50">
                  {ticket.description}
                </div>
             </div>
          </div>

          {/* Metadata Ledger Unit */}
          <div className="rounded-3xl bg-slate-50/50 p-8 border border-slate-100/50 flex-1 flex flex-col">
            <p className="text-[11px] font-semibold text-slate-500 mb-8 tracking-wider uppercase pl-1">Primary Dispatch Details</p>
            <div className="space-y-1 border-t border-slate-100 flex-1 pt-4">
              <div className="flex justify-between py-3 border-b border-slate-50 hover:bg-slate-100/50 px-3 -mx-3 rounded-xl transition-all cursor-default group/row">
                <span className="text-[12px] font-semibold text-slate-400 group-hover/row:text-slate-500 transition-colors">Requester</span>
                <span className="text-[13px] font-bold text-slate-900">{((Array.isArray(ticket.requester) ? ticket.requester[0] : ticket.requester) as any)?.full_name || 'System User'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-50 hover:bg-slate-100/50 px-3 -mx-3 rounded-xl transition-all cursor-default group/row">
                <span className="text-[12px] font-semibold text-slate-400 group-hover/row:text-slate-500 transition-colors">Lead Operative</span>
                <span className="text-[13px] font-bold text-slate-900">{((Array.isArray(ticket.assigned_to) ? ticket.assigned_to[0] : ticket.assigned_to) as any)?.full_name || 'Waiting Assignment'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-50 hover:bg-slate-100/50 px-3 -mx-3 rounded-xl transition-all cursor-default group/row">
                <span className="text-[12px] font-semibold text-slate-400 group-hover/row:text-slate-500 transition-colors">Module Origin</span>
                <span className="text-[13px] font-bold text-slate-600 group-hover/row:text-indigo-950 transition-colors">{((Array.isArray(ticket.module) ? ticket.module[0] : ticket.module) as any)?.name || 'General'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-50 hover:bg-slate-100/50 px-3 -mx-3 rounded-xl transition-all cursor-default group/row">
                <span className="text-[12px] font-semibold text-slate-400 group-hover/row:text-slate-500 transition-colors">Category Tag</span>
                <span className="text-[13px] font-bold text-slate-600 group-hover/row:text-indigo-950 transition-colors">{((Array.isArray(ticket.category) ? ticket.category[0] : ticket.category) as any)?.name || 'Uncategorized'}</span>
              </div>

              {ticket.sla_due_date && (
                <div className={cn(
                  "mt-6 p-6 rounded-2xl border flex flex-col justify-center transition-all bg-white shadow-sm",
                  differenceInHours(new Date(ticket.sla_due_date), new Date()) < 0 ? "border-red-100" : "border-indigo-100"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className={cn("h-3.5 w-3.5", differenceInHours(new Date(ticket.sla_due_date), new Date()) < 0 ? "text-red-500" : "text-indigo-950")} />
                    <p className="text-[10px] font-bold text-slate-400 tracking-wider">SLA DISPATCH DEADLINE</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={cn("text-2xl font-extrabold m-0 leading-none", differenceInHours(new Date(ticket.sla_due_date), new Date()) < 0 ? "text-red-600" : "text-slate-900")}>
                        {format(new Date(ticket.sla_due_date), 'MMM dd, HH:mm')}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 mt-2">
                        {differenceInHours(new Date(ticket.sla_due_date), new Date()) < 0 ? "Expired " : "Remaining "}
                        {formatDistanceToNow(new Date(ticket.sla_due_date))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Span: Strategic Command & Management */}
        <div className="lg:col-span-3 space-y-10">
          <div className="space-y-4">
             <p className="text-[11px] font-semibold text-slate-500 tracking-wider pl-1 uppercase">Strategic Command Console</p>
             <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-10">
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
                
                {/* COMMUNICATION_LEDGER - Integrated into Console */}
                <div className="pt-10 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 tracking-wider mb-6 uppercase">Audit Narrative Ledger</p>
                  <InteractionQueue 
                    activities={[
                      ...sanitizedActivities,
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
        </div>
      </div>

      {/* Strategic Archive Matrix - Independent Column Configuration */}
      <div className="space-y-4 pt-1">
        <p className="text-[11px] font-semibold text-slate-500 tracking-wider pl-1 uppercase">Historical & Logistics Matrix</p>
        <div className="columns-1 md:columns-2 gap-6 space-y-6">
          {/* Column 1 Block -> Operational & Scheduler */}
          <div className="break-inside-avoid mb-6">
            <CollapsibleStrategicCard 
              title="Operational Registry" 
              subtitle={`${sanitizedActivities.length} Data Points`}
              iconName="activity"
            >
              <Tabs defaultValue="activity" className="w-full flex-1 flex flex-col">
                <TabsList className="bg-slate-50 p-1 rounded-2xl mb-8 w-full h-12 border border-slate-100 shadow-inner">
                  <TabsTrigger 
                    value="activity" 
                    className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:text-indigo-950 data-[state=active]:shadow-sm transition-all h-full"
                  >
                    History
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chat" 
                    className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:text-indigo-950 data-[state=active]:shadow-sm transition-all h-full"
                  >
                    Logic
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="activity" className="flex-1 mt-0">
                  <ActivityLog ticketId={ticket.id} initialActivities={sanitizedActivities as any} />
                </TabsContent>
                
                <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
                  <div className="h-full rounded-2xl bg-slate-50 border border-slate-100 p-6">
                    <LiveChat ticketId={ticket.id} currentUserId={user.id} />
                  </div>
                </TabsContent>
              </Tabs>
            </CollapsibleStrategicCard>
          </div>

          <div className="break-inside-avoid mb-6">
            <CollapsibleStrategicCard 
              title="Resource Payloads" 
              subtitle={`${ticketAttachments?.length || 0} Assets`}
              iconName="folder"
            >
              <div className="flex-1 pt-4">
                {ticketAttachments && ticketAttachments.length > 0 ? (
                  <AttachmentsPanel
                    attachments={ticketAttachments.map((attachment: any) => ({
                      id: attachment.id,
                      file_name: attachment.file_name,
                      file_size: attachment.file_size,
                      content_type: attachment.content_type,
                      created_at: attachment.created_at,
                      uploaded_by_name: attachment.uploader?.full_name ?? "Unknown",
                      storage_path: attachment.storage_path,
                    }))}
                    canView={canViewAttachments}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] border border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                     <FolderOpen className="h-10 w-10 text-slate-200 mb-4" />
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payload Vault Empty</p>
                  </div>
                )}
              </div>
            </CollapsibleStrategicCard>
          </div>

          <div className="break-inside-avoid mb-6">
            <CollapsibleStrategicCard 
              title="Strategic Scheduler" 
              subtitle="Engagement"
              iconName="calendar"
            >
               <div className="flex-1 overflow-y-auto no-scrollbar">
                  <ScheduleMeetingPanel
                    ticketId={ticket.id}
                    ticketSubject={ticket.subject}
                    requesterId={ticket.requester_id}
                  />
               </div>
            </CollapsibleStrategicCard>
          </div>

          <div className="break-inside-avoid mb-6">
            <CollapsibleStrategicCard 
              title="Intervention Archive" 
              subtitle={`${meetings.length} Sessions Logged`}
              iconName="history"
            >
               <div className="flex-1 overflow-y-auto no-scrollbar">
                  <PlannedInterventions meetings={meetings} ticketId={ticket.id} />
               </div>
            </CollapsibleStrategicCard>
          </div>
        </div>
      </div>
    </div>
  );
}
