"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ServerCog, Plus, Trash2, Cpu, Code2, Database, ShieldAlert, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addSoftwareSystem, deleteSoftwareSystem } from "./softwareSystemActions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SoftwareSystem = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status?: string | null;
};

export default function SoftwareSystemManager({
  scope,
  title,
  initialSystems,
}: {
  scope: "erp" | "it";
  title: string;
  initialSystems: SoftwareSystem[];
}) {
  const router = useRouter();
  const [systems, setSystems] = useState(initialSystems);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState("save");

  const triggerSuccess = (type: string) => {
    setActivityType(type);
    toast.success(type === "delete" ? "System Purged" : "System Configuration Saved");
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await addSoftwareSystem(scope, name.trim(), code.trim(), description.trim());
      setSystems((prev) => [...prev, created]);
      setName("");
      setCode("");
      setDescription("");
      triggerSuccess("save");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteSoftwareSystem(id);
      setSystems((prev) => prev.filter((system) => system.id !== id));
      triggerSuccess("delete");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 rounded-2xl border border-border/40 bg-card/60 p-6 font-sans antialiased shadow-xl shadow-black/5 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">{title}</h3>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase opacity-60">Software System Inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-6 px-2 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold tabular-nums">
              {systems.length} Systems
            </Badge>
          </div>
        </div>

        <div className="bg-muted/30 p-5 rounded-xl space-y-4 border border-border/60">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">System Name</p>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Core Database"
                  className="h-10 rounded-xl bg-card border-border/40 text-xs font-semibold focus-visible:ring-primary/20 pl-9"
                />
                <Database className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Identifier Code</p>
              <div className="relative">
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. DB-01"
                  className="h-10 rounded-xl bg-card border-border/40 text-xs font-semibold focus-visible:ring-primary/20 pl-9"
                />
                <Code2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-40" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Description</p>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="System purpose and scope..."
              className="min-h-[80px] rounded-xl bg-card border-border/40 text-xs font-medium placeholder:opacity-30 focus-visible:ring-primary/20"
            />
          </div>

          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2">
            {saving ? "Saving..." : <><Plus className="h-4 w-4" /> Add Software System</>}
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          {systems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-8 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">No systems registered in this scope.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {systems.map((system) => (
                <div key={system.id} className="group flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-card/50 p-4 hover:border-primary/30 hover:bg-card transition-all hover:shadow-lg hover:shadow-black/5">
                  <div className="flex gap-4">
                    <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-muted/40 border border-border/40 group-hover:border-primary/20 transition-colors">
                      <ServerCog className="h-5 w-5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-tight text-foreground">{system.name}</span>
                        {system.code && <Badge variant="outline" className="text-[9px] h-4 border-muted-foreground/20 text-muted-foreground opacity-60 px-1 font-bold">{system.code}</Badge>}
                      </div>
                      {system.description && <p className="text-[10px] font-medium text-muted-foreground opacity-60 leading-tight">{system.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(system.id)} className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}