"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { X, Folder } from "lucide-react";

interface ProjectModalProps {
  workspaceId: string;
  children?: React.ReactNode;
  initialData?: { id: string; name: string; description: string };
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectModal({ workspaceId, children, initialData, onSuccess, open: controlledOpen, onOpenChange: controlledOnOpenChange }: ProjectModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const isEditing = !!initialData;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        await updateProject(initialData.id, formData);
        toast.success("Project updated successfully");
      } else {
        await createProject(workspaceId, formData);
        toast.success("Project created successfully");
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({ name: "", description: "" });
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(`Error ${isEditing ? 'updating' : 'creating'} project: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl rounded-xl">
        <DialogTitle className="sr-only">{isEditing ? "Edit" : "Create"} Project</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
              <Folder className="w-4 h-4" />
            </div>
            {isEditing ? "Edit Project" : "Create New Project"}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Project Name</label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Website Redesign"
              className="bg-zinc-50/50 dark:bg-zinc-900/50 focus-visible:ring-1 focus-visible:ring-zinc-400"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What is this project about?"
              className="bg-zinc-50/50 dark:bg-zinc-900/50 resize-none h-24 focus-visible:ring-1 focus-visible:ring-zinc-400"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-6"
            >
              {loading ? "Saving..." : (isEditing ? "Save Changes" : "Create Project")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
