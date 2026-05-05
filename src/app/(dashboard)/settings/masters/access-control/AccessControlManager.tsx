"use client";

import React, { useState, useMemo } from "react";
import { 
    Shield, 
    CheckCircle2, 
    Search, 
    Lock, 
    RefreshCw, 
    Zap,
    Box,
    Users,
    Plus,
    Activity,
    ChevronDown,
    Save,
    Layout,
    ShieldCheck,
    Fingerprint,
    CheckSquare,
    XCircle,
    Edit3,
    ArrowRightCircle,
    Server,
    Database,
    LineChart
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
    initialProfiles: any[];
    initialModules: any[];
    initialRoles: any[];
    initialPermissions: any[];
    initialUserRoles: Record<string, string[]>;
    canManageGlobal: boolean;
    canManageDept: boolean;
    userDeptId?: string;
}

export default function AccessControlManager({ 
    initialProfiles, 
    initialModules, 
    initialRoles, 
    initialPermissions, 
    initialUserRoles, 
    canManageGlobal,
    canManageDept,
    userDeptId 
}: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("initialize");
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleSearchTerm, setRoleSearchTerm] = useState("");
    
    // Global Data State
    const [currentRoles, setCurrentRoles] = useState(initialRoles);
    const [userRolesMap, setUserRolesMap] = useState(initialUserRoles);
    
    // New Role State (Tab 1)
    const [newRoleForm, setNewRoleForm] = useState({ name: "", description: "" });
    const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

    // Edit Role State (Tab 2)
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [tempPerms, setTempPerms] = useState<string[]>([]);

    // Edit User Role State (Tab 3)
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [tempUserRoles, setTempUserRoles] = useState<string[]>([]);

    const accessibleProfiles = useMemo(() => {
        let filtered = initialProfiles;
        if (!canManageGlobal && canManageDept) {
            filtered = filtered.filter(p => p.department_id === userDeptId);
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.full_name?.toLowerCase().includes(q) || 
                p.email?.toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [initialProfiles, canManageGlobal, canManageDept, userDeptId, searchTerm]);

    // TAB 1: INITIALIZE ACTIONS
    const toggleNewPerm = (id: string) => {
        setNewRolePerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectGroup = (filterFn: (m: any) => boolean, select: boolean) => {
        const filteredModules = initialModules.filter(filterFn);
        const allPermIds = filteredModules.flatMap(module => {
            const raw = module.slug.toLowerCase().trim();
            const withUnderscore = raw.replace(/[-]/g, "_");
            const variants = [raw, withUnderscore, `module_${raw}`, `module_${withUnderscore}`];

            return initialPermissions.filter(p =>
                variants.includes(p.resource)
            ).map(p => p.id);
        });

        if (select) {
            setNewRolePerms(prev => [...new Set([...prev, ...allPermIds])]);
        } else {
            setNewRolePerms(prev => prev.filter(id => !allPermIds.includes(id)));
        }
    };

    const handleSaveRole = async () => {
        if (!newRoleForm.name.trim()) return toast.error("Protocol Name is required.");
        setIsSaving(true);
        try {
            const response = await fetch('/settings/masters/access-control/api/roles/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newRoleForm,
                    permissionIds: newRolePerms
                })
            });
            if (!response.ok) throw new Error("API Failure");
            const finalRole = await response.json();
            setCurrentRoles(prev => [...prev, finalRole]);
            setNewRoleForm({ name: "", description: "" });
            setNewRolePerms([]);
            toast.success("Security Role Initialized.");
            setActiveTab("registry");
            router.refresh();
        } catch (error) {
            toast.error("Failed to initialize protocol.");
        } finally {
            setIsSaving(false);
        }
    };

    // TAB 2: REGISTRY ACTIONS (MODIFIED)
    const startEditingRole = (role: any) => {
        setEditingRoleId(role.id);
        const existingPermIds = role.permissions?.map((p: any) => p.id) || [];
        setTempPerms(existingPermIds);
    };

    const cancelEditingRole = () => {
        setEditingRoleId(null);
        setTempPerms([]);
    };

    const toggleTempPermission = (permId: string) => {
        setTempPerms(prev => prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]);
    };

    const commitRoleChanges = async (roleId: string) => {
        setIsSaving(true);
        try {
            // Matrix API logic for batch updates
            // For simplicity in this demo, we'll sync individual perms if the matrix API doesn't support batch
            // But usually this would be a single batch call.
            // We'll iterate the current permissions and find diffs.
            const role = currentRoles.find(r => r.id === roleId);
            const currentPermIds = role.permissions?.map((p: any) => p.id) || [];
            
            const toAdd = tempPerms.filter(id => !currentPermIds.includes(id));
            const toRemove = currentPermIds.filter((id: string) => !tempPerms.includes(id));

            // Syncing logic: Sequential or Batch perms
            for (const id of toAdd) {
                await fetch('/settings/masters/access-control/api/roles/matrix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roleId, permissionId: id, grant: true })
                });
            }
            for (const id of toRemove) {
                await fetch('/settings/masters/access-control/api/roles/matrix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roleId, permissionId: id, grant: false })
                });
            }

            setCurrentRoles(prev => prev.map(r => {
                if (r.id !== roleId) return r;
                const nextPerms = tempPerms.map(id => initialPermissions.find(p => p.id === id)).filter(Boolean);
                return { ...r, permissions: nextPerms };
            }));

            toast.success("Protocol Matrix Hydrated.");
            setEditingRoleId(null);
            router.refresh();
        } catch (error) {
            toast.error("Sync Failure.");
        } finally {
            setIsSaving(false);
        }
    };

    // TAB 3: ASSIGN ACTIONS (MODIFIED)
    const startEditingUser = (userId: string) => {
        setEditingUserId(userId);
        setTempUserRoles(userRolesMap[userId] || []);
    };

    const toggleTempUserRole = (roleName: string) => {
        setTempUserRoles(prev => prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]);
    };

    const commitUserRoles = async (userId: string) => {
        setIsSaving(true);
        try {
            const response = await fetch('/settings/masters/access-control/api/user_roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: userId, roleNames: tempUserRoles })
            });
            if (!response.ok) throw new Error("API Failure");
            setUserRolesMap(prev => ({ ...prev, [userId]: tempUserRoles }));
            toast.success(`User Directives Synchronized.`);
            setEditingUserId(null);
        } catch (error) {
            toast.error("Failed to update user roles.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-10 pb-20 animate-in fade-in duration-700 font-sans antialiased text-slate-800">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-12 p-1 bg-slate-100/40 border border-slate-200/60 rounded-2xl gap-2 mb-8 w-full max-w-2xl backdrop-blur-sm">
                    <TabsTrigger value="initialize" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Initialize
                    </TabsTrigger>
                    <TabsTrigger value="registry" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Role Registry
                    </TabsTrigger>
                    <TabsTrigger value="assign" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Assign Directives
                    </TabsTrigger>
                </TabsList>

                {/* 1. INITIALIZE TAB */}
                <TabsContent value="initialize" className="space-y-12 outline-none">
                    <div className="bg-white/40 border border-slate-200/60 p-8 rounded-[2.5rem] shadow-sm space-y-8 backdrop-blur-xl">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200/40 pb-8">
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Protocol Name</Label>
                                <Input 
                                    value={newRoleForm.name}
                                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                                    placeholder="SUPPORT_ADMIN_L1"
                                    className="h-12 px-5 rounded-xl bg-slate-50 border-slate-200/60 focus:border-primary focus:ring-primary/10 font-black uppercase tracking-widest text-[11px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Mandate</Label>
                                <Textarea 
                                    value={newRoleForm.description}
                                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                                    placeholder="Operational scope definition..."
                                    className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-50 border-slate-200/60 focus:border-primary focus:ring-primary/10 font-bold text-xs"
                                />
                            </div>
                         </div>

                         <div className="space-y-12">
                                {[
                                    { label: "Core Service Support", icon: Server, filter: (m: any) => (m.slug === "help-desk" || m.slug === "tickets" || m.slug === "requisitions" || m.slug.includes("support")) && !m.slug.includes("asset") },
                                    { label: "Structural Masters Hub", icon: Database, filter: (m: any) => m.slug.includes("masters") },
                                    { label: "Enterprise Governance & Intel", icon: LineChart, filter: (m: any) => m.slug === "dashboard" || m.slug === "intelligence_hub" || m.slug === "reports" || m.slug === "mail" || m.slug === "themes" || m.slug === "settings" || m.slug === "workspace" }
                                ].map((group) => {
                                    const filteredModules = initialModules.filter(group.filter);
                                    if (filteredModules.length === 0) return null;

                                    return (
                                        <div key={group.label} className="space-y-5">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-2">
                                                    <group.icon size={14} className="text-primary/60" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{group.label}</h3>
                                                </div>
                                                <div className="flex gap-2">
                                                     <Button 
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSelectGroup(group.filter, true)}
                                                        className="h-8 px-4 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                                                     >
                                                         Select_All
                                                     </Button>
                                                     <Button 
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSelectGroup(group.filter, false)}
                                                        className="h-8 px-4 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                                                     >
                                                         Clear_All
                                                     </Button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-1">
                                                {filteredModules.map(module => {
                                                    const raw = module.slug.toLowerCase().trim();
                                                    const withUnderscore = raw.replace(/[-]/g, "_");
                                                    const variants = [raw, withUnderscore, `module_${raw}`, `module_${withUnderscore}`];

                                                    const modulePerms = initialPermissions.filter(p => 
                                                        variants.includes(p.resource)
                                                    );
                                                    return (
                                                        <div key={module.id} className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-3xl space-y-6 hover:border-primary/20 transition-all group relative overflow-hidden">
                                                            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
                                                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-800">{module.name}</p>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const raw = module.slug.toLowerCase().trim();
                                                                            const withUnderscore = raw.replace(/[-]/g, "_");
                                                                            const variants = [raw, withUnderscore, `module_${raw}`, `module_${withUnderscore}`];
                                                                            const ids = initialPermissions.filter(p => variants.includes(p.resource)).map(p => p.id);
                                                                            setNewRolePerms(prev => [...new Set([...prev, ...ids])]);
                                                                        }}
                                                                        className="text-[7px] font-black uppercase text-primary/40 hover:text-primary transition-colors"
                                                                    >
                                                                        All
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const raw = module.slug.toLowerCase().trim();
                                                                            const withUnderscore = raw.replace(/[-]/g, "_");
                                                                            const variants = [raw, withUnderscore, `module_${raw}`, `module_${withUnderscore}`];
                                                                            const ids = initialPermissions.filter(p => variants.includes(p.resource)).map(p => p.id);
                                                                            setNewRolePerms(prev => prev.filter(id => !ids.includes(id)));
                                                                        }}
                                                                        className="text-[7px] font-black uppercase text-red-400/40 hover:text-red-500 transition-colors"
                                                                    >
                                                                        None
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {[
                                                                    { label: 'VIEW', key: 'can_view', action: 'read' },
                                                                    { label: 'CREATE', key: 'can_create', action: 'create' },
                                                                    { label: 'UPDATE', key: 'can_update', action: 'update' },
                                                                    { label: 'DELETE', key: 'can_delete', action: 'delete' }
                                                                ].map(attr => {
                                                                    const perm = modulePerms.find(p => p.action === attr.action) || 
                                                                                 modulePerms.find(p => p.action === attr.key.replace('can_', ''));
                                                                    
                                                                    const isChecked = perm ? newRolePerms.includes(perm.id) : false;
                                                                    return (
                                                                        <div key={attr.key} className="flex items-center justify-between">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-60">{attr.label}</span>
                                                                            <Checkbox 
                                                                                checked={isChecked}
                                                                                disabled={!perm}
                                                                                onCheckedChange={() => perm && toggleNewPerm(perm.id)}
                                                                                className={cn(
                                                                                    "h-5 w-5 rounded-md border-slate-200 data-[state=checked]:bg-primary",
                                                                                    !perm && "opacity-20 cursor-not-allowed"
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                         </div>

                         <div className="pt-8 flex justify-end">
                             <Button 
                                onClick={handleSaveRole}
                                disabled={isSaving || !newRoleForm.name}
                                className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all"
                             >
                                 Commit Security Protocol
                             </Button>
                         </div>
                    </div>
                </TabsContent>

                {/* 2. REGISTRY TAB */}
                <TabsContent value="registry" className="space-y-8 outline-none">
                    <div className="max-w-md relative group">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="SEARCH_PROTOCOL..." 
                            className="h-12 pl-12 rounded-xl bg-white border-slate-200/60 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            value={roleSearchTerm}
                            onChange={(e) => setRoleSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {currentRoles.filter(r => r.name.toLowerCase().includes(roleSearchTerm.toLowerCase())).map(role => {
                            const isEditing = editingRoleId === role.id;
                            return (
                            <div key={role.id} className="bg-white/40 border border-slate-200/60 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                                <div className="p-6 flex items-center justify-between bg-slate-100/30 border-b border-slate-200/40">
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                                            <Shield size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none mb-1">{role.name}</h3>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60">{role.description || 'Enterprise Security Directive'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                         {isEditing ? (
                                             <>
                                                 <Button 
                                                    onClick={cancelEditingRole}
                                                    variant="ghost"
                                                    className="h-8 rounded-lg text-slate-400 text-[9px] font-black uppercase px-4"
                                                 >
                                                     Cancel
                                                 </Button>
                                                 <Button 
                                                    onClick={() => commitRoleChanges(role.id)}
                                                    disabled={isSaving}
                                                    className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase px-6 shadow-lg shadow-emerald-500/20"
                                                 >
                                                     {isSaving ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                                                     Save Changes
                                                 </Button>
                                             </>
                                         ) : (
                                             <Button 
                                                onClick={() => startEditingRole(role)}
                                                variant="outline"
                                                className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-primary hover:text-white hover:border-primary text-[9px] font-black uppercase px-6 transition-all"
                                             >
                                                 <Edit3 className="h-3 w-3 mr-2" />
                                                 Modify Protocol
                                             </Button>
                                         )}
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {initialModules.map(module => {
                                        const raw = module.slug.toLowerCase().trim();
                                        const withUnderscore = raw.replace(/[-]/g, "_");
                                        const variants = [raw, withUnderscore, `module_${raw}`, `module_${withUnderscore}`];

                                        const modulePerms = initialPermissions.filter(p => 
                                            variants.includes(p.resource)
                                        );
                                        return (
                                            <div key={module.id} className={cn(
                                                "p-4 rounded-2xl bg-white/40 border border-slate-100 transition-all",
                                                isEditing && "border-primary/10 ring-1 ring-primary/5"
                                            )}>
                                                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-primary/40 truncate mb-3">{module.name}</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { label: 'VIEW', key: 'can_view', action: 'read' },
                                                        { label: 'CREATE', key: 'can_create', action: 'create' },
                                                        { label: 'UPDATE', key: 'can_update', action: 'update' },
                                                        { label: 'DELETE', key: 'can_delete', action: 'delete' }
                                                    ].map(attr => {
                                                        const perm = modulePerms.find(p => p.action === attr.action) || 
                                                                     modulePerms.find(p => p.action === attr.key.replace('can_', ''));
                                                        
                                                        const hasPerm = perm ? (
                                                            isEditing 
                                                                ? tempPerms.includes(perm.id)
                                                                : role.permissions?.some((p: any) => p.id === perm.id)
                                                        ) : false;

                                                        return (
                                                            <div key={attr.key} className="flex items-center justify-between gap-2">
                                                                <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 opacity-60 italic">{attr.label}</span>
                                                                <Checkbox 
                                                                    checked={hasPerm}
                                                                    disabled={!isEditing || !perm}
                                                                    onCheckedChange={() => perm && toggleTempPermission(perm.id)}
                                                                    className={cn(
                                                                        "h-3.5 w-3.5 rounded-md border-slate-200",
                                                                        (!isEditing || !perm) && "opacity-20 cursor-not-allowed"
                                                                    )}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )})}
                    </div>
                </TabsContent>

                {/* 3. ASSIGN TAB */}
                <TabsContent value="assign" className="space-y-8 outline-none">
                    <div className="max-w-md relative group">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="SEARCH_IDENTITY..." 
                            className="h-12 pl-12 rounded-xl bg-white border-slate-200/60 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {accessibleProfiles.map(user => {
                            const isEditing = editingUserId === user.id;
                            return (
                            <div key={user.id} className="bg-white/40 border border-slate-200/60 p-6 rounded-[2rem] flex flex-col gap-6 hover:shadow-xl hover:shadow-primary/5 transition-all group backdrop-blur-xl relative overflow-hidden">
                                {isEditing && <div className="absolute top-0 right-0 p-2"><Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[7px] font-black uppercase tracking-[0.2em] italic">Editing_Active</Badge></div>}
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-[1.2rem] bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-primary/10">
                                            {user.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none truncate">{user.full_name}</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase opacity-40 tracking-widest truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    
                                    {isEditing ? (
                                         <div className="flex gap-1">
                                             <Button 
                                                onClick={() => setEditingUserId(null)}
                                                variant="ghost"
                                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-500"
                                             >
                                                 <XCircle size={14} />
                                             </Button>
                                             <Button 
                                                onClick={() => commitUserRoles(user.id)}
                                                className="h-7 w-7 p-0 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10"
                                             >
                                                 <Save size={14} />
                                             </Button>
                                         </div>
                                     ) : (
                                         <Button 
                                            onClick={() => startEditingUser(user.id)}
                                            variant="ghost"
                                            className="h-8 w-8 p-0 rounded-xl bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all shadow-sm"
                                         >
                                             <Edit3 size={14} />
                                         </Button>
                                     )}
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 opacity-60">
                                        <ShieldCheck size={10} className="text-primary" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Directives</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentRoles.map(role => {
                                            const roleIsAssigned = isEditing 
                                                ? tempUserRoles.includes(role.name)
                                                : (userRolesMap[user.id] || []).includes(role.name);
                                            
                                            return (
                                                <button
                                                    key={role.id}
                                                    disabled={!isEditing}
                                                    onClick={() => toggleTempUserRole(role.name)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                                        roleIsAssigned 
                                                            ? "bg-primary text-white shadow-md shadow-primary/10" 
                                                            : "bg-slate-100/50 text-slate-400 border border-transparent hover:bg-slate-200/50",
                                                        !isEditing && "opacity-60 cursor-not-allowed"
                                                    )}
                                                >
                                                    {role.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100/60 flex items-center justify-between">
                                     <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-300">Operational Profile</span>
                                     <ArrowRightCircle size={10} className="text-slate-200" />
                                </div>
                            </div>
                        )})}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}