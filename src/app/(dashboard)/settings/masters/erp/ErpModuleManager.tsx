"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addErpModule, deleteErpModule, addErpSubModule, deleteErpSubModule } from "./erpActions";
import { 
  Plus, 
  Trash2, 
  Boxes, 
  Network, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  RotateCcw, 
  Database, 
  Layers,
  ChevronRight,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubModule {
  id: string;
  name: string;
}

interface ErpModule {
  id: string;
  name: string;
  sub_modules: SubModule[];
}

type SuccessActivity = "save" | "update" | "delete" | "submit";

export default function ErpModuleManager({ initialModules = [] }: { initialModules: ErpModule[] }) {
  const router = useRouter();
  const [modules, setModules] = useState<ErpModule[]>(initialModules);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState<SuccessActivity>("save");

  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  const triggerSuccess = (message: string, activity: SuccessActivity = "save") => {
    setActivityType(activity);
    toast.success(message);
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const totalSubModules = useMemo(
    () => modules.reduce((sum, m) => sum + (m.sub_modules?.length || 0), 0),
    [modules],
  );

  const handleCreateModule = async () => {
    if (!moduleName.trim()) {
      toast.error("Please enter a module name.");
      return;
    }

    const normalized = moduleName.trim().toLowerCase();
    if (modules.some((m) => m.name.toLowerCase() === normalized)) {
      toast.error("Resource Detail Reference Already Available");
      return;
    }

    setLoading(true);
    try {
      const newModule = await addErpModule(moduleName.trim());
      if (newModule?.id) {
        setModules((prev) => [...prev, newModule]);
        setModuleName("");
        setIsAddingModule(false);
        triggerSuccess(`ERP Module ${moduleName} provisioned successfully`, "save");
        router.refresh();
      } else {
        toast.error("Unable to create ERP Module.");
      }
    } catch (e) {
      toast.error("Error adding module: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (confirm("Are you sure? This will delete all associated sub-modules as well.")) {
      try {
        await deleteErpModule(id);
        const mod = modules.find(m => m.id === id);
        setModules((prev) => prev.filter((m) => m.id !== id));
        triggerSuccess(`ERP Module ${mod?.name} purged from registry`, "delete");
        router.refresh();
      } catch (e) {
        toast.error("Error deleting module: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  const handleCreateSubModule = async (moduleId: string) => {
    if (!subName.trim()) {
      toast.error("Please enter a sub-module name.");
      return;
    }

    const selectedModule = modules.find((m) => m.id === moduleId);
    if (!selectedModule) {
      toast.error("Parent resource not found.");
      return;
    }

    const normalized = subName.trim().toLowerCase();
    if (selectedModule.sub_modules?.some((s) => s.name.toLowerCase() === normalized)) {
      toast.error("Resource Detail Reference Already Available");
      return;
    }

    setLoading(true);
    try {
      const added = await addErpSubModule(moduleId, subName.trim());
      if (added?.id) {
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? { ...m, sub_modules: [...(m.sub_modules || []), added] }
              : m
          )
        );
        setSubName("");
        setAddingSubFor(null);
        triggerSuccess(`Sub-Module ${subName} attached to ${selectedModule.name}`, "save");
        router.refresh();
      } else {
        toast.error("Unable to create sub-module.");
      }
    } catch (e) {
      toast.error("Error adding sub-module: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubModule = async (id: string) => {
    if (confirm("Delete this sub-module?")) {
      try {
        await deleteErpSubModule(id);
        setModules((prev) =>
          prev.map((m) => ({
            ...m,
            sub_modules: m.sub_modules?.filter((s) => s.id !== id) || [],
          }))
        );
        triggerSuccess("Sub-Module purged from registry", "delete");
        router.refresh();
      } catch (e) {
        toast.error("Error deleting sub-module: " + (e instanceof Error ? e.message : String(e)));
      }
    }
  };

  return (
    <div className="space-y-10 font-sans antialiased">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Modules</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{modules.length}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Sub-Modules</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{totalSubModules}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">System Health</p>
            <p className="text-3xl font-bold tracking-tight text-foreground text-emerald-500">A+</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1 opacity-60">
              <Database className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Module Inventory</p>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground m-0">ERP Modules</h2>
            <p className="text-xs text-muted-foreground">Manage core ERP modules and their functional sub-components</p>
          </div>
          <Button 
            onClick={() => setIsAddingModule(!isAddingModule)}
            className={cn(
              "h-10 px-6 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-[0.95] text-[10px]",
              isAddingModule 
                ? "bg-muted border border-border/40 text-muted-foreground" 
                : "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
            )}
          >
            {isAddingModule ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-2" />
                Add New Module
              </>
            )}
          </Button>
        </div>
        
        {isAddingModule && (
          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 mb-8 animate-in zoom-in-95 fade-in duration-300">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1">Module Name</Label>
                <Input 
                  placeholder="e.g. Finance & Accounts" 
                  value={moduleName} 
                  onChange={e => setModuleName(e.target.value)} 
                  className="h-12 px-5 rounded-xl bg-background border-primary/20 focus:border-primary/50 focus:ring-primary/20 font-bold text-sm tracking-tight" 
                />
              </div>
              <Button 
                onClick={handleCreateModule} 
                disabled={loading || !moduleName} 
                className="h-12 w-full rounded-xl bg-primary text-white font-bold uppercase tracking-wider shadow-lg shadow-primary/20 transition-all active:scale-[0.95]"
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {loading ? "Creating..." : "Create Module"}
              </Button>
            </div>
          </div>
        )}

        {modules.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-12 rounded-3xl border border-dashed border-border/40 bg-muted/5">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6 opacity-40">
              <Boxes className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground m-0">No Modules Configured</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              The module inventory is currently empty. Add your first ERP module to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((m) => (
              <div key={m.id} className="rounded-3xl border border-border/40 bg-card/60 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all duration-500">
                <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary transition-transform group-hover:scale-110">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-none mb-1.5">{m.name}</h4>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-primary/60" />
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {m.sub_modules?.length || 0} Sub-modules Defined
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setAddingSubFor(addingSubFor === m.id ? null : m.id)} 
                      className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        addingSubFor === m.id 
                          ? "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <Plus className={cn("h-4 w-4 transition-transform", addingSubFor === m.id && "rotate-45")} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteModule(m.id)} 
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 flex-1 bg-gradient-to-b from-transparent to-muted/5">
                  {addingSubFor === m.id && (
                    <div className="flex gap-2 mb-6 animate-in slide-in-from-top-2 duration-300">
                      <Input 
                        placeholder="Sub-module name..." 
                        value={subName} 
                        onChange={e => setSubName(e.target.value)} 
                        className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/50 focus:ring-primary/20 text-xs" 
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleCreateSubModule(m.id)} 
                        disabled={loading || !subName} 
                        className="h-10 px-6 rounded-xl bg-primary text-white font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20 active:scale-[0.95]"
                      >
                        {loading ? <RotateCcw className="h-3 w-3 animate-spin" /> : "Attach"}
                      </Button>
                    </div>
                  )}
                  
                  {(!m.sub_modules || m.sub_modules.length === 0) ? (
                    <div className="h-20 flex flex-col items-center justify-center text-center opacity-40">
                      <Network className="w-5 h-5 mb-2" />
                      <p className="text-[9px] font-bold uppercase tracking-widest">No Sub-modules Attached</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {m.sub_modules.map(sm => (
                        <div key={sm.id} className="flex justify-between items-center px-4 py-3 bg-background/40 hover:bg-background/80 rounded-2xl border border-border/40 group/item transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <ChevronRight className="w-3 h-3 text-primary opacity-40 group-hover/item:translate-x-1 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 group-hover/item:text-primary transition-colors">{sm.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteSubModule(sm.id)} 
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
