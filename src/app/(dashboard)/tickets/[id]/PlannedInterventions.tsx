"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, X, Maximize2, Minimize2, ExternalLink, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";

interface Meeting {
  id: string;
  title: string;
  meeting_type: string;
  starts_at: string;
  duration_minutes: number;
  status: string;
  location: string | null;
  meeting_link: string | null;
  interaction_id: string | null;
}

interface Props {
  meetings: Meeting[] | null;
  ticketId: string;
}

export default function PlannedInterventions({ meetings, ticketId }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (meetings && meetings.length > 0) {
      console.log("PlannedInterventions: Initialized with meetings:", meetings.map(m => ({ id: m.id, title: m.title })));
    }
  }, [meetings]);

  if (!isExpanded) {
    return (
      <div id="planned-interventions" className="scroll-mt-24">
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all"
        >
          <div className="flex items-center gap-4">
             <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
               <History className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Intervention Log</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-900">
                {(!meetings || meetings.length === 0) ? "No Active Records" : `${meetings.length} Scheduled`}
              </p>
            </div>
          </div>
          <button 
            className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
            title="Maximize Registry"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="planned-interventions" className="space-y-6 animate-in font-sans scroll-mt-24 bg-white">
      <div 
        onClick={() => setIsExpanded(false)}
        className="flex items-center justify-between border-b border-slate-50 pb-5 cursor-pointer hover:bg-slate-50/30 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <History className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Registry Active</p>
            <p className="mt-0.5 text-[12px] font-bold text-slate-900">Historical Interaction Archive</p>
          </div>
        </div>
        <button 
          className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
          title="Minimize Registry"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      {(!meetings || meetings.length === 0) ? (
        <div className="py-8 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
           <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-300 italic">Archive Empty</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 no-scrollbar">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="p-5 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/10 transition-all group">
              <div className="flex items-center justify-between mb-4">
                 <div className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                  {meeting.status}
                </div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  {meeting.interaction_id || (meeting.meeting_type || "").replace(/_/g, ' ')}
                </div>
              </div>
              <div className="text-[14px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 leading-tight tracking-tight">{meeting.title}</div>
              <div suppressHydrationWarning className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-4">
                <Clock className="h-3 w-3" />
                {format(new Date(meeting.starts_at), "MMM dd | HH:mm")}
              </div>
              <Link 
                href={`/tickets/${ticketId}/meetings/${meeting.id}`}
                prefetch={false}
                className="inline-flex w-full items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] text-white bg-slate-900 hover:bg-indigo-600 h-10 rounded-lg transition-all active:scale-[0.98] gap-2 shadow-sm"
              >
                Join Interaction
                <ExternalLink className="h-3.5 w-3.5 opacity-40" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
