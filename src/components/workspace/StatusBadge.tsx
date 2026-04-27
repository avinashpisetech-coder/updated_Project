import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  TODO: { 
    label: "To Do", 
    className: "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800",
    dot: "bg-zinc-400"
  },
  IN_PROGRESS: { 
    label: "In Progress", 
    className: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/30",
    dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
  },
  COMPLETE: { 
    label: "Completed", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
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
