"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { History, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const supabase = useMemo(() => createClient(), []);

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

  // Handle Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-activity:${ticketId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ticket_activity_log',
        filter: `ticket_id=eq.${ticketId}`
      }, async (payload) => {
        const newItem = payload.new as any;
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
    // Exclude basic reply/note types as they go in interaction queue
    if (["public_reply", "internal_note"].includes(a.activity_type)) return false;
    return true;
  });

  if (loading) return <div className="h-20 flex items-center justify-center text-[10px] font-black uppercase text-slate-300 tracking-widest">Hydrating Logs...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-black text-slate-700 flex items-center gap-2 pl-1">
          <Activity className="h-4 w-4 text-indigo-600" />
          Audit Trail
      </h3>

      <div className="border border-slate-300 rounded-sm overflow-hidden bg-white shadow-sm">
          <Table>
              <TableHeader className="bg-[#D9EAF7] hover:bg-[#D9EAF7]">
                  <TableRow className="h-12 border-b border-slate-300">
                      <TableHead className="w-[180px] text-[13px] font-black text-slate-800 text-center uppercase border-r border-slate-300">Phase Status</TableHead>
                      <TableHead className="w-[200px] text-[13px] font-black text-slate-800 text-center uppercase border-r border-slate-300">Lead Operative</TableHead>
                      <TableHead className="w-[200px] text-[13px] font-black text-slate-800 text-center uppercase border-r border-slate-300">Timestamp</TableHead>
                      <TableHead className="text-[13px] font-black text-slate-800 text-center uppercase">Remarks / Changes</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredActivities.length > 0 ? filteredActivities.map((log) => {
                      const logType = log.activity_type || "Transition";
                      const logContent = log.content || "Status transition recorded";
                      
                      return (
                          <TableRow key={log.id} className="h-24 border-b border-slate-200 hover:bg-slate-50/50">
                              <TableCell className="text-center font-bold text-indigo-900 border-r border-slate-200 text-[11px] uppercase tracking-tight">
                                  {logType.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-center font-bold text-slate-700 border-r border-slate-200 text-[12px]">
                                  {log.actor?.full_name || "System"}
                              </TableCell>
                              <TableCell className="text-center font-medium text-slate-500 border-r border-slate-100 text-[11px] uppercase tracking-tighter">
                                  {format(new Date(log.created_at), "MMM dd yyyy, HH:mm")}
                              </TableCell>
                              <TableCell className="p-4">
                                  <div className="w-full h-full min-h-[60px] bg-[#F1F5F9] rounded-sm p-3 text-[12px] text-slate-700 font-medium relative group shadow-inner border border-slate-200">
                                      {logContent}
                                      {log.new_value && (
                                        <div className="mt-1 text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
                                          → New Value: {String(log.new_value).replace(/_/g, ' ')}
                                        </div>
                                      )}
                                      <div className="absolute bottom-1 right-1 opacity-20">
                                          <div className="w-2 h-[1px] bg-slate-400 rotate-45 translate-y-1" />
                                          <div className="w-2 h-[1px] bg-slate-400 rotate-45 translate-x-1" />
                                      </div>
                                  </div>
                              </TableCell>
                          </TableRow>
                      );
                  }) : (
                    <TableRow className="h-24">
                      <TableCell colSpan={4} className="text-center text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
                        INITIAL_STATE: No transitions recorded in registry
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
          </Table>
      </div>
    </div>
  );
}
