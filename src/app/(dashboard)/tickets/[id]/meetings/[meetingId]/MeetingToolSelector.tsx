"use client";

import { useState, useTransition } from "react";
import { initializeMeetingTool } from "../../../actions";
import { Button } from "@/components/ui/button";
import { Loader2, Video, MessageSquare, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = {
  id: 'jitsi' | 'google_meet' | 'teams' | 'zoom';
  name: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  status: string;
};

const TOOLS: Tool[] = [
  { 
    id: 'jitsi', 
    name: 'Jitsi Meet', 
    icon: Video, 
    color: 'text-violet-600', 
    bg: 'bg-violet-50', 
    border: 'border-violet-100',
    status: 'Fully Automated / Recommended'
  },
  { 
    id: 'google_meet', 
    name: 'Google Meet', 
    icon: Video, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-100',
    status: 'Manual ID Required'
  },
  { 
    id: 'teams', 
    name: 'MS Teams', 
    icon: MessageSquare, 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50', 
    border: 'border-indigo-100',
    status: 'Manual Link Pattern'
  },
  { 
    id: 'zoom', 
    name: 'Zoom Meet', 
    icon: Monitor, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    border: 'border-blue-100',
    status: 'Personal ID Pattern'
  },
];

export default function MeetingToolSelector({ meetingId }: { meetingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleSelect = (toolId: 'jitsi' | 'google_meet' | 'teams' | 'zoom') => {
    setSelectedTool(toolId);
    startTransition(async () => {
      await initializeMeetingTool(meetingId, toolId);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Step 02 / Deployment</p>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Select Interface Tool</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            disabled={isPending}
            onClick={() => handleSelect(tool.id)}
            className={cn(
              "flex items-center justify-between p-5 rounded-[1.5rem] border transition-all group",
              selectedTool === tool.id 
                ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[0.98]" 
                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 active:scale-95"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                selectedTool === tool.id ? "bg-white/10 text-white" : cn(tool.bg, tool.color, "border", tool.border)
              )}>
                {selectedTool === tool.id && isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <tool.icon className="h-6 w-6" />
                )}
              </div>
              <div className="text-left">
                <p className={cn(
                  "text-sm font-black uppercase tracking-widest",
                  selectedTool === tool.id ? "text-white" : "text-slate-900"
                )}>
                  {tool.name}
                </p>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-tight",
                  selectedTool === tool.id ? "text-white/50" : "text-slate-400"
                )}>
                  {tool.status}
                </p>
              </div>
            </div>
            
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center border transition-all",
              selectedTool === tool.id 
                ? "bg-white/20 border-white/20 text-white" 
                : "bg-slate-50 border-slate-100 text-slate-300 group-hover:bg-slate-900 group-hover:text-white"
            )}>
              <Video className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
