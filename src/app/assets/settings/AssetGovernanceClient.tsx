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
    LineChart,
    Truck,
    HardDrive,
    ShoppingBag
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
    users: any[];
    modules: any[];
    roles: any[];
    permissions: any[];
    initialUserRoles: Record<string, string[]>;
    currentUserId: string;
}

export function AssetGovernanceClient({ users, modules, roles, permissions, initialUserRoles, currentUserId }: Props) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("initialize");
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleSearchTerm, setRoleSearchTerm] = useState("");
    
    // Global Data State
    const [currentRoles, setCurrentRoles] = useState(roles);
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

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.personal_email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const filteredRoles = useMemo(() => {
        return currentRoles.filter(r => 
            r.name.toLowerCase().includes(roleSearchTerm.toLowerCase())
        );
    }, [currentRoles, roleSearchTerm]);

    // TAB 1: INITIALIZE ACTIONS
    const toggleNewPerm = (id: string) => {
        setNewRolePerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectGroup = (filter: (m: any) => boolean, select: boolean) => {
        const groupModules = modules.filter(filter);
        const groupPermIds = permissions
            .filter(p => groupModules.some(m => p.resource === `module_${m.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_")}`))
            .map(p => p.id);

        if (select) {
            setNewRolePerms(prev => [...new Set([...prev, ...groupPermIds])]);
        } else {
            setNewRolePerms(prev => prev.filter(id => !groupPermIds.includes(id)));
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
            
            // Transform perms to match props structure
            const formattedRole = {
                ...finalRole,
                permissions: finalRole.permissions?.map((rp: any) => rp.permissions) || []
            };

            setCurrentRoles(prev => [...prev, formattedRole]);
            setNewRoleForm({ name: "", description: "" });
            setNewRolePerms([]);
            toast.success("Structural Role Initialized.");
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
            const role = currentRoles.find(r => r.id === roleId);
            const currentPermIds = role.permissions?.map((p: any) => p.id) || [];
            
            const toAdd = tempPerms.filter(id => !currentPermIds.includes(id));
            const toRemove = currentPermIds.filter((id: string) => !tempPerms.includes(id));

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
                const nextPerms = tempPerms.map(id => permissions.find(p => p.id === id)).filter(Boolean);
                return { ...r, permissions: nextPerms };
            }));

            toast.success("Protocol Matrix Hydrated.");
            setEditingRoleId(null);
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
                    <TabsTrigger value="initialize" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Initialize
                    </TabsTrigger>
                    <TabsTrigger value="registry" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Registry
                    </TabsTrigger>
                    <TabsTrigger value="assign" className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all font-black uppercase text-[10px] tracking-widest">
                        Assignments
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
                                    placeholder="HARDWARE_CUSTODIAN_L1"
                                    className="h-12 px-5 rounded-xl bg-slate-50 border-slate-200/60 focus:border-emerald-500 focus:ring-emerald-500/10 font-black uppercase tracking-widest text-[11px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</Label>
                                <Textarea 
                                    value={newRoleForm.description}
                                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                                    placeholder="Operational scope for assets..."
                                    className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-50 border-slate-200/60 focus:border-emerald-500 focus:ring-emerald-500/10 font-bold text-xs"
                                />
                            </div>
                         </div>

                         <div className="space-y-12">
                                {[
                                    { label: "1. Transactional Protocol Core", icon: Truck, filter: (m: any) => !m.slug.includes("master") && !m.slug.includes("setting") && !m.slug.includes("governance") && !m.slug.includes("themes") && !m.slug.includes("report") && !m.slug.includes("catalog") && !m.slug.includes("supplier") },
                                    { label: "2. Master Data Taxonomy", icon: Database, filter: (m: any) => m.slug.includes("master") || m.slug.includes("catalog") || m.slug.includes("supplier") },
                                    { label: "3. Systemic Governance & Intel", icon: LineChart, filter: (m: any) => m.slug.includes("setting") || m.slug.includes("governance") || m.slug.includes("theme") || m.slug.includes("report") }
                                ].map((group) => {
                                    const filteredModules = modules.filter(group.filter);
                                    if (filteredModules.length === 0) return null;

                                    return (
                                        <div key={group.label} className="space-y-5">
                                            <div className="flex items-center justify-between px-2">
                                                <div className="flex items-center gap-2">
                                                    <group.icon size={14} className="text-emerald-500/60" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">{group.label}</h3>
                                                </div>
                                                <div className="flex gap-2">
                                                     <Button 
                                                        variant="ghost" size="sm"
                                                        onClick={() => handleSelectGroup(group.filter, true)}
                                                        className="h-8 px-4 rounded-lg bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                                                     >
                                                         Select_All
                                                     </Button>
                                                     <Button 
                                                        variant="ghost" size="sm"
                                                        onClick={() => handleSelectGroup(group.filter, false)}
                                                        className="h-8 px-4 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white text-[8px] font-black uppercase tracking-widest transition-all"
                                                     >
                                                         Clear_All
                                                     </Button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-1">
                                                {filteredModules.map(module => {
                                                    const resourceKey = `module_${module.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_")}`;
                                                    const modulePerms = permissions.filter(p => p.resource === resourceKey);
                                                    return (
                                                        <div key={module.id} className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-3xl space-y-6 hover:border-emerald-500/20 transition-all group relative overflow-hidden">
                                                            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
                                                                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-800">{module.name}</p>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const ids = modulePerms.map(p => p.id);
                                                                            setNewRolePerms(prev => [...new Set([...prev, ...ids])]);
                                                                        }}
                                                                        className="text-[7px] font-black uppercase text-emerald-500/40 hover:text-emerald-500 transition-colors"
                                                                    >
                                                                        All
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const ids = modulePerms.map(p => p.id);
                                                                            setNewRolePerms(prev => prev.filter(id => !ids.includes(id)));
                                                                        }}
                                                                        className="text-[7px] font-black uppercase text-red-400/40 hover:text-red-500 transition-colors"
                                                                    >
                                                                        None
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {['view', 'create', 'update', 'delete'].map(action => {
                                                                    const actionLabel = action === 'view' ? 'read' : action;
                                                                    const perm = modulePerms.find(p => p.action === actionLabel);
                                                                    if (!perm) return null;
                                                                    const isChecked = newRolePerms.includes(perm.id);
                                                                    return (
                                                                        <div key={action} className="flex items-center justify-between">
                                                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-60">{action}</span>
                                                                            <Checkbox 
                                                                                checked={isChecked}
                                                                                onCheckedChange={() => toggleNewPerm(perm.id)}
                                                                                className="h-5 w-5 rounded-md border-slate-200 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
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
                                className="h-14 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all font-sans"
                             >
                                 Commit Asset Protocol
                             </Button>
                         </div>
                    </div>
                </TabsContent>

                {/* 2. REGISTRY TAB */}
                <TabsContent value="registry" className="space-y-8 outline-none">
                    <div className="max-w-md relative group">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input 
                            placeholder="SEARCH_ASSET_PROTOCOL..." 
                            className="h-12 pl-12 rounded-xl bg-white border-slate-200/60 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            value={roleSearchTerm}
                            onChange={(e) => setRoleSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {filteredRoles.map(role => {
                            const isEditing = editingRoleId === role.id;
                            return (
                            <div key={role.id} className="bg-white/40 border border-slate-200/60 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                                <div className="p-6 flex items-center justify-between bg-emerald-500/[0.02] border-b border-slate-200/40">
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                                            <Shield size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 leading-none mb-1">{role.name}</h3>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60">{role.description || 'Asset Operational Protocol'}</p>
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
                                                     <Save className="h-3 w-3 mr-2" />
                                                     Save Protocol
                                                 </Button>
                                             </>
                                         ) : (
                                             <Button 
                                                onClick={() => startEditingRole(role)}
                                                variant="ghost"
                                                className="h-9 w-9 p-0 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                             >
                                                 <Edit3 size={14} />
                                             </Button>
                                         )}
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {modules.map(module => {
                                        const resourceKey = `module_${module.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_")}`;
                                        const modulePerms = permissions.filter(p => p.resource === resourceKey);
                                        return (
                                            <div key={module.id} className={cn(
                                                "p-4 rounded-2xl bg-white/40 border border-slate-100 transition-all",
                                                isEditing && "border-emerald-500/10 ring-1 ring-emerald-500/5"
                                            )}>
                                                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-500/40 truncate mb-3">{module.name}</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {['view', 'create', 'update', 'delete'].map(action => {
                                                        const actionLabel = action === 'view' ? 'read' : action;
                                                        const perm = modulePerms.find(p => p.action === actionLabel);
                                                        if (!perm) return null;
                                                        
                                                        const hasPerm = isEditing 
                                                            ? tempPerms.includes(perm.id)
                                                            : role.permissions?.some((p: any) => p.id === perm.id);

                                                        return (
                                                            <div key={action} className="flex items-center justify-between gap-2">
                                                                <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 opacity-60 italic">{action}</span>
                                                                <Checkbox 
                                                                    checked={hasPerm}
                                                                    disabled={!isEditing}
                                                                    onCheckedChange={() => toggleTempPermission(perm.id)}
                                                                    className={cn(
                                                                        "h-3.5 w-3.5 rounded-md border-slate-200",
                                                                        !isEditing && "opacity-40 cursor-not-allowed"
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
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input 
                            placeholder="SEARCH_CUSTODIAN..." 
                            className="h-12 pl-12 rounded-xl bg-white border-slate-200/60 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredUsers.map(user => {
                            const isEditing = editingUserId === user.id;
                            return (
                            <div key={user.id} className="bg-white/40 border border-slate-200/60 p-6 rounded-[2rem] flex flex-col gap-6 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group backdrop-blur-xl relative overflow-hidden">
                                {isEditing && <div className="absolute top-0 right-0 p-2"><Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[7px] font-black uppercase tracking-[0.2em] italic">Editing_Active</Badge></div>}
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-[1.2rem] bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-500/10 transition-transform group-hover:scale-105">
                                            {user.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none truncate">{user.full_name}</h4>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase opacity-40 tracking-widest truncate">{user.personal_email}</p>
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
                                            className="h-8 w-8 p-0 rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                         >
                                             <Edit3 size={14} />
                                         </Button>
                                     )}
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-2 opacity-60">
                                        <ShieldCheck size={10} className="text-emerald-500" />
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
                                                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all text-left",
                                                        roleIsAssigned 
                                                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                                                            : "bg-slate-100/50 text-slate-400 border border-transparent hover:bg-emerald-500/10 hover:text-emerald-500",
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
