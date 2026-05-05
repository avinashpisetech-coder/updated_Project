"use client";

import React from "react";
import { 
  Search, 
  Plus, 
  ChevronRight, 
  MoreVertical,
  History,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Trash2,
  Edit2,
  ExternalLink,
  Activity,
  Package,
  Monitor,
  Smartphone,
  Wifi,
  Zap,
  Cpu,
  MousePointer2,
  User,
  ReceiptIndianRupee,
  Camera,
  Box,
  ArrowLeft
} from "lucide-react";
import { useNavigation } from "@/components/providers/NavigationProvider";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AssetDetailPro } from "./AssetDetailPro";
import { AssetQRLabel } from "@/components/assets/AssetQRLabel";

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
    salvage_value?: number | string;
    asset_photograph_path?: string;
    brand_id?: string;
    model_id?: string;
}

interface AssetCatalog {
    id: string;
    name: string;
    sub_type_id: string;
    uom_id: string | null;
    brand: string | null;
    model_number: string | null;
}

interface UOM {
    id: string;
    name: string;
    symbol: string;
}

interface Props {
    initialAssets: Asset[];
    subTypes: AssetSubType[];
    purchases: { 
        id: string; 
        po_number: string; 
        supplier_id?: string;
        purchase_date?: string;
        total_raw_amount?: number;
        gst_amount?: number;
        grand_total?: number;
        project?: { company_id: string } 
    }[];
    profiles: { id: string; full_name: string; email: string }[];
    stores: { id: string; name: string }[];
    companies: { id: string; name: string }[];
    suppliers: { id: string; name: string }[];
    departments: { id: string; name: string }[];
    catalog: AssetCatalog[];
    uoms: UOM[];
}

