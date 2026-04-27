"use client";

import { useState, useEffect } from "react";
import { getMilestones, createMilestone, updateMilestoneStatus, getTasks, updateTaskField } from "@/app/(dashboard)/workspace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, Plus, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";

export function MilestoneBoard({ projectId }: { projectId: string }) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState("");

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ms = await getMilestones(projectId);
      const ts = await getTasks(projectId);
      setMilestones(ms || []);
      setTasks(ts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneName.trim()) return;
    try {
      await createMilestone(projectId, { name: newMilestoneName });
      setNewMilestoneName("");
      setOpen(false);
      await loadData();
      toast.success("Milestone created");
    } catch (error: any) {
      toast.error("Error creating milestone");
    }
  };

  // Group tasks by milestone
  const tasksByMilestone = (milestoneId: string) => tasks.filter(t => t.milestone_id === milestoneId);
  
  // Calculate completion
  const getCompletionStats = (milestoneId: string) => {
    const msTasks = tasksByMilestone(milestoneId);
    if (msTasks.length === 0) return { total: 0, completed: 0, percentage: 0 };
    const completed = msTasks.filter(t => t.status === 'COMPLETE').length;
    return {
      total: msTasks.length,
      completed,
      percentage: Math.round((completed / msTasks.length) * 100)
    };
  };

  // Assign task to milestone UI
  const handleAssignTask = async (taskId: string, milestoneId: string) => {
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, milestone_id: milestoneId } : t));
      await updateTaskField(taskId, "milestone_id", milestoneId);
      toast.success("Task added to milestone");
    } catch (e) {
      toast.error("Failed to assign task");
      loadData();
    }
  };

  if (loading && milestones.length === 0) return <div className="text-zinc-500 py-8 text-center">Loading Milestones...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Flag className="w-5 h-5 text-indigo-500" /> Milestones
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" /> New Milestone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogTitle>Create Milestone</DialogTitle>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <Input 
                value={newMilestoneName}
                onChange={e => setNewMilestoneName(e.target.value)}
                placeholder="Milestone Name (e.g. Beta Release)"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {milestones.map(ms => {
          const stats = getCompletionStats(ms.id);
          const isComplete = stats.total > 0 && stats.total === stats.completed;

          return (
            <div key={ms.id} className={`p-6 rounded-xl border ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Flag className="w-6 h-6 text-zinc-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-zinc-900 text-lg">{ms.name}</h3>
                    <div className="text-sm text-zinc-500 flex items-center gap-2">
                      <span>{stats.completed} / {stats.total} Tasks Completed</span>
                      <span>•</span>
                      <span>{stats.percentage}%</span>
                    </div>
                  </div>
                </div>
                {/* Progress bar visually */}
                <div className="w-48 h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all`} 
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 mt-4 pl-9">
                {tasksByMilestone(ms.id).map(task => (
                  <div key={task.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-100 last:border-0">
                    <span className={task.status === 'COMPLETE' ? 'line-through text-zinc-400' : 'text-zinc-700'}>
                      {task.title}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
                {tasksByMilestone(ms.id).length === 0 && (
                  <div className="text-sm text-zinc-400 py-2">No tasks in this milestone.</div>
                )}
              </div>
            </div>
          );
        })}
        {milestones.length === 0 && (
          <div className="text-center py-12 border border-dashed rounded-xl border-zinc-300">
            <Flag className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <h3 className="font-medium text-zinc-900">No Milestones</h3>
            <p className="text-sm text-zinc-500 mt-1">Group tasks by milestones to track major progress points.</p>
          </div>
        )}
      </div>
    </div>
  );
}
