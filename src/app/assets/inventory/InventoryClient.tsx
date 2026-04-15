"use client";

import React from "react";
import { 
  Search, 
  Plus, 
  Settings2, 
  ChevronRight, 
  Printer, 
  FileDown,
  MoreVertical,
  History,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Trash2,
  Edit2,
  ExternalLink,
  Activity,
  Box,
  Monitor,
  Smartphone,
  Wifi,
  Zap,
  Cpu,
  MousePointer2,
  User,
  ReceiptIndianRupee,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter,
    DialogDescription 
} from "@/components/ui/dialog";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssetDetailPro } from "./AssetDetailPro";

// --- Types ---
interface AssetSubType {
    id: string;
    name: string;
    code_prefix: string;
    required_fields: any;
}

interface Asset {
    id: string;
    asset_code: string;
    sub_type_id: string;
    brand: string;
    model: string;
    serial_number: string;
    status: string;
    condition: string;
    purchase_date: string;
    warranty_expiry: string;
    current_holder_id: string | null;
    holder?: { full_name: string };
    sub_type?: { name: string; code_prefix: string };
    purchase?: { po_number: string };
    specifications: any;
    created_at: string;
    purchase_cost?: number | string;
    depreciation_method?: string;
    depreciation_rate?: number | string;
    salvage_value?: number | string;
    unit_cost?: number | string;
}

interface Props {
    initialAssets: Asset[];
    subTypes: AssetSubType[];
    purchases: { id: string; po_number: string }[];
    profiles: { id: string; full_name: string; email: string }[];
    stores: { id: string; name: string }[];
    role: string;
}

