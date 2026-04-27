"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityPanel } from "./ActivityPanel";
import { UserSelector } from "./UserSelector";
import { updateTaskStatus, updateTaskField, updateTaskFull, updateTaskAssignees } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { 
  CheckCircle2, Users, Calendar, Flag,
  ChevronDown, ChevronRight, ChevronUp, FolderKanban,
  Minimize2, Maximize2, MoreHorizontal,
  Plus, MessageSquare, Trash2, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TaskChecklist } from "./TaskChecklist";
import { TaskSubtasks } from "./TaskSubtasks";
import { cn } from "@/lib/utils";

export function TaskDetailPanel({ task }: { task: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(task.status);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [hideEmpty, setHideEmpty] = useState(false);

  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [assignees, setAssignees] = useState<string[]>(task.task_assignees?.map((a: any) => a.profile_id) || []);
  const [loading, setLoading] = useState(false);
  const [showPrioritySelect, setShowPrioritySelect] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatus(newStatus);
      await updateTaskStatus(task.id, newStatus);
      toast.success("Status updated");
    } catch (error: any) {
      toast.error("Error updating status: " + error.message);
      setStatus(task.status);
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      await updateTaskField(task.id, field, value);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    } catch (error: any) {
      toast.error(`Error updating ${field}: ` + error.message);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-zinc-950 overflow-hidden border-t dark:border-zinc-800">
      
      {/* Left Content Area */}
      <div className="flex-1 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
        
        {/* Header Breadcrumbs */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Workspace</span>
            <ChevronRight className="w-3 h-3 opacity-30" />
            <FolderKanban className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold uppercase tracking-widest text-[10px]">{task.workspace_projects?.name}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-2.5 py-1 text-[10px] font-black text-primary bg-primary/5 border border-primary/20 rounded-md tracking-[0.2em] uppercase">
               TASK-{task.id.slice(0, 6).toUpperCase()}
             </div>
          </div>
        </div>

        <div className="px-10 py-2 max-w-4xl space-y-6">
          
          {/* Top Indicators */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              Operational_Task
            </div>
            <div className="px-2 py-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
              Protocol_{task.id.split('-')[0].toUpperCase()}
            </div>
          </div>

          {/* Title */}
          <div>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && handleFieldUpdate("title", title)}
              className="border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl bg-white dark:bg-zinc-900 h-auto py-3"
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-[160px_1fr] gap-y-1 pt-4">
            
            {/* Status */}
            <div className="flex items-center text-zinc-500 text-sm py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer px-2 -ml-2 rounded">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Status
            </div>
            <div className="flex items-center py-1.5">
              <div className="flex items-center relative group">
                <select 
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={cn(
                    "flex items-center px-3 py-1 text-[10px] font-black rounded-lg cursor-pointer uppercase transition-all shadow-sm border-0 focus:ring-1 focus:ring-primary/20 appearance-none pr-8",
                    status === 'COMPLETE' ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-500/20' : 
                    status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  <option value="TODO">TODO_INGESTION</option>
                  <option value="IN_PROGRESS">ACTIVE_PROCESSING</option>
                  <option value="REVIEW">REVIEW_REQUIRED</option>
                  <option value="COMPLETE">ARCHIVE_SUCCESS</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-40" />
              </div>
            </div>

            {/* Assignees */}
            <div className="flex items-center text-zinc-500 text-[10px] font-black uppercase tracking-[0.1em] py-1.5 px-2 -ml-2 rounded">
              <Users className="w-3.5 h-3.5 mr-2 text-primary" /> Lead_Operatives
            </div>
            <div className="flex items-center py-1.5">
              <UserSelector 
                value={assignees} 
                onChange={(val) => setAssignees(val)} 
                customTrigger={
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all min-w-[200px] bg-white dark:bg-zinc-900 shadow-sm">
                    {assignees.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 3).map((id, idx) => (
                            <div key={idx} className="h-7 w-7 rounded-lg ring-2 ring-white dark:ring-zinc-950 bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                              {id.slice(0, 2)}
                            </div>
                          ))}
                          {assignees.length > 3 && (
                            <div className="h-7 w-7 rounded-lg ring-2 ring-white dark:ring-zinc-950 bg-zinc-100 flex items-center justify-center text-[10px] font-black text-zinc-500">
                              +{assignees.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          {assignees.length} NODE(S)_ACTIVE
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <div className="h-7 w-7 rounded-lg border border-dashed border-zinc-300 flex items-center justify-center">
                          <User className="w-3 h-3 opacity-30" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Protocol_Standby</span>
                      </div>
                    )}
                  </div>
                }
              />
            </div>

            {/* Dates */}
            <div className="flex items-center text-zinc-500 text-sm py-1.5 px-2 -ml-2 rounded">
              <Calendar className="w-4 h-4 mr-2" /> Due Date
            </div>
            <div className="flex items-center py-1.5 text-sm">
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleFieldUpdate("due_date", e.target.value);
                }}
                className="px-2 py-0.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer text-zinc-500 bg-transparent border-none focus:outline-none"
              />
            </div>

            {/* Priority */}
            <div className="flex items-center text-zinc-500 text-sm py-1.5 px-2 -ml-2 rounded">
              <Flag className="w-4 h-4 mr-2" /> Priority
            </div>
            <div className="flex items-center py-1.5 text-sm relative">
              <div 
                className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer text-zinc-700 dark:text-zinc-300 uppercase text-xs font-semibold"
                onClick={() => setShowPrioritySelect(!showPrioritySelect)}
              >
                {priority} <ChevronDown className="w-3 h-3 opacity-50" />
              </div>
              {showPrioritySelect && (
                <div className="absolute top-full left-0 z-50 w-32 bg-white dark:bg-zinc-900 border rounded-md shadow-lg p-1">
                  {["LOW", "MEDIUM", "HIGH"].map(p => (
                    <div 
                      key={p} 
                      className="px-2 py-1.5 text-xs rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer uppercase"
                      onClick={() => { 
                        setPriority(p); 
                        handleFieldUpdate("priority", p);
                        setShowPrioritySelect(false); 
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div 
            className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 mt-2"
            onClick={() => setHideEmpty(!hideEmpty)}
          >
            {hideEmpty ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {hideEmpty ? "Show empty properties" : "Hide empty properties"}
          </div>

          {/* Description area */}
          <div className="pt-6">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block pl-1">Protocol Description (Mandatory)</label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description.trim() && handleFieldUpdate("description", description)}
              placeholder="Detailed operational steps required..."
              className="border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 py-3 text-zinc-700 dark:text-zinc-300 focus-visible:ring-1 focus-visible:ring-primary/20 min-h-[150px] resize-none bg-white dark:bg-zinc-900 rounded-xl font-medium"
              required
            />
          </div>

          <div className="pt-6 space-y-8 pb-12">
            <TaskChecklist taskId={task.id} />
            <TaskSubtasks parentTaskId={task.id} projectId={task.project_id} />
            
            <div className="pt-10 flex justify-end">
              <Button 
                onClick={async () => {
                  if (!description.trim()) {
                    toast.error("Description is mandatory");
                    return;
                  }
                  try {
                    await updateTaskFull(task.id, {
                      title,
                      description,
                      priority,
                      due_date: dueDate
                    });
                    await updateTaskAssignees(task.id, assignees);
                    toast.success("Task updated successfully");
                    // Redirect to project list
                    router.push(`/workspace/${task.workspace_projects.workspace_id}/project/${task.project_id}`);
                  } catch (e) {
                    toast.error("Failed to update task");
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Update_Protocol
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Right Activity Sidebar */}
      <div className="w-[400px] flex-shrink-0 hidden lg:block bg-zinc-50/30 dark:bg-zinc-950/30">
        <ActivityPanel taskId={task.id} />
      </div>

    </div>
  );
}
