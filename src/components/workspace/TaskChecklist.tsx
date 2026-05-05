"use client";

import { useState, useEffect } from "react";
import { getChecklists, addChecklistItem, toggleChecklistItem, removeChecklistItem } from "@/app/(dashboard)/workspace/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

export function TaskChecklist({ taskId, disabled }: { taskId: string, disabled?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklists();
  }, [taskId]);

  const loadChecklists = async () => {
    setLoading(true);
    try {
      const data = await getChecklists(taskId);
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !newItem.trim()) return;
    
    try {
      const tempId = `temp-${Date.now()}`;
      setItems([...items, { id: tempId, content: newItem, is_completed: false }]);
      setNewItem("");
      
      await addChecklistItem(taskId, newItem);
      await loadChecklists();
    } catch (error: any) {
      toast.error("Failed to add item: " + error.message);
      loadChecklists();
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (disabled) return;
    try {
      setItems(items.map(item => item.id === id ? { ...item, is_completed: !currentStatus } : item));
      await toggleChecklistItem(id, !currentStatus);
    } catch (error: any) {
      toast.error("Failed to toggle item");
      loadChecklists();
    }
  };

  const handleRemove = async (id: string) => {
    if (disabled) return;
    try {
      setItems(items.filter(item => item.id !== id));
      await removeChecklistItem(id);
    } catch (error: any) {
      toast.error("Failed to remove item");
      loadChecklists();
    }
  };

  if (loading && items.length === 0) return <div className="text-sm text-zinc-500">Loading checklists...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-zinc-500" />
        Checklist
      </h3>
      
      <div className="space-y-2 pl-6">
        {items.map(item => (
          <div key={item.id} className={`flex items-center gap-2 group ${disabled ? 'pointer-events-none' : ''}`}>
            <button 
              onClick={() => handleToggle(item.id, item.is_completed)}
              disabled={disabled}
              className="text-zinc-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
            >
              {item.is_completed ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
            </button>
            <span className={`text-sm flex-1 ${item.is_completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {item.content}
            </span>
            {!disabled && (
              <button 
                onClick={() => handleRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 group">
            <Button 
              type="submit"
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-md hover:bg-emerald-50 hover:text-emerald-600 opacity-0 group-focus-within:opacity-100 transition-opacity"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Input 
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a step to ensure quality..."
              className="h-8 text-sm bg-transparent border-none focus-visible:ring-0 shadow-none px-0 placeholder:text-zinc-400 font-medium"
            />
          </form>
        )}
      </div>
    </div>
  );
}
