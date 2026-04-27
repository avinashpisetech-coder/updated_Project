import { getMyTasks } from "../actions";
import { ModuleHeader } from "@/components/ModuleHeader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, User2 } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const tasks = await getMyTasks();

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans antialiased">
      <ModuleHeader
        title="MY_TASKS"
        subtitle="Your personal task assignments across all workspaces."
      />

      <main className="flex-1 overflow-auto p-8 bg-slate-50/40">
        <div className="max-w-5xl mx-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-6 py-32 opacity-40">
              <div className="h-24 w-24 rounded-[2rem] bg-muted border border-border flex items-center justify-center shadow-inner relative">
                <CheckCircle2 size={48} className="text-muted-foreground/40" />
                <div className="absolute inset-0 rounded-[2rem] border border-primary/20 animate-pulse" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-sm font-black text-foreground uppercase tracking-[0.4em]">
                  NO_ASSIGNMENTS
                </p>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest italic max-w-xs mx-auto">
                  You have no tasks assigned to you yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-950 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-8 py-4">Task Name</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {tasks.map((task: any) => (
                    <tr
                      key={task.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all group border-l-[3px] border-l-transparent hover:border-l-primary relative"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium opacity-60">
                            REF: {task.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 italic">
                          {task.workspace_projects?.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                            task.priority === "HIGH"
                              ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30"
                              : task.priority === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                          {task.due_date
                            ? format(new Date(task.due_date), "MMM dd, yyyy")
                            : "No due date"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <Link
                          href={`/workspace/${task.workspace_projects?.workspace_id}/project/${task.project_id}/task/${task.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all group/btn"
                          >
                            View Details{" "}
                            <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
