"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateUserStatus, updateUserProfile, deleteUser } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserCog, UserMinus, ShieldCheck, Mail, Hash, Building2, Briefcase, Activity, Search, Filter, ArrowUpDown, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  full_name: string;
  employee_id: string;
  email: string;
  company_id?: string;
  project_id?: string;
  company_ids?: string[];
  project_ids?: string[];
  company?: string;
  project?: string;
  department: string;
  department_id?: string;
  designation: string;
  designation_id?: string;
  role: string;
  roles?: string;
  status: string;
  created_at: string;
};

export default function UserManager({
  initialUsers,
  departments = [],
  designations = [],
  companies = [],
  projects = [],
  roles = [],
  canManageGlobal,
  canManageDept,
  currentUserDepartmentId,
}: {
  initialUsers: Profile[];
  departments?: { id: string; name: string }[];
  designations?: { id: string; name: string; department_id?: string }[];
  companies?: { id: string; name: string }[];
  projects?: { id: string; name: string; company_id?: string }[];
  roles?: { id: string; name: string; is_system_role: boolean }[];
  canManageGlobal: boolean;
  canManageDept: boolean;
  currentUserDepartmentId?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedDesignationId, setSelectedDesignationId] = useState<string>("");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activityType, setActivityType] = useState("save");
  const [loading, setLoading] = useState(false);

  const triggerSuccess = (type: string) => {
    setActivityType(type);
    
    const messageMap: Record<string, string> = {
      save: "User Created Successfully",
      update: "User Profile Updated",
      delete: "User Data Purged"
    };
    
    toast.success(messageMap[type] || "Operation Successful");
    
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  // Multi-select helpers
  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredProjects = projects?.filter((p) =>
    selectedCompanyIds.length === 0 || selectedCompanyIds.includes(p.company_id || "")
  ) ?? [];

  const mapRoleNameToEnum = (roleName: string) => {
    const roleMap: Record<string, string> = {
      "Super Admin": "super_admin",
      "Department Admin": "dept_admin",
      "Module Agent": "module_agent",
      "End User": "end_user",
    };
    return roleMap[roleName] || roleName.toLowerCase().replace(/\s+/g, "_");
  };

  const getRoleNameFromEnum = (roleId: string) => {
    const role = roles.find((r) => mapRoleNameToEnum(r.name) === roleId);
    if (role) return role.name;
    return roleId
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const [sortField, setSortField] = useState<keyof Profile | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setLoading(true);
    try {
      await updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      triggerSuccess("save");
    } catch (error) {
      console.error(error);
      toast.error("Telemetry Sync Failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    selectedCompanyIds.forEach((id) => formData.append("company_ids[]", id));
    selectedProjectIds.forEach((id) => formData.append("project_ids[]", id));
    try {
      await updateUserProfile(editingUser.id, formData);
      setEditingUser(null);
      triggerSuccess("update");
    } catch (error) {
       console.error(error);
       toast.error("Structural Integrity Failure.");
    } finally {
      setLoading(false);
    }
  };

  const canManageRecord = (user: Profile) => {
    if (canManageGlobal) return true;
    if (!canManageDept) return false;
    if (!currentUserDepartmentId || user.department_id !== currentUserDepartmentId) return false;
    if (user.role === "super_admin") return false; // Dept admins cannot manage super admins
    return true;
  };

  const sortedUsers = [...users]
    .filter((user) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        user.full_name.toLowerCase().includes(term) ||
        user.employee_id.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||        (user.roles || "").toLowerCase().includes(term) ||        user.department.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const left = String(a[sortField]).toLowerCase();
      const right = String(b[sortField]).toLowerCase();
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const allCount = users.length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const inactiveCount = users.filter((u) => u.status !== "active").length;

  const toggleSort = (field: keyof Profile) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (userId: string) => {
    setLoading(true);
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      triggerSuccess("delete");
    } catch (error) {
      console.error(error);
      toast.error("De-provisioning Failure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6 font-sans antialiased">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 opacity-60">
              <Users className="h-3.5 w-3.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Users</p>
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground">{allCount}</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-emerald-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-emerald-600/60 font-bold uppercase tracking-widest text-[10px]">
              <Activity className="h-3.5 w-3.5" />
              Active Users
            </div>
            <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-destructive/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-destructive/60 font-bold uppercase tracking-widest text-[10px]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Inactive Users
            </div>
            <p className="text-3xl font-bold tabular-nums text-destructive">{inactiveCount}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
          <div className="relative w-full md:max-w-md">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, ID, role, or department..."
              className="pl-10 h-10 rounded-xl bg-card border-border/40 text-xs font-semibold focus-visible:ring-primary/20"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground opacity-40" />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setSearchTerm("")} 
              className="h-10 px-4 rounded-xl border border-border/40 bg-background hover:bg-muted/50 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Filter className="h-3 w-3" /> Reset Filters
            </button>
            <Button asChild className="h-10 px-6 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white text-[11px] flex items-center gap-2">
              <Link href="/register"><Plus className="h-4 w-4" /> Add New User</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-2xl">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
            <TableHeader className="bg-muted/50 backdrop-blur sticky top-0 z-10 border-b border-border/60">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead onClick={() => toggleSort("full_name")} className="cursor-pointer group">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 py-4 px-2">
                    User <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead onClick={() => toggleSort("employee_id")} className="cursor-pointer group">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 py-4 px-2">
                    Employee ID <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Role</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Department & Unit</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-40">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Users className="h-10 w-10 mb-3" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No users found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-inner uppercase">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold tracking-tight text-foreground">{user.full_name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground opacity-60">
                            <Mail className="h-2.5 w-2.5" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[11px] font-black tracking-tighter text-muted-foreground bg-muted/40 w-fit px-2 py-0.5 rounded-md border border-border/40">
                        <Hash className="h-3 w-3 opacity-40" /> {user.employee_id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg bg-primary/5 border-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">
                        {getRoleNameFromEnum(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground">
                          <Building2 className="h-3 w-3 opacity-40" /> {user.department}
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-[10px] text-muted-foreground">
                          <Briefcase className="h-3 w-3 opacity-40 ml-0.5" /> {user.designation}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest",
                          user.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        )}
                      >
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(user.id, user.status)}
                          disabled={!canManageRecord(user) || loading}
                          className={cn(
                            "h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                            user.status === 'active' ? 'text-destructive hover:bg-destructive/5' : 'text-emerald-600 hover:bg-emerald-500/5'
                          )}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Restore'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canManageRecord(user) || loading}
                          className="h-8 w-8 rounded-lg hover:bg-primary/5 text-primary"
                          onClick={() => {
                            setEditingUser(user);
                            setSelectedCompanyIds(user.company_ids?.length ? user.company_ids : user.company_id ? [user.company_id] : []);
                            setSelectedProjectIds(user.project_ids?.length ? user.project_ids : user.project_id ? [user.project_id] : []);
                            setSelectedDeptId(user.department_id || "");
                            setSelectedDesignationId(user.designation_id || "");
                            setSelectedRole(user.role || "");
                          }}
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                        {canManageGlobal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            disabled={loading || user.id === initialUsers[0]?.id /* Avoid self delete if possible */}
                            className="h-8 w-8 rounded-lg hover:bg-destructive/5 text-destructive"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl rounded-3xl border border-border/40 bg-card p-0 overflow-hidden shadow-2xl">
            <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/5 w-full" />
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <UserCog className="h-5 w-5" />
                </div>
                User Configuration
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
               <input type="hidden" name="department_id" value={selectedDeptId} />
               <input type="hidden" name="designation_id" value={selectedDesignationId} />
               <input type="hidden" name="role" value={selectedRole} />
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity</Label>
                   <Input defaultValue={editingUser?.full_name} name="fullName" className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold focus-visible:ring-primary/20" />
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Privilege Vector</Label>
                   <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {roles.map(r => (
                        <SelectItem key={r.id} value={mapRoleNameToEnum(r.name)} className="text-xs font-bold uppercase italic">{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                   <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs font-bold">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Designation</Label>
                   <Select value={selectedDesignationId} onValueChange={setSelectedDesignationId}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {designations.filter(d => !d.department_id || d.department_id === selectedDeptId).map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs font-bold">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                 </div>
               </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} className="h-11 px-6 rounded-xl font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Cancel</Button>
                  <Button type="submit" disabled={loading} className="h-11 px-8 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-[10px]">
                    {loading ? "Saving Changes..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
