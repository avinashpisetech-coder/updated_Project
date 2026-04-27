"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Plus, 
  Search, 
  ChevronRight,
  HelpCircle,
  Boxes,
  Info,
  LayoutDashboard,
  PieChart,
  TrendingUp,
  AlertCircle,
  FileDown,
  Printer,
  ShieldCheck,
  Activity,
  Package,
  ArrowUpRight,
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Trash2,
  GitBranch,
  Eye,
  Edit,
  History,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
    saveDeployment, 
    approveDeploymentAction, 
    createAmendmentAction, 
    deleteDeploymentAction,
    updateStatusAction,
    getLiveStock,
    getDeploymentAmendments,
    getDeploymentAuditLogs,
    seedAuditLogsAction
} from "./actions";
import { useNavigation } from "@/components/providers/NavigationProvider";

interface DeploymentHubProps {
    companies: any[];
    projects: any[];
    departments: any[];
    stores: any[];
    assets: any[];
    users: any[];
    deployments: any[];
    role: string;
    currentUserId: string;
}

const DEFAULT_HEADER = {
    deployment_date: new Date().toISOString().split('T')[0],
    company_id: "",
    project_id: "",
    scope: "Project scope",
    recipient_id: "",
    department_id: "",
    store_id: "",
    handover_to: "",
    remark: "",
};

