"use client";

import { useState } from "react";
import { Activity, Maximize2, Minimize2, Clock, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityLogItem {
  id: string;
  content: string | null;
  created_at: string;
  actor: { full_name: string } | null;
  metadata: any;
}

interface Props {
  activities: ActivityLogItem[];
}

export default function ManualActivityBlock({ activities }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter only manual activities
  const manualActivities = activities.filter(a => 
    a.metadata && (a.metadata.manual_activity === true || a.metadata.manual_activity === "true")
  );

  if (manualActivities.length === 0) return null;

  if (!isExpanded) {
    return (
      <div className="group transition-all duration-300">
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 bg-white/50 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-800">Manual Activity Records</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {manualActivities.length} {manualActivities.length === 1 ? 'Action' : 'Actions'} Logged
              </p>
            </div>
          </div>
          <button className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100/50 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div 
        onClick={() => setIsExpanded(false)}
        className="flex items-center justify-between p-5 border-b border-slate-100 cursor-pointer hover:bg-slate-50/50 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-900 italic">Technical Activity Registry</p>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Chronological Trace Active</p>
          </div>
        </div>
        <button className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all">
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[500px] overflow-y-auto p-4 space-y-4 no-scrollbar">
        {manualActivities.map((activity, index) => (
          <div 
            key={activity.id} 
            className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-slate-100"
          >
            <div className="absolute left-[-4px] top-2 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
            
            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-lg hover:shadow-slate-100/50 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                    {activity.actor?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{activity.actor?.full_name || "System"}</p>
                    <div className="flex items-center gap-1.5 opacity-40">
                      <Clock className="h-2.5 w-2.5" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">{format(new Date(activity.created_at), "MMM dd, HH:mm")}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[8px] font-black text-slate-300 uppercase tracking-tighter shadow-sm border border-slate-100 bg-white px-2 py-0.5 rounded-full">
                  ENTRY #{manualActivities.length - index}
                </div>
              </div>
              
              <div className="text-[13px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap selection:bg-indigo-50">
                {activity.content}
              </div>
            </div>
            
            {index < manualActivities.length - 1 && (
              <div className="h-4 border-l border-slate-100 ml-[-1px] opacity-20" />
            )}
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
         <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 italic">End of Activity Registry</p>
      </div>
    </div>
  );
}
