"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Edit2, Trash2, Hash, Activity, ShieldCheck, Search, Filter, ArrowUpDown, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Department = {
  id: string;
  name: string;
  code: string | null;
  status?: "active" | "inactive";
  created_at: string;
};

export default function DepartmentManager({ initialDepartments }: { initialDepartments: Department[] }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusSelection, setStatusSelection] = useState<"active" | "inactive">("active");
  const [sortField, setSortField] = useState<keyof Department>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activityType, setActivityType] = useState("save");

  const triggerSuccess = (type: string) => {
    setActivityType(type);
    toast.success(type === "delete" ? "Department Removed" : "Department Saved Successfully");
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const getDepartmentStatus = (d: Department) => d.status ?? "active";

  const total = departments.length;
  const activeCount = departments.filter((d) => getDepartmentStatus(d) === "active").length;
  const inactiveCount = total - activeCount;

  const filteredDepartments = departments
    .filter((d) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        d.name.toLowerCase().includes(term) ||
        (d.code ?? "").toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const left = String(a[sortField] ?? "").toLowerCase();
      const right = String(b[sortField] ?? "").toLowerCase();
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: keyof Department) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleOpenNew = () => {
    setEditingDept(null);
    setStatusSelection("active");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setStatusSelection(dept.status ?? "active");
    setIsDialogOpen(true);
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("departments")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      triggerSuccess("save");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const status = formData.get("status") as "active" | "inactive";

    try {
      if (editingDept) {
        const { error } = await supabase
          .from("departments")
          .update({ name, code, status })
          .eq("id", editingDept.id);
        if (error) throw error;
        triggerSuccess("update");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name, code, status });
        if (error) throw error;
        triggerSuccess("submit");
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
      setDepartments(prev => prev.filter(d => d.id !== id));
      triggerSuccess("delete");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 font-sans antialiased">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 opacity-60">
              <Building2 className="h-3.5 w-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Departments</p>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground">{total}</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-emerald-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-emerald-600/60 font-bold uppercase tracking-widest text-[10px]">
              <Activity className="h-3.5 w-3.5" />
              Active Departments
            </div>
            <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-destructive/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-destructive/60 font-bold uppercase tracking-widest text-[10px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Inactive Departments
            </div>
            <p className="text-3xl font-bold tabular-nums text-destructive">{inactiveCount}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
          <div className="relative w-full md:max-w-md">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search departments..."
              className="pl-10 h-10 rounded-xl bg-card border-border/40 text-xs font-semibold focus-visible:ring-primary/20"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground opacity-40" />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button size="sm" variant="outline" onClick={() => setSearchTerm("")} className="h-10 px-4 rounded-xl border border-border/40 font-bold uppercase tracking-wider text-[10px] hover:bg-muted/50">
              <Filter className="h-3 w-3 mr-2" /> Clear Filters
            </Button>
            <Button onClick={handleOpenNew} className="h-10 px-6 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white text-[10px]">
              <Plus className="h-4 w-4 mr-2" /> Add Department
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-2xl">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
            <TableHeader className="bg-muted/50 backdrop-blur sticky top-0 z-10 border-b border-border/60">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead onClick={() => toggleSort("name")} className="cursor-pointer group">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 py-4 px-2">
                    Department Name <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead onClick={() => toggleSort("code")} className="cursor-pointer group">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 py-4 px-2">
                    Department Code <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-40">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Building2 className="h-10 w-10 mb-3" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No departments found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepartments.map((dept) => (
                  <TableRow key={dept.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner uppercase">
                          {dept.name.charAt(0)}
                        </div>
                        <div className="text-sm font-bold tracking-tight text-foreground">{dept.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-tighter text-muted-foreground bg-muted/40 w-fit px-2 py-0.5 rounded-md border border-border/40">
                        <Hash className="h-3 w-3 opacity-40" /> {dept.code || "---"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                          getDepartmentStatus(dept) === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}
                      >
                        {getDepartmentStatus(dept) === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(dept.id, getDepartmentStatus(dept))}
                          disabled={isSubmitting}
                          className={cn(
                            "h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                            getDepartmentStatus(dept) === "active" ? "text-destructive hover:bg-destructive/5" : "text-emerald-600 hover:bg-emerald-500/5"
                          )}
                        >
                          {getDepartmentStatus(dept) === "active" ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(dept)}
                          className="h-8 w-8 rounded-lg hover:bg-primary/5 text-primary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dept.id)}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/5 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl border border-border/40 bg-card p-0 overflow-hidden shadow-2xl">
            <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/5 w-full" />
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                Department Configuration
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department Name</Label>
                <Input name="name" defaultValue={editingDept?.name} required placeholder="e.g. Operations" className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department Code</Label>
                <Input name="code" defaultValue={editingDept?.code || ""} placeholder="e.g. OPS" className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Status</Label>
                <Select
                  value={statusSelection}
                  onValueChange={(value) => setStatusSelection(value as "active" | "inactive")}
                  name="status"
                >
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl font-bold uppercase text-[10px]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="h-11 px-8 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-[10px]">
                  {isSubmitting ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Department</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