export function InventoryClient({ initialAssets, subTypes, purchases, profiles, stores, role }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [typeFilter, setTypeFilter] = React.useState("all");
    
    // --- Asset CRUD State ---
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = React.useState(false);
    const [isCheckinModalOpen, setIsCheckinModalOpen] = React.useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const [isDisposalOpen, setIsDisposalOpen] = React.useState(false);
    const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [assets, setAssets] = React.useState<Asset[]>(initialAssets);

    const [form, setForm] = React.useState({
        sub_type_id: subTypes[0]?.id || "",
        brand: "",
        model: "",
        serial_number: "",
        inventory_number: "",
        date_put_to_use: "",
        store_id: "",
        status: "in_stock",
        condition: "new",
        purchase_date: "",
        warranty_expiry: "",
        purchase_id: "",
        specifications: {} as any
    });

    const [checkoutForm, setCheckoutForm] = React.useState({
        user_id: "",
        notes: ""
    });

    const [checkinForm, setCheckinForm] = React.useState({
        condition: "good" as any,
        notes: ""
    });

    const fetchAssets = async () => {
        const { data } = await supabase.from("assets")
            .select("*, sub_type:sub_type_id(name, code_prefix), purchase:purchase_id(po_number), holder:current_holder_id(full_name)")
            .order('created_at', { ascending: false });
        if (data) setAssets(data as any);
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = 
            a.asset_code?.toLowerCase().includes(search.toLowerCase()) || 
            a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
            a.brand?.toLowerCase().includes(search.toLowerCase()) ||
            a.model?.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        const matchesType = typeFilter === "all" || a.sub_type_id === typeFilter;
        
        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'in_stock': return { label: 'In Stock', class: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 };
            case 'assigned': return { label: 'Deployed', class: 'bg-blue-50 text-blue-600', icon: Activity };
            case 'under_repair': return { label: 'Repair Bay', class: 'bg-amber-50 text-amber-600', icon: Wrench };
            case 'damaged': return { label: 'Damaged', class: 'bg-red-50 text-red-600', icon: AlertCircle };
            case 'written_off': return { label: 'Retired', class: 'bg-slate-100 text-slate-400', icon: Trash2 };
            default: return { label: status, class: 'bg-slate-50 text-slate-400', icon: Package };
        }
    };

    const getIcon = (name: string = "") => {
        const n = name.toLowerCase();
        if (n.includes("laptop") || n.includes("desktop")) return Monitor;
        if (n.includes("mobile") || n.includes("phone")) return Smartphone;
        if (n.includes("network")) return Wifi;
        if (n.includes("power")) return Zap;
        if (n.includes("peripheral")) return MousePointer2;
        return Cpu;
    };

    const handleAddAsset = async () => {
        if (!form.brand || !form.model) {
            toast.error("Brand and Model are required");
            return;
        }

        setIsLoading(true);
        try {
            const payload = { ...form };
            if (payload.purchase_id === "none" || !payload.purchase_id) {
                delete (payload as any).purchase_id;
            }

            const { error } = await supabase.from("assets").insert([payload]);
            if (error) throw error;
            
            toast.success("Asset added to registry");
            setIsAddModalOpen(false);
            fetchAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!selectedAsset || !checkoutForm.user_id) {
            toast.error("User assignment required");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error: moveError } = await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id,
                type: 'handover',
                direction: 'out',
                to_user_id: checkoutForm.user_id,
                condition_before: selectedAsset.condition,
                notes: checkoutForm.notes,
                performed_by: user?.id
            }]);
            if (moveError) throw moveError;

            const { error: assetError } = await supabase.from("assets").update({
                status: 'assigned',
                current_holder_id: checkoutForm.user_id
            }).eq("id", selectedAsset.id);
            if (assetError) throw assetError;

            toast.success("Asset deployed successfully");
            setIsCheckoutModalOpen(false);
            fetchAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckin = async () => {
        if (!selectedAsset) return;

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error: moveError } = await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id,
                type: 'return',
                direction: 'in',
                from_user_id: selectedAsset.current_holder_id,
                condition_after: checkinForm.condition,
                notes: checkinForm.notes,
                performed_by: user?.id
            }]);
            if (moveError) throw moveError;

            const { error: assetError } = await supabase.from("assets").update({
                status: 'in_stock',
                current_holder_id: null,
                condition: checkinForm.condition
            }).eq("id", selectedAsset.id);
            if (assetError) throw assetError;

            toast.success("Asset returned to inventory");
            setIsCheckinModalOpen(false);
            fetchAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetire = async () => {
        if (!selectedAsset) return;

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error: moveError } = await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id,
                type: 'retired',
                direction: 'out',
                from_user_id: selectedAsset.current_holder_id,
                condition_before: selectedAsset.condition,
                notes: "Asset sent for Disposal/Retirement",
                performed_by: user?.id
            }]);
            if (moveError) throw moveError;

            const { error: assetError } = await supabase.from("assets").update({
                status: 'written_off',
                current_holder_id: null
            }).eq("id", selectedAsset.id);
            if (assetError) throw assetError;

            toast.success("Asset retired from active mesh");
            setIsDisposalOpen(false);
            fetchAssets();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
             {/* 1. Universal Protocol Header */}
             <header className="h-[72px] shrink-0 bg-[var(--header-bg)] border-b border-[var(--header-border)] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
                <div className="flex items-center gap-6 text-foreground">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                            <h1 className="text-[17px] font-black uppercase tracking-tight">GLOBAL_INVENTORY_MESH</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Physical Node Registry v8.4.2</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="h-8 w-[1px] bg-border/40 mx-2" />
                    
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors z-10" />
                        <Input 
                            placeholder="SEARCH_BY_SN_ASSET_ID_OR_BRAND..." 
                            className="h-10 w-full pl-11 pr-4 text-[11px] font-bold bg-card/60 border border-border/40 backdrop-blur-xl shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/40 rounded-xl"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-card/60 p-1 rounded-2xl border border-border/40 shadow-sm mr-2 backdrop-blur-md">
                        <Select value={statusFilter} onValueChange={v => setStatusFilter(v)}>
                            <SelectTrigger className="h-8 w-44 bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-foreground focus:ring-0 shadow-none">
                                <SelectValue placeholder="FILTER_STATUS" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all" className="text-[9px] font-black uppercase">ALL_STOCK_LEVELS</SelectItem>
                                <SelectItem value="in_stock" className="text-[9px] font-black uppercase">READY_FOR_HANDOVER</SelectItem>
                                <SelectItem value="assigned" className="text-[9px] font-black uppercase">ACTIVE_FIELD_NODES</SelectItem>
                                <SelectItem value="under_repair" className="text-[9px] font-black uppercase">MAINTENANCE_BAY</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="h-4 w-[1px] bg-border/40 mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 px-4 text-[10px] font-black text-muted-foreground uppercase hover:bg-background hover:text-red-500 transition-all rounded-lg">
                             Archive_Sweep
                        </Button>
                    </div>

                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="default" size="sm" className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xl shadow-primary/20 border-primary/20 transition-all active:scale-95">
                                <Plus size={18} className="mr-2" /> Commit_Stock_Node
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl rounded-[3rem] p-10 border-border/40 bg-card backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
                             <DialogHeader className="mb-10">
                                <DialogTitle className="text-[20px] font-black uppercase text-foreground tracking-tight flex items-center gap-4">
                                    <div className="h-7 w-1.5 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]" />
                                    INVENTORY_INWARD_PROTOCOL
                                </DialogTitle>
                                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic mt-2">Authorize hardware ingestion into central mesh stock</DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-8 mb-10">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Asset Classification</Label>
                                    <Select value={form.sub_type_id} onValueChange={v => setForm(f => ({ ...f, sub_type_id: v }))}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            {subTypes.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">OEM / Brand</Label>
                                    <Input placeholder="E.G. DELL, APPLE..." className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Machine Model</Label>
                                    <Input placeholder="LATITUDE_5420" className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                                </div>
                                 <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identity Serial ID</Label>
                                    <Input placeholder="8A-F802_SYNC" className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Inventory Control ID</Label>
                                    <Input placeholder="INV_WKS_001" className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6" value={form.inventory_number} onChange={e => setForm(f => ({ ...f, inventory_number: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Date Put to Use</Label>
                                    <Input type="date" className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6" value={form.date_put_to_use} onChange={e => setForm(f => ({ ...f, date_put_to_use: e.target.value }))} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Store Allocation</Label>
                                    <Select value={form.store_id} onValueChange={v => setForm(f => ({ ...f, store_id: v }))}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6"><SelectValue placeholder="SELECT_STORE" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="none" className="text-[9px] font-black uppercase opacity-40">NO_SPECIFIC_STORE</SelectItem>
                                            {stores?.map((s: any) => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-3 col-span-2">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Linked Procurement PO</Label>
                                    <Select value={form.purchase_id} onValueChange={v => setForm(f => ({ ...f, purchase_id: v }))}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-background border-border/40 text-[11px] font-black uppercase pl-6"><SelectValue placeholder="OPTIONAL_PO_IDENTITY" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="none" className="text-[9px] font-black uppercase opacity-40">Direct_Inward_No_PO</SelectItem>
                                            {purchases.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.po_number}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter className="gap-3">
                                <Button variant="ghost" className="h-12 px-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/5 transition-all" onClick={() => setIsAddModalOpen(false)}>ABORT_COMMIT</Button>
                                <Button className="h-12 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95" onClick={handleAddAsset} disabled={isLoading}>
                                     {isLoading ? "EXECUTING_INGESTION..." : "SYNC_TO_INVENTORY"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
             </header>

             {/* 2. Unified Resource Matrix */}
             <main className="flex-1 overflow-hidden p-8 flex flex-col">
                 <div className="flex-1 overflow-auto rounded-[3rem] border border-border/40 bg-card/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] backdrop-blur-xl no-scrollbar scroll-smooth p-6">
                     <Table className="font-sans">
                        <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
                            <TableRow className="h-14 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">IDENTIFY_NODE</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">CLASSIFICATION</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">HARDWARE_SPEC</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center">REGISTRY_STATUS</TableHead>
                                <TableHead className="text-right pr-10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">EXECUTE</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssets.length === 0 ? (
                                <TableRow className="h-64 border-none hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center opacity-10">
                                        <div className="flex flex-col items-center gap-2">
                                            <Box size={40} />
                                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Inventory_Mesh_Signals_Detected</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAssets.map((asset, idx) => {
                                    const status = getStatusConfig(asset.status);
                                    const Icon = getIcon(asset.sub_type?.name);
                                    
                                    return (
                                        <TableRow key={asset.id} className={cn(
                                            "h-16 border-b border-slate-50 transition-all group hover:bg-slate-100/50",
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                                        )}>
                                            <TableCell className="pl-10">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all shadow-sm">
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{asset.asset_code}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">{asset.serial_number || 'S/N_NOT_ASSIGNED'}</span>
                                                            {asset.purchase && (
                                                                <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                                                                    <ReceiptIndianRupee size={8} className="text-primary/40" />
                                                                    <span className="text-[8px] font-black uppercase text-primary/40">{asset.purchase.po_number}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/10 bg-primary/5 px-3">
                                                    {asset.sub_type?.name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[11px] font-black text-slate-700 uppercase">{asset.brand}</span>
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter truncate max-w-[120px]">{asset.model}</span>
                                                    </div>
                                                    {asset.holder ? (
                                                        <div className="flex items-center gap-1.5 opacity-60">
                                                            <User size={10} className="text-blue-500" />
                                                            <span className="text-[9px] font-black text-blue-600 uppercase">CUSTODIAN: {asset.holder.full_name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500/60 flex items-center gap-1">
                                                            <div className="h-1 w-1 rounded-full bg-emerald-400" /> READY_IN_MESH
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded-full border-none shadow-sm min-w-[100px] justify-center",
                                                        status.class
                                                    )}>
                                                        {status.label}
                                                    </Badge>
                                                    <span className="text-[8px] font-black uppercase text-slate-300 italic">{asset.condition}_GRADE</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-10">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 text-slate-300 hover:text-slate-800 transition-all">
                                                            <MoreVertical size={16} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 bg-white shadow-2xl">
                                                        <DropdownMenuItem 
                                                            className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-primary focus:text-white transition-all cursor-pointer"
                                                            onClick={() => { setSelectedAsset(asset); setIsCheckoutModalOpen(true); }}
                                                        >
                                                            <ExternalLink size={14} /> Checkout_Node
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-emerald-500 focus:text-white transition-all cursor-pointer"
                                                            onClick={() => { setSelectedAsset(asset); setIsCheckinModalOpen(true); }}
                                                        >
                                                            <History size={14} /> Inward_Return
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="mx-2 my-1.5 opacity-5" />
                                                        <DropdownMenuItem 
                                                            className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-900 focus:text-white transition-all cursor-pointer"
                                                            onClick={() => { setSelectedAsset(asset); setIsDetailsModalOpen(true); }}
                                                        >
                                                            <Edit2 size={14} /> Profile_Analysis
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-red-500 focus:bg-red-500 focus:text-white transition-all cursor-pointer"
                                                            onClick={() => { setSelectedAsset(asset); setIsDisposalOpen(true); }}
                                                        >
                                                            <Trash2 size={14} /> Retire_Protocol
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                     </Table>
                 </div>
             </main>


            {/* MODALS REDESIGN - Applying Snow White to all Dialogs */}
            {/* Checkout Modal */}
            <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-12 border-slate-100 bg-white shadow-2xl">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-[20px] font-black uppercase tracking-tight text-slate-800">ASSET_DEPLOYMENT_PROTOCOL</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Authorize manual assignment for {selectedAsset?.asset_code}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 mb-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assign Target Custodian</Label>
                            <Select value={checkoutForm.user_id} onValueChange={v => setCheckoutForm(f => ({ ...f, user_id: v }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-black uppercase pl-6"><SelectValue placeholder="SELECT_CUSTODIAN" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {profiles.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.full_name} ({p.email})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Execution Notes</Label>
                            <Input placeholder="E.G. NEW_ONBOARDING_ASSIGNMENT" className="h-12 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-black uppercase pl-6" value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="h-11 text-[11px] font-black uppercase text-slate-400" onClick={() => setIsCheckoutModalOpen(false)}>DE-AUTHORIZE</Button>
                        <Button className="h-11 px-12 rounded-xl bg-primary hover:bg-primary/95 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={handleCheckout} disabled={isLoading}>EXECUTE_HANDOVER</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-12 border-slate-100 bg-white shadow-2xl">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-[20px] font-black uppercase tracking-tight text-slate-800">INWARD_RECLAMATION_PROTOCOL</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Terminating custody for {selectedAsset?.asset_code}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 mb-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Asset Grade Audit</Label>
                            <Select value={checkinForm.condition} onValueChange={v => setCheckinForm(f => ({ ...f, condition: v as any }))}>
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-black uppercase pl-6"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="new" className="text-[10px] font-black uppercase text-emerald-500">GRADE_A (PRISTINE)</SelectItem>
                                    <SelectItem value="good" className="text-[10px] font-black uppercase text-blue-500">GRADE_B (OPERATIONAL)</SelectItem>
                                    <SelectItem value="fair" className="text-[10px] font-black uppercase text-amber-500">GRADE_C (USED)</SelectItem>
                                    <SelectItem value="damaged" className="text-[10px] font-black uppercase text-red-500">DEGRADED (NEEDS_REPAIR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condition Remarks</Label>
                            <Input placeholder="E.G. KEYBOARD_WEAR_DETECTED" className="h-12 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-black uppercase pl-6" value={checkinForm.notes} onChange={e => setCheckinForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="h-11 text-[11px] font-black uppercase text-slate-400" onClick={() => setIsCheckinModalOpen(false)}>ABORT_RETURN</Button>
                        <Button className="h-11 px-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20" onClick={handleCheckin} disabled={isLoading}>COMMIT_RECLAMATION</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Analysis Fullscreen Modal */}
            <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                <DialogContent className="max-w-6xl rounded-[3rem] p-14 border-none bg-white shadow-2xl h-[90vh] overflow-auto scrollbar-hide">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-[28px] font-black uppercase tracking-tighter text-slate-800 flex items-center gap-4">
                            <div className="h-8 w-1.5 bg-primary rounded-full" />
                            HARDWARE_NODE_INTELLIGENCE
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mt-2">Atomic Audit & Relationship Mesh Reconstruction</DialogDescription>
                    </DialogHeader>
                    <AssetDetailPro asset={selectedAsset} onUpdate={() => { fetchAssets(); setIsDetailsModalOpen(false); }} />
                </DialogContent>
            </Dialog>

            {/* Retire Protocol (Disposal) Modal */}
            <Dialog open={isDisposalOpen} onOpenChange={setIsDisposalOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-12 border-slate-100 bg-white shadow-2xl">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-[20px] font-black uppercase tracking-tight text-red-600">HARDWARE_RETIREMENT_PROTOCOL</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Decommissioning {selectedAsset?.asset_code}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-8 mb-10">
                        <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest">Permanent Decommissioning</p>
                            <p className="text-[9px] font-medium leading-relaxed uppercase">Authorization will mark the asset as 'Retired', initiating the final financial write-off. This action cannot be reversed by standard operators.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Disposal Reason/Method</Label>
                            <Select defaultValue="scrap">
                                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-black uppercase pl-6"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="scrap" className="text-[10px] font-black uppercase">Physical_Scrapping</SelectItem>
                                    <SelectItem value="sold" className="text-[10px] font-black uppercase">Authorized_Sale</SelectItem>
                                    <SelectItem value="donated" className="text-[10px] font-black uppercase">Charitable_Donation</SelectItem>
                                    <SelectItem value="lost" className="text-[10px] font-black uppercase text-red-500">Inventory_Loss_WriteOff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                             <input type="checkbox" id="finance-approval" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" checked />
                             <Label htmlFor="finance-approval" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">Notify Finance for Asset Write-off</Label>
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="ghost" className="h-11 text-[11px] font-black uppercase text-slate-400" onClick={() => setIsDisposalOpen(false)}>ABORT_PROTOCOL</Button>
                        <Button className="h-11 px-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20" onClick={handleRetire} disabled={isLoading}>INITIALIZE_RETIREMENT</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
