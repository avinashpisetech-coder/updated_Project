"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelector } from "./UserSelector";
import { createTask } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { 
  Users, Calendar, Flag, 
  ChevronDown, Minimize2, X, ListTodo, Paperclip
} from "lucide-react";
import { uploadTaskAttachment } from "@/app/(dashboard)/workspace/actions";

export function TaskModal({ projectId, parentTaskId, children, onSuccess }: { projectId: string, parentTaskId?: string, children: React.ReactNode, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showPrioritySelect, setShowPrioritySelect] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "LOW",
    due_date: "",
    assignees: [] as string[],
    attachments: [] as File[]
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Task description is mandatory");
      return;
    }
    setLoading(true);
    try {
      const task = await createTask(projectId, { ...formData, parent_task_id: parentTaskId });
      
      // Upload attachments if any
      if (formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          const fileData = new FormData();
          fileData.append("file", file);
          await uploadTaskAttachment(task.id, fileData);
        }
      }

      toast.success("Task created successfully");
      setOpen(false);
      setFormData({ title: "", description: "", status: "TODO", priority: "LOW", due_date: "", assignees: [], attachments: [] });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error("Error creating task: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-[750px] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-950 border-none shadow-2xl rounded-xl">
        <DialogTitle className="sr-only">Create Task</DialogTitle>
        
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              <ListTodo className="w-4 h-4" />
              <span>Project Task</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </div>
            <span className="text-zinc-300">/</span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full border border-zinc-400"></div>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Task</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100">
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-100" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-6 space-y-6">
          
          {/* Title Input */}
          <div>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Task Title"
              className="border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 text-2xl font-bold tracking-tight placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl bg-white dark:bg-zinc-900 h-14"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Description (Mandatory)</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Provide full operational details..."
              className="border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 py-3 bg-white dark:bg-zinc-900 resize-none min-h-[120px] focus-visible:ring-1 focus-visible:ring-primary/20 text-base rounded-xl"
              required
            />
          </div>

          {/* Attribute Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            
            {/* Status Pill */}
            <div className="relative">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-semibold bg-zinc-100/50 dark:bg-zinc-800 border-zinc-200"
                onClick={() => setShowStatusSelect(!showStatusSelect)}
              >
                {formData.status === "TODO" ? "To Do" : formData.status === "IN_PROGRESS" ? "In Progress" : "Completed"}
              </Button>
              {showStatusSelect && (
                <div className="absolute top-full mt-1 left-0 z-50 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-1 animate-in fade-in zoom-in-95 duration-200">
                  {[
                    { val: "TODO", label: "To Do" },
                    { val: "IN_PROGRESS", label: "In Progress" },
                    { val: "COMPLETE", label: "Completed" }
                  ].map(s => (
                    <div 
                      key={s.val} 
                      className="px-3 py-2 text-xs font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                      onClick={() => { setFormData({...formData, status: s.val}); setShowStatusSelect(false); }}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignee Pill */}
            <UserSelector 
              value={formData.assignees} 
              onChange={(val) => setFormData({...formData, assignees: val})} 
              customTrigger={
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-zinc-500 gap-1.5">
                  <Users className="w-3.5 h-3.5" /> 
                  {formData.assignees.length > 0 ? `${formData.assignees.length} Assignees` : 'Assignee'}
                </Button>
              }
            />

            {/* Due Date Pill / Input */}
            <div className="relative">
              <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 overflow-hidden h-8">
                <div className="px-2 text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-800 h-full flex items-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="h-full px-2 text-xs border-none focus:outline-none bg-transparent text-zinc-600 dark:text-zinc-300"
                />
              </div>
            </div>

            {/* Priority Pill */}
             <div className="relative">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs text-zinc-500 gap-1.5"
                onClick={() => setShowPrioritySelect(!showPrioritySelect)}
              >
                <Flag className="w-3.5 h-3.5" /> {formData.priority === 'LOW' ? 'Priority' : formData.priority}
              </Button>
              {showPrioritySelect && (
                <div className="absolute top-full mt-1 left-0 z-50 w-32 bg-white dark:bg-zinc-900 border rounded-md shadow-lg p-1">
                  {["LOW", "MEDIUM", "HIGH"].map(p => (
                    <div 
                      key={p} 
                      className="px-2 py-1.5 text-xs rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      onClick={() => { setFormData({...formData, priority: p}); setShowPrioritySelect(false); }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Attachment Button */}
            <div className="relative">
              <input 
                type="file" 
                multiple 
                id="task-create-attachments" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files) {
                    setFormData({...formData, attachments: Array.from(e.target.files)});
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-8 text-xs gap-1.5",
                  formData.attachments.length > 0 ? "text-primary border-primary/30 bg-primary/5" : "text-zinc-500"
                )}
                onClick={() => document.getElementById('task-create-attachments')?.click()}
              >
                <Paperclip className="w-3.5 h-3.5" /> 
                {formData.attachments.length > 0 ? `${formData.attachments.length} Files` : 'Attach'}
              </Button>
            </div>

          </div>

        </div>

        {/* Footer Action Bar */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => handleSubmit()} 
              disabled={loading}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-6"
            >
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
