"use client";

import { useState } from "react";
import { Folder, MoreVertical, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ProjectModal } from "./ProjectModal";
import { deleteProject } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  project: { id: string; name: string; description: string; workspace_id: string };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      try {
        await deleteProject(project.id);
        toast.success("Project deleted successfully");
        router.refresh();
      } catch (error: any) {
        toast.error("Error deleting project: " + error.message);
      }
    }
  };

  return (
    <>
      <div className="relative group bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all">
        <Link href={`/workspace/${project.workspace_id}/project/${project.id}`} className="absolute inset-0 z-0"></Link>
        
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors pointer-events-none">
              <Folder className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 pointer-events-none">{project.name}</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 pointer-events-none relative z-10">
          {project.description || "No description provided."}
        </p>
      </div>

      <ProjectModal
        workspaceId={project.workspace_id}
        initialData={{ id: project.id, name: project.name, description: project.description }}
        onSuccess={() => setIsEditModalOpen(false)}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </>
  );
}
