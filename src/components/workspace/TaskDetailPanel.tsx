"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActivityPanel } from "./ActivityPanel";
import { UserSelector } from "./UserSelector";
import { TeamSelector } from "./TeamSelector";
import { updateTaskStatus, updateTaskField, updateTaskFull, updateTaskAssignees, atomicUpdateTask } from "@/app/(dashboard)/workspace/actions";
import { toast } from "sonner";
import { 
  CheckCircle2, Users, Calendar, Flag,
  ChevronDown, ChevronRight, ChevronUp, FolderKanban,
  Minimize2, Maximize2, MoreHorizontal,
  Plus, MessageSquare, Trash2, User, UserPlus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TaskChecklist } from "./TaskChecklist";
import { TaskSubtasks } from "./TaskSubtasks";
import { TaskAttachments } from "./TaskAttachments";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function TaskDetailPanel({ task, user, permissions }: { task: any, user: any, permissions: any[] }) {
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
  
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Dynamic Freezing Logic:
  // If user is not the creator, not an assignee, and doesn't have workspace update permission, freeze the UI.
  const isAssignee = assignees.includes(user?.id);
  const isCreator = task.created_by === user?.id;
  const canEdit = isAssignee || isCreator || hasPermission(permissions, RESOURCES.WORKSPACE, "update") || hasPermission(permissions, "*", "manage");

  const isFrozen = !canEdit;

  const handleStatusChange = async (newStatus: string) => {
    if (isFrozen) return;
    if (newStatus === 'COMPLETE') {
      setPendingStatus(newStatus);
      setShowResolutionModal(true);
      return;
    }

    try {
      setStatus(newStatus);
      await updateTaskStatus(task.id, newStatus);
      toast.success("Status updated");
    } catch (error: any) {
      toast.error("Error updating status: " + error.message);
      setStatus(task.status);
    }
  };

  const submitResolution = async () => {
    if (!resolutionNote.trim()) {
      toast.error("Resolution note is required to close this protocol");
      return;
    }
    setLoading(true);
    try {
      const s = pendingStatus || 'COMPLETE';
      setStatus(s);
      await updateTaskStatus(task.id, s, resolutionNote);
      setShowResolutionModal(false);
      toast.success("Task resolved and logged");
    } catch (error: any) {
      toast.error("Failed to resolve task");
    } finally {
      setLoading(false);
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
            {(() => {
              const wp = task.workspace_projects;
              const workspaceObj = Array.isArray(wp) ? wp[0]?.workspace : wp?.workspace;
              const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;
              return (
                <Link 
                  href={`/workspace/${workspaceId}`}
                  className="font-bold uppercase tracking-widest text-[10px] hover:text-primary transition-colors"
                >
                  {workspaceObj?.name || 'Workspace'}
                </Link>
              );
            })()}
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
              readOnly={isFrozen}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && handleFieldUpdate("title", title)}
              className={cn(
                "border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl bg-white dark:bg-zinc-900 h-auto py-3",
                isFrozen && "opacity-80 cursor-not-allowed"
              )}
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-[160px_1fr] gap-y-1 pt-4">
            
            {/* Status */}
            <div className="flex items-center text-zinc-500 text-sm py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer px-2 -ml-2 rounded">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Current Status
            </div>
            <div className="flex items-center py-1.5">
              <div className="flex items-center relative group">
                <select 
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isFrozen}
                  className={cn(
                    "flex items-center px-4 py-1.5 text-[11px] font-bold rounded-xl cursor-pointer uppercase transition-all shadow-sm border focus:ring-2 focus:ring-primary/20 appearance-none pr-10",
                    status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    'bg-zinc-50 text-zinc-700 border-zinc-200',
                    isFrozen && "opacity-60 cursor-not-allowed pointer-events-none"
                  )}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Under Review</option>
                  <option value="COMPLETE">Completed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 pointer-events-none opacity-40" />
              </div>
            </div>

            {/* Assignees */}
            <div className="flex items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider py-1.5 px-2 -ml-2 rounded">
              <Users className="w-3.5 h-3.5 mr-2 text-primary" /> Assignees
            </div>
            <div className="flex items-center py-1.5 gap-3">
              <UserSelector 
                value={assignees} 
                onChange={(val) => !isFrozen && setAssignees(val)} 
                customTrigger={
                  <div className={cn(
                    "flex items-center gap-3 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all min-w-[180px] bg-white dark:bg-zinc-900 shadow-sm",
                    isFrozen ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  )}>
                    {assignees.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {task.task_assignees?.slice(0, 3).map((ta: any, idx: number) => (
                            <div 
                              key={idx} 
                              title={ta.profiles?.full_name}
                              className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary uppercase"
                            >
                              {ta.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || "U"}
                            </div>
                          ))}
                          {assignees.length > 3 && (
                            <div className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-100 flex items-center justify-center text-[9px] font-bold text-zinc-500">
                              +{assignees.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          {assignees.length} Assigned
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <div className="h-7 w-7 rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                          <UserPlus className="w-3 h-3 opacity-30" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest italic">Assign User</span>
                      </div>
                    )}
                  </div>
                }
              />
              <TeamSelector 
                onTeamSelected={(memberIds) => {
                  const newSet = new Set([...assignees, ...memberIds]);
                  setAssignees(Array.from(newSet));
                }}
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
                disabled={isFrozen}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleFieldUpdate("due_date", e.target.value || null);
                }}
                className={cn(
                  "px-2 py-0.5 rounded text-zinc-500 bg-transparent border-none focus:outline-none",
                  isFrozen ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
                )}
              />
            </div>

            {/* Priority */}
            <div className="flex items-center text-zinc-500 text-sm py-1.5 px-2 -ml-2 rounded">
              <Flag className="w-4 h-4 mr-2" /> Priority
            </div>
            <div className="flex items-center py-1.5 text-sm relative">
              <div 
                className={cn(
                  "flex items-center gap-2 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 uppercase text-xs font-semibold",
                  isFrozen ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
                )}
                onClick={() => !isFrozen && setShowPrioritySelect(!showPrioritySelect)}
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
              readOnly={isFrozen}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description.trim() && handleFieldUpdate("description", description)}
              placeholder="Detailed operational steps required..."
              className={cn(
                "border border-zinc-200 dark:border-zinc-800 shadow-sm px-4 py-3 text-zinc-700 dark:text-zinc-300 focus-visible:ring-1 focus-visible:ring-primary/20 min-h-[150px] resize-none bg-white dark:bg-zinc-900 rounded-xl font-medium",
                isFrozen && "opacity-80 cursor-not-allowed"
              )}
              required
            />
          </div>

          <div className="pt-6 space-y-8 pb-12">
            <TaskChecklist taskId={task.id} disabled={isFrozen} />
            <TaskSubtasks parentTaskId={task.id} projectId={task.project_id} disabled={isFrozen} />
            <TaskAttachments taskId={task.id} disabled={isFrozen} />
            
            {!isFrozen && (
              <div className="pt-10 flex justify-end">
                <Button 
                  disabled={isFrozen || loading}
                  onClick={async () => {
                    if (!description.trim()) {
                      toast.error("Description is mandatory");
                      return;
                    }
                    setLoading(true);
                    try {
                      const wp = task.workspace_projects;
                      const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;

                      await atomicUpdateTask(task.id, {
                        title,
                        description,
                        priority,
                        due_date: dueDate || null
                      }, assignees);
                      
                      toast.success("Task updated successfully");
                      // Redirect to project list
                      if (workspaceId) {
                        router.push(`/workspace/${workspaceId}/project/${task.project_id}`);
                      }
                    } catch (e: any) {
                      toast.error("Failed to update: " + (e.message || "Unknown error"));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-8 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Synchronizing..." : "Update Task"}
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Right Activity Sidebar */}
      <div className="w-[400px] flex-shrink-0 hidden lg:block bg-zinc-50/30 dark:bg-zinc-950/30">
        <ActivityPanel taskId={task.id} />
      </div>

      <Dialog open={showResolutionModal} onOpenChange={setShowResolutionModal}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl bg-white dark:bg-zinc-950 p-0 overflow-hidden rounded-3xl">
          <div className="h-2 bg-emerald-500 w-full" />
          <div className="p-8 space-y-6">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Resolution Protocol</DialogTitle>
              <p className="text-zinc-500 text-sm">Please provide a final resolution note to close this operational task. This will be logged in the permanent activity audit.</p>
            </DialogHeader>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] block pl-1">Final Resolution Note</label>
              <Textarea 
                placeholder="Describe how the task was completed, any outcomes, or final configurations..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="min-h-[120px] bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 rounded-2xl p-4 text-sm font-medium"
              />
            </div>

            <DialogFooter className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <Button 
                variant="ghost" 
                onClick={() => setShowResolutionModal(false)}
                className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitResolution}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] px-8 rounded-xl h-10 shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Logging..." : "Resolve_Task"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
