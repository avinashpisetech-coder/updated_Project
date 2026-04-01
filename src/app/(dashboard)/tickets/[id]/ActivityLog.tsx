"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import Link from "next/navigation";
import { History, Maximize2, Minimize2, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  actor_id: string;
  activity_type: string;
  content: string | null;
  created_at: string;
  new_value?: string;
  metadata?: any;
  actor: { full_name: string } | null;
}

export default function ActivityLog({ 
  ticketId, 
  initialActivities = [] 
}: { 
  ticketId: string,
  initialActivities?: ActivityItem[]
}) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [loading, setLoading] = useState(initialActivities.length === 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Load activities only if initial data is missing
  useEffect(() => {
    if (initialActivities.length > 0) {
      setActivities(initialActivities);
      setLoading(false);
      return;
    }

    async function loadActivities() {
      const { data } = await supabase
        .from("ticket_activity_log")
        .select(`
          *,
          actor:profiles!ticket_activity_log_actor_id_fkey(full_name)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
        
      if (data) setActivities(data as ActivityItem[]);
      setLoading(false);
    }
    loadActivities();
  }, [ticketId, supabase, initialActivities]);

  // Handle Realtime Subscription for Activities
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-activity:${ticketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_activity_log',
        filter: `ticket_id=eq.${ticketId}`
      }, async (payload) => {
        // Filter: for display in operational journal, we show all (except maybe very noisy system ones)
        const newItem = payload.new as any;
        
        // Fetch actor details for the new activity
        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", newItem.actor_id)
          .single();
            
        setActivities(prev => [{ ...newItem, actor: actorProfile }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  const filteredActivities = activities.filter((a) => {
    // 1. Exclude conversational narration already handled in the Interaction history
    if (["public_reply", "internal_note"].includes(a.activity_type)) return false;

    // 2. Exclude the "synthesis" or literal added ticket activity log if it is conversational noise
    if (a.content === "Added ticket") return false;

    // 3. Keep all system/operational transitions
    return true;
  });

  const lastActivity = filteredActivities[0];

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-500" />
          <span className="text-[11px] font-black tracking-widest text-slate-800 uppercase italic">Operational Journal</span>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 transition-all shadow-sm"
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn(
        "transition-all duration-500 ease-in-out overflow-hidden",
        isExpanded ? "max-h-[800px] opacity-100" : "max-h-20 opacity-80"
      )}>
        {loading ? (
          <p className="py-6 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Reading records...</p>
        ) : filteredActivities.length === 0 ? (
          <p className="py-6 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">No activity found</p>
        ) : isExpanded ? (
          <div className="space-y-6 overflow-y-auto pr-4 no-scrollbar max-h-[500px] border-l border-slate-100 ml-3">
            {filteredActivities.map((activity, idx) => {
              const content = String(activity.content);
              const isStatusChange = activity.activity_type === "status_change";
              
              return (
                <div key={activity.id as string} className="relative pl-8 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-4 ring-white shadow-sm" />
                  
                  <div className="group rounded-xl border border-slate-100 bg-white p-3 hover:border-indigo-100 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[12px] font-black text-slate-800 uppercase italic">
                        {(activity.actor as { full_name: string })?.full_name || 'System'}
                      </span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">
                          {format(new Date(activity.created_at as string), 'MMM dd | HH:mm')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-[12px] font-medium text-slate-600 leading-relaxed font-sans">
                      {content}
                    </div>

                    {activity.new_value && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase italic border-indigo-100/50 rounded-lg px-2 py-0.5">
                          {String(activity.new_value).replace(/_/g, ' ')}
                        </Badge>
                        {activity.metadata?.manual_activity && (
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200 text-slate-400 px-2 h-4">
                            MANUAL RECORD
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div 
            onClick={() => setIsExpanded(true)}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-white hover:border-indigo-100 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
               <Activity className="h-3.5 w-3.5 text-indigo-400 group-hover:animate-pulse" />
               <div className="flex flex-col">
                 <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest">Operational Journal</p>
                 <p className="text-[11px] font-bold text-slate-700 line-clamp-1 truncate max-w-[400px]">
                   Click to see Audit Trail
                 </p>
               </div>
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase italic">View System Logs</p>
          </div>
        )}
      </div>
    </div>
  );
}
