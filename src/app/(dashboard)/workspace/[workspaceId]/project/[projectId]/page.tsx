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
        <TabsList className="mb-6 bg-transparent border-b rounded-none p-0 h-auto w-full justify-start gap-6">
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 rounded-none px-0 pb-3 font-medium text-zinc-500"
          >
            <ListTodo className="w-4 h-4 mr-2" /> List View
          </TabsTrigger>
          <TabsTrigger 
            value="milestones" 
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-900 rounded-none px-0 pb-3 font-medium text-zinc-500"
          >
            <Flag className="w-4 h-4 mr-2" /> Milestones
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-0 outline-none">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-900">{task.title}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        task.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                        task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/workspace/${workspaceId}/project/${projectId}/task/${task.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      No tasks found. Create one to get started.
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
