"use client";

import { useState, useEffect } from "react";
import { getTasks, createTask, updateTaskStatus } from "@/app/(dashboard)/workspace/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, ListTree, User, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import { TaskModal } from "./TaskModal";
import { cn } from "@/lib/utils";

export function TaskSubtasks({ parentTaskId, projectId, disabled }: { parentTaskId: string, projectId: string, disabled?: boolean }) {
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtasks();
  }, [parentTaskId]);

  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const allTasks = await getTasks(projectId);
      const filtered = allTasks.filter((t: any) => t.parent_task_id === parentTaskId);
      setSubtasks(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !newTaskTitle.trim()) return;
    
    try {
      await createTask(projectId, { 
        title: newTaskTitle, 
        parent_task_id: parentTaskId,
        status: "TODO",
        priority: "LOW"
      });
      setNewTaskTitle("");
      await loadSubtasks();
    } catch (error: any) {
      toast.error("Failed to add subtask: " + error.message);
    }
  };

  const toggleStatus = async (task: any) => {
    if (disabled) return;
    const newStatus = task.status === 'COMPLETE' ? 'TODO' : 'COMPLETE';
    try {
      setSubtasks(subtasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      await updateTaskStatus(task.id, newStatus);
    } catch (error) {
      toast.error("Failed to update status");
      loadSubtasks();
    }
  };

  if (loading && subtasks.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <ListTree className="w-4 h-4 text-zinc-500" />
        Subtasks
      </h3>
      
      <div className="space-y-2 pl-6">
        {subtasks.map(task => (
          <div key={task.id} className="flex items-center justify-between group py-1 border-b border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleStatus(task)} 
                disabled={disabled}
                className={cn(
                  "text-zinc-400 hover:text-emerald-500",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <CheckCircle2 className={`w-4 h-4 ${task.status === 'COMPLETE' ? 'text-emerald-500' : ''}`} />
              </button>
              <span className={cn(
                "text-sm",
                task.status === 'COMPLETE' ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
              )}>
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {task.due_date && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
              <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                {task.task_assignees?.[0]?.profiles?.full_name?.charAt(0) || <User className="w-3 h-3" />}
              </div>
              <StatusBadge status={task.status} />
              <button 
                onClick={() => window.location.href = `/workspace/${projectId}/project/${projectId}/task/${task.id}`}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-primary transition-all"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

         {!disabled && (
           <div className="flex items-center gap-4 pt-2">
              <TaskModal projectId={projectId} parentTaskId={parentTaskId} onSuccess={loadSubtasks}>
                 <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary p-0">
                   <Plus className="w-4 h-4 mr-1" /> Add_Operational_Subtask
                 </Button>
              </TaskModal>
              
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={loading}
                onClick={async () => {
                  const { generateAISubtasks } = await import("@/app/(dashboard)/workspace/ai-actions");
                  toast.promise(generateAISubtasks(parentTaskId, projectId), {
                    loading: 'AI is analyzing and breaking down task...',
                    success: () => {
                      loadSubtasks();
                      return 'Operational breakdown complete!';
                    },
                    error: 'AI failed to generate protocol'
                  });
                }}
                className="h-8 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 p-0"
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white animate-pulse">
                     <span className="text-[8px]">✨</span>
                  </div>
                  Magic_Breakdown
                </div>
              </Button>
           </div>
         )}
      </div>
    </div>
  );
}
