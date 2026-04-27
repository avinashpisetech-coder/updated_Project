import { getWorkspaces } from "./actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";
import Link from "next/link";

export default async function WorkspaceDashboard() {
  const workspaces = await getWorkspaces();

  // Redirect to first workspace if exists to skip this landing page
  if (workspaces.length > 0) {
    redirect(`/workspace/${workspaces[0].id}`);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Workspaces</h1>
          <p className="text-zinc-500 mt-1">Manage your team's projects and tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/workspace/tasks">
            <Button variant="outline" className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-100">
              Task_Registry
            </Button>
          </Link>
          <WorkspaceModal>
            <Button className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Plus className="mr-2 h-4 w-4" /> Create_Workspace
            </Button>
          </WorkspaceModal>
        </div>
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
    </div>
  );
}
