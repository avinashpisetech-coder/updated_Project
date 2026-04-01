"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  MessageSquare, Maximize2, Minimize2, Clock, 
  User, ChevronRight, Zap, CheckCircle2, 
  AlertCircle, Activity 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ActivityLogItem {
  id: string;
  actor_id: string;
  content: string | null;
  created_at: string;
  activity_type: string;
  actor: { full_name: string } | null;
  metadata: any;
}

interface Props {
  activities: ActivityLogItem[];
  ticketRequesterId: string;
  ticketId: string;
}

export default function InteractionQueue({ activities, ticketRequesterId, ticketId }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localActivities, setLocalActivities] = useState<ActivityLogItem[]>(activities);
  const supabase = useMemo(() => createClient(), []);

  // Sync with props when they change (initial load or page revalidation)
  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  // Real-time listener for new interactions
  useEffect(() => {
    const channel = supabase
      .channel(`interaction-queue-${ticketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_activity_log',
        filter: `ticket_id=eq.${ticketId}`
      }, async (payload) => {
        const newItem = payload.new as any;
        
        // Filter: only public_reply or status_change with content
        if (!["public_reply", "status_change"].includes(newItem.activity_type) || !newItem.content) return;
        
        const content = newItem.content.trim();
        // Skip noise
        if (content === "") return;
        if (content === "Added ticket" && newItem.id !== "initial-" + ticketId) return; // Allow if it is the synthesis but not the literal activity log
        
        // For status changes, only allow if they have an embedded Note/Narration
        if (newItem.activity_type === "status_change") {
          if (!content.includes("Note:")) return;
        }

        if (content.startsWith("[EMAIL TRIGGER]") || content.startsWith("Deadline updated")) return;
        if (content.startsWith("Ticket assigned") || content.startsWith("Ticket unassigned")) return;

        // Fetch actor details
        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", newItem.actor_id)
          .single();

        setLocalActivities(prev => [{ ...newItem, actor: actorProfile, isNew: true }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  // Combined filter for display: Strictly Narration Only
  const interactionQueue = localActivities.filter((a, index, self) => {
    // Unique by ID to prevent duplication between props and realtime
    if (self.findIndex(t => t.id === a.id) !== index) return false;

    const content = (a.content || "").trim();
    if (content === "") return false;

    // 1. Explicit Narration Types
    if (["public_reply", "internal_note"].includes(a.activity_type)) {
      return true;
    }

    // 2. Initial Ticket Description (Synthesized)
    if (a.id.startsWith("initial-")) {
      return true;
    }

    // 3. Status Changes with Narration
    if (a.activity_type === "status_change" && content.includes("Note:")) {
      return true;
    }
    
    // Everything else is system noise and remains in the Operational Journal
    return false;
  });

  if (interactionQueue.length === 0) return null;

  // Helper to extract narration from status change strings
  const getDisplayContent = (item: ActivityLogItem) => {
    if (!item.content) return "";
    if (item.activity_type === "status_change" && item.content.includes("Note:")) {
      return item.content.split("Note:")[1].trim();
    }
    return item.content;
  };

  const latestInteraction = interactionQueue[0];

  if (!isExpanded) {
    return (
      <div className="group transition-all duration-300">
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 p-6 rounded-3xl border border-slate-100 bg-white shadow-sm transition-all"
        >
          <div className="flex items-center gap-5">
            <div className="h-10 w-10 rounded-2xl bg-indigo-950 flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider">COMMUNICATION REGISTRY</p>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-[13px] font-bold text-slate-900">
                  {interactionQueue.length} Official Records
                </p>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
                <p className="text-[11px] font-semibold text-indigo-900 opacity-60 truncate max-w-[250px]">
                  LATEST: {getDisplayContent(latestInteraction).substring(0, 45)}...
                </p>
              </div>
            </div>
          </div>
          <button className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-950 group-hover:text-white transition-all">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-500 flex flex-col max-h-[700px]">
      <div 
        onClick={() => setIsExpanded(false)}
        className="flex items-center justify-between p-6 border-b border-slate-50 cursor-pointer hover:bg-slate-50/30 transition-all"
      >
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 rounded-2xl bg-indigo-950 flex items-center justify-center text-white shadow-sm">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider">TACTICAL NARRATIVE LEDGER</p>
            <p className="text-[14px] font-bold text-slate-900 mt-0.5">Communication Chain Archive</p>
          </div>
        </div>
        <button className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-indigo-950 hover:text-white transition-all">
          <Minimize2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-0 no-scrollbar scrolling-touch">
        {interactionQueue.map((item, index) => {
          const isRequester = item.actor_id === ticketRequesterId;
          const isAgentReply = !isRequester;
          const actorLabel = item.actor?.full_name || "System Record";
          
          return (
            <div 
              key={item.id} 
              className={cn(
                "relative pl-10 pb-8 last:pb-0 animate-in fade-in slide-in-from-left-4 duration-500",
                index < interactionQueue.length - 1 && "before:absolute before:left-[7px] before:top-4 before:bottom-0 before:w-[2px] before:bg-slate-100",
              )}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={cn(
                "absolute left-0 top-3 h-4 w-4 rounded-full border-4 border-white shadow-sm z-10",
                isAgentReply ? "bg-indigo-950" : "bg-emerald-500",
              )} />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[14px] font-bold",
                      isAgentReply ? "text-slate-900" : "text-emerald-950"
                    )}>
                      {actorLabel}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-bold px-2 py-0 h-5 border-slate-100 rounded-md",
                      isAgentReply ? "bg-indigo-50 text-indigo-900" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {isAgentReply ? "OFFICER" : "REQUESTER"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 opacity-60">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{format(new Date(item.created_at), "MMM dd, HH:mm")}</span>
                  </div>
                </div>
                
                <div className={cn(
                  "text-[15px] font-medium leading-[1.7] whitespace-pre-wrap selection:bg-indigo-100 max-w-3xl",
                  isAgentReply ? "text-slate-600" : "text-slate-900"
                )}>
                  {getDisplayContent(item)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-4">
         <div className="h-1 w-8 rounded-full bg-slate-200" />
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">End of Official Record</p>
         <div className="h-1 w-8 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}

function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
