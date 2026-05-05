import { getProjects, getWorkspace } from "../actions";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { ProjectModal } from "@/components/workspace/ProjectModal";
import { ProjectCard } from "@/components/workspace/ProjectCard";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";

export default async function WorkspaceProjectsPage({ 
  params,
  searchParams 
}: { 
  params: { workspaceId: string },
  searchParams: { [key: string]: string | undefined }
}) {
  const { workspaceId } = await params;
  const sParams = await searchParams;
  const isManual = sParams?.manual === 'true';

  const user = await getCachedUser();
  if (!user) return null;

  const [projects, permissions, workspace] = await Promise.all([
    getProjects(workspaceId),
    getUserPermissions(user.id),
    getWorkspace(workspaceId)
  ]);

  // Logical Auto-Redirect: If there is only one project, skip the list unless manual access is requested
  if (projects.length === 1 && !isManual) {
    redirect(`/workspace/${workspaceId}/project/${projects[0].id}`);
  }

  const canCreate = hasPermission(permissions, RESOURCES.WORKSPACE, "create") || 
                    hasPermission(permissions, "*", "manage");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/workspace?manual=true" className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Hub
            </Link>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase">
            {workspace?.name}
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Select a project to view tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/workspace/tasks">
            <Button variant="outline" className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-100">
              Task_Registry
            </Button>
          </Link>
          {canCreate && (
            <ProjectModal workspaceId={workspaceId}>
              <Button className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px]">
                <Plus className="mr-2 h-4 w-4" /> Create_Project
              </Button>
            </ProjectModal>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-24 bg-white rounded-xl border border-dashed border-zinc-300">
            <h3 className="text-lg font-medium text-zinc-900">No Projects</h3>
            <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
              Create a project to start adding tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
