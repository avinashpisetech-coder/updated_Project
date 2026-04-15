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
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

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
        if (!["public_reply", "status_change"].includes(newItem.activity_type) || !newItem.content) return;
        const content = newItem.content.trim();
        if (content === "") return;
        if (newItem.activity_type === "status_change" && !content.includes("Note:")) return;
        if (content.startsWith("[EMAIL TRIGGER]") || content.startsWith("Deadline updated")) return;

        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", newItem.actor_id)
          .single();

        setLocalActivities(prev => [{ ...newItem, actor: actorProfile }, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase]);

  const interactionQueue = localActivities.filter((a, index, self) => {
    if (self.findIndex(t => t.id === a.id) !== index) return false;
    const content = (a.content || "").trim();
    if (content === "") return false;
    if (["public_reply", "internal_note"].includes(a.activity_type)) return true;
    if (a.id.startsWith("initial-")) return true;
    if (a.activity_type === "status_change" && content.includes("Note:")) return true;
    return false;
  });

  if (interactionQueue.length === 0) return null;

  const getDisplayContent = (item: ActivityLogItem) => {
    if (!item.content) return "";
    if (item.activity_type === "status_change" && item.content.includes("Note:")) {
      return item.content.split("Note:")[1].trim();
    }
    return item.content;
  };

  const latestInteraction = interactionQueue[0];

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div 
            key="collapsed"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            whileHover={{ y: -2 }}
            onClick={() => setIsExpanded(true)}
            className="group flex items-center justify-between cursor-pointer p-6 rounded-[2rem] border border-border/40 bg-white/60 backdrop-blur-xl shadow-premium hover:shadow-executive transition-all duration-500"
          >
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">NARRATIVE_STREAM</p>
                <div className="flex items-center gap-2">
                   <p className="text-sm font-black text-foreground whitespace-nowrap">
                    {interactionQueue.length} Protocol Records
                  </p>
                  <div className="h-1 w-1 rounded-full bg-border" />
                  <p className="text-[11px] font-bold text-muted-foreground truncate max-w-[300px] italic">
                    &ldquo;{getDisplayContent(latestInteraction).substring(0, 50)}...&rdquo;
                  </p>
                </div>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
              <Maximize2 className="h-4 w-4" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="expanded"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-[2.5rem] border border-border/40 bg-white shadow-executive overflow-hidden flex flex-col max-h-[750px] relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10" />
            
            <div 
              onClick={() => setIsExpanded(false)}
              className="flex items-center justify-between p-8 border-b border-border/40 cursor-pointer hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-1">TACTICAL_COMMS_LEDGER</p>
                  <p className="text-lg font-black text-foreground tracking-tight">Chronological Narrative Registry</p>
                </div>
              </div>
              <button className="h-12 w-12 rounded-xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all">
                <Minimize2 className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-0 no-scrollbar custom-scrollbar">
              {interactionQueue.map((item, index) => {
                const isRequester = item.actor_id === ticketRequesterId;
                const isAgentReply = !isRequester;
                const actorLabel = item.actor?.full_name || "SYSTEM_AUTH_GEN";
                
                return (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "relative pl-12 pb-10 last:pb-0 group/item",
                      index < interactionQueue.length - 1 && "before:absolute before:left-[7px] before:top-4 before:bottom-0 before:w-[2px] before:bg-muted/60",
                    )}
                  >
                    <div className={cn(
                      "absolute left-0 top-3 h-4 w-4 rounded-full border-4 border-white shadow-md z-10 transition-transform group-hover/item:scale-125",
                      isAgentReply ? "bg-primary" : "bg-emerald-500",
                    )} />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "text-sm font-black tracking-tight",
                            isAgentReply ? "text-foreground" : "text-emerald-900"
                          )}>
                            {actorLabel}
                          </span>
                          <span className={cn(
                            "text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-[0.1em]",
                            isAgentReply ? "bg-primary/5 text-primary border-primary/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {isAgentReply ? "STRATEGIC_OPERATOR" : "END_USER_STAKEHOLDER"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(item.created_at), "MMM dd, HH:mm:ss")}</span>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "text-[15px] font-medium leading-relaxed whitespace-pre-wrap p-6 rounded-3xl border transition-all",
                        isAgentReply 
                          ? "bg-muted/10 border-border/40 text-muted-foreground group-hover/item:bg-white group-hover/item:border-primary/20 group-hover/item:text-foreground" 
                          : "bg-emerald-50/20 border-emerald-100 text-emerald-950 group-hover/item:bg-emerald-50/50"
                      )}>
                        {getDisplayContent(item)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="p-8 bg-muted/20 border-t border-border/40 flex items-center justify-center gap-4">
               <div className="h-[2px] w-12 rounded-full bg-border" />
               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">REGISTRY_LOG_TERMINATED</p>
               <div className="h-[2px] w-12 rounded-full bg-border" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
