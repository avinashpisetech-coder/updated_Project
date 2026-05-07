import { getWorkspaces, getMyTasks } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Calendar, CheckSquare, ArrowRight, Clock, ArrowLeft } from "lucide-react";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";
import Link from "next/link";
import { getCachedUser } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export default async function WorkspaceDashboard({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const params = await searchParams;
  const isManual = params?.manual === 'true';

  const user = await getCachedUser();
  if (!user) return null;

  const [workspaces, permissions, myTasks] = await Promise.all([
    getWorkspaces(),
    getUserPermissions(user.id),
    getMyTasks().catch(() => [])
  ]);

  // Logical Auto-Redirect: If there is only one workspace, skip the hub unless manual access is requested
  if (workspaces.length === 1 && !isManual) {
    redirect(`/workspace/${workspaces[0].id}`);
  }

  const canCreate = hasPermission(permissions, RESOURCES.WORKSPACE, "create") || 
                    hasPermission(permissions, "*", "manage");
  
  const canReadTasks = hasPermission(permissions, RESOURCES.WORKSPACE, "read") || 
                       hasPermission(permissions, "*", "manage");

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">Operational Hub</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Workspace & Task Governance</p>
        </div>
        <div className="flex items-center gap-3">
          {canReadTasks && (
            <Link href="/workspace/tasks">
              <Button variant="outline" className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-100">
                Task_Registry
              </Button>
            </Link>
          )}
          {canCreate && (
            <WorkspaceModal>
              <Button className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                <Plus className="mr-2 h-4 w-4" /> Create_Workspace
              </Button>
            </WorkspaceModal>
          )}
        </div>
      </div>

      {/* Direct Assignment Access - The "Skip" Button */}
      {myTasks && myTasks.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
             <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
             <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Your Active Assignments</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {myTasks.slice(0, 3).map((task) => (
              <Link 
                key={task.id} 
                href={`/workspace/${task.workspace_projects?.workspace_id}/project/${task.project_id}/task/${task.id}`}
                className="group flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate">{task.title}</span>
                      <div className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        {task.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{task.workspace_projects?.workspace?.name || 'Workspace'}</span>
                       <span className="h-1 w-1 rounded-full bg-zinc-200" />
                       <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{task.workspace_projects?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 pl-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Deadline</span>
                    <span className="text-[10px] font-bold text-zinc-600">{task.due_date ? format(new Date(task.due_date), 'dd MMM') : 'NONE'}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-300" />
                </div>
              </Link>
            ))}
            {myTasks.length > 3 && (
              <Link href="/workspace/my-tasks" className="text-center py-2 text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:underline">
                View All {myTasks.length} Assignments
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
         <FolderKanban className="h-4 w-4 text-zinc-400" />
         <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Workspaces Registry</h2>
      </div>

      {workspaces.length === 0 && (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-zinc-300">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900">No Workspaces Yet</h3>
          <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
            Create a workspace to start organizing your projects, tasks, and collaborating with your team.
          </p>
          <div className="mt-6">
            <WorkspaceModal>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Workspace
              </Button>
            </WorkspaceModal>
          </div>
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/workspace/${workspace.id}`}>
              <div className="group relative bg-white rounded-xl border border-zinc-200 p-6 hover:border-red-300 hover:shadow-lg hover:shadow-red-50 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                    {workspace.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-zinc-900 group-hover:text-red-600 transition-colors break-words">
                      {workspace.name}
                    </h3>
                    {workspace.description && workspace.description !== "Default Workspace" && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {workspace.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(workspace.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>Projects</span>
                  </div>
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
