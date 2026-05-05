"use client";

import React, { useState, useEffect } from "react";
import { 
    Plus, Search, ArrowLeft, Trash2, Printer, 
    History, Eye, ShieldCheck, ShieldAlert,
    LayoutDashboard, Layers, Activity, Monitor,
    Key, User, Package, RefreshCw, X, Shield,
    CheckCircle2, ArrowRightLeft, Database, Globe,
    FileText
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
import { 
    Dialog, DialogContent, DialogDescription, 
    DialogHeader, DialogTitle, DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
    saveSoftwareProduct, 
    saveLicenseEntry, 
    assignSeatAction, 
    revokeSeatAction,
    getSoftwareAuditLogs 
} from "./actions";

import { useNavigation } from "@/components/providers/NavigationProvider";

interface Props {
    initialSoftware: any[];
    suppliers: any[];
    purchases: any[];
    profiles: any[];
    hardware: any[];
}

export function SoftwareClient({ initialSoftware, suppliers, purchases, profiles, hardware }: Props) {
    const { isSidebarOpen } = useNavigation();
    const [view, setView] = useState<'list' | 'details'>('list');
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Assignment Modals
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [isAddLicenseOpen, setIsAddLicenseOpen] = useState(false);
    const [isAssignSeatOpen, setIsAssignSeatOpen] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Form States
    const [productForm, setProductForm] = useState({ 
        // Product Metadata
        name: "", 
        publisher: "", 
        category: "SaaS", 
        description: "",
        version: "",
        edition: "",
        publisher_part_number: "",
        
        // Transaction Info (Stored in software_licenses usually)
        transaction_id: "",
        transaction_type: "Acquisition",
        purchase_date: format(new Date(), "yyyy-MM-dd"),
        license_metric: "Per User",
        seat_count: 1,
        status: "approved",
        cost: 0,
        currency: "INR",
        maintenance_cost: 0,
        vendor_name: "", // Will map to supplier or text
        contract_reference: "",
        expiry_date: "",
        
        // Assignment/Lifecycle
        department_name: "", // For cost center
        location: "",
        
        // Compliance
        compliance_status: "compliant",
        has_downgrade_rights: false,
        has_upgrade_rights: false,
        is_reclaimable: false,
        reclamation_status: "eligible",
        usage_tracking_enabled: true
    });
    const [licenseForm, setLicenseForm] = useState({ license_key: "", license_type: "Standard", seat_count: 1, expiry_date: "", purchase_date: format(new Date(), "yyyy-MM-dd") });
    const [assignForm, setAssignForm] = useState({ license_id: "", profile_id: "", asset_id: "", notes: "" });

    useEffect(() => {
        if (selectedProduct) fetchAuditLogs();
    }, [selectedProduct]);

    const fetchAuditLogs = async () => {
        if (!selectedProduct) return;
        // Fetch license logs specifically for the first license for now, or aggregate
        const logs = await getSoftwareAuditLogs('license', selectedProduct.licenses?.[0]?.id || "");
        setAuditLogs(logs);
    };

    const filteredPortfolio = initialSoftware.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.publisher.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
        return matchesSearch && matchesCat;
    });

    const getCompliance = (product: any) => {
        const total = product.licenses?.reduce((a: number, b: any) => a + (b.seat_count || 0), 0) || 0;
        const used = product.licenses?.reduce((a: number, b: any) => a + (b.assignments?.[0]?.count || 0), 0) || 0;
        const ratio = total === 0 ? 0 : (used / total) * 100;
        return { total, used, ratio, isCritical: used >= total && total > 0, isEmpty: total === 0 };
    };

    const handleSaveProduct = async () => {
        setIsProcessing(true);
        try {
            await saveSoftwareProduct(productForm);
            setIsAddProductOpen(false);
            toast.success("Catalog Metadata Synchronized.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddLicense = async () => {
        if (!selectedProduct) return;
        setIsProcessing(true);
        try {
            await saveLicenseEntry({ ...licenseForm, product_id: selectedProduct.id });
            setIsAddLicenseOpen(false);
            toast.success("Entitlement Certificate Logged.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAssignSeat = async () => {
        setIsProcessing(true);
        try {
            await assignSeatAction(assignForm);
            setIsAssignSeatOpen(false);
            toast.success("Digital Seat Allocated Successfully.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (view === 'details' && selectedProduct) {
        const stats = getCompliance(selectedProduct);
        return (
            <div className="flex flex-col min-h-screen w-full bg-background font-sans">
                <header className="h-[72px] shrink-0 bg-card/40 backdrop-blur-3xl border-b border-border/40 flex items-center justify-between px-8 shadow-2xl shadow-black/5">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-10 w-10 rounded-xl hover:bg-muted/10 border border-border/40">
                             <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-[18px] font-bold text-foreground tracking-tight">{selectedProduct.name}</h1>
                                <div className="h-5 w-[1px] bg-border/40" />
                                <Badge variant="outline" className="text-[10px] font-bold uppercase bg-muted/20 text-muted-foreground border-none">
                                    {selectedProduct.publisher}
                                </Badge>
                            </div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5 opacity-60">Product_License_Profile</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => setView('list')} className="h-10 px-4 rounded-xl text-[11px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-all">Back to Portfolio</Button>
                        <Button 
                            onClick={() => setIsAddLicenseOpen(true)}
                            className="h-10 px-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-sky-600/20 border-none transition-all"
                        >
                            + Add License Key
                        </Button>
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-auto no-scrollbar">
                    <div className="mx-auto space-y-8 animate-in fade-in duration-500">
                        
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { label: "Utilization Rate", value: `${stats.ratio.toFixed(1)}%`, sub: "Total Capacity", color: stats.isCritical ? "text-destructive" : "text-primary" },
                                { label: "Total Licenses", value: stats.total, sub: "Purchased Seats", color: "text-foreground" },
                                { label: "Active Assignments", value: stats.used, sub: "Currently In Use", color: "text-foreground" },
                                { label: "Available Seats", value: Math.max(0, stats.total - stats.used), sub: "Remaining Pool", color: stats.isCritical ? "text-destructive" : "text-emerald-500" }
                            ].map((s, i) => (
                                <div key={i} className="bg-card/40 backdrop-blur-3xl border border-border/40 p-6 rounded-[2rem] shadow-xl shadow-black/5 transition-all hover:border-primary/20">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 opacity-60">{s.label}</p>
                                    <p className={cn("text-3xl font-black italic", s.color)}>{s.value}</p>
                                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase mt-1">{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* License Entries */}
                        <div className="bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[2rem] shadow-2xl shadow-black/5 overflow-hidden">
                            <div className="p-4 px-8 border-b border-border/40 bg-muted/5 flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 opacity-70">
                                    <Key size={14} className="text-primary" /> Registered_License_Matrix
                                </h3>
                                <Button onClick={() => setIsAssignSeatOpen(true)} disabled={stats.ratio >= 100 && stats.total > 0} className="h-9 px-5 rounded-xl bg-background border border-border/40 text-[10px] font-black uppercase shadow-inner hover:bg-muted/10">
                                     ALLOCATE_SEAT
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/10 backdrop-blur-md">
                                        <TableRow className="h-12 border-none">
                                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-10">Identity_Token</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Metric</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Seats</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Active</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">Expiration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedProduct.licenses?.map((lic: any, idx: number) => (
                                            <TableRow key={lic.id} className={cn(
                                                "h-16 group transition-all border-b border-border/20",
                                                idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                            )}>
                                                <TableCell className="pl-10 font-mono font-black text-[13px] text-foreground tracking-tight">{lic.license_key}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase text-primary border-primary/20 bg-primary/10 px-3">{lic.license_type}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-black text-foreground text-[16px] italic">{lic.seat_count}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[14px] font-black text-primary italic leading-none">{lic.assignments?.[0]?.count || 0}</span>
                                                        <div className="w-16 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                                            <div className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" style={{ width: `${((lic.assignments?.[0]?.count || 0) / (lic.seat_count || 1)) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-10">
                                                    <Badge className={cn("text-[10px] font-black uppercase tracking-widest h-7 px-4 rounded-xl shadow-lg shadow-black/5", lic.expiry_date ? "bg-muted/40 text-muted-foreground" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20")}>
                                                        {lic.expiry_date ? format(new Date(lic.expiry_date), "MMM dd, yyyy") : "PERPETUAL_CORE"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Description / Remarks */}
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Product Observations & Scope</label>
                            <div className="text-sm text-slate-600 leading-relaxed font-medium">
                                {selectedProduct.description || "No specific product notes recorded."}
                            </div>
                        </div>

                        {/* Allocation History */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1">Allocation History</h3>
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="h-10 border-b border-slate-200">
                                            <TableHead className="w-[180px] text-[10px] font-bold text-slate-400 text-center uppercase border-r">Status</TableHead>
                                            <TableHead className="w-[180px] text-[10px] font-bold text-slate-400 text-center uppercase border-r">Actor</TableHead>
                                            <TableHead className="w-[200px] text-[10px] font-bold text-slate-400 text-center uppercase border-r">Timestamp</TableHead>
                                            <TableHead className="text-[10px] font-bold text-slate-400 text-center uppercase">Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditLogs.length > 0 ? auditLogs.map((log) => (
                                            <TableRow key={log.id} className="h-16 border-b border-slate-100 hover:bg-slate-50/50 transition-all group">
                                                <TableCell className="text-center font-bold text-slate-800 border-r text-[10px] uppercase">{log.status}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-800 border-r text-[10px] uppercase">{log.profile?.full_name}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-400 border-r text-[9px] uppercase tracking-widest">{format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                                                <TableCell className="p-4">
                                                    <div className="text-[11px] font-medium text-slate-500 italic">
                                                        {log.remarks}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow className="h-24">
                                                <TableCell colSpan={4} className="text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                                                    No allocation history recorded
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <Dialog open={isAddLicenseOpen} onOpenChange={setIsAddLicenseOpen}>
                    <DialogContent className="max-w-xl rounded-3xl p-10 bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-[20px] font-bold text-slate-900">Register New License Key</DialogTitle>
                            <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Adding license seats for {selectedProduct.name}</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-5 my-8 py-8 border-y border-slate-50">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">License Key / ARN</label>
                                <Input value={licenseForm.license_key} onChange={e => setLicenseForm({...licenseForm, license_key: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl font-mono font-bold tracking-widest" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Seat Capacity</label>
                                <Input type="number" value={licenseForm.seat_count} onChange={e => setLicenseForm({...licenseForm, seat_count: parseInt(e.target.value)})} className="h-12 bg-slate-50 border-none rounded-xl font-bold text-lg" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Expiration Date</label>
                                <Input type="date" value={licenseForm.expiry_date} onChange={e => setLicenseForm({...licenseForm, expiry_date: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl font-bold uppercase" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddLicense} className="w-full h-12 bg-sky-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-sky-600/20 border-none">Commit License</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isAssignSeatOpen} onOpenChange={setIsAssignSeatOpen}>
                    <DialogContent className="max-w-xl rounded-3xl p-10 bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-[20px] font-bold text-slate-900">License Assignment</DialogTitle>
                            <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Allocating {selectedProduct.name} to project member</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-5 my-8 py-8 border-y border-slate-50">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Source License Pool</label>
                                <Select value={assignForm.license_id} onValueChange={v => setAssignForm({...assignForm, license_id: v})}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="Select Source Key" /></SelectTrigger>
                                    <SelectContent>
                                        {selectedProduct.licenses?.map((lic: any) => (
                                            <SelectItem key={lic.id} value={lic.id} className="font-bold text-xs py-3">{lic.license_key} ({lic.seat_count} Seats)</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Assign to Personnel</label>
                                <Select value={assignForm.profile_id} onValueChange={v => setAssignForm({...assignForm, profile_id: v, asset_id: ""})}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="Select User" /></SelectTrigger>
                                    <SelectContent>
                                        {profiles.map(p => <SelectItem key={p.id} value={p.id} className="font-bold text-xs py-3">{p.full_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Assign to Asset Node</label>
                                <Select value={assignForm.asset_id} onValueChange={v => setAssignForm({...assignForm, asset_id: v, profile_id: ""})}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl font-bold text-xs"><SelectValue placeholder="Select Hardware" /></SelectTrigger>
                                    <SelectContent>
                                        {hardware.map(h => <SelectItem key={h.id} value={h.id} className="font-bold text-xs py-3">{h.asset_code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAssignSeat} className="w-full h-12 bg-sky-600 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-sky-600/20 border-none">Confirm Assignment</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    if (isAddProductOpen) {
        return (
            <div className="absolute inset-0 z-[100] flex flex-col bg-[#F8FAFC] animate-in fade-in duration-500 overflow-hidden">
                <header className="h-[72px] shrink-0 flex items-center justify-between px-8 border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                            <Package size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Onboard New Software Product</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Catalog Data Entry</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsAddProductOpen(false)} 
                        className="h-10 px-5 rounded-lg hover:bg-slate-100 text-slate-500 transition-all gap-2 font-bold text-xs border border-slate-200"
                    >
                        <X size={16} /> CANCEL_ONBOARDING
                    </Button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
                    <div className="mx-auto space-y-6 p-8 pb-32 transition-all duration-500">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
                                <Database size={14} className="text-slate-400" />
                                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">General Product Information</h3>
                            </div>
                            <div className="p-6 grid grid-cols-6 gap-x-6 gap-y-5">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Name</label>
                                    <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publisher / Vendor</label>
                                    <Input value={productForm.publisher} onChange={e => setProductForm({...productForm, publisher: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version</label>
                                    <Input value={productForm.version} onChange={e => setProductForm({...productForm, version: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edition</label>
                                    <Input value={productForm.edition} onChange={e => setProductForm({...productForm, edition: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction ID</label>
                                    <Input value={productForm.transaction_id} onChange={e => setProductForm({...productForm, transaction_id: e.target.value})} className="h-11 bg-slate-50 text-sm font-mono" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Type</label>
                                    <Select value={productForm.transaction_type} onValueChange={v => setProductForm({...productForm, transaction_type: v})}>
                                        <SelectTrigger className="h-11 bg-slate-50 text-sm font-semibold uppercase"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Acquisition">Acquisition</SelectItem>
                                            <SelectItem value="Renewal">Renewal</SelectItem>
                                            <SelectItem value="Upgrade">Upgrade</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Effective Date</label>
                                    <Input type="date" value={productForm.purchase_date} onChange={e => setProductForm({...productForm, purchase_date: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Value</label>
                                    <div className="flex gap-2">
                                        <Input type="number" value={productForm.cost} onChange={e => setProductForm({...productForm, cost: parseFloat(e.target.value)})} className="h-11 bg-slate-50 text-sm font-semibold flex-1" />
                                        <Select value={productForm.currency} onValueChange={v => setProductForm({...productForm, currency: v})}>
                                            <SelectTrigger className="h-11 w-20 bg-slate-100 border-none font-black text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="INR">INR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maintenance Cost</label>
                                    <Input type="number" value={productForm.maintenance_cost} onChange={e => setProductForm({...productForm, maintenance_cost: parseFloat(e.target.value)})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Reference</label>
                                    <Input value={productForm.contract_reference} onChange={e => setProductForm({...productForm, contract_reference: e.target.value})} className="h-11 bg-slate-50 text-xs" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PPN (Manufacturer Part #)</label>
                                    <Input value={productForm.publisher_part_number} onChange={e => setProductForm({...productForm, publisher_part_number: e.target.value})} className="h-11 bg-slate-50 text-xs font-mono font-bold" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">License Model</label>
                                    <Select value={productForm.license_metric} onValueChange={v => setProductForm({...productForm, license_metric: v})}>
                                        <SelectTrigger className="h-11 bg-slate-50 text-sm font-semibold uppercase"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Per User">Per User</SelectItem>
                                            <SelectItem value="Per Device">Per Device</SelectItem>
                                            <SelectItem value="SaaS">SaaS Subscription</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</label>
                                    <Input type="number" value={productForm.seat_count} onChange={e => setProductForm({...productForm, seat_count: parseInt(e.target.value)})} className="h-11 bg-slate-50 text-sm font-bold" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</label>
                                    <Select value={productForm.status} onValueChange={v => setProductForm({...productForm, status: v})}>
                                        <SelectTrigger className="h-11 bg-slate-50 text-sm font-semibold uppercase"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Perpetual">Perpetual</SelectItem>
                                            <SelectItem value="Subscription">Subscription</SelectItem>
                                            <SelectItem value="OEM">OEM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col">
                                <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
                                    <Activity size={14} className="text-slate-400" />
                                    <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Timeline & Allocation</h3>
                                </div>
                                <div className="p-6 space-y-6 flex-1">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Effective From</label>
                                            <Input type="date" value={productForm.purchase_date} onChange={e => setProductForm({...productForm, purchase_date: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valid Until</label>
                                            <Input type="date" value={productForm.expiry_date} onChange={e => setProductForm({...productForm, expiry_date: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Assignment</label>
                                        <Input value={productForm.department_name} onChange={e => setProductForm({...productForm, department_name: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Location</label>
                                        <Input value={productForm.location} onChange={e => setProductForm({...productForm, location: e.target.value})} className="h-11 bg-slate-50 text-sm font-semibold" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col">
                                <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
                                    <ShieldCheck size={14} className="text-slate-400" />
                                    <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Compliance Controls</h3>
                                </div>
                                <div className="p-6 space-y-5 flex-1">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                        {[
                                            { id: 'downgrade', label: 'Downgrade Rights', key: 'has_downgrade_rights' },
                                            { id: 'upgrade', label: 'Upgrade Rights', key: 'has_upgrade_rights' },
                                            { id: 'reclamation', label: 'Reclaimable', key: 'is_reclaimable' },
                                            { id: 'usage', label: 'Usage Tracking', key: 'usage_tracking_enabled' },
                                        ].map(item => (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <Checkbox id={item.id} checked={(productForm as any)[item.key]} onCheckedChange={v => setProductForm({...productForm, [item.key]: !!v})} />
                                                <label htmlFor={item.id} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer">{item.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1.5 flex-1 flex flex-col pt-4">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Remarks / Audit Notes</label>
                                        <Textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="flex-1 min-h-[100px] bg-slate-50 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center pt-10">
                            <Button 
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        await saveSoftwareProduct(productForm);
                                        setIsAddProductOpen(false);
                                        toast.success("Software Product Cataloged.");
                                        window.location.reload();
                                    } catch (error: any) {
                                        toast.error(error.message);
                                    } finally { setIsProcessing(false); }
                                }} 
                                disabled={isProcessing}
                                className="h-16 px-16 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-[12px] font-black uppercase tracking-widest shadow-2xl"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin mr-3" /> : <Database className="mr-3" />}
                                {isProcessing ? "Processing..." : "Catalog Product"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background font-sans">
            <header className="h-[72px] shrink-0 bg-card/40 backdrop-blur-3xl border-b border-border/40 flex items-center justify-between px-10 shadow-2xl shadow-black/5 z-20">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="h-4 w-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                            <h1 className="text-[18px] font-black text-foreground tracking-tighter uppercase italic">Software_Asset_Portfolio</h1>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-4 opacity-60">Digital_License_Authority // SAM_CORE</p>
                    </div>
                    <div className="h-8 w-[1px] bg-border/40 mx-4" />
                    <div className="flex items-center gap-2 bg-muted/20 border border-border/40 rounded-[1.25rem] px-5 py-2 group focus-within:border-primary/40 transition-all">
                        <Search size={14} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input className="border-none bg-transparent h-6 w-64 text-sm font-black uppercase tracking-tight focus-visible:ring-0 p-0" placeholder="DECRYPT_PORTFOLIO..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <Button onClick={() => setIsAddProductOpen(true)} className="h-11 px-8 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                    + ONBOARD_PROTOCOL
                </Button>
            </header>

            <main className="flex-1 overflow-auto no-scrollbar p-10">
                <div className="mx-auto space-y-6 transition-all duration-500">
                    <Table className="bg-card/40 backdrop-blur-3xl rounded-[2rem] border border-border/40 shadow-2xl shadow-black/5 overflow-hidden">
                        <TableHeader className="bg-muted/10 backdrop-blur-md">
                            <TableRow className="hover:bg-transparent border-border/20 h-14">
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] pl-10 text-muted-foreground/60">Portfolio_Identity_Asset</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Publisher_Node</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-muted-foreground/60">Compliance_Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-muted-foreground/60">Utilization_Matrix</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-right pr-10 text-muted-foreground/60">Protocol</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPortfolio.length > 0 ? filteredPortfolio.map((p, idx) => {
                                const stats = getCompliance(p);
                                return (
                                    <TableRow key={p.id} onClick={() => { setSelectedProduct(p); setView('details'); }} className={cn(
                                        "group transition-all h-20 cursor-pointer border-border/10 hover:bg-primary/5",
                                        idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                    )}>
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-[1.25rem] bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 group-hover:scale-110 transition-all shadow-inner"><Layers size={20} /></div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-black text-foreground tracking-tight uppercase leading-none mb-1">{p.name}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{p.publisher}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><span className="text-[11px] font-black text-muted-foreground/60 uppercase">{p.publisher}</span></TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "text-[9px] font-black h-7 px-4 rounded-xl border-none shadow-lg shadow-black/5", 
                                                stats.isCritical ? "bg-destructive text-destructive-foreground" : stats.isEmpty ? "bg-muted/60 text-muted-foreground" : "bg-emerald-500 text-white"
                                            )}>
                                                {stats.isCritical ? "CRITICAL_SHORTAGE" : stats.isEmpty ? "NO_LICENSES" : "SECURE_COMPLIANCE"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[14px] font-black text-foreground italic">{stats.used} <span className="text-[10px] text-muted-foreground opacity-40">/ {stats.total}</span></span>
                                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                                                    <div className={cn("h-full shadow-[0_0_8px_rgba(var(--primary),0.3)]", stats.isCritical ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, stats.ratio)}%` }} />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg border border-border/40">
                                                <ArrowRightLeft size={14} className="text-primary" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow className="h-80 border-none opacity-20 text-center">
                                    <TableCell colSpan={5}>
                                        <Activity size={48} className="mx-auto mb-4 stroke-[1px]" />
                                        <p className="text-[11px] uppercase font-black tracking-[0.3em]">No_Assets_Identified_In_Current_Scope</p>
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
