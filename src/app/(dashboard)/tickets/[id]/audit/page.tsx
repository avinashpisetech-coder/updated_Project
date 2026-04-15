import { createClient, getCachedUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  ShieldCheck, 
  ChevronRight,
  Calendar,
  FileText,
  History,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

type TicketActivity = {
  id: string;
  actor?: { full_name?: string };
  created_at: string;
  activity_type?: string;
  old_value?: string;
  new_value?: string;
  content?: string;
};

export const dynamic = "force-dynamic";

export default async function AuditTrailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const routeId = decodeURIComponent(params.id);

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return <div>Unauthorized</div>;

  // Use parallel fetching for ticket and activities
  const [{ data: ticket }, { data: rawActivities }] = await Promise.all([
    supabase.rpc("get_ticket_detail_v2", { p_identifier: routeId }),
    supabase.rpc("get_ticket_activities_v2", { p_identifier: routeId })
  ]);

  // Fallback for activities if RPC doesn't exist yet (though we should assume v2 is the standard now)
  let activities = rawActivities;
  if (!activities) {
    const { data: ticketForId } = await supabase.from("tickets").select("id").eq("ticket_number", routeId).maybeSingle();
    const tId = ticketForId?.id || routeId;
    const { data } = await supabase
      .from("ticket_activity_log")
      .select(`*, actor:profiles(full_name)`)
      .eq("ticket_id", tId)
      .order("created_at", { ascending: false });
    activities = data;
  }

  if (!ticket) return notFound();

  const formatValue = (value?: string) => {
    if (!value || value.trim() === "" || value === "null") return "—";
    return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20 font-sans antialiased">
      {/* Professional Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-slate-100">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Enterprise Compliance Trail</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 m-0">
            Audit Ledger: <span className="text-slate-400">#{ticket.ticket_number}</span>
          </h1>
          <p className="text-[15px] font-medium text-slate-500 max-w-2xl leading-relaxed">
            Detailed chronological record of all lifecycle events, status transitions, and agent interactions for administrative oversight.
          </p>
        </div>
        <Link 
          href={`/tickets/${routeId}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all font-bold text-[11px] uppercase tracking-widest group shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Ticket
        </Link>
      </div>

      {/* Primary Metadata Insight */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Initiated By</p>
          <p className="text-[16px] font-bold text-slate-900 truncate">{ticket.requester?.full_name || "System User"}</p>
          <p className="text-[12px] font-medium text-slate-400 mt-1">{ticket.requester?.email || "No Email Provided"}</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Filing Date</p>
          <p className="text-[16px] font-bold text-slate-900">{format(new Date(ticket.created_at), "MMM dd, yyyy")}</p>
          <p className="text-[12px] font-medium text-slate-400 mt-1">{format(new Date(ticket.created_at), "hh:mm a")} EST</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Status</p>
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 rounded-lg text-[11px] font-bold px-3 py-1 uppercase tracking-tighter">
            {ticket.status.replace(/_/g, ' ')}
          </Badge>
          <p className="text-[12px] font-medium text-slate-400 mt-2">{ticket.priority.toUpperCase()} Priority Level</p>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Governance Node</p>
          <p className="text-[16px] font-bold text-slate-900">{ticket.module?.name || "General Access"}</p>
          <p className="text-[12px] font-medium text-slate-400 mt-1">{ticket.category?.name || "Uncategorized"}</p>
        </div>
      </div>

      {/* Main Activity Ledger */}
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600/50" />
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-indigo-500" />
            <span className="text-[13px] font-bold uppercase tracking-widest text-slate-800">Historical Chain of Custody</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200">
            {activities?.length || 0} Recorded Entries
          </Badge>
        </div>

        <div className="space-y-6">
          {activities && activities.length > 0 ? (
            activities.map((activity: any, index: number) => (
              <div 
                key={activity.id} 
                className={cn(
                  "p-6 rounded-3xl border transition-all duration-300 group",
                  index === 0 ? "bg-indigo-50/30 border-indigo-100 shadow-indigo-50 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                )}
              >
                {/* Entry Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm text-indigo-600 font-bold">
                       {activity.actor?.full_name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {activity.actor?.full_name || "System Automated Protocol"}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {format(new Date(activity.created_at), "MMM dd, yyyy | hh:mm:ss a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-white text-slate-600 border-slate-200 text-[9px] font-extrabold uppercase tracking-[0.2em] px-3 py-1.5 shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-600">
                    {activity.activity_type?.replace(/_/g, ' ') || "Update"}
                  </Badge>
                </div>

                {/* Entry Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Values Mapping */}
                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 rounded-2xl bg-white/60 border border-slate-100 shadow-inner">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="h-1 w-1 rounded-full bg-slate-300" /> Previous State
                      </div>
                      <p className="text-[13px] font-bold text-slate-500 break-words">{formatValue(activity.old_value)}</p>
                    </div>
                    <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-inner">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-indigo-500 uppercase tracking-widest">
                        <div className="h-1 w-1 rounded-full bg-indigo-500" /> Optimized State
                      </div>
                      <p className="text-[13px] font-bold text-indigo-700 break-words">{formatValue(activity.new_value)}</p>
                    </div>
                  </div>

                  {/* Description / Content Column */}
                  <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <FileText className="h-3 w-3" /> Technical Description
                    </div>
                    <p className="text-[13px] font-medium text-slate-600 leading-relaxed leading-snug">
                      {activity.content || "No narrative justification provided for this transition."}
                    </p>
                  </div>
                </div>

                {/* Timeline Connector Link style */}
                {activities && index < activities.length - 1 && (
                  <div className="mt-6 flex justify-center opacity-20">
                     <ChevronRight className="h-5 w-5 rotate-90 text-slate-300" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-40">
               <Activity className="h-16 w-16 text-slate-200" />
               <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-slate-400">Registry Trace Non-Existent</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Insight */}
      <div className="flex items-center justify-center gap-3 pt-6 opacity-40">
         <div className="h-px w-12 bg-slate-300" />
         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">End of Compliance Record</p>
         <div className="h-px w-12 bg-slate-300" />
      </div>
    </div>
  );
}