export function InventoryClient({ initialAssets, subTypes, purchases, profiles, stores, companies, suppliers, departments, catalog, uoms }: Props) {
    const router = useRouter();
    const { isSidebarOpen } = useNavigation();
    const supabase = createClient();
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [typeFilter, setTypeFilter] = React.useState("all");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(15);
    
    // --- View/Protocol Management ---
    type ProtocolMode = 'LIST' | 'INWARD' | 'HANDOVER' | 'RECLAMATION' | 'INTELLIGENCE' | 'RETIREMENT' | 'QR_LABEL';
    const [activeProtocol, setActiveProtocol] = React.useState<ProtocolMode>('LIST');
    const [showQRLabel, setShowQRLabel] = React.useState(false);
    
    // --- Asset CRUD State ---
    const [assets, setAssets] = React.useState<Asset[]>(initialAssets);
    const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const [form, setForm] = React.useState({
        sub_type_id: "",
        brand: "",
        model: "",
        serial_number: "",
        inventory_number: "",
        date_put_to_use: "",
        store_id: "",
        department_id: "",
        status: "in_stock",
        condition: "new",
        purchase_date: "",
        warranty_expiry: "",
        purchase_id: "",
        specifications: {} as any,
        certifying_company_id: "",
        asset_name: "",
        asset_id_custom: "",
        asset_display_number: "",
        warranty_from: "",
        warranty_to: "",
        client_name: "",
        invoice_date: "",
        invoice_number: "",
        supplier_id: "",
        po_amount: 0,
        tax_amount: 0,
        gross_po_value: 0,
        total_tax_credit: 0,
        net_asset_value: 0,
        salvage_value: 0,
        warranty_remarks: "",
        maintenance_date: "",
        catalog_id: "",
        uom_id: "",
        asset_photograph_path: "",
        grn_number: "",
        indent_number: ""
    });

    const [checkoutForm, setCheckoutForm] = React.useState({
        user_id: "",
        notes: ""
    });

    const [checkinForm, setCheckinForm] = React.useState({
        condition: "good" as any,
        notes: ""
    });

    // --- Lifecycle Logic: Smart Procurement Propagation ---
    React.useEffect(() => {
        if (form.purchase_id && form.purchase_id !== "none") {
            const selectedPurchase = purchases.find(p => p.id === form.purchase_id);
            if (selectedPurchase) {
                setForm(f => ({ 
                    ...f, 
                    certifying_company_id: selectedPurchase.project?.company_id || f.certifying_company_id,
                    supplier_id: selectedPurchase.supplier_id || f.supplier_id,
                    purchase_date: selectedPurchase.purchase_date || f.purchase_date,
                    po_amount: selectedPurchase.total_raw_amount || 0,
                    tax_amount: selectedPurchase.gst_amount || 0,
                    gross_po_value: selectedPurchase.grand_total || 0,
                    net_asset_value: selectedPurchase.grand_total || 0, // Initial NAV matches Acquisition Cost
                    invoice_date: selectedPurchase.purchase_date || f.invoice_date // Default to PO Date
                }));
            }
        }
    }, [form.purchase_id, purchases]);

    React.useEffect(() => {
        if (form.catalog_id && form.catalog_id !== "none") {
            const selectedMatch = catalog.find(c => c.id === form.catalog_id);
            if (selectedMatch) {
                setForm(f => ({
                    ...f,
                    asset_name: selectedMatch.name,
                    sub_type_id: selectedMatch.sub_type_id,
                    brand: selectedMatch.brand || "",
                    model: selectedMatch.model_number || "",
                    uom_id: selectedMatch.uom_id || ""
                }));
            }
        }
    }, [form.catalog_id, catalog]);

    // --- Automation: Asset Code Generation ---
    React.useEffect(() => {
        if (form.sub_type_id && !form.asset_id_custom) {
            const st = subTypes.find(t => t.id === form.sub_type_id);
            const prefix = st?.code_prefix || "AST";
            const ts = Date.now().toString().slice(-6);
            setForm(f => ({ ...f, asset_id_custom: `${prefix}-${ts}` }));
        }
    }, [form.sub_type_id, subTypes]);

    const fetchAssets = async () => {
        const { data } = await supabase.from("assets")
            .select(`
                *, 
                sub_type:sub_type_id(name, code_prefix), 
                purchase:purchase_id(po_number), 
                holder:current_holder_id(full_name),
                company:certifying_company_id(name),
                supplier:supplier_id(name),
                store:store_id(name),
                department:department_id(name)
            `)
            .order('created_at', { ascending: false });
        if (data) setAssets(data as any);
    };

    const filteredAssets = assets.filter((a: Asset) => {
        const s = search.toLowerCase();
        return (
            a.asset_code?.toLowerCase().includes(s) || 
            a.serial_number?.toLowerCase().includes(s) ||
            a.brand?.toLowerCase().includes(s) ||
            a.model?.toLowerCase().includes(s)
        ) && (statusFilter === "all" || a.status === statusFilter) 
          && (typeFilter === "all" || a.sub_type_id === typeFilter);
    });

    React.useEffect(() => { setCurrentPage(1); }, [search, statusFilter, typeFilter]);

    const totalPages = Math.ceil(filteredAssets.length / pageSize);
    const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        try {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
            const { error: uploadError } = await supabase.storage.from('asset_photos').upload(`asset_registry/${fileName}`, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('asset_photos').getPublicUrl(`asset_registry/${fileName}`);
            setForm(f => ({ ...f, asset_photograph_path: publicUrl }));
            toast.success("Identity visual synchronized");
        } catch (error: any) {
            toast.error(`Photo upload failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAsset = async () => {
        if (!form.brand || !form.model) { toast.error("Brand and Model are required"); return; }
        setIsLoading(true);
        try {
            const payload: any = { ...form };
            if (form.asset_id_custom) payload.asset_code = form.asset_id_custom;
            
            // Clean empty UUID references
            const uuidKeys = ['purchase_id', 'catalog_id', 'uom_id', 'certifying_company_id', 'store_id', 'department_id', 'supplier_id'];
            uuidKeys.forEach(key => {
                if (payload[key] === "none" || !payload[key]) delete payload[key];
            });

            // Clean date fields if empty
            const dateKeys = ['purchase_date', 'warranty_expiry', 'warranty_from', 'warranty_to', 'invoice_date', 'maintenance_date', 'date_put_to_use'];
            dateKeys.forEach(key => {
                if (!payload[key]) delete payload[key];
            });

            const { error } = await supabase.from("assets").insert([payload]);
            if (error) throw error;
            toast.success("Node Inwarded to Stockroom");
            setActiveProtocol('LIST'); fetchAssets();
        } catch (error: any) {
            toast.error(`Ingestion Failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!selectedAsset || !checkoutForm.user_id) { toast.error("User assignment required"); return; }
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id, type: 'handover', direction: 'out', to_user_id: checkoutForm.user_id,
                condition_before: selectedAsset.condition, notes: checkoutForm.notes, performed_by: user?.id
            }]);
            await supabase.from("assets").update({ status: 'assigned', current_holder_id: checkoutForm.user_id }).eq("id", selectedAsset.id);
            toast.success("HANDOVER_PROTOCOL_COMPLETE");
            setActiveProtocol('LIST'); fetchAssets();
        } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
    };

    const handleCheckin = async () => {
        if (!selectedAsset) return;
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id, type: 'return', direction: 'in', from_user_id: selectedAsset.current_holder_id,
                condition_after: checkinForm.condition, notes: checkinForm.notes, performed_by: user?.id
            }]);
            await supabase.from("assets").update({ status: 'in_stock', current_holder_id: null, condition: checkinForm.condition }).eq("id", selectedAsset.id);
            toast.success("RECLAMATION_PROTOCOL_COMPLETE");
            setActiveProtocol('LIST'); fetchAssets();
        } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
    };

    const handleRetire = async () => {
        if (!selectedAsset) return;
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("stock_movements").insert([{
                asset_id: selectedAsset.id, type: 'retired', direction: 'out', from_user_id: selectedAsset.current_holder_id,
                condition_before: selectedAsset.condition, notes: "Decommissioning Protocol", performed_by: user?.id
            }]);
            await supabase.from("assets").update({ status: 'written_off', current_holder_id: null }).eq("id", selectedAsset.id);
            toast.success("RETIREMENT_PROTOCOL_TERMINATED");
            setActiveProtocol('LIST'); fetchAssets();
        } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
    };

    return (
        <div className={cn("flex flex-col h-screen overflow-hidden bg-white/50 backdrop-blur-xl transition-all duration-300", isSidebarOpen ? "pl-0" : "pl-[6px]")}>
            {/* Protocol Header */}
            <header className="h-[56px] shrink-0 bg-[var(--header-bg)] border-b border-[var(--header-border)] flex items-center justify-between px-8 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
                <div className="flex items-center gap-6 text-foreground">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-1 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                            <h1 className="text-[14px] font-black uppercase tracking-tight">
                                {activeProtocol === 'LIST' ? 'GLOBAL_INVENTORY_MESH' : activeProtocol.replace('_', ' ')}
                            </h1>
                        </div>
                    </div>
                    
                    {activeProtocol === 'LIST' ? (
                        <>
                            <div className="h-8 w-[1px] bg-border/40 mx-2" />
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors z-10" />
                                <Input 
                                    placeholder="SEARCH_MESH..." 
                                    className="h-8 w-64 pl-9 pr-3 text-[10px] font-bold bg-card/60 border border-border/40 backdrop-blur-xl shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/40 rounded-lg"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                         <Button variant="ghost" className="h-8 gap-2 text-[9px] font-black uppercase text-muted-foreground hover:text-primary" onClick={() => setActiveProtocol('LIST')}>
                            <ChevronRight className="rotate-180" size={12} /> Registry
                         </Button>
                    )}
                </div>

                {activeProtocol === 'LIST' && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-card/60 p-1 rounded-xl border border-border/40 shadow-sm mr-2 backdrop-blur-md">
                            <Select value={statusFilter} onValueChange={v => setStatusFilter(v)}>
                                <SelectTrigger className="h-7 w-36 bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-foreground focus:ring-0 shadow-none">
                                    <SelectValue placeholder="STATUS" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all" className="text-[9px] font-black uppercase">ALL_NODES</SelectItem>
                                    <SelectItem value="in_stock" className="text-[9px] font-black uppercase">IN_STOCK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="default" size="sm" className="h-9 px-6 rounded-xl text-[10px] font-black uppercase bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg transition-all" onClick={() => setActiveProtocol('INWARD')}>
                            <Plus size={14} className="mr-2" /> Commit Node
                        </Button>
                    </div>
                )}
            </header>

            {/* Main Protocol Workspace Area */}
            <main className="flex-1 overflow-hidden p-8 flex flex-col">
                {activeProtocol === 'LIST' && (
                    <div className="flex flex-col h-full animate-in fade-in duration-500">
                        <div className="flex-1 overflow-auto rounded-[3rem] border border-border/40 bg-card/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] backdrop-blur-xl no-scrollbar p-6">
                            <Table>
                                <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
                                    <TableRow className="h-14 border-none hover:bg-transparent text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                                        <TableHead className="pl-10">IDENTIFY_NODE</TableHead>
                                        <TableHead>CLASSIFICATION</TableHead>
                                        <TableHead>HARDWARE_SPEC</TableHead>
                                        <TableHead className="text-center">REGISTRY_STATUS</TableHead>
                                        <TableHead className="text-right pr-10">EXECUTE</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedAssets.length === 0 ? (
                                        <TableRow className="h-64 border-none hover:bg-transparent">
                                            <TableCell colSpan={5} className="text-center opacity-10">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Box size={40} />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Inventory_Mesh_Signals</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedAssets.map((asset, idx) => {
                                            const status = getStatusConfig(asset.status);
                                            const Icon = getIcon(asset.sub_type?.name);
                                            return (
                                                <TableRow key={asset.id} className={cn("h-16 border-b border-slate-50 transition-all group hover:bg-slate-100/50", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                                                    <TableCell className="pl-10 font-sans">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-primary shadow-sm">
                                                                <Icon size={16} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{asset.asset_code}</span>
                                                                <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">{asset.serial_number || 'S/N_NOT_ASSIGNED'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-primary border-primary/10 bg-primary/5 px-3 h-6">{asset.sub_type?.name}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-700 uppercase">{asset.brand} <span className="text-slate-300 ml-1">{asset.model}</span></span>
                                                            {asset.holder && <span className="text-[8px] font-black text-blue-600 uppercase mt-0.5 flex items-center gap-1"><User size={8} /> CUSTODIAN: {asset.holder.full_name}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={cn("text-[8px] font-black uppercase tracking-widest h-6 px-4 rounded-full border-none shadow-sm min-w-[100px] justify-center", status.class)}>{status.label}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-10">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-800"><MoreVertical size={14} /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-slate-100 bg-white shadow-2xl">
                                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-primary focus:text-white cursor-pointer" onClick={() => { setSelectedAsset(asset); setActiveProtocol('HANDOVER'); }}><ExternalLink size={14} /> Checkout_Node</DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-emerald-500 focus:text-white cursor-pointer" onClick={() => { setSelectedAsset(asset); setActiveProtocol('RECLAMATION'); }}><History size={14} /> Inward_Return</DropdownMenuItem>
                                                                <DropdownMenuSeparator className="mx-2 my-1 opacity-5" />
                                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-900 focus:text-white cursor-pointer" onClick={() => { setSelectedAsset(asset); setActiveProtocol('INTELLIGENCE'); }}><Edit2 size={14} /> Profile_Analysis</DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-indigo-500 focus:text-white cursor-pointer" onClick={() => { setSelectedAsset(asset); setShowQRLabel(true); }}><Camera size={14} /> Generate_Tag</DropdownMenuItem>
                                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest text-red-500 focus:bg-red-500 focus:text-white cursor-pointer" onClick={() => { setSelectedAsset(asset); setActiveProtocol('RETIREMENT'); }}><Trash2 size={14} /> Retire_Protocol</DropdownMenuItem>
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
                        <div className="h-12 shrink-0 border-t border-border/10 flex items-center justify-between px-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                             <span>Nodes: {(currentPage-1)*pageSize + 1} - {Math.min(currentPage*pageSize, filteredAssets.length)} of {filteredAssets.length}</span>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>PREV</Button>
                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>NEXT</Button>
                             </div>
                        </div>
                    </div>
                )}

                {/* Protocol Workspace: Commit Stock */}
                {activeProtocol === 'INWARD' && (
                    <div className="flex-1 overflow-auto bg-white rounded-[2rem] p-7 border border-slate-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 no-scrollbar">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-4">
                                     <h2 className="text-[14px] font-black uppercase tracking-tight flex items-center gap-2">
                                        <Plus size={16} className="text-primary" /> COMMIT_INVENTORY_NODE
                                    </h2>
                                    <span className="text-[9px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black border border-primary/10">ID: {form.asset_id_custom}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" className="h-8 px-4 text-[9px] font-black uppercase text-slate-400 hover:text-red-500" onClick={() => setActiveProtocol('LIST')}>ABORT</Button>
                                    <Button className="h-8 px-8 rounded-lg bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={handleAddAsset} disabled={isLoading}>
                                        {isLoading ? 'SYNCING...' : 'COMMIT_NODE'}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-12 gap-5 bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100/50">
                                {/* Compact Identity Panel */}
                                <div className="col-span-12 lg:col-span-1 border-r border-slate-200/30 pr-5">
                                     <div className="h-14 w-14 mx-auto rounded-lg bg-white border border-slate-200 flex items-center justify-center relative overflow-hidden group">
                                          {form.asset_photograph_path ? <img src={form.asset_photograph_path} className="w-full h-full object-cover" /> : <Camera size={14} className="text-slate-300" />}
                                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handlePhotoUpload} accept="image/*" />
                                     </div>
                                </div>

                                {/* UNIFIED 4-COLUMN MATRIX */}
                                <div className="col-span-12 lg:col-span-11 grid grid-cols-4 gap-4 items-start content-start">
                                    {/* SECTION I: IDENTIFICATION */}
                                    <div className="col-span-4 space-y-2 pt-2 pb-1">
                                        <h3 className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] pl-1">I. IDENTITY_&_CLASSIFICATION</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mesh Catalog</Label>
                                        <Select value={form.catalog_id} onValueChange={v => setForm(f => ({ ...f, catalog_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="CATALOG" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{catalog.map(c => <SelectItem key={c.id} value={c.id} className="text-[9px] font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Classification</Label>
                                        <Select value={form.sub_type_id} onValueChange={v => setForm(f => ({ ...f, sub_type_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{subTypes.map(t => <SelectItem key={t.id} value={t.id} className="text-[9px] font-black uppercase">{t.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">OEM / Brand</Label>
                                        <Input className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Model_Definition</Label>
                                        <Input className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Serial_ID (SN)</Label>
                                        <Input placeholder="REQUIRED" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">UOM_Unit</Label>
                                        <Select value={form.uom_id} onValueChange={v => setForm(f => ({ ...f, uom_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{uoms.map(u => <SelectItem key={u.id} value={u.id} className="text-[9px] font-black uppercase">{u.symbol}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2" /> {/* Gap Fill to maintain grid integrity */}

                                    {/* SECTION II: SOURCE_&_AUTHORITY */}
                                    <div className="col-span-4 space-y-2 pt-6 border-t border-slate-100/50">
                                        <h3 className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] pl-1">II. SOURCE_&_AUTHORITY</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Source_PO (Live-Link)</Label>
                                        <Select value={form.purchase_id} onValueChange={v => setForm(f => ({ ...f, purchase_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="PO_LNK" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="none" className="text-[9px] font-black uppercase">DIRECT_INWARD</SelectItem>
                                                {purchases.map(p => <SelectItem key={p.id} value={p.id} className="text-[9px] font-black uppercase">{p.po_number}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Supplier Authority</Label>
                                        <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="SOURCE" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{suppliers.map(s => <SelectItem key={s.id} value={s.id} className="text-[9px] font-black uppercase">{s.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Owners (Company)</Label>
                                        <Select value={form.certifying_company_id} onValueChange={v => setForm(f => ({ ...f, certifying_company_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="ENTITY" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{companies.map(c => <SelectItem key={c.id} value={c.id} className="text-[9px] font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Indent_Ref</Label>
                                        <Input className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.indent_number} onChange={e => setForm(f => ({ ...f, indent_number: e.target.value }))} />
                                    </div>

                                    {/* SECTION III: FINANCIAL_SNAPSHOT */}
                                    <div className="col-span-4 space-y-2 pt-6 border-t border-slate-100/50">
                                        <h3 className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] pl-1">III. FINANCIAL_SNAPSHOT</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purchase Date</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Invoice Number</Label>
                                        <Input className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Invoice Date</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">GRN Reference</Label>
                                        <Input className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.grn_number} onChange={e => setForm(f => ({ ...f, grn_number: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">PO_Value (NET)</Label>
                                        <Input type="number" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.po_amount} onChange={e => setForm(f => ({ ...f, po_amount: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tax Amount</Label>
                                        <Input type="number" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net_Capital_Expos.</Label>
                                        <Input type="number" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.net_asset_value} onChange={e => setForm(f => ({ ...f, net_asset_value: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Salvage Anchor</Label>
                                        <Input type="number" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: parseFloat(e.target.value) || 0 }))} />
                                    </div>

                                    {/* SECTION IV: LOGISTICS_&_LIFECYCLE */}
                                    <div className="col-span-4 space-y-2 pt-6 border-t border-slate-100/50">
                                        <h3 className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em] pl-1">IV. LOGISTICS_&_LIFECYCLE</h3>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Store / Buffer</Label>
                                        <Select value={form.store_id} onValueChange={v => setForm(f => ({ ...f, store_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="BIN" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{stores.map(s => <SelectItem key={s.id} value={s.id} className="text-[9px] font-black uppercase">{s.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Department Mesh</Label>
                                        <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                                            <SelectTrigger className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3 shadow-none"><SelectValue placeholder="DEPT" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">{departments.map(d => <SelectItem key={d.id} value={d.id} className="text-[9px] font-black uppercase">{d.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Warranty Activation</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.warranty_from} onChange={e => setForm(f => ({ ...f, warranty_from: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Warranty Terminus</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.warranty_to} onChange={e => setForm(f => ({ ...f, warranty_to: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inventory_Reg_#</Label>
                                        <Input placeholder="PHYSICAL_TAG" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.inventory_number} onChange={e => setForm(f => ({ ...f, inventory_number: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date_Put_to_Use</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.date_put_to_use} onChange={e => setForm(f => ({ ...f, date_put_to_use: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Next Maint. Anchor</Label>
                                        <Input type="date" className="h-8 rounded-lg border-slate-100 bg-white text-[10px] font-black uppercase pl-3" value={form.maintenance_date} onChange={e => setForm(f => ({ ...f, maintenance_date: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* Protocol Workspace: Intelligence (Profile) */}
                {activeProtocol === 'INTELLIGENCE' && (
                    <div className="flex-1 overflow-auto bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl no-scrollbar animate-in slide-in-from-right duration-500">
                        <AssetDetailPro asset={selectedAsset} onUpdate={() => { fetchAssets(); setActiveProtocol('LIST'); }} />
                    </div>
                )}

                {/* Protocol Workspace: Termination (Reclamation/Retire) */}
                {(activeProtocol === 'RECLAMATION' || activeProtocol === 'RETIREMENT') && (
                    <div className="flex-1 overflow-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl">
                         <div className="max-w-2xl mx-auto">
                            <h2 className={cn("text-[24px] font-black uppercase tracking-tight flex items-center gap-4 mb-8", activeProtocol === 'RETIREMENT' ? 'text-red-600' : 'text-emerald-600')}>
                                {activeProtocol === 'RETIREMENT' ? <Trash2 size={24} /> : <History size={24} />} 
                                {activeProtocol === 'RETIREMENT' ? 'HARDWARE_RETIREMENT_PROTOCOL' : 'INWARD_RECLAMATION_PROTOCOL'}
                            </h2>
                            <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 mb-10 text-center">
                                <div className="h-20 w-20 rounded-3xl bg-white border mx-auto flex items-center justify-center text-primary mb-6 shadow-xl">
                                     {getIcon(selectedAsset?.sub_type?.name)({ size: 32 })}
                                </div>
                                <h3 className="text-[20px] font-black uppercase tracking-tight text-slate-800">{selectedAsset?.asset_code}</h3>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Node Termination Audit</p>
                            </div>
                            
                            {activeProtocol === 'RECLAMATION' ? (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Audit Condition Grade</Label>
                                        <Select value={checkinForm.condition} onValueChange={v => setCheckinForm(f => ({ ...f, condition: v as any }))}>
                                            <SelectTrigger className="h-12 rounded-xl border-slate-100 text-[11px] font-black uppercase pl-6"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="new" className="text-[10px] font-black uppercase text-emerald-500">GRADE_A (PRISTINE)</SelectItem>
                                                <SelectItem value="good" className="text-[10px] font-black uppercase text-blue-500">GRADE_B (OPERATIONAL)</SelectItem>
                                                <SelectItem value="fair" className="text-[10px] font-black uppercase text-amber-500">GRADE_C (USED)</SelectItem>
                                                <SelectItem value="damaged" className="text-[10px] font-black uppercase text-red-500">DEGRADED (NEEDS_REPAIR)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Audit Remarks</Label>
                                        <Input placeholder="LOG_VISUAL_OR_TECHNICAL_DEFECTS" className="h-12 rounded-xl border-slate-100 text-[11px] font-black uppercase pl-6" value={checkinForm.notes} onChange={e => setCheckinForm(f => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-xl transition-all" onClick={handleCheckin} disabled={isLoading}>COMMIT_RECLAMATION</Button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-600">
                                        <p className="text-[11px] font-black uppercase tracking-widest mb-1">Permanent Decommissioning</p>
                                        <p className="text-[9px] font-medium leading-relaxed uppercase opacity-80">This action will mark the node as 'Retired', initiating final financial removal.</p>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                        <CheckCircle2 size={16} className="text-emerald-500" /> Authorization for Write-off Verified
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-xl transition-all" onClick={handleRetire} disabled={isLoading}>INITIALIZE_RETIREMENT</Button>
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {/* Protocol Workspace: Handover */}
                {activeProtocol === 'HANDOVER' && (
                    <div className="flex-1 overflow-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl animate-in fade-in transition-all">
                         <div className="max-w-2xl mx-auto">
                            <h2 className="text-[24px] font-black uppercase tracking-tight flex items-center gap-4 mb-8">
                                <ExternalLink size={24} className="text-primary" /> ASSET_HANDOVER_PROTOCOL
                            </h2>
                            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 mb-8 flex items-center gap-6">
                                <div className="h-14 w-14 rounded-xl bg-white border flex items-center justify-center text-primary shadow-sm">
                                    {getIcon(selectedAsset?.sub_type?.name)({ size: 24 })}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Mesh Node</p>
                                    <p className="text-[16px] font-black text-slate-800 uppercase leading-none">{selectedAsset?.asset_code}</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Field Identity</Label>
                                    <Select value={checkoutForm.user_id} onValueChange={v => setCheckoutForm(f => ({ ...f, user_id: v }))}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 text-[11px] font-black uppercase pl-6"><SelectValue placeholder="SELECT_CUSTODIAN" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">{profiles.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.full_name} ({p.email})</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Authorization Notes</Label>
                                    <Input placeholder="E.G. NEW_ONBOARDING_ASSIGN_24" className="h-12 rounded-xl border-slate-100 text-[11px] font-black uppercase pl-6" value={checkoutForm.notes} onChange={e => setCheckoutForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="mt-12 flex justify-end gap-4 border-t border-slate-100 pt-8">
                                <Button variant="ghost" className="h-12 px-8 text-[11px] font-black uppercase text-slate-400" onClick={() => setActiveProtocol('LIST')}>DE-AUTHORIZE</Button>
                                <Button className="h-12 px-12 rounded-2xl bg-primary hover:bg-primary/95 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={handleCheckout} disabled={isLoading}>EXECUTE_HANDOVER</Button>
                            </div>
                        </div>
                    </div>
                )}
                {showQRLabel && selectedAsset && (
                    <AssetQRLabel 
                        asset={selectedAsset} 
                        onClose={() => setShowQRLabel(false)} 
                    />
                )}
            </main>
        </div>
    );
}
