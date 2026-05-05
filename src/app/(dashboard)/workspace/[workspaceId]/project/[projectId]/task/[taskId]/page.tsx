import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/permissions-server";
import { TaskDetailPanel } from "@/components/workspace/TaskDetailPanel";
import Link from "next/link";
import { ArrowLeft, Printer, Shield, Clock, Calendar, CheckSquare } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default async function TaskPage({ params }: { params: { workspaceId: string, projectId: string, taskId: string } }) {
  const { workspaceId, projectId, taskId } = await params;
  
  const user = await getCachedUser();
  if (!user) notFound();

  const supabase = await createClient();
  const [taskRes, permissions] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, workspace_projects(name, workspace_id, workspace:workspaces(name)), creator:profiles!created_by(id, full_name, email), task_assignees(profile_id, profiles(full_name, email))")
      .eq("id", taskId)
      .single(),
    getUserPermissions(user.id)
  ]);

  const { data: task, error } = taskRes;

  if (error || !task) {
    notFound();
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'complete') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s === 'in_progress') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (s === 'review') return 'bg-orange-50 text-orange-600 border-orange-100';
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50/50 overflow-hidden font-sans">
      {/* ── Deployment-Style Header ── */}
      <header className="h-[72px] shrink-0 bg-white border-b border-border/40 flex items-center justify-between px-8 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted border border-border/40">
            <Link href={`/workspace/${workspaceId}/project/${projectId}`}>
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight">
                TASK-{task.id.slice(0, 6)}
              </h1>
              <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-2 rounded-md", getStatusColor(task.status))}>
                {task.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 px-2 rounded-md border-primary/20 bg-primary/5 text-primary">
                WORKSPACE-NODE
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-[#E1F0F7] border-[#C5E1F0] text-slate-700 hover:bg-[#D4E9F4]">
            <Printer className="h-3.5 w-3.5 mr-2" /> Export Protocol
          </Button>
          <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border-none">
            <Link href={`/workspace/${workspaceId}/project/${projectId}`}>Close</Link>
          </Button>
        </div>
      </header>
      
      {/* ── Main content transition area ── */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        <div className="w-full max-w-[98%] mx-auto space-y-6">
          
          {/* Sector 1: Metadata Configuration */}
          <div className="bg-card/40 border border-border/40 p-6 rounded-3xl shadow-sm backdrop-blur-xl">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 1: Task Metadata Configuration
            </h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Creation Date</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {format(new Date(task.created_at), 'dd MMM yyyy')}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Project Zone</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700 italic">
                  {task.workspace_projects.name}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Target Deadline</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-rose-600">
                  {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy') : "NO_DEADLINE"}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Primary Node</label>
                <div className="h-11 rounded-xl bg-white border border-border/20 flex items-center px-4 text-xs font-bold text-slate-700">
                  {(task as any).creator?.full_name || 'SYSTEM_NODE'}
                </div>
              </div>
            </div>
          </div>

          {/* Sector 2: Transaction Interaction Console */}
          <div className="bg-white border border-border/40 rounded-3xl shadow-sm overflow-hidden flex flex-col relative z-10">
            <div className="p-4 border-b border-border/40 bg-card/10 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 2: Task Engagement Console
              </h3>
            </div>
            <div className="flex-1 h-[750px] min-h-[600px]">
              <TaskDetailPanel task={task} user={user} permissions={permissions} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
