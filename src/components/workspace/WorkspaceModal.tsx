"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createWorkspace, updateWorkspace } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { X, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkspaceModalProps {
  children: React.ReactNode;
  initialData?: { id: string; name: string; description: string };
  onSuccess?: () => void;
}

export function WorkspaceModal({ children, initialData, onSuccess }: WorkspaceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
  });

  const isEditing = !!initialData;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        await updateWorkspace(initialData.id, formData);
        toast.success("Workspace updated successfully");
      } else {
        const newWorkspace = await createWorkspace(formData);
        toast.success("Workspace created successfully");
        router.push(`/workspace/${newWorkspace.id}`);
      }
      setOpen(false);
      if (!isEditing) {
        setFormData({ name: "", description: "" });
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(`Error ${isEditing ? 'updating' : 'creating'} workspace: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl rounded-xl">
        <DialogTitle className="sr-only">{isEditing ? "Edit" : "Create"} Workspace</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            {isEditing ? "Edit Workspace" : "Create New Workspace"}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Workspace Name</label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Engineering Team"
              className="bg-zinc-50/50 dark:bg-zinc-900/50 focus-visible:ring-1 focus-visible:ring-zinc-400"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description (Optional)</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="What is this workspace for?"
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
              {loading ? "Saving..." : (isEditing ? "Save Changes" : "Create Workspace")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
