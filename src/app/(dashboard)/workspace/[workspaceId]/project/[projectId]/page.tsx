import { getTasks, getProject } from "../../../actions";
import { TaskModal } from "@/components/workspace/TaskModal";
import { ProjectModal } from "@/components/workspace/ProjectModal";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, ListTodo, Flag } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import Link from "next/link";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneBoard } from "@/components/workspace/MilestoneBoard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, User2 } from "lucide-react";

export default async function ProjectTasksPage({ params }: { params: { workspaceId: string, projectId: string } }) {
  const { workspaceId, projectId } = await params;
  const tasks = await getTasks(projectId);
  const project = await getProject(projectId);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{project.name}</h1>
            <ProjectModal workspaceId={workspaceId} initialData={{ id: project.id, name: project.name, description: project.description }}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
                <Settings2 className="h-4 w-4" />
              </Button>
            </ProjectModal>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-zinc-900 transition-colors">
              Project List
            </Link>
            <span>/</span>
            <span>{project.name} Tasks</span>
          </div>
        </div>
        
        <TaskModal projectId={projectId}>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </TaskModal>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-8 bg-transparent border-b border-zinc-200 dark:border-zinc-800 rounded-none p-0 h-auto w-full justify-start gap-10">
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-zinc-900 rounded-none px-0 pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition-all border-b-2 border-transparent"
          >
            <ListTodo className="w-3.5 h-3.5 mr-2 opacity-50" /> List_Protocol
          </TabsTrigger>
          <TabsTrigger 
            value="milestones" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-zinc-900 rounded-none px-0 pb-4 font-bold text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition-all border-b-2 border-transparent"
          >
            <Flag className="w-3.5 h-3.5 mr-2 opacity-50" /> Milestones_Node
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white dark:bg-zinc-950 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <tr>
                  <th className="px-8 py-5">Task_Identity</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5">Priority</th>
                  <th className="px-6 py-5">Assigned_Agents</th>
                  <th className="px-6 py-5">Due_Date</th>
                  <th className="px-8 py-5 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all group border-l-[3px] border-l-transparent hover:border-l-primary relative">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-primary transition-colors">{task.title}</span>
                        <span className="text-[10px] text-zinc-400 font-medium line-clamp-1 opacity-60">REF: {task.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                        task.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/30' :
                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30' :
                        'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex -space-x-2 overflow-hidden">
                        {task.task_assignees && task.task_assignees.length > 0 ? (
                          task.task_assignees.map((ta: any, idx: number) => (
                            <Avatar key={idx} className="h-8 w-8 border-2 border-white dark:border-zinc-950 shadow-md ring-1 ring-zinc-100 dark:ring-zinc-800 transition-transform group-hover:scale-110">
                              <AvatarImage src={ta.profiles?.avatar_url} />
                              <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-600 font-bold">
                                {ta.profiles?.full_name?.charAt(0) || <User2 className="h-3 w-3" />}
                              </AvatarFallback>
                            </Avatar>
                          ))
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center">
                            <User2 className="h-3 w-3 text-zinc-300" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                           {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "OPEN_TIMELINE"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link href={`/workspace/${workspaceId}/project/${projectId}/task/${task.id}`}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group/btn"
                        >
                          Execute_Protocol <ArrowRight className="ml-2 w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <ListTodo size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Tasks_Identified</p>
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
