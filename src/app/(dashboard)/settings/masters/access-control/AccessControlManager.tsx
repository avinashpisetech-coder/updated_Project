"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Users, 
  Settings, 
  CheckCircle2, 
  Search, 
  UserCheck,
  Layout,
  Briefcase,
  ChevronRight,
  Cpu,
  Activity,
  Fingerprint,
  Lock,
  Zap,
  RotateCcw
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProfileType = {
  id: string;
  full_name: string;
  email: string;
  department_id?: string;
  designation?: string;
  role: string;
};

type RoleType = {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: PermissionType[];
};

type PermissionType = {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
};

type ModuleType = {
  id: string;
  name: string;
  slug: string;
};

type AccessType = {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  access_scope: "global" | "department" | "self";
};

type SuccessActivity = "save" | "update" | "delete" | "submit";

export default function AccessControlManager({
  initialProfiles,
  initialModules,
  initialAccess,
  initialRoles = [],
  initialPermissions = [],
  initialUserRoles = {},
  isSuperAdmin,
  isDeptAdmin,
  userDeptId,
}: {
  initialProfiles: ProfileType[];
  initialModules: ModuleType[];
  initialAccess: Record<string, Record<string, AccessType>>;
  initialRoles?: RoleType[];
  initialPermissions?: PermissionType[];
  initialUserRoles?: Record<string, string[]>;
  isSuperAdmin: boolean;
  isDeptAdmin: boolean;
  userDeptId?: string;
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>(initialProfiles[0]?.id || "");
  const [accessMap, setAccessMap] = useState(initialAccess);
  const [busy, setBusy] = useState(false);
  const [activityType, setActivityType] = useState<SuccessActivity>("save");

  const [moduleSearch, setModuleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>(initialUserRoles);
  const [roles, setRoles] = useState<RoleType[]>(initialRoles);
  const [permissions] = useState<PermissionType[]>(initialPermissions);
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    selectedPermissions: [] as string[],
  });

  const triggerSuccess = (message: string, activity: SuccessActivity = "save") => {
    setActivityType(activity);
    toast.success(message);
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const accessibleProfiles = useMemo(() => {
    let filtered = initialProfiles;
    if (!isSuperAdmin && isDeptAdmin) {
      filtered = filtered.filter(p => p.department_id === userDeptId);
    }
    if (userSearch) {
      const q = userSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.full_name.toLowerCase().includes(q) || 
        p.email.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [initialProfiles, isSuperAdmin, isDeptAdmin, userDeptId, userSearch]);

  const selectedProfile = useMemo(() => 
    initialProfiles.find(p => p.id === selectedUserId),
    [initialProfiles, selectedUserId]
  );

  const onToggle = (moduleId: string, action: keyof AccessType) => {
    setAccessMap((prev) => {
      const userMap = prev[selectedUserId] ?? {};
      const moduleAccess = userMap[moduleId] ?? {
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false,
        access_scope: "global",
      };
      return {
        ...prev,
        [selectedUserId]: {
          ...userMap,
          [moduleId]: {
            ...moduleAccess,
            [action]: !moduleAccess[action],
          },
        },
      };
    });
  };

  const saveAccess = async () => {
    setBusy(true);
    try {
      const moduleAccesses = accessMap[selectedUserId] || {};
      for (const moduleId of Object.keys(moduleAccesses)) {
        const response = await fetch("/settings/masters/access-control/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: selectedUserId,
            moduleId,
            access: moduleAccesses[moduleId],
          }),
        });

        if (!response.ok) throw new Error("Failed to save some access rules");
      }
      triggerSuccess(`Access permissions updated for ${selectedProfile?.full_name}`, "update");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save access controls");
    } finally {
      setBusy(false);
    }
  };

  const toggleUserRole = async (roleName: string) => {
    if (!selectedUserId) return;
    const current = userRolesMap[selectedUserId] || [];
    const next = current.includes(roleName)
      ? current.filter((r) => r !== roleName)
      : [...current, roleName];

    setBusy(true);
    try {
      const response = await fetch("/settings/masters/access-control/api/user_roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: selectedUserId, roleNames: next }),
      });

      if (!response.ok) throw new Error("Failed to update roles");

      setUserRolesMap(prev => ({ ...prev, [selectedUserId]: next }));
      triggerSuccess(`User roles updated for ${selectedProfile?.full_name}`, "update");
      router.refresh();
    } catch (err) {
      toast.error("Failed to update user roles");
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Delete this role? This might affect many users.")) return;
    try {
      const response = await fetch(`/settings/masters/access-control/api/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete role");
      setRoles(roles.filter(r => r.id !== roleId));
      triggerSuccess("Role deleted from system", "delete");
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete role");
    }
  };

  const saveRole = async () => {
    if (!roleForm.name.trim()) return;
    setBusy(true);
    try {
      const url = selectedRole 
        ? `/settings/masters/access-control/api/roles/${selectedRole.id}` 
        : "/settings/masters/access-control/api/roles";
      const method = selectedRole ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          permissionIds: roleForm.selectedPermissions,
        }),
      });

      if (!response.ok) throw new Error("Failed to save role");

      const savedRole = await response.json();
      if (selectedRole) {
        setRoles(roles.map(r => r.id === selectedRole.id ? savedRole : r));
      } else {
        setRoles([...roles, savedRole]);
      }
      setIsRoleDialogOpen(false);
      triggerSuccess(`Role ${selectedRole ? "updated" : "created"} successfully`, selectedRole ? "update" : "save");
      router.refresh();
    } catch (err) {
      toast.error("Failed to save role.");
    } finally {
      setBusy(false);
    }
  };

  const openRoleDialog = (role?: RoleType) => {
    setSelectedRole(role || null);
    setRoleForm({
      name: role?.name || "",
      description: role?.description || "",
      selectedPermissions: role?.permissions.map(p => p.id) || [],
    });
    setIsRoleDialogOpen(true);
  };

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, PermissionType[]>);
  }, [permissions]);

  const filteredModules = useMemo(() => {
    if (!moduleSearch) return initialModules;
    const q = moduleSearch.toLowerCase();
    return initialModules.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.slug.toLowerCase().includes(q)
    );
  }, [initialModules, moduleSearch]);

  return (
    <div className="space-y-10 pb-20 font-sans antialiased">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Users</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{initialProfiles.length}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Modules</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{initialModules.length}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/60 p-6 flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
          <div className="p-4 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">Defined Roles</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{roles.length}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="user-access" className="w-full">
        <TabsList className="h-14 bg-muted/20 border border-border/40 p-1.5 rounded-2xl mb-10 w-full max-w-md">
          <TabsTrigger 
            value="user-access" 
            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
          >
            <UserCheck className="w-3.5 h-3.5 mr-2" />
            User Permissions
          </TabsTrigger>
          <TabsTrigger 
            value="manage-roles" 
            className="flex-1 rounded-xl font-bold uppercase tracking-wider text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
          >
            <Settings className="w-3.5 h-3.5 mr-2" />
            Role Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-access" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Identity Node Registry */}
            <div className="xl:col-span-4 space-y-6">
              <div className="rounded-3xl border border-border/40 bg-card/60 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2 opacity-60">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Search Users</p>
                </div>
                <div className="relative group">
                  <Input 
                    placeholder="Search by name or email..." 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-12 pl-4 rounded-xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-medium text-xs transition-all placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest"
                  />
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {accessibleProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedUserId(p.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group text-left border border-transparent",
                        selectedUserId === p.id 
                          ? "bg-primary text-white shadow-xl shadow-primary/20 border-primary/20 scale-[1.02]" 
                          : "hover:bg-muted/30 hover:border-border/40 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all",
                          selectedUserId === p.id 
                            ? "bg-white/20" 
                            : "bg-primary/5 text-primary group-hover:bg-primary/10"
                        )}>
                          {p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold tracking-tight text-[11px] truncate leading-none mb-1">{p.full_name}</p>
                          <p className={cn(
                            "text-[9px] font-medium truncate tracking-wider opacity-60 uppercase",
                            selectedUserId === p.id ? "text-white/70" : "text-muted-foreground"
                          )}>{p.email}</p>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform duration-300",
                        selectedUserId === p.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Governance Configuration Panes */}
            <div className="xl:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              {selectedProfile ? (
                <>
                  {/* Identity Summary Node */}
                  <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-primary/10 rounded-2xl text-primary shadow-inner">
                        <UserCheck className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1 opacity-60">
                          <Fingerprint className="h-3 w-3 text-primary" />
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Profile Verified</p>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">{selectedProfile.full_name}</h2>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <Badge variant="outline" className="h-6 rounded-lg bg-background/50 border-primary/20 text-[9px] font-bold uppercase tracking-wider text-primary px-3">
                            {selectedProfile.role === "super_admin" ? "Super Admin" : selectedProfile.role === "dept_admin" ? "Dept Admin" : "User"}
                          </Badge>
                          {selectedProfile.designation && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20 px-3 py-1 rounded-lg border border-border/40">
                              <Briefcase className="w-3.5 h-3.5 opacity-60" />
                              {selectedProfile.designation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={saveAccess} 
                        disabled={busy}
                        className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-[0.95] disabled:opacity-50 text-[10px]"
                      >
                        <Zap className={cn("w-4 h-4 mr-2", busy && "animate-spin")} />
                        {busy ? "Saving..." : "Save Permissions"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Role Registry Matrix */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 opacity-60 px-1">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider">Assign Roles</h3>
                      </div>
                      <div className="rounded-3xl border border-border/40 bg-card/60 p-6 space-y-3 overflow-hidden">
                        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                          {roles.map((r) => {
                            const isSelected = (userRolesMap[selectedProfile.id] || []).includes(r.name);
                            return (
                              <button
                                key={r.id}
                                onClick={() => toggleUserRole(r.name)}
                                className={cn(
                                  "w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 border group",
                                  isSelected 
                                    ? "bg-primary/5 border-primary shadow-sm" 
                                    : "bg-muted/10 border-transparent hover:border-border/60 hover:bg-muted/30"
                                )}
                              >
                                <div className="text-left space-y-1">
                                  <p className="text-[11px] font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">{r.name}</p>
                                  <p className="text-[9px] font-medium text-muted-foreground uppercase opacity-60 line-clamp-1">{r.description}</p>
                                </div>
                                <div className={cn(
                                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                  isSelected ? "border-primary bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "border-border/60 group-hover:border-primary/40"
                                )}>
                                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Resource Access Control Matrix */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between opacity-60 px-1">
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-primary" />
                          <h3 className="text-[10px] font-bold uppercase tracking-wider">Module Permissions</h3>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-40" />
                          <Input 
                            placeholder="Filter Modules..." 
                            value={moduleSearch}
                            onChange={(e) => setModuleSearch(e.target.value)}
                            className="w-32 h-8 pl-7 rounded-xl bg-muted/20 border-border/40 text-[9px] font-bold uppercase tracking-widest"
                          />
                        </div>
                      </div>
                      <div className="rounded-3xl border border-border/40 bg-card/60 p-6 space-y-4 overflow-hidden">
                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                          {filteredModules.map((m: ModuleType) => {
                            const access = (accessMap[selectedProfile.id] || {})[m.id] || { 
                              can_view: false, can_create: false, can_update: false, can_delete: false, access_scope: "global" 
                            };
                            return (
                              <div key={m.id} className="p-5 rounded-2xl border border-border/40 bg-muted/10 space-y-4 group hover:border-primary/20 transition-all duration-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Activity className="h-3.5 w-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                                    <p className="text-[11px] font-bold uppercase tracking-tight text-primary truncate">{m.name}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {[
                                    { key: "can_view", label: "Read" },
                                    { key: "can_create", label: "Create" },
                                    { key: "can_update", label: "Edit" },
                                    { key: "can_delete", label: "Delete" },
                                  ].map((act) => (
                                    <div key={act.key} className="flex items-center gap-3">
                                      <Checkbox
                                        id={`${m.id}-${act.key}`}
                                        checked={(access as any)[act.key]}
                                        onCheckedChange={() => onToggle(m.id, act.key as any)}
                                        className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                                      />
                                      <Label 
                                        htmlFor={`${m.id}-${act.key}`}
                                        className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer select-none group-hover:text-foreground transition-colors"
                                      >
                                        {act.label}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                  <div className="h-[600px] flex flex-col items-center justify-center text-center p-12 rounded-3xl border border-dashed border-border/40 bg-muted/5">
                    <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10 shadow-inner">
                      <Fingerprint className="w-10 h-10 text-primary opacity-40" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Select a User</h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
                      Select a user from the list to manage their roles and module permissions.
                    </p>
                  </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage-roles" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
          <div className="rounded-3xl border border-border/40 bg-card/60 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-border/40 pb-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1 opacity-60">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Role Definitions</p>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">System Roles</h3>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Manage role-based access control and permissions</p>
              </div>
              <Button 
                onClick={() => openRoleDialog()}
                className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-[0.95] text-[10px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Role
              </Button>
            </div>

            <div className="rounded-2xl border border-border/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 pl-6 text-muted-foreground">Role Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-muted-foreground">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-muted-foreground">Permissions</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-muted-foreground">Type</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest py-4 pr-6 text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors border-border/40">
                      <TableCell className="font-bold tracking-tight text-[11px] py-5 pl-6 text-primary">{r.name}</TableCell>
                      <TableCell className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 max-w-xs truncate">{r.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="h-6 rounded-lg bg-primary/5 border-primary/20 text-[9px] font-bold uppercase tracking-wider text-primary px-3">
                          {r.permissions?.length || 0} Permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.is_system_role ? (
                          <div className="flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest">
                            <Cpu className="w-3 h-3" /> System
                          </div>
                        ) : (
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Custom</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-5 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                            onClick={() => openRoleDialog(r)}
                          >
                            <Edit2 className="w-3.5 h-3.5 group-hover:scale-110" />
                          </Button>
                          {!r.is_system_role && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl border-border/40 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all group"
                              onClick={() => deleteRole(r.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 group-hover:scale-110" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Identity Role Configuration Pane */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/40 bg-card p-10 shadow-2xl custom-scrollbar font-sans antialiased">
          <DialogHeader className="mb-10">
            <div className="flex items-center gap-2 mb-2 opacity-60">
              <Settings className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Role Configuration</p>
            </div>
            <DialogTitle className="text-4xl font-bold tracking-tight text-foreground font-sans">
              {selectedRole ? "Edit" : "Create"} <span className="text-primary/60">System Role</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Role Name</Label>
                <Input 
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. Administrator"
                  className="h-14 px-5 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold tracking-tight text-base"
                  disabled={selectedRole?.is_system_role}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                <Textarea 
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Describe the responsibilities of this role..."
                  className="min-h-[160px] p-5 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-medium text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1 opacity-60 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Permissions Matrix</p>
                </div>
                <Badge variant="outline" className="h-5 rounded-lg text-[8px] font-bold tracking-widest">
                  {roleForm.selectedPermissions.length} / {permissions.length} Active
                </Badge>
              </div>
              <div className="rounded-3xl border border-border/40 bg-muted/5 p-6 h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource} className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary border-b border-primary/10 pb-2 italic opacity-60">{resource}</p>
                      <div className="space-y-2">
                        {perms.map((p) => (
                          <div 
                            key={p.id} 
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group cursor-pointer border",
                              roleForm.selectedPermissions.includes(p.id) 
                                ? "bg-primary/5 border-primary/40 shadow-sm" 
                                : "hover:bg-muted/30 border-transparent hover:border-border/40"
                            )}
                            onClick={() => {
                              const cur = roleForm.selectedPermissions;
                              const next = cur.includes(p.id) ? cur.filter(id => id !== p.id) : [...cur, p.id];
                              setRoleForm({ ...roleForm, selectedPermissions: next });
                            }}
                          >
                            <Checkbox
                              checked={roleForm.selectedPermissions.includes(p.id)}
                              onCheckedChange={() => {}} // Handle in div click
                              className="rounded-lg h-5 w-5 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                            />
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold tracking-tight text-foreground uppercase group-hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-[9px] font-medium text-muted-foreground opacity-60 line-clamp-1">{p.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-12 border-t border-border/40 pt-10">
            <Button 
              variant="outline" 
              onClick={() => setIsRoleDialogOpen(false)}
              className="h-14 px-8 rounded-2xl border-border/40 hover:bg-muted/50 font-bold uppercase tracking-wider text-[10px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveRole} 
              disabled={busy || !roleForm.name.trim()}
              className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider shadow-xl shadow-primary/20 transition-all active:scale-[0.95] disabled:opacity-50 text-[10px]"
            >
              {busy ? <RotateCcw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {busy ? "Saving..." : "Save Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}