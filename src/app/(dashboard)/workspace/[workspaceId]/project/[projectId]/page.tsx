import { getTasks, getProject, getWorkspace } from "../../../actions";
import { TaskModal } from "@/components/workspace/TaskModal";
import { ProjectModal } from "@/components/workspace/ProjectModal";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, ListTodo, Flag, Home, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import Link from "next/link";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneBoard } from "@/components/workspace/MilestoneBoard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, User2 } from "lucide-react";

export default async function ProjectTasksPage({ params }: { params: { workspaceId: string, projectId: string } }) {
  const { workspaceId, projectId } = await params;
  const [tasks, project, workspace] = await Promise.all([
    getTasks(projectId),
    getProject(projectId),
    getWorkspace(workspaceId)
  ]);

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/workspace?manual=true" className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-primary transition-colors">
              <Home className="h-3 w-3" /> Hub
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-300" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">
              {project.name}
            </h1>
            <ProjectModal workspaceId={workspaceId} initialData={{ id: project.id, name: project.name, description: project.description }}>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </ProjectModal>
          </div>
          <p className="text-zinc-500 text-xs font-medium max-w-2xl line-clamp-1">{project.description || "Operational task protocols and resource management."}</p>
        </div>
        
        <TaskModal projectId={projectId}>
          <Button className="h-9 rounded-xl px-4 font-black uppercase tracking-widest text-[9px] bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/10 transition-all active:scale-95 group">
            <Plus className="mr-2 h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-300" /> New Task
          </Button>
        </TaskModal>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-zinc-100/80 dark:bg-zinc-900/80 p-1 rounded-xl h-auto gap-0.5 border border-zinc-200/50 dark:border-zinc-800/50">
            <TabsTrigger 
              value="list" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest text-zinc-500 transition-all flex items-center gap-2"
            >
              <ListTodo className="w-3 h-3" /> List View
            </TabsTrigger>
            <TabsTrigger 
              value="milestones" 
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm px-4 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest text-zinc-500 transition-all flex items-center gap-2"
            >
              <Flag className="w-3 h-3" /> Roadmap
            </TabsTrigger>
          </TabsList>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
            {tasks.length} Protocols Active
          </div>
        </div>
        
        <TabsContent value="list" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100">
                <tr>
                  <th className="px-6 py-4">Task Identity</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Urgency</th>
                  <th className="px-4 py-4">Assignees</th>
                  <th className="px-4 py-4">Timeline</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all group border-l-2 border-l-transparent hover:border-l-primary">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-sm group-hover:text-primary transition-colors">{task.title}</span>
                        <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest opacity-60">REF: {task.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all ${
                        task.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100' :
                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-zinc-50 text-zinc-500 border-zinc-200'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {task.task_assignees && task.task_assignees.length > 0 ? (
                          task.task_assignees.map((ta: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2.5 group/name">
                              <Avatar className="h-6 w-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <AvatarImage src={ta.profiles?.avatar_url} />
                                <AvatarFallback className="text-[7px] bg-zinc-100 text-zinc-600 font-black">
                                  {ta.profiles?.full_name?.charAt(0) || <User2 className="h-2 w-2" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[140px] group-hover/name:text-primary transition-colors">
                                {ta.profiles?.full_name || 'Assigned'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-300">
                            <div className="h-6 w-6 rounded-full border border-dashed border-zinc-200 flex items-center justify-center">
                              <User2 className="h-3 w-3" />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest">Unassigned</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-tighter">
                         {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : "---"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/workspace/${workspaceId}/project/${projectId}/task/${task.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-100 dark:border-zinc-800 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all group/btn"
                        >
                          Details <ArrowRight className="ml-1 w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <ListTodo size={48} className="text-zinc-200" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">No tasks found in this project</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        <TabsContent value="milestones" className="mt-0 outline-none">
          <MilestoneBoard projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
