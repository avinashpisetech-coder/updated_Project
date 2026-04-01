import { createClient, getCachedUser } from "@/lib/supabase/server";
import { format } from "date-fns";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Activity, ArrowRight } from "lucide-react";
import React from "react";

type RecentActivity = {
  id: string;
  ticket_id?: string | null;
  actor?: { full_name?: string } | Array<{ full_name?: string }>;
  created_at?: string;
  activity_type?: string;
  content?: string;
  new_value?: string;
};

function normalizeRoleKey(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
    <span className="text-primary font-semibold">
      {getTicketNumberFromActivity(activity)}
    </span>
  );

  if (activity.content === "Added ticket") {
    return <span>Created Ticket {ticketRef}</span>;
  }

  if (activity.content === "Opened ticket details") {
    return <span>Viewed ticket {ticketRef}</span>;
  }

  switch (activity.activity_type) {
    case "assignment":
      return <span>Assigned ticket {ticketRef}</span>;
    case "status_change":
      return (
        <span>
          Updated ticket {ticketRef} status to{" "}
          <span className="text-foreground font-semibold">
            {activity.new_value?.replace(/_/g, " ")}
          </span>
        </span>
      );
    case "public_reply":
      return <span>New public reply on ticket {ticketRef}</span>;
    case "internal_note":
      return <span>New internal note on ticket {ticketRef}</span>;
    case "escalation":
      return <span>Escalated ticket {ticketRef}</span>;
    case "transfer":
      return <span>Transferred ticket {ticketRef}</span>;
    case "merge":
      return <span>Merged ticket {ticketRef}</span>;
    default:
      return <span>{activity.content || "Activity"} on ticket {ticketRef}</span>;
  }
};

export async function ActivityFeed() {
  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) return null;

  // --- Total System Solution: Direct Performance-Hardened RPC (v2) ---
  // This replaces the previous logic that fetched thousands of ticket IDs in-memory.
  // The database now handles RBAC scoping during the initial scan.
  const { data: recentActivities, error } = await supabase.rpc("get_system_activities_v2", { p_limit: 10 });

  if (error) {
    console.error("Supabase Error on Activity Feed:", error.message, error.details, error.hint);
  }

  const recentActivityRows = (recentActivities ?? []).map(a => ({
    ...a,
    actor: { full_name: a.actor_full_name }
  })) as RecentActivity[];

  if (!recentActivities || recentActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/20 mb-6 flex items-center justify-center border border-border/40">
          <Clock className="h-8 w-8 text-muted-foreground opacity-20" />
        </div>
        <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest">No recent updates</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/10">
      {recentActivityRows.map((activity) => {
        const ticketId = getTicketIdFromActivity(activity);
        const actor = getActorFromActivity(activity);
        return (
          <Link
            key={activity.id}
            href={ticketId ? `/tickets/${ticketId}/audit` : "/tickets"}
            className="block group hover:bg-primary/5 transition-all duration-300"
          >
            <div className="px-8 py-6 flex items-start gap-6 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
              <div className="mt-1 h-3 w-3 rounded-full bg-primary shrink-0 opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300 ring-4 ring-primary/5" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                    {actor?.full_name || "System"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">
                    {format(new Date(activity.created_at ?? Date.now()), "HH:mm · MMM d")}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2 group-hover:text-foreground transition-colors leading-relaxed">
                  {getActivityMessage(activity)}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="divide-y divide-border/10">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-8 py-6 flex items-start gap-6 relative">
          {/* Subtle pulseline */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted scale-y-0 opacity-20" />
          
          <div className="mt-1 h-3 w-3 rounded-full bg-muted shrink-0 opacity-20 animate-pulse ring-4 ring-muted/5 shadow-inner" />
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex justify-between items-center mb-1.5">
              {/* Actor Name Placeholder */}
              <div className="h-3 w-24 bg-muted/30 rounded-lg animate-pulse" />
              {/* Date/Time Placeholder */}
              <div className="h-2 w-16 bg-muted/20 rounded-md animate-pulse ml-auto" />
            </div>
            
            <div className="space-y-2">
              {/* Activity Content Line 1 */}
              <div className="h-4 w-full md:w-[85%] bg-muted/20 rounded-xl animate-pulse" />
              {/* Activity Content Line 2 (Short) */}
              <div className="h-4 w-[40%] bg-muted/10 rounded-xl animate-pulse" />
            </div>
          </div>
          
          <div className="h-4 w-4 bg-muted/10 rounded-lg animate-pulse hidden md:block" />
        </div>
      ))}
    </div>
  );
}
