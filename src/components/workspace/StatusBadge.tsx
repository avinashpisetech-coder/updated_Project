import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  TODO: { 
    label: "To Do", 
    className: "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800",
    dot: "bg-zinc-300"
  },
  IN_PROGRESS: { 
    label: "In Progress", 
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30 shadow-sm shadow-indigo-500/5",
    dot: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] animate-pulse"
  },
  INPROGRESS: { 
    label: "In Progress", 
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30 shadow-sm shadow-indigo-500/5",
    dot: "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] animate-pulse"
  },
  REVIEW: { 
    label: "Under Review", 
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30 shadow-sm shadow-amber-500/5",
    dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
  },
  COMPLETE: { 
    label: "Completed", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30 shadow-sm shadow-emerald-500/5",
    dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
  },
  COMPLETED: { 
    label: "Completed", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30 shadow-sm shadow-emerald-500/5",
    dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.TODO;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${config.className}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}
