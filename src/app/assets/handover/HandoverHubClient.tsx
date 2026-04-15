"use client";

import React, { useState, useEffect } from "react";
import { 
    Plus, Search, ArrowLeft, Trash2, Printer, 
    Image as ImageIcon, History, AlertCircle, 
    Eye, LayoutDashboard, Camera, Save, 
    CheckCircle2, Box, ArrowRightLeft, 
    RefreshCw, X, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
    saveHandover, 
    updateHandoverStatus, 
    approveHandoverAction, 
    getHandoverAuditLogs 
} from "./actions";
import { createClient } from "@/lib/supabase/client";

interface Props {
    assets: any[];
    users: any[];
    requisitions: any[];
    departments: any[];
    projects: any[];
    stores: any[];
    initialData?: any[];
}

export function HandoverHubClient({ assets, users, requisitions, departments, projects, stores, initialData = [] }: Props) {
    const supabase = createClient();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [handoverNumber, setHandoverNumber] = useState("");
    const [status, setStatus] = useState("draft");
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [handovers, setHandovers] = useState<any[]>(initialData);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form Headers
    const [header, setHeader] = useState({
        recipient_id: "",
        project_id: "",
        department_id: "",
        store_id: "",
        provisioning_id: "",
        handover_date: format(new Date(), "yyyy-MM-dd"),
        notes: ""
    });

    // Form Items
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (currentId) fetchAuditLogs();
    }, [currentId]);

    const fetchAuditLogs = async () => {
        if (!currentId) return;
        const logs = await getHandoverAuditLogs(currentId);
        setAuditLogs(logs);
    };

    const handleCreateNew = () => {
        setCurrentId(null);
        setHandoverNumber("HND/NEW/AUTO");
        setStatus("draft");
        setHeader({
            recipient_id: "",
            project_id: "",
            department_id: "",
            store_id: "",
            provisioning_id: "",
            handover_date: format(new Date(), "yyyy-MM-dd"),
            notes: ""
        });
        setItems([{ asset_id: "", condition_status: "good", condition_notes: "", photos: [] }]);
        setAuditLogs([]);
        setView('form');
    };

    const handleEdit = (handover: any) => {
        setCurrentId(handover.id);
        setHandoverNumber(handover.handover_number);
        setStatus(handover.status);
        setHeader({
            recipient_id: handover.recipient_id,
            project_id: handover.project_id,
            department_id: handover.department_id,
            store_id: handover.store_id || "",
            provisioning_id: handover.provisioning_id || "",
            handover_date: handover.handover_date,
            notes: handover.notes || ""
        });
        
        // Fetch items
        const fetchItems = async () => {
            const { data } = await supabase.from("asset_handover_items").select("*").eq("handover_id", handover.id);
            setItems(data || []);
        };
        fetchItems();
        setView('form');
    };

    const handleAddLine = () => {
        setItems([...items, { asset_id: "", condition_status: "good", condition_notes: "", photos: [] }]);
    };

    const handleRemoveItem = (idx: number) => {
        const newItems = [...items];
        newItems.splice(idx, 1);
        setItems(newItems);
    };

    const handleItemChange = (idx: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        setItems(newItems);
    };

    const handleFileUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems = [...items];
        newItems[idx].isUploading = true;
        setItems(newItems);

        const photoUrls = [...(items[idx].photos || [])];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `condition_tracking/${fileName}`;

            const { error } = await supabase.storage.from('asset_handover_photos').upload(filePath, file);
            if (error) {
                toast.error(`Upload failed: ${error.message}`);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage.from('asset_handover_photos').getPublicUrl(filePath);
            photoUrls.push(publicUrl);
        }

        const finalItems = [...items];
        finalItems[idx].photos = photoUrls;
        finalItems[idx].isUploading = false;
        setItems(finalItems);
    };

    const handleSave = async (newStatus: string) => {
        if (!header.recipient_id || items.length === 0) {
            toast.error("Handover Protocol Incomplete: Recipient and Items required.");
            return;
        }

        setIsProcessing(true);
        try {
            const payload = { ...header, status: newStatus, id: currentId };
            const saved = await saveHandover(payload, items);
            
            setCurrentId(saved.id);
            setHandoverNumber(saved.handover_number);
            setStatus(saved.status);
            toast.success("Protocol Document Synchronized Successfully.");
            
            // Force immediate refresh of Chronology
            const logs = await getHandoverAuditLogs(saved.id);
            setAuditLogs(logs);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        if (!currentId) return;
        setIsProcessing(true);
        try {
            await approveHandoverAction(currentId);
            setStatus('approved');
            toast.success("Handover Officially Verified. Asset ownership transferred.");
            fetchAuditLogs();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!currentId) return;
        setIsProcessing(true);
        try {
            await updateHandoverStatus(currentId, newStatus);
            setStatus(newStatus);
            toast.success(`Protocol state updated to ${newStatus.toUpperCase()}`);
            fetchAuditLogs();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredHandovers = handovers.filter(h => {
        const searchStr = `${h.handover_number} ${h.recipient?.full_name}`.toLowerCase();
        const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const isLocked = status === 'approved' || status === 'deleted';

    if (view === 'form') {
        return (
            <div className="flex flex-col min-h-screen w-full bg-slate-50/50">
                <header className="h-[72px] shrink-0 bg-white border-b border-border/40 flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted border border-border/40">
                             <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-[17px] font-black text-slate-900 uppercase tracking-tighter">Direct_Handover Hub</h1>
                                <div className="h-5 w-[1px] bg-slate-200" />
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white border-none h-5">
                                    {handoverNumber}
                                </Badge>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Physical Custody Transfer Node</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4">
                           <Button variant="outline" size="sm" onClick={() => setView('list')} className="h-9 px-4 rounded-lg text-[11px] font-bold bg-[#E1F0F7] border-[#C5E1F0] text-slate-700 hover:bg-[#D4E9F4]">
                               Close
                           </Button>
                           <Button variant="outline" size="sm" onClick={() => setView('list')} className="h-9 px-4 rounded-lg text-[11px] font-bold bg-[#E1F0F7] border-[#C5E1F0] text-slate-700 hover:bg-[#D4E9F4]">
                               Back
                           </Button>
                           {currentId && (
                               <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-4 rounded-lg text-[11px] font-bold bg-[#E1F0F7] border-[#C5E1F0] text-slate-700 hover:bg-[#D4E9F4]">
                                   Print
                               </Button>
                           )}
                        </div>

                        {/* Action Dropdown - HIGHLIGHTED CYAN */}
                        {!['deleted', 'cancelled'].includes(status) && (
                            <Select 
                                value={status}
                                onValueChange={(v) => {
                                    if (v === status) return;
                                    if (v === 'save') handleSave('draft');
                                    else if (v === 'submit') handleSave('submitted');
                                    else if (v === 'approve') handleApprove();
                                    else handleStatusChange(v);
                                }}
                            >
                                <SelectTrigger className="h-10 w-60 rounded-xl bg-[#0F172A] text-sky-400 border-2 border-sky-500/30 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-sky-500/20 hover:bg-slate-900 transition-all duration-300 ring-2 ring-sky-500/10 ring-offset-2">
                                    <div className="flex items-center gap-2 w-full justify-center">
                                        <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                        <SelectValue placeholder="HANDOVER_PROTOCOL_STATE" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 shadow-2xl rounded-xl">
                                    <div className="px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                                        Active State: {status}
                                    </div>
                                    <SelectItem value={status} disabled className="opacity-50 font-bold">CURRENT_STATE</SelectItem>
                                    
                                    {status === 'draft' && (
                                        <>
                                            <SelectItem value="save" className="text-indigo-600 font-bold">💾 Register Draft</SelectItem>
                                            <SelectItem value="submit" className="text-emerald-600 font-bold">🚀 Finalize Protocol</SelectItem>
                                        </>
                                    )}
                                    {status === 'submitted' && (
                                        <SelectItem value="approve" className="text-emerald-600 font-bold">✅ Official Verification</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </header>

                <div className="flex-1 p-4 lg:p-6 layout-content bg-slate-50/50 transition-all duration-300">
                    <div className="w-full max-w-[98%] mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        
                        {/* Sector 1: Custodian Profile */}
                        <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm backdrop-blur-xl">
                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Sector 1: Custodian Identity Mapping
                            </h3>
                            
                            <div className="grid grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Transfer Recipient</label>
                                    <Select disabled={isLocked} value={header.recipient_id} onValueChange={(v) => setHeader({...header, recipient_id: v})}>
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-100 font-medium">
                                            <SelectValue placeholder="Select Recipient" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Physical Location (Project)</label>
                                    <Select disabled={isLocked} value={header.project_id} onValueChange={(v) => setHeader({...header, project_id: v})}>
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-100 font-medium">
                                            <SelectValue placeholder="Select Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Transfer Source Hub</label>
                                    <Select disabled={isLocked} value={header.store_id} onValueChange={(v) => setHeader({...header, store_id: v})}>
                                        <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-100 font-medium">
                                            <SelectValue placeholder="Select Source Store" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Transfer Date</label>
                                    <Input 
                                        type="date"
                                        disabled={isLocked}
                                        value={header.handover_date}
                                        onChange={(e) => setHeader({...header, handover_date: e.target.value})}
                                        className="h-10 rounded-xl bg-slate-50 border-slate-100 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sector 2: Hardware Condition Matrix */}
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col relative z-10">
                            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Sector 2: Hardware Physical condition matrix
                                </h3>
                                {!isLocked && (
                                    <Button onClick={handleAddLine} variant="outline" className="h-8 px-4 rounded-lg bg-white text-[10px] font-black uppercase text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                                        <Plus className="h-3.5 w-3.5 mr-2" /> Add Hardware Node
                                    </Button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-[#D9EAF7] hover:bg-[#D9EAF7]">
                                        <TableRow className="h-11 border-none">
                                            <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest pl-8">ASSET_SERIAL_ID</TableHead>
                                            <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center">CONDITION</TableHead>
                                            <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center">TELEMETRY_PHOTOS</TableHead>
                                            <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest">TECHNICAL_NOTES</TableHead>
                                            {!isLocked && <TableHead className="w-10 pr-8" />}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, idx) => (
                                            <TableRow key={idx} className="group hover:bg-muted/30 border-b border-slate-100 transition-all transition-colors h-16">
                                                <TableCell className="pl-8">
                                                    <Select disabled={isLocked} value={item.asset_id} onValueChange={(v) => handleItemChange(idx, 'asset_id', v)}>
                                                        <SelectTrigger className="h-9 w-64 rounded-lg bg-white border-slate-200 text-xs font-bold uppercase tracking-tight">
                                                            <SelectValue placeholder="SCAN_HARDWARE..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[300px] w-[350px]">
                                                            {assets && assets.length > 0 ? assets.map(a => (
                                                                <SelectItem key={a.id} value={a.id} className="font-bold text-xs uppercase py-3 border-b border-slate-50">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-indigo-600 font-black">{a.asset_code}</span>
                                                                            {a.serial_number && (
                                                                                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">SN: {a.serial_number}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[9px] text-slate-400 font-bold tracking-wider">{a.brand} {a.model}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            )) : (
                                                                <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase">
                                                                    No assets available for handover
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Select disabled={isLocked} value={item.condition_status} onValueChange={(v) => handleItemChange(idx, 'condition_status', v)}>
                                                        <SelectTrigger className={cn(
                                                            "h-8 w-28 rounded-lg text-[10px] font-black uppercase text-center mx-auto",
                                                            item.condition_status === 'good' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            item.condition_status === 'mint' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                        )}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="mint">MINT (NEW)</SelectItem>
                                                            <SelectItem value="good">GOOD (USE)</SelectItem>
                                                            <SelectItem value="fair">FAIR (WEAR)</SelectItem>
                                                            <SelectItem value="poor">POOR (DAMAGE)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <label className={cn(
                                                            "h-8 w-24 rounded-lg border flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all cursor-pointer",
                                                            item.isUploading ? "bg-slate-50 text-slate-400" : "bg-white text-indigo-500 border-indigo-100 hover:bg-indigo-50"
                                                        )}>
                                                            {item.isUploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                                                            {(item.photos?.length || 0)} Photos
                                                            {!isLocked && <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(idx, e)} disabled={item.isUploading} />}
                                                        </label>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        disabled={isLocked}
                                                        value={item.condition_notes}
                                                        onChange={(e) => handleItemChange(idx, 'condition_notes', e.target.value)}
                                                        placeholder="Physical observations..."
                                                        className="h-9 rounded-lg bg-transparent border-transparent hover:border-slate-200 focus:bg-white transition-all text-xs"
                                                    />
                                                </TableCell>
                                                {!isLocked && (
                                                    <TableCell className="text-right pr-8">
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Remark Area */}
                        <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Executive Transfer Protocol Notes</label>
                            <Textarea 
                                disabled={isLocked}
                                value={header.notes}
                                onChange={(e) => setHeader({...header, notes: e.target.value})}
                                placeholder="Add any high-level transfer observations or special conditions..."
                                className="min-h-[60px] rounded-2xl bg-slate-50 border-none resize-none text-xs font-semibold p-4"
                            />
                        </div>

                        {/* Audit Trail Section */}
                        {currentId && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 pl-1">
                                    Transfer Protocol Chronology
                                </h3>
                                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mt-3">
                                    <Table>
                                        <TableHeader className="bg-[#D9EAF7] hover:bg-[#D9EAF7]">
                                            <TableRow className="h-11 border-b border-slate-200">
                                                <TableHead className="w-[180px] text-[11px] font-black text-slate-800 text-center uppercase border-r border-slate-200">Protocol State</TableHead>
                                                <TableHead className="w-[180px] text-[11px] font-black text-slate-800 text-center uppercase border-r border-slate-200">Authority</TableHead>
                                                <TableHead className="w-[200px] text-[11px] font-black text-slate-800 text-center uppercase border-r border-slate-200">Timestamp</TableHead>
                                                <TableHead className="text-[11px] font-black text-slate-800 text-center uppercase">Executive Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {auditLogs.length > 0 ? auditLogs.map((log) => (
                                                <TableRow key={log.id} className="h-20 border-b border-slate-100 hover:bg-slate-50/50">
                                                    <TableCell className="text-center font-bold text-slate-600 border-r border-slate-100 text-[11px]">
                                                        {log.status.toUpperCase()}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-600 border-r border-slate-100 text-[11px]">
                                                        {log.profile?.full_name || "SYSTEM"}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-slate-400 border-r border-slate-100 text-[10px]">
                                                        {format(new Date(log.created_at), "MMM dd yyyy p")}
                                                    </TableCell>
                                                    <TableCell className="p-4">
                                                        <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 font-medium">
                                                            {log.remarks}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow className="h-20">
                                                    <TableCell colSpan={4} className="text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                                                        PROTOCOL_NODES_STANDBY: No chronology entries recorded
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

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
            {/* 1. Protocol Header */}
            <header className="h-20 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-30 transition-all duration-300">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-6 w-1.5 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.3)]" />
                            <h1 className="text-[20px] font-black text-slate-900 uppercase tracking-tighter">Direct Handover Registry</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Physical Assignment Unit 8.1</span>
                        </div>
                    </div>
                    
                    <div className="h-10 w-[1px] bg-slate-100 mx-2" />
                    
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-sky-600 transition-colors" />
                        <Input 
                            placeholder="SEARCH_HANDOVER_INDEX..." 
                            className="h-11 w-96 pl-11 pr-4 text-[12px] font-bold bg-slate-50 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-sky-500/20 transition-all placeholder:text-slate-400 rounded-xl"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                         <SelectTrigger className="h-11 w-44 bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest rounded-xl text-slate-600 shadow-inner">
                             <SelectValue placeholder="FILTER STATUS" />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl border-slate-200">
                             <SelectItem value="all">ALL_PROTOCOLS</SelectItem>
                             <SelectItem value="draft">DRAFT_MODE</SelectItem>
                             <SelectItem value="submitted">SUBMITTED</SelectItem>
                             <SelectItem value="approved">VERIFIED</SelectItem>
                         </SelectContent>
                    </Select>
                    <Button onClick={handleCreateNew} className="h-11 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20 transition-all active:scale-95">
                        <Plus size={18} className="mr-2" /> New Handover
                    </Button>
                </div>
            </header>

            {/* 2. Intelligence Matrix Registry */}
            <main className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col gap-6 bg-slate-50/50 transition-all duration-300">
                <div className="flex-1 overflow-auto rounded-[1.25rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40 scrollbar-hide w-full max-w-[98%] mx-auto transition-all duration-300">
                    <Table>
                        <TableHeader className="bg-[#D9EAF7] sticky top-0 z-20 hover:bg-[#D9EAF7]">
                            <TableRow className="h-14 border-none border-b border-slate-200">
                                <TableHead className="pl-10 text-[11px] font-black text-slate-800 uppercase tracking-widest">IDENTIFIER</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest">DATE</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest">RECIPIENT_USER</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest pl-8">PHYSICAL_PROJECT</TableHead>
                                <TableHead className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center">STATUS</TableHead>
                                <TableHead className="text-right pr-10 text-[11px] font-black text-slate-800 uppercase tracking-widest">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHandovers.length > 0 ? filteredHandovers.map((h) => (
                                <TableRow 
                                    key={h.id} 
                                    className="h-[72px] group hover:bg-muted/20 border-b border-slate-100 transition-all cursor-pointer"
                                    onClick={() => handleEdit(h)}
                                >
                                    <TableCell className="pl-10">
                                        <div className="flex items-center gap-6">
                                            <div className="relative flex items-center justify-center">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                                                    h.status === 'approved' ? "bg-emerald-50" : "bg-slate-50"
                                                )}>
                                                    <div className={cn(
                                                        "h-3 w-3 rounded-full",
                                                        h.status === 'approved' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" : "bg-slate-400"
                                                    )} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-black text-slate-900 uppercase tracking-tighter mb-0.5 leading-none">{h.handover_number}</span>
                                                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">v1.0</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black text-slate-500">
                                        {format(new Date(h.handover_date), "dd MMM yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                            </div>
                                            <span className="text-[12px] font-extrabold text-slate-800 tracking-tight">{h.recipient?.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="pl-8">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-slate-800 tracking-tight">{h.project?.name || 'GENERIC_PROJECT'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.department?.name || 'SYSTEM_GLOBAL'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn(
                                            "text-[10px] font-black uppercase tracking-widest h-7 px-4 rounded-xl border-none shadow-md min-w-[110px] justify-center",
                                            h.status === 'approved' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                        )}>
                                            {h.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-10">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white border hover:border-slate-200 transition-all">
                                                 <Eye size={14} className="text-slate-400" />
                                             </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow className="h-64 border-none">
                                    <TableCell colSpan={6} className="text-center opacity-40">
                                        <History size={40} className="mx-auto mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Handover Records Detected</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}