export function DeploymentHubClient({
    companies,
    projects,
    departments,
    stores,
    assets,
    users,
    deployments,
    role,
    currentUserId
}: DeploymentHubProps) {
    const router = useRouter();
    const { isSidebarOpen } = useNavigation();
    const [view, setView] = useState<'list' | 'form' | 'amend_compare'>('list');
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    
    // Form State
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [header, setHeader] = useState<any>(DEFAULT_HEADER);
    const [items, setItems] = useState<any[]>([]);
    const [status, setStatus] = useState<string>("draft");
    const [version, setVersion] = useState<number>(1);
    const [deploymentNumber, setDeploymentNumber] = useState<string>("");

    // Loading States
    const [isSaving, setIsSaving] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    // Amendment & Audit State
    const [amendments, setAmendments] = useState<any[]>([]);
    const [selectedAmendment, setSelectedAmendment] = useState<string | null>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Live Stock Cache
    const [liveStockCache, setLiveStockCache] = useState<Record<string, number>>({});

    const filteredDeployments = deployments.filter(d => {
        const dNum = d.deployment_number || "";
        const pName = d.project?.name || "";
        const matchesSearch = dNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              pName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || d.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusConfig = (status: string) => {
        const s = (status || 'draft').toLowerCase();
        switch (s) {
            case 'approved': return { label: 'Approved', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
            case 'submitted': return { label: 'Submitted', class: 'bg-blue-50 text-blue-600 border-blue-100' };
            case 'cancelled': return { label: 'Cancelled', class: 'bg-orange-50 text-orange-600 border-orange-100' };
            case 'deleted': return { label: 'Deleted', class: 'bg-red-50 text-red-600 border-red-100' };
            case 'requested_for_delete': return { label: 'Pending Delete', class: 'bg-amber-50 text-amber-600 border-amber-100' };
            case 'draft': return { label: 'Draft', class: 'bg-slate-50 text-slate-400 border-slate-200' };
            default: return { label: status, class: 'bg-slate-50 text-slate-600 border-slate-100' };
        }
    };

    const handleCreateNew = () => {
        setCurrentId(null);
        setHeader(DEFAULT_HEADER);
        setItems([createEmptyItem()]);
        setStatus("draft");
        setVersion(1);
        setDeploymentNumber("");
        setView('form');
    };

    const handleEdit = async (d: any) => {
        setCurrentId(d.id);
        setHeader({
            deployment_date: d.deployment_date,
            company_id: d.company_id || "",
            project_id: d.project_id || "",
            scope: d.scope || "Project scope",
            recipient_id: d.recipient_id || "",
            department_id: d.department_id || "",
            store_id: d.store_id || "",
            handover_to: d.handover_to || "",
            remark: d.remark || "",
        });
        setStatus(d.status);
        setVersion(d.version);
        setDeploymentNumber(d.deployment_number);
        
        // Use provided items or create an empty one
        setItems(d.asset_deployment_items || [createEmptyItem()]);
        
        // Fecth history and audit logs immediately
        fetchAmendments(d.id);
        fetchAuditLogs(d.id);

        setView('form');
    };

    const fetchAuditLogs = async (id: string) => {
        const logs = await getDeploymentAuditLogs(id);
        setAuditLogs(logs);
    };

    const fetchAmendments = async (id: string) => {
        const history = await getDeploymentAmendments(id);
        setAmendments(history);
    };

    const createEmptyItem = () => ({
        id: crypto.randomUUID(),
        asset_id: "",
        quantity: 1,
        uom: "NOS",
        remark: "",
        item_image: null
    });

    const addItem = () => {
        setItems([...items, createEmptyItem()]);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleOpenAudit = async () => {
        // This is now redundant as logs are shown at the bottom
        // Scrolling to the bottom instead
        const auditSection = document.getElementById('protocol-audit-trail');
        if (auditSection) {
            auditSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleItemChange = async (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        if (field === 'asset_id' && value) {
            const assetDetails = assets.find(a => a.id === value);
            if (assetDetails) {
                // Fetch live stock
                const subTypeId = assetDetails.sub_type?.id;
                if (subTypeId) {
                   const storeFilter = header.scope === 'Project scope' ? header.store_id : undefined;
                   const cacheKey = `${subTypeId}-${storeFilter || 'all'}`;
                   
                   if (liveStockCache[cacheKey] === undefined) {
                       const stock = await getLiveStock(subTypeId, storeFilter);
                       setLiveStockCache(prev => ({...prev, [cacheKey]: stock}));
                   }
                }
            }
        }
        
        setItems(newItems);
    };

    const availableAssets = useMemo(() => {
        return assets || [];
    }, [assets]);

    const handleSave = async (submitStatus: string = 'draft') => {
        if (!header.company_id || !header.project_id) {
            toast.error("Company and Project are required.");
            return;
        }

        const validItems = items.filter(i => i.asset_id && i.quantity > 0);
        if (validItems.length === 0) {
            toast.error("At least one valid asset line item is required.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                id: currentId || undefined,
                company_id: header.company_id || null,
                project_id: header.project_id || null,
                scope: header.scope,
                recipient_id: header.recipient_id || null,
                department_id: header.department_id || null,
                store_id: header.store_id || null,
                remarks: header.remarks,
                created_by: header.created_by,
                status: submitStatus
            };
            
            // Clean up item IDs if they are local UUIDs
            const cleanItems = validItems.map(i => ({
                asset_id: i.asset_id,
                quantity: parseInt(i.quantity),
                uom: i.uom,
                remark: i.remark,
                item_image: i.item_image
            }));

            await saveDeployment(payload, cleanItems);
            toast.success(`Deployment ${currentId ? 'updated' : 'created'} successfully.`);
            if (submitStatus === 'submitted') {
                // If submitted, stay on page to see audit and updated status
                router.refresh();
                if (currentId) fetchAuditLogs(currentId);
                setStatus('submitted');
            } else {
                setView('list');
                router.refresh();
            }
        } catch (error: any) {
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!currentId) return;
        setIsApproving(true);
        try {
            await approveDeploymentAction(currentId);
            toast.success("Deployment approved successfully. Assets have been marked as assigned.");
            router.refresh();
            fetchAuditLogs(currentId);
            setStatus('approved');
        } catch (error: any) {
            toast.error(`Approval failed: ${error.message}`);
        } finally {
            setIsApproving(false);
        }
    };

    const handleAmend = async () => {
        if (!currentId) return;
        const summary = window.prompt("Enter reason for amendment:");
        if (!summary) return;

        try {
            await createAmendmentAction(currentId, summary);
            toast.success("Amendment created. Document is back to Draft status.");
            setView('list');
            router.refresh();
        } catch (error: any) {
            toast.error(`Failed to amend: ${error.message}`);
        }
    };

    const handleDeleteRequest = async () => {
        if (!currentId) return;
        if (!window.confirm("Are you sure you want to request deletion of this deployment?")) return;

        try {
            await deleteDeploymentAction(currentId);
            toast.success("Deployment deletion requested.");
            setView('list');
            router.refresh();
        } catch (error: any) {
            toast.error(`Failed to request delete: ${error.message}`);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!currentId) return;
        try {
            await updateStatusAction(currentId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
            router.refresh();
            fetchAuditLogs(currentId);
            setStatus(newStatus);
        } catch (error: any) {
            toast.error(`Failed to update status: ${error.message}`);
        }
    };

    const handleSeedAudit = async () => {
        if (!currentId) return;
        try {
            await seedAuditLogsAction(currentId);
            toast.success("Audit records pushed successfully.");
            fetchAuditLogs(currentId);
        } catch (error: any) {
            toast.error(`Seed failed: ${error.message}`);
        }
    };

    const isLocked = ['approved', 'requested_for_delete', 'deleted', 'cancelled'].includes(status);

    if (view === 'form') {
        return (
            <div className="flex flex-col min-h-screen w-full bg-background animate-in fade-in duration-500 pl-[6px]">
                <header className="h-[72px] shrink-0 bg-[var(--header-bg)] border-b border-[var(--header-border)] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-10 w-10 rounded-2xl bg-card border border-border/40 hover:bg-muted/10 transition-all text-muted-foreground shadow-sm">
                             <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-0.5">
                                <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                                <h1 className="text-[17px] font-black text-foreground uppercase tracking-tight">
                                    {deploymentNumber || 'CREATE_PROTOCOL_DRAFT'}
                                </h1>
                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5 px-3 rounded-md border-none", getStatusConfig(status).class)}>
                                    {getStatusConfig(status).label}
                                </Badge>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40 ml-4">Deployment Execution Layer v4.0</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* SURFACED ACTIONS */}
                        {status === 'draft' && (
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    className="h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all"
                                    onClick={() => handleSave('draft')}
                                    disabled={isSaving}
                                >
                                    <Save className="h-4 w-4 mr-2" /> Save_Draft
                                </Button>
                                <Button 
                                    className="h-11 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                    onClick={() => handleSave('submitted')}
                                    disabled={isSaving}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" /> Execute_Protocol
                                </Button>
                            </div>
                        )}

                        {status === 'submitted' && (role === 'super_admin' || role === 'it_admin') && (
                            <Button 
                                className="h-11 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xl transition-all"
                                onClick={handleApprove}
                                disabled={isApproving}
                            >
                                <ShieldCheck className="h-4 w-4 mr-2" /> Authorize_Transaction
                            </Button>
                        )}

                        <div className="h-8 w-[1px] bg-border/40 mx-2" />

                        {/* SECONDARY ACTIONS DROPDOWN */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-muted/10 text-muted-foreground">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border/40 bg-white shadow-2xl">
                                <DropdownMenuItem onClick={() => setView('amend_compare')} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase">
                                    <History size={14} /> Amend History
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleOpenAudit} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase">
                                    <Activity size={14} /> Protocol Audit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => window.print()} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase">
                                    <Printer size={14} /> Print Protocol
                                </DropdownMenuItem>
                                {status === 'approved' && (
                                    <DropdownMenuItem onClick={handleAmend} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase text-amber-500">
                                        <Edit size={14} /> Amend Document
                                    </DropdownMenuItem>
                                )}
                                {(status === 'approved' || status === 'submitted') && (
                                    <DropdownMenuItem onClick={handleDeleteRequest} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase text-red-500">
                                        <Trash2 size={14} /> Request Deletion
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <div className="flex-1 p-4 lg:p-8 layout-content bg-background transition-all duration-300">
                    <div className="w-full max-w-[99%] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        
                        {/* Section 1: Header Protocol */}
                        <div className="bg-card/40 border border-border/40 p-10 rounded-[3rem] shadow-2xl shadow-black/5 backdrop-blur-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 1: Metadata Configuration
                            </h3>
                            
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Deployment Date</label>
                                    <Input 
                                        type="date"
                                        value={header.deployment_date}
                                        onChange={(e) => setHeader({...header, deployment_date: e.target.value})}
                                        disabled={isLocked}
                                        className="h-11 rounded-xl bg-white border-border/40 font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Target Scope</label>
                                    <Select disabled={isLocked} value={header.scope} onValueChange={(v) => setHeader({...header, scope: v})}>
                                        <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                            <SelectValue placeholder="Select Scope" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="User scope">User Scope</SelectItem>
                                            <SelectItem value="Project scope">Project Scope</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Company</label>
                                    <Select disabled={isLocked} value={header.company_id} onValueChange={(v) => setHeader({...header, company_id: v})}>
                                        <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                            <SelectValue placeholder="Select Company" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Project</label>
                                    <Select disabled={isLocked} value={header.project_id} onValueChange={(v) => setHeader({...header, project_id: v})}>
                                        <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Conditional Fields based on Scope */}
                                {header.scope === 'User scope' ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Recipient User</label>
                                            <Select disabled={isLocked} value={header.recipient_id} onValueChange={(v) => setHeader({...header, recipient_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                                    <SelectValue placeholder="Select User" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Department</label>
                                            <Select disabled={isLocked} value={header.department_id} onValueChange={(v) => setHeader({...header, department_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">To Store</label>
                                            <Select disabled={isLocked} value={header.store_id} onValueChange={(v) => setHeader({...header, store_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-white border-border/40">
                                                    <SelectValue placeholder="Select Store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Handed Over To</label>
                                            <Input 
                                                value={header.handover_to}
                                                onChange={(e) => setHeader({...header, handover_to: e.target.value})}
                                                disabled={isLocked}
                                                placeholder="Representative Name"
                                                className="h-11 rounded-xl bg-white border-border/40"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="mt-3 space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">General Protocol Remark</label>
                                <Textarea 
                                    value={header.remark}
                                    onChange={(e) => setHeader({...header, remark: e.target.value})}
                                    disabled={isLocked}
                                    placeholder="Add any global remarks or instructions here..."
                                    className="min-h-[80px] rounded-xl bg-white border-border/40 resize-none text-[13px]"
                                />
                            </div>
                        </div>

                        {/* Section 2: Lines Items Matrix */}
                        <div className="bg-white border border-border/40 rounded-3xl shadow-sm overflow-hidden flex flex-col relative z-10 print-friendly">
                            <div className="p-4 border-b border-border/40 bg-card/10 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Sector 2: Hardware Execution Matrix
                                </h3>
                                {!isLocked && (
                                    <Button size="sm" variant="outline" onClick={addItem} className="h-8 rounded-xl text-[10px] font-black uppercase">
                                        <Plus className="h-3 w-3 mr-1" /> Add Asset Line
                                    </Button>
                                )}
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                                <Table>
                                    <TableHeader className="bg-muted/5 sticky top-0 z-20 backdrop-blur-md">
                                        <TableRow className="h-10 hover:bg-transparent border-none">
                                            <TableHead className="w-[40px] text-center text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest pl-6">#</TableHead>
                                            <TableHead className="w-[280px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Asset Identification</TableHead>
                                            <TableHead className="w-[120px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Type</TableHead>
                                            <TableHead className="w-[140px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Sub-Type</TableHead>
                                            <TableHead className="w-[90px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest text-center">In_Stock</TableHead>
                                            <TableHead className="w-[100px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest text-center">Qty / UOM</TableHead>
                                            <TableHead className="w-[180px] text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest text-right pr-6">Remark / Authorization</TableHead>
                                            {!isLocked && <TableHead className="w-[50px]"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => {
                                            const assetDetails = assets.find(a => a.id === item.asset_id);
                                            const subTypeId = assetDetails?.sub_type?.id;
                                            const storeFilter = header.scope === 'Project scope' ? header.store_id : undefined;
                                            const cacheKey = `${subTypeId}-${storeFilter || 'all'}`;
                                            const stockCount = liveStockCache[cacheKey] || 0;
                                            
                                            const isNegativeStockAllowed = assetDetails?.sub_type?.allow_negative_stock || false;
                                            const isLowStock = stockCount < item.quantity;
                                            
                                            return (
                                                <TableRow key={item.id || idx} className={cn("h-12 border-b border-border/5 group transition-all", idx % 2 === 0 ? "bg-white/40" : "bg-muted/5")}>
                                                    <TableCell className="text-center font-bold text-muted-foreground text-[10px] pl-6">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <Select 
                                                            disabled={isLocked} 
                                                            value={item.asset_id ? item.asset_id : undefined} 
                                                            onValueChange={(v) => handleItemChange(idx, 'asset_id', v)}
                                                        >
                                                            <SelectTrigger className="h-8 rounded-lg bg-transparent border-transparent hover:border-border/40 focus:bg-white transition-all shadow-none w-full text-[11px] font-bold">
                                                                <SelectValue placeholder="SELECT_ASSET_NODE..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[300px] overflow-y-auto bg-white z-[99999]">
                                                                {availableAssets.map((a: any) => (
                                                                    <SelectItem key={a.id} value={a.id}>
                                                                        <div className="flex flex-col text-left">
                                                                            <span className="font-bold text-[10px] uppercase">{a.name}</span>
                                                                            <span className="text-[8px] text-muted-foreground uppercase opacity-60">{a.brand} {a.model_number}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {assetDetails ? (
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{assetDetails.sub_type?.asset_type?.name || '-'}</span>
                                                        ) : <span className="text-muted-foreground/20">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assetDetails ? (
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-primary border-primary/10 bg-primary/5 h-5 px-2">
                                                                {assetDetails.sub_type?.name || '-'}
                                                            </Badge>
                                                        ) : <span className="text-muted-foreground/20">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {item.asset_id ? (
                                                            <Badge variant="outline" className={cn(
                                                                "h-5 rounded font-mono font-bold w-12 justify-center text-[9px]",
                                                                isLowStock && isNegativeStockAllowed ? "border-amber-200 text-amber-600 bg-amber-50" : 
                                                                isLowStock ? "border-red-200 text-red-600 bg-red-50" : 
                                                                "border-emerald-200 text-emerald-600 bg-emerald-50"
                                                            )}>
                                                                {stockCount}
                                                            </Badge>
                                                        ) : <span className="text-muted-foreground/20">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 bg-white/50 border border-border/20 rounded-lg p-0.5 focus-within:border-primary/50 transition-colors">
                                                            <Input 
                                                                type="number"
                                                                min="1"
                                                                disabled={isLocked}
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                                className="h-6 w-12 border-none shadow-none text-center font-bold px-1 text-[11px]"
                                                            />
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase pr-1 w-8 text-center">{item.uom}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        <Input 
                                                            disabled={isLocked}
                                                            value={item.remark}
                                                            onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                                                            placeholder="AUTHORIZATION_NOTE..."
                                                            className="h-8 rounded-lg bg-transparent border-transparent hover:border-border/40 focus:bg-white transition-all shadow-none text-[10px] font-bold text-right"
                                                        />
                                                    </TableCell>
                                                    {!isLocked && (
                                                        <TableCell className="text-right pr-4">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => removeItem(idx)}
                                                                className="h-6 w-6 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Audit Trail Section - Re-designed per Screenshot */}
                        {currentId && (
                            <div id="protocol-audit-trail" className="space-y-6 pt-10">
                                <h3 className="text-[14px] font-black text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-4 pl-2 opacity-50">
                                    <History size={18} /> Protocol_Audit_Trail
                                </h3>

                                <div className="border border-border/40 rounded-[2.5rem] overflow-hidden bg-card/20 shadow-xl backdrop-blur-xl">
                                    <Table>
                                        <TableHeader className="bg-muted/10">
                                            <TableRow className="h-16 border-b border-border/40">
                                                <TableHead className="w-[180px] text-[11px] font-black text-foreground text-center uppercase border-r border-border/40 tracking-widest">Status</TableHead>
                                                <TableHead className="w-[200px] text-[11px] font-black text-foreground text-center uppercase border-r border-border/40 tracking-widest">Operator</TableHead>
                                                <TableHead className="w-[200px] text-[11px] font-black text-foreground text-center uppercase border-r border-border/40 tracking-widest">Timestamp</TableHead>
                                                <TableHead className="text-[11px] font-black text-foreground text-center uppercase tracking-widest">Operational Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {auditLogs.length > 0 ? auditLogs.map((log) => {
                                                const logStatus = log.status || "Unknown";
                                                const logRemarks = log.remarks || "No remarks provided";
                                                
                                                return (
                                                    <TableRow key={log.id} className="h-28 border-b border-border/10 hover:bg-muted/5 transition-all">
                                                        <TableCell className="text-center font-black text-[11px] text-foreground uppercase border-r border-border/40">
                                                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                                                {logStatus.charAt(0).toUpperCase() + logStatus.slice(1)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center font-black text-[11px] text-muted-foreground uppercase border-r border-border/40">
                                                            {log.profile?.full_name || "System"}
                                                        </TableCell>
                                                        <TableCell className="text-center font-black text-[10px] text-muted-foreground border-r border-border/40">
                                                            {format(new Date(log.created_at), "MMM dd yyyy // HH:mm")}
                                                        </TableCell>
                                                        <TableCell className="p-6">
                                                            <div className="w-full h-full min-h-[70px] bg-muted/20 rounded-2xl p-4 text-[12px] text-foreground font-medium relative group shadow-inner border border-border/20">
                                                                {logRemarks}
                                                                <div className="absolute bottom-2 right-2 opacity-10">
                                                                    <div className="w-3 h-[1.5px] bg-foreground rotate-45 translate-y-1" />
                                                                    <div className="w-3 h-[1.5px] bg-foreground rotate-45 translate-x-1" />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }) : (
                                                <TableRow className="h-20">
                                                    <TableCell colSpan={4} className="text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                        PROTOCOL_INITIALIZED: No status transitions found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    if (view === 'amend_compare') {
        const selectedAm = selectedAmendment 
            ? amendments.find(a => a.id === selectedAmendment) 
            : amendments[0];
            
        let previousAm = null;
        if (selectedAm) {
            previousAm = amendments.find(a => a.version_number === selectedAm.version_number - 1);
        }

        const getComparisons = () => {
            if (!selectedAm) return { added: [], modified: [], deleted: [] };
            const currItems = selectedAm.snapshot.items || [];
            const prevItems = previousAm?.snapshot.items || [];
            
            const added = currItems.filter((ci: any) => !prevItems.some((pi: any) => pi.asset_id === ci.asset_id));
            const deleted = prevItems.filter((pi: any) => !currItems.some((ci: any) => ci.asset_id === pi.asset_id));
            const modified = currItems.filter((ci: any) => {
                const prev = prevItems.find((pi: any) => pi.asset_id === ci.asset_id);
                return prev && (prev.quantity !== ci.quantity || prev.remark !== ci.remark);
            }).map((ci: any) => {
                const prev = prevItems.find((pi: any) => pi.asset_id === ci.asset_id);
                return { ...ci, prev_quantity: prev?.quantity, prev_remark: prev?.remark };
            });

            return { added, modified, deleted };
        };

        const { added, modified, deleted } = getComparisons();

        return (
            <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
                <header className="h-[72px] shrink-0 bg-white border-b border-border/40 flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setView('form')} className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted border border-border/40">
                            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-black text-foreground uppercase tracking-tight">
                                Amendment Details
                            </h1>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{deploymentNumber}</p>
                        </div>
                    </div>
                    {amendments.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Select Amendment:</span>
                            <Select value={selectedAm?.id} onValueChange={setSelectedAmendment}>
                                <SelectTrigger className="h-9 w-40 rounded-xl bg-white border-border/40 font-bold text-xs">
                                    <SelectValue placeholder="Select version" />
                                </SelectTrigger>
                                <SelectContent>
                                    {amendments.map(a => (
                                        <SelectItem key={a.id} value={a.id}>Amendment {a.version_number}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </header>
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {amendments.length === 0 ? (
                            <div className="text-center p-12 text-muted-foreground h-full flex items-center justify-center flex-col shadow-sm rounded-2xl bg-white border border-border/40">
                                <History className="h-12 w-12 opacity-20 mb-4" />
                                <span className="font-bold uppercase tracking-widest text-xs opacity-50">No Amendments Recorded</span>
                            </div>
                        ) : selectedAm && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm flex flex-col gap-2">
                                    <h2 className="text-sm font-black uppercase text-primary">Summary: Amendment {selectedAm.version_number}</h2>
                                    <p className="text-xs text-muted-foreground">{selectedAm.change_summary}</p>
                                    <p className="text-[10px] text-muted-foreground opacity-50">{format(new Date(selectedAm.created_at), 'PPp')}</p>
                                </div>

                                {/* Comparison Details */}
                                <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-6">
                                    <h3 className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                                        <GitBranch className="h-4 w-4" /> Change Comparison (vs {previousAm ? `Version ${previousAm.version_number}` : 'Baseline'})
                                    </h3>
                                    
                                    {added.length === 0 && modified.length === 0 && deleted.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No item changes detected in this amendment.</p>
                                    )}

                                    {added.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 inline-block rounded">Added Assets</h4>
                                            <ul className="text-xs space-y-1">
                                                {added.map((a: any, i: number) => {
                                                    const assetDetails = assets.find(ast => ast.id === a.asset_id);
                                                    return <li key={i} className="flex gap-2 text-emerald-700">
                                                                <Plus className="h-3.5 w-3.5" /> 
                                                                <span>{assetDetails?.asset_code || a.asset_id} - Qty: {a.quantity} {a.uom}</span>
                                                           </li>
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    {modified.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-1 inline-block rounded">Modified Assets</h4>
                                            <ul className="text-xs space-y-2">
                                                {modified.map((m: any, i: number) => {
                                                    const assetDetails = assets.find(ast => ast.id === m.asset_id);
                                                    return <li key={i} className="flex flex-col gap-1 text-amber-700 bg-amber-50/50 p-2 rounded-lg">
                                                                <div className="flex gap-2 items-center font-bold">
                                                                    <Edit className="h-3.5 w-3.5" /> 
                                                                    {assetDetails?.asset_code || m.asset_id}
                                                                </div>
                                                                <div className="pl-6 flex items-center gap-4 text-[11px]">
                                                                    {m.quantity !== m.prev_quantity && (
                                                                        <span>Qty: <span className="line-through opacity-60">{m.prev_quantity}</span> → {m.quantity}</span>
                                                                    )}
                                                                    {m.remark !== m.prev_remark && (
                                                                        <span>Remark: <span className="line-through opacity-60">{m.prev_remark || 'none'}</span> → {m.remark || 'none'}</span>
                                                                    )}
                                                                </div>
                                                           </li>
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    {deleted.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-1 inline-block rounded">Removed Assets</h4>
                                            <ul className="text-xs space-y-1">
                                                {deleted.map((d: any, i: number) => {
                                                    const assetDetails = assets.find(ast => ast.id === d.asset_id);
                                                    return <li key={i} className="flex gap-2 text-red-700 decoration-red-300">
                                                                <Trash2 className="h-3.5 w-3.5" /> 
                                                                <span className="line-through">{assetDetails?.asset_code || d.asset_id} - Qty: {d.quantity} {d.uom}</span>
                                                           </li>
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
            {/* 1. Protocol Header */}
            {/* 1. Protocol Header - Refined & Sharp */}
            <header className="h-20 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-30">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-1.5 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]" />
                            <h1 className="text-[20px] font-black text-slate-900 uppercase tracking-tighter">Custody Registry</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Terminal Operations Unit 9.4</span>
                        </div>
                    </div>
                    
                    <div className="h-10 w-[1px] bg-slate-100 mx-2" />
                    
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                        <Input 
                            placeholder="SEARCH_REGISTRY_INDEX..." 
                            className="h-11 w-96 pl-11 pr-4 text-[12px] font-bold bg-slate-50 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-indigo-500/20 transition-all placeholder:text-slate-400 rounded-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                         <SelectTrigger className="h-11 w-44 bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-600 focus:ring-2 focus:ring-indigo-500/20 shadow-inner">
                             <SelectValue placeholder="FILTER STATUS" />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl border-slate-200">
                             <SelectItem value="all">ALL_PROTOCOLS</SelectItem>
                             <SelectItem value="draft">DRAFT_MODE</SelectItem>
                             <SelectItem value="submitted">SUBMITTED</SelectItem>
                             <SelectItem value="approved">VERIFIED</SelectItem>
                         </SelectContent>
                    </Select>
                    <Button onClick={handleCreateNew} className="h-11 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                        <Plus size={18} className="mr-2" /> New Deployment
                    </Button>
                </div>
            </header>

            {/* 2. Intelligence Matrix Data Display */}
            <main className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col gap-6 bg-slate-50/50 transition-all duration-300">
                
                <div className="flex-1 overflow-auto rounded-[1.25rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40 scrollbar-hide w-full max-w-[98%] mx-auto transition-all duration-300">
                    <Table>
                        <TableHeader className="bg-[#D9EAF7] sticky top-0 z-20 hover:bg-[#D9EAF7]">
                            <TableRow className="h-14 border-none border-b border-slate-200">
                                <TableHead className="pl-10 text-[11px] font-black text-slate-800 uppercase tracking-widest">IDENTIFIER</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest">DATE</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center">TARGET_SCOPE</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest pl-8">DESTINATION</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center">STATUS</TableHead>
                                <TableHead className="text-right pr-10 text-[11px] font-black text-slate-800 uppercase tracking-widest">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeployments.length > 0 ? filteredDeployments.map((d) => {
                                const status = getStatusConfig(d.status);
                                return (
                                    <TableRow 
                                        key={d.id} 
                                        className="h-[72px] group hover:bg-muted/20 border-b border-border/40 transition-all cursor-pointer"
                                        onClick={() => handleEdit(d)}
                                    >
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-6">
                                                {/* Sharpened Status Dot Icon */}
                                                <div className="relative flex items-center justify-center">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                        d.status === 'approved' ? "bg-emerald-50" : 
                                                        d.status === 'submitted' ? "bg-blue-50" : "bg-slate-50"
                                                    )}>
                                                        <div className={cn(
                                                            "h-3 w-3 rounded-full animate-pulse",
                                                            d.status === 'approved' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
                                                            d.status === 'submitted' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-slate-400"
                                                        )} />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-black text-slate-900 uppercase tracking-tighter mb-0.5 leading-none">{d.deployment_number || 'DRAFT_TRANSACTION'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">v{d.version}</span>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d.project?.name || 'GENERIC_PROTOCOL'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                            {format(new Date(d.deployment_date), "dd MMM yyyy")}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-[0.15em] border border-indigo-100 italic">
                                                {d.scope}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-extrabold text-slate-800 tracking-tight">
                                                    {d.scope === 'User scope' ? d.recipient?.full_name : d.store?.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {d.department?.name || 'GLOBAL_UNIT'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "text-[10px] font-black uppercase tracking-widest h-7 px-4 rounded-xl border-none shadow-md min-w-[110px] justify-center", 
                                                status.class
                                            )}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white border border-transparent hover:border-border/60 hover:shadow-sm transition-all">
                                                     <Eye size={14} className="text-muted-foreground" />
                                                 </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow className="h-64 border-none hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center opacity-40">
                                        <div className="flex flex-col items-center gap-3">
                                            <AlertCircle size={40} className="text-muted-foreground" />
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em]">No Deployment Records Found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>

            {/* Audit Log Dialog Logic Removed - Audit shown inline at bottom of form */}
        </div>
    );
}
