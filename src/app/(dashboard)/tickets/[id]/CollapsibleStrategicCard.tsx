"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Maximize2, Minimize2, 
  History, FolderOpen, Calendar, Activity, 
  LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

const IconMap: Record<string, LucideIcon> = {
  history: History,
  folder: FolderOpen,
  calendar: Calendar,
  activity: Activity,
};

interface Props {
  title: string;
  subtitle?: string;
  iconName: "history" | "folder" | "calendar" | "activity";
  children: ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleStrategicCard({ 
  title, 
  subtitle, 
  iconName, 
  children, 
  defaultExpanded = false 
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const Icon = IconMap[iconName] || Activity;

  return (
    <motion.div 
      whileHover={!isExpanded ? { scale: 1.0125, y: -5, transition: { type: "spring", stiffness: 400, damping: 25 } } : {}}
      className={cn(
        "rounded-3xl border transition-all duration-500 bg-white overflow-hidden flex flex-col h-full",
        isExpanded 
          ? "border-slate-100 shadow-xl min-h-[500px]" 
          : "border-slate-100/50 shadow-sm hover:shadow-lg hover:border-slate-200 cursor-pointer"
      )}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      {/* Header Area */}
      <div className={cn(
        "p-6 flex items-center justify-between transition-all select-none",
        isExpanded ? "border-b border-slate-50 bg-slate-50/20" : "h-24"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-2xl flex items-center justify-center transition-all",
            isExpanded ? "bg-indigo-950 text-white shadow-md" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className={cn(
              "text-[11px] font-semibold tracking-wider uppercase transition-all",
              isExpanded ? "text-slate-500" : "text-slate-400"
            )}>
              {title}
            </p>
            {!isExpanded && subtitle && (
              <p className="text-[12px] font-bold text-slate-900 mt-0.5">{subtitle}</p>
            )}
            {isExpanded && (
               <p className="text-[14px] font-bold text-slate-900 mt-0.5">Strategic Archive</p>
            )}
          </div>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-all border",
            isExpanded 
              ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white" 
              : "bg-white border-transparent text-slate-300 hover:text-indigo-950"
          )}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            <div className="p-8 flex-1 flex flex-col overflow-hidden">
              {children}
            </div>
            
            <div className="p-4 bg-slate-50/30 border-t border-slate-50 flex items-center justify-center">
               <button 
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-indigo-950 transition-colors uppercase tracking-widest"
               >
                 <Minimize2 className="h-3 w-3" />
                 Compress Strategic Matrix
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!isExpanded && (
        <div className="px-6 pb-2">
           <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-950/10 w-1/3" />
           </div>
        </div>
      )}
    </motion.div>
  );
}
