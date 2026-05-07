import { createClient, getCachedUser } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Clock, Activity, ArrowUpRight, User } from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type RecentActivity = {
  id: string;
  ticket_id?: string | null;
  task_id?: string | null;
  actor?: { full_name?: string, avatar_url?: string } | Array<{ full_name?: string, avatar_url?: string }>;
  created_at?: string;
  activity_type?: string;
  content?: string;
  new_value?: string;
  // Task specific
  action_type?: string;
  task_title?: string;
  workspace_id?: string;
  project_id?: string;
};

const getActorFromActivity = (activity: RecentActivity) =>
  Array.isArray(activity.actor) ? activity.actor[0] : activity.actor;

const getTicketIdFromActivity = (activity: RecentActivity) =>
  activity.ticket_id || undefined;

const getTicketNumberFromActivity = (activity: RecentActivity) => {
  if (activity.content === "Added ticket" && activity.new_value) {
    return activity.new_value;
  }
  return activity.ticket_id
    ? `#${activity.ticket_id.slice(0, 8)}`
    : "Ticket";
};

const getActivityMessage = (activity: RecentActivity) => {
  const ticketRef = (
    <span className="text-blue-600 font-black hover:underline">
      {getTicketNumberFromActivity(activity)}
    </span>
  );

  if (activity.content === "Added ticket") {
    return <span>CREATED TICKET {ticketRef}</span>;
  }

  if (activity.content === "Opened ticket details") {
    return <span>VIEWED TICKET {ticketRef}</span>;
  }

  switch (activity.activity_type) {
    case "assignment":
      return <span>ASSIGNED TICKET {ticketRef}</span>;
    case "status_change":
      return (
        <span>
          STATUS UPDATED {ticketRef} TO{" "}
          <span className="text-slate-900 font-black">
            {activity.new_value?.replace(/_/g, " ").toUpperCase()}
          </span>
        </span>
      );
    case "public_reply":
      return <span>PUBLIC REPLY ON {ticketRef}</span>;
    case "internal_note":
      return <span>INTERNAL NOTE ON {ticketRef}</span>;
    default:
      if (activity.task_id) {
        const taskRef = <span className="text-orange-600 font-black hover:underline">{activity.task_title || "TASK"}</span>;
        switch (activity.action_type) {
          case 'created': return <span>CREATED TASK {taskRef}</span>;
          case 'status_changed': return <span>UPDATED STATUS OF {taskRef}</span>;
          case 'commented': return <span>COMMENTED ON {taskRef}</span>;
          default: return <span>{activity.action_type?.toUpperCase().replace(/_/g, ' ') || "ACTIVITY"} ON {taskRef}</span>;
        }
      }
      return <span>{activity.content?.toUpperCase() || "EVENT"} ON {ticketRef}</span>;
  }
};

export async function ActivityFeed() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) return null;

  // Fetch Unified Activities (Tickets + Tasks) in a single optimized RPC call
  const { data: unifiedActivities, error } = await supabase.rpc("get_unified_dashboard_activities", { 
    p_limit: 15 
  });

  if (error) console.error("Activity Feed Error:", error.message);

  const recentActivityRows = (unifiedActivities ?? []).map((a: any) => ({
    ...a,
    actor: { full_name: a.actor_full_name, avatar_url: a.actor_avatar_url },
    activity_type: a.activity_type,
    action_type: a.task_id ? a.activity_type : undefined
  })) as RecentActivity[];

  if (!recentActivityRows || recentActivityRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-center">
        <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm mb-6">
          <Clock className="h-8 w-8 text-slate-200" />
        </div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">No Activity Logs Recorded</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {recentActivityRows.map((activity) => {
        const ticketId = getTicketIdFromActivity(activity);
        const actor = getActorFromActivity(activity);
        const dateObj = new Date(activity.created_at ?? Date.now());

        return (
          <Link
            key={activity.id}
            href={
              activity.task_id 
                ? `/workspace/${activity.workspace_id}/project/${activity.project_id}/task/${activity.task_id}`
                : ticketId ? `/tickets/${ticketId}/audit` : "/tickets"
            }
            className="block group hover:bg-slate-50/50 transition-all duration-300"
          >
            <div className="px-6 py-4 flex items-center gap-4 relative overflow-hidden">
              {/* Identity Token */}
              <Avatar className="h-10 w-10 rounded-xl border border-slate-200 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:border-primary/20">
                <AvatarImage src={actor?.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-100 text-slate-600 font-bold text-[10px]">
                  {actor?.full_name?.slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight transition-all group-hover:text-primary">
                      {actor?.full_name || "AGENT_SYSTEM"}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700">
                      {formatDistanceToNow(dateObj, { addSuffix: true }).toUpperCase()}
                    </span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-1 group-hover:translate-x-0" />
                </div>
                <div className="text-[13px] text-slate-700 font-bold uppercase tracking-tight group-hover:text-slate-900 transition-colors leading-tight">
                  {getActivityMessage(activity)}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
