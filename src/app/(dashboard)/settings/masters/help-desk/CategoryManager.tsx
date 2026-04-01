"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCategory, deleteCategory } from "./actions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Settings2, 
  ShieldCheck, 
  Database,
  RotateCcw,
  Zap,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function CategoryManager({ moduleId, initialCategories = [] }: { moduleId: string, initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState("submit");

  const triggerSuccess = (type: string) => {
    setActivityType(type);
    toast.success(type === "delete" ? "Record Purged" : "Record Saved Successfully");
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await addCategory(moduleId, name, description);
      setName("");
      setDescription("");
      setIsAdding(false);
      triggerSuccess("submit");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteCategory(id);
      triggerSuccess("delete");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-8 font-sans antialiased">
        <div className="flex justify-between items-center border-b border-border/40 pb-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1 opacity-60">
              <Database className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Category Inventory</p>
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground m-0">Ticket Categories</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Manage support ticket categories for efficient routing</p>
          </div>
          <Button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingId(null);
              setName("");
              setDescription("");
            }} 
            className={cn(
              "h-10 px-6 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-[0.95] text-[10px]",
              isAdding 
                ? "bg-muted border border-border/40 text-muted-foreground" 
                : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            )}
          >
            {isAdding ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Category
              </>
            )}
          </Button>
        </div>
        
        {isAdding && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-8 animate-in zoom-in-95 fade-in duration-300">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Category Name</Label>
                  <Input 
                    placeholder="e.g. Infrastructure" 
                    value={name} onChange={e => setName(e.target.value)} 
                    className="h-10 px-4 rounded-xl bg-background border-primary/20 focus:border-primary/50 focus:ring-primary/20 font-bold text-sm tracking-tight" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Description</Label>
                  <Input 
                    placeholder="Short description..." 
                    value={description} onChange={e => setDescription(e.target.value)} 
                    className="h-10 px-4 rounded-xl bg-background border-primary/20 focus:border-primary/50 focus:ring-primary/20 font-medium text-xs transition-all" 
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={loading || !name} 
                className="h-12 w-full rounded-xl bg-primary text-white font-bold uppercase tracking-wider shadow-lg shadow-primary/20 transition-all active:scale-[0.95]"
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {loading ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 && !isAdding ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-12 rounded-3xl border border-dashed border-border/40 bg-muted/5">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 opacity-40">
              <Settings2 className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground m-0">No Categories Found</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              The category inventory is currently empty. Add your first ticket category to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(c => (
              <div key={c.id} className="rounded-3xl border border-border/40 bg-card/60 shadow-sm p-6 group hover:border-primary/30 transition-all duration-500 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 group-hover:border-primary/30 transition-all group-hover:rotate-12">
                    <ShieldCheck className="h-7 w-7 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <p className="text-sm font-bold tracking-tight text-foreground">{c.name}</p>
                      <Badge variant="outline" className="text-[9px] h-4.5 px-2 rounded-lg border-primary/20 bg-primary/5 text-primary font-bold uppercase tracking-wider">Active</Badge>
                    </div>
                    {c.description && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-primary/60" />
                        <p className="text-[10px] font-medium text-muted-foreground opacity-60 truncate max-w-[200px]">{c.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleDelete(c.id)} 
                  className="h-10 w-10 rounded-xl border-border/40 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all active:scale-[0.9] group/del"
                >
                  <Trash2 className="h-4 w-4 group-hover/del:scale-110" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
