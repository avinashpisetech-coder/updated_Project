"use client";

import React from "react";
import { 
  Network, 
  Link2, 
  Unlink, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  History,
  Info,
  BadgeAlert,
  ArrowRight,
  Package,
  Cpu,
  MousePointer2,
  FileText,
  Plus,
  Zap,
  Image as ImageIcon,
  FileCheck,
  X,
  Layers,
  ShieldCheck,
  Activity,
  Printer,
  Shield,
  Settings,
  User,
  Truck,
  Building2,
  Receipt,
  Clock,
  Save,
  Trash2,
  ExternalLink
} from "lucide-react";
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, differenceInMonths } from "date-fns";

interface Props {
    asset: any;
    onUpdate?: () => void;
}

export function AssetDetailPro({ asset, onUpdate }: Props) {
    const supabase = createClient();
    const [isLoading, setIsLoading] = React.useState(false);
    
    // Core Data States
    const [insurance, setInsurance] = React.useState<any[]>([]);
    const [modifications, setModifications] = React.useState<any[]>([]);
    const [assignments, setAssignments] = React.useState<any[]>([]);
    const [maintenance, setMaintenance] = React.useState<any[]>([]);
    const [logs, setLogs] = React.useState<any[]>([]);
    const [valuation, setValuation] = React.useState<any>(null);

    // Modal States
    const [isInsuranceModalOpen, setIsInsuranceModalOpen] = React.useState(false);
    const [isModModalOpen, setIsModModalOpen] = React.useState(false);

    // Form States
    const [insuranceForm, setInsuranceForm] = React.useState({
        policy_number: "", provider_name: "", insurance_type: "Comprehensive",
        start_date: format(new Date(), "yyyy-MM-dd"), expiry_date: format(new Date(), "yyyy-MM-dd"),
        premium_amount: 0, insured_value: 0
    });
    const [modForm, setModForm] = React.useState({
        modification_date: format(new Date(), "yyyy-MM-dd"), modification_type: "Hardware Upgrade",
        description: "", cost: 0, performed_by: ""
    });

    React.useEffect(() => {
        fetchAllData();
    }, [asset.id]);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [insRes, modRes, dplRes, mntRes, logRes] = await Promise.all([
                supabase.from('asset_insurance').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }),
                supabase.from('asset_modifications').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }),
                supabase.from('stock_movements').select('*, performer:profiles(full_name)').eq('asset_id', asset.id).order('created_at', { ascending: false }),
                supabase.from('asset_maintenance').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }),
                supabase.from('asset_activity_logs').select('*, performer:profiles(full_name)').eq('asset_id', asset.id).order('created_at', { ascending: false })
            ]);

            setInsurance(insRes.data || []);
            setModifications(modRes.data || []);
            setAssignments(dplRes.data || []);
            setMaintenance(mntRes.data || []);
            setLogs(logRes.data || []);

            // Fetch Real-time Valuation
            const { data: valData } = await supabase.rpc('calculate_asset_valuation', { p_asset_id: asset.id });
            if (valData && valData[0]) setValuation(valData[0]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddInsurance = async () => {
        const { error } = await supabase.from('asset_insurance').insert({
            ...insuranceForm,
            asset_id: asset.id,
            created_by: (await supabase.auth.getUser()).data.user?.id
        });
        if (error) toast.error(error.message);
        else {
            toast.success("Insurance Policy Logged.");
            setIsInsuranceModalOpen(false);
            fetchAllData();
        }
    };

    const handleAddModification = async () => {
        const { error } = await supabase.from('asset_modifications').insert({
            ...modForm,
            asset_id: asset.id,
            created_by: (await supabase.auth.getUser()).data.user?.id
        });
        if (error) toast.error(error.message);
        else {
            toast.success("Modification Protocol Logged.");
            setIsModModalOpen(false);
            fetchAllData();
        }
    };

    // --- Financial Calculations ---
    const cost = parseFloat(asset.gross_po_value || asset.unit_cost || 0);
    const purchaseDate = new Date(asset.purchase_date || asset.created_at);
    const monthsPassed = differenceInMonths(new Date(), purchaseDate);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc] font-sans">
            
            {/* 1. PREMIUM HEADER SECTION */}
            <header className="px-10 py-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-[#003366] flex items-center justify-center text-white shadow-lg shadow-[#003366]/20 relative group">
                        <Package size={32} />
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[22px] font-black text-slate-900 uppercase tracking-tighter leading-none">{asset.asset_name || asset.sub_type?.name}</h2>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[9px] font-black uppercase px-3 h-5">IN_SERVICE</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-tighter leading-none">{asset.asset_name || asset.sub_type?.name}</h2>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[8px] font-black uppercase px-2 h-4">IN_SERVICE</Badge>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1 flex items-center gap-2">
                            {asset.brand} // {asset.model} // <span className="text-primary font-black">NODE_OID: {asset.asset_code}</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Node_Custodian</span>
                        <div className="flex items-center gap-2">
                           <User size={12} className="text-blue-500" />
                           <span className="text-[10px] font-black text-slate-700 uppercase">{asset.holder?.full_name || 'CENTRAL_HUB'}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Printer size={16} />
                    </Button>
                </div>
            </header>

            {/* 2. TABBED PROTOCOL MATRIX */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 bg-white border-b border-slate-100 shrink-0">
                    <TabsList className="h-[48px] bg-transparent p-0 gap-6 justify-start">
                        {["details", "issue", "insurance", "modifications", "maintenance", "depreciation", "documents", "history"].map(tab => (
                            <TabsTrigger 
                                key={tab} 
                                value={tab} 
                                className="h-full border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-slate-600"
                            >
                                {tab.replace('_', ' ')}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-[#f8fafc]">
                    
                    {/* --- DETAILS TAB: THE CORE GRID --- */}
                    <TabsContent value="details" className="m-0 space-y-6 focus-visible:ring-0">
                        <div className="grid grid-cols-12 gap-6">
                            {/* Primary Field Matrix */}
                            <div className="col-span-8 space-y-6">
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6 border-b border-slate-50 pb-3">Asset_Master_Specification</h3>
                                    
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                                        {[
                                            { label: "Certifying Company", value: asset.company?.name || 'ADIOS_CORE' },
                                            { label: "Asset Group", value: asset.sub_type?.asset_types?.name || 'CORE_EQUIPMENT' },
                                            { label: "Asset Type", value: asset.sub_type?.name },
                                            { label: "Asset Sub Type", value: asset.sub_type?.name },
                                            { label: "Indent No", value: asset.indent_number || 'N/A' },
                                            { label: "PO Number", value: asset.po_number || asset.purchase?.po_number || 'MANUAL_INWARD' },
                                            { label: "PO Date", value: asset.purchase?.purchase_date ? format(new Date(asset.purchase.purchase_date), 'dd MMM yyyy') : 'N/A' },
                                            { label: "GRN Number", value: asset.grn_number || 'N/A' },
                                            { label: "Received Date", value: asset.purchase_date ? format(new Date(asset.purchase_date), 'dd MMM yyyy') : 'N/A' },
                                            { label: "Condition", value: `${asset.condition || 'NEW'}_GRADE` },
                                            { label: "Retail UOM", value: asset.uom?.symbol || asset.uom?.name || 'NOS' },
                                            { label: "Ownership", value: asset.department?.name || 'CENTRAL' },
                                            { label: "Location", value: asset.store?.name || 'TRANSIT' }
                                        ].map(field => (
                                            <div key={field.label} className="space-y-1 border-b border-slate-50 pb-1">
                                                <Label className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{field.label}</Label>
                                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate">{field.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Purchase Order Tax Addition Table */}
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Purchase_Order_Tax_Addition</h4>
                                        <Receipt size={12} className="text-slate-300" />
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-slate-50/10">
                                            <TableRow className="border-slate-100">
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 pl-6">Tax Category</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 text-right">Percentage</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 text-right">Tax Amount</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 text-right pr-6">Credit Applicable</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow className="border-none text-[10px] font-bold text-slate-600">
                                                <TableCell className="pl-6 uppercase">GST Protocol (CGST+SGST)</TableCell>
                                                <TableCell className="text-right">18%</TableCell>
                                                <TableCell className="text-right font-black text-slate-900">₹{asset.tax_amount?.toLocaleString('en-IN') || '0.00'}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[7px] font-black px-2">YES_CREDIT</Badge>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Sidebar Matrix */}
                            <div className="col-span-4 space-y-6">
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
                                    <div className="h-40 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center relative group overflow-hidden shadow-inner">
                                        {asset.asset_photograph_path ? (
                                            <img src={asset.asset_photograph_path} alt="Node Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={32} className="text-slate-200 group-hover:scale-110 transition-transform" />
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Button variant="outline" className="h-6 w-6 rounded-lg bg-white/90 backdrop-blur shadow-sm p-0">
                                                <Plus size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Inward_Lifecycle_Status</p>
                                        <Badge className="bg-slate-900 text-white border-none rounded-lg h-6 px-4 text-[9px] font-black uppercase tracking-widest">
                                            {asset.status || 'IN_STOCK'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Vendor_Contact_Protocol</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <Truck size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-800 uppercase leading-none mb-0.5">{asset.supplier?.name || 'DIRECT'}</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Certified Vendor</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-300 uppercase">POC:</span>
                                                <span className="text-slate-600 uppercase">{asset.supplier?.city || 'HQ'} Division</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span className="text-slate-300 uppercase">Comm:</span>
                                                <span className="text-blue-500 font-black italic underline cursor-pointer">Email Link</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Trail */}
                            <div className="col-span-12">
                                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                     <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational_Audit_Trail</h4>
                                        <Badge variant="outline" className="rounded-lg h-4 px-2 text-[7px] font-black uppercase border-slate-200">Full_Log</Badge>
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-slate-50/10">
                                            <TableRow className="border-slate-100 h-8">
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 pl-6">Status</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400">Performed By</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 text-center">Timestamp</TableHead>
                                                <TableHead className="text-[8px] font-black uppercase text-slate-400 pr-6">Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(assignments.slice(0, 5)).map((log) => (
                                                <TableRow key={log.id} className="border-slate-50 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50/30">
                                                    <TableCell className="pl-6">
                                                       <Badge className="bg-blue-50 text-blue-600 border-none text-[7px] font-black uppercase h-4">{log.type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="uppercase text-slate-900">{log.performer?.full_name || 'SYSTEM'}</TableCell>
                                                    <TableCell className="text-center italic">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                    <TableCell className="pr-6 text-slate-400 uppercase italic">"{log.notes || 'Automated Protocol Sync'}"</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- ISSUE TAB: ASSIGNMENT HISTORY --- */}
                    <TabsContent value="issue" className="m-0 focus-visible:ring-0">
                         <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tighter">Custody_Lifecycle_Log</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Complete Issue and Return chronology</p>
                                </div>
                                <Button className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest gap-2">
                                    <Plus size={12} /> Initiate_Issue
                                </Button>
                            </div>
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 h-8">
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-6">Transaction_ID</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Recipient</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Issue Date</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Return Date</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.length > 0 ? assignments.map(mv => (
                                        <TableRow key={mv.id} className="border-slate-50 hover:bg-slate-50 transition-all font-black uppercase h-12">
                                            <TableCell className="pl-6 text-[10px] text-blue-600 italic">#{mv.id.slice(0, 8)}</TableCell>
                                            <TableCell className="text-[11px] text-slate-900">{mv.performer?.full_name}</TableCell>
                                            <TableCell className="text-slate-500 text-[10px]">{format(new Date(mv.created_at), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="text-slate-300 text-[10px]">N/A</TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-md h-5 px-2 text-[8px]">COMPLETED</Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-30 italic">No_Custody_Records_Found</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>

                    {/* --- INSURANCE TAB --- */}
                    <TabsContent value="insurance" className="m-0 space-y-6 focus-visible:ring-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tighter">Machine_Insurance_Vault</h3>
                            <Button onClick={() => setIsInsuranceModalOpen(true)} className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest gap-2 shadow-lg shadow-indigo-600/20">
                                <Shield size={12} /> Register_Coverage
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {insurance.map(policy => (
                                <div key={policy.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative group hover:shadow-md transition-all duration-300">
                                    <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Shield size={60} />
                                    </div>
                                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded-md h-5 px-2 text-[8px] mb-4 font-black uppercase">{policy.insurance_type}</Badge>
                                    <div className="space-y-0.5 mb-6">
                                        <p className="text-[18px] font-black text-slate-950 uppercase tracking-tighter leading-none">{policy.provider_name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Policy Protocol: {policy.policy_number}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-0.5">Coverage Period</span>
                                            <p className="text-[10px] font-black text-slate-700 uppercase italic leading-none">{format(new Date(policy.start_date), 'dd/MM/yy')} — {format(new Date(policy.expiry_date), 'dd/MM/yy')}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest block mb-0.5">Insured Value</span>
                                            <p className="text-[11px] font-black text-indigo-600 leading-none">₹{policy.insured_value?.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* --- MODIFICATIONS TAB --- */}
                    <TabsContent value="modifications" className="m-0 space-y-6 focus-visible:ring-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tighter">Hardware_Modification_Logs</h3>
                            <Button onClick={() => setIsModModalOpen(true)} className="h-9 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-widest gap-2 shadow-lg shadow-amber-600/20">
                                <Settings size={12} /> Log_Technical_Change
                            </Button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100">
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-6">Protocol Date</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Modification_Type</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Description</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right pr-6 font-bold">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modifications.map(mod => (
                                        <TableRow key={mod.id} className="border-slate-50 h-[56px] hover:bg-slate-50/50 transition-all font-black uppercase">
                                            <TableCell className="pl-6 text-[10px] text-slate-400 font-bold italic">{format(new Date(mod.modification_date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-amber-50 text-amber-600 border-none rounded-md h-5 px-2 text-[8px]">{mod.modification_type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-[10px] text-slate-700 max-w-[200px] truncate underline decoration-slate-100 decoration-2">{mod.description}</TableCell>
                                            <TableCell className="text-right pr-6 text-[11px] text-slate-950 font-black">₹{mod.cost?.toLocaleString('en-IN')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* --- HISTORY TAB: IMMUTABLE AUDIT LOG --- */}
                    <TabsContent value="history" className="m-0 focus-visible:ring-0">
                         <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tighter italic">Machine_Activity_Chain</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Historical Protocol Log // ID: {asset.id.slice(0, 8)}</p>
                                </div>
                                <Activity className="text-slate-100" size={32} />
                            </div>
                            
                            <div className="space-y-4">
                                {logs.map((log: any, idx: number) => (
                                    <div key={log.id} className="flex gap-6 group/trail">
                                        <div className="flex flex-col items-center gap-1 group/trail">
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center border transition-all",
                                                idx === 0 ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-300 border-slate-100"
                                            )}>
                                                <History size={12} />
                                            </div>
                                            <div className="w-[1px] flex-1 bg-slate-100 group-last/trail:hidden" />
                                        </div>
                                        <div className="flex-1 pb-6 space-y-0.5 border-b border-slate-50 group-last/trail:border-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight italic">{log.description}</span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase italic tracking-widest">{format(new Date(log.created_at), 'dd MMM yyyy // HH:mm')}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic decoration-slate-100 underline leading-none mb-0.5">
                                                Status: {log.action_type || 'SYSTEM_RECORD'} // Auditor: {log.performer?.full_name || 'SYSTEM_DAEMON'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </TabsContent>

                    {/* --- MAINTENANCE TAB --- */}
                    <TabsContent value="maintenance" className="m-0 space-y-6 focus-visible:ring-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tighter">Machine_Maintenance_Registry</h3>
                            <Button className="h-9 px-6 rounded-xl bg-[#003366] hover:bg-[#004488] text-white font-black text-[9px] uppercase tracking-widest gap-2 shadow-lg shadow-[#003366]/20">
                                <Plus size={12} /> Schedule_Intervention
                            </Button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 h-10">
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-6">Maintenance_ID</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400">Category</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center">Protocol_Status</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right pr-6">Est_Execution_Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {maintenance.length > 0 ? maintenance.map(mnt => (
                                        <TableRow key={mnt.id} className="border-slate-50 h-[56px] hover:bg-slate-50 transition-all font-black uppercase">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-slate-900">{mnt.maintenance_number || 'MNT-UNASSIGNED'}</span>
                                                    <span className="text-[8px] text-slate-400 italic">{mnt.reported_date ? format(new Date(mnt.reported_date), 'dd MMM yyyy') : 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-slate-200 text-slate-400 text-[7px] font-black px-2">{mnt.request_type || 'GENERAL'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn(
                                                    "border-none rounded-md h-5 px-2 text-[8px]",
                                                    mnt.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                )}>{mnt.status?.toUpperCase()}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 text-[11px] text-slate-900">
                                                ₹{(mnt.actual_costs?.labor + mnt.actual_costs?.material + mnt.actual_costs?.service)?.toLocaleString('en-IN') || '0.00'}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-300 font-black uppercase tracking-widest opacity-30 italic">No_Maintenance_Records_Available</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                    
                    {/* --- DEPRECIATION TAB --- */}
                    <TabsContent value="depreciation" className="m-0 space-y-8 focus-visible:ring-0">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Valuation Hero Card */}
                            <div className="col-span-12 lg:col-span-5">
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group min-h-[320px] flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all">
                                        <TrendingDown size={120} />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em]">Node_Fiscal_Valuation</h4>
                                        <p className="text-[42px] font-black tracking-tighter leading-none mt-4">
                                            ₹{valuation?.current_value?.toLocaleString('en-IN') || '0.00'}
                                        </p>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Current Net Book Value (NBV)</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Months Consumed</p>
                                            <p className="text-[18px] font-black text-white uppercase">{valuation?.months_elapsed || 0} / 60</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Fiscal Status</p>
                                            <Badge className={cn(
                                                "border-none rounded-md h-5 px-3 text-[8px] font-black",
                                                valuation?.is_fully_depreciated ? "bg-red-500 text-white" : "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                            )}>
                                                {valuation?.is_fully_depreciated ? 'EXPIRED_ASSET' : 'ACTIVE_EQUITY'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Matrix */}
                            <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-6">
                                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accumulated_Depletion</h5>
                                        <DollarSign size={14} className="text-slate-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-slate-900 leading-none">₹{valuation?.accumulated_depreciation?.toLocaleString('en-IN') || '0.00'}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Total value loss since acquisition</p>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full mt-6 overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 rounded-full transition-all duration-1000" 
                                            style={{ width: `${Math.min(((valuation?.accumulated_depreciation || 0) / (valuation?.original_cost || 1)) * 100, 100)}%` }} 
                                        />
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salvage_Anchor_Value</h5>
                                        <ShieldCheck size={14} className="text-slate-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-slate-900 leading-none">₹{asset.salvage_value?.toLocaleString('en-IN') || '0.00'}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Guaranteed terminal value at retirement</p>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Protocol Secured</span>
                                    </div>
                                </div>

                                <div className="col-span-2 bg-blue-50 border border-blue-100/50 rounded-[2rem] p-8 flex items-center justify-between group hover:bg-blue-600 transition-all duration-500">
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-all">
                                            <TrendingDown size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <h6 className="text-[10px] font-black text-blue-900 uppercase tracking-widest group-hover:text-white transition-colors">Depreciation Method Applied</h6>
                                            <p className="text-[14px] font-black text-blue-600 uppercase group-hover:text-blue-100 transition-colors">
                                                {asset.depreciation_method?.replace('_', ' ') || 'STRAIGHT_LINE'} Protocol // {asset.depreciation_rate || 0}% Annual
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="h-10 w-10 p-0 text-blue-400 group-hover:text-white transition-colors">
                                        <Info size={20} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* --- DOCUMENTS TAB --- */}
                    <TabsContent value="documents" className="m-0 focus-visible:ring-0">
                        <div className="grid grid-cols-4 gap-6">
                             <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-3 hover:border-blue-400 hover:text-blue-400 transition-all cursor-pointer bg-white group">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-all">
                                    <Plus size={18} />
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest">Secure_Upload</p>
                             </div>
                             {/* Mock Documents */}
                             {[
                                { title: "INWARD_GRN_ADVISORY", type: "PDF", size: "1.2 MB" },
                                { title: "OEM_WARRANTY_CERT", type: "JPG", size: "4.5 MB" },
                                { title: "INSURANCE_POLICY_MNT", type: "PDF", size: "0.8 MB" }
                             ].map((doc, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group">
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={16} className="text-blue-600 cursor-pointer" />
                                    </div>
                                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 font-black text-[10px] uppercase">{doc.type}</div>
                                    <p className="text-[12px] font-black text-slate-800 uppercase leading-tight mb-1 truncate pr-4">{doc.title}</p>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{doc.size}</p>
                                </div>
                             ))}
                        </div>
                    </TabsContent>

                </div>
            </Tabs>

            {/* 3. MODALS FOR CRUD */}
            <Dialog open={isInsuranceModalOpen} onOpenChange={setIsInsuranceModalOpen}>
                <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-2xl p-10 font-sans">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Machine Insurance Ingestion</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Identifier</Label>
                            <Input value={insuranceForm.policy_number} onChange={e => setInsuranceForm({...insuranceForm, policy_number: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insurance Carrier</Label>
                            <Input value={insuranceForm.provider_name} onChange={e => setInsuranceForm({...insuranceForm, provider_name: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Start</Label>
                            <Input type="date" value={insuranceForm.start_date} onChange={e => setInsuranceForm({...insuranceForm, start_date: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Expiry</Label>
                            <Input type="date" value={insuranceForm.expiry_date} onChange={e => setInsuranceForm({...insuranceForm, expiry_date: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insured Value (IDV)</Label>
                            <Input type="number" value={insuranceForm.insured_value} onChange={e => setInsuranceForm({...insuranceForm, insured_value: parseFloat(e.target.value) || 0})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                        </div>
                    </div>
                    <DialogFooter className="mt-10 pt-8 border-t border-slate-50">
                        <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl uppercase tracking-[0.4em]" onClick={handleAddInsurance}>Authorize Coverage Protocol</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isModModalOpen} onOpenChange={setIsModModalOpen}>
                <DialogContent className="sm:max-w-2xl rounded-[3rem] border-none shadow-2xl p-10 font-sans">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Technical Change Log</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modification Date</Label>
                                <Input type="date" value={modForm.modification_date} onChange={e => setModForm({...modForm, modification_date: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type of Upgrade</Label>
                                <Select value={modForm.modification_type} onValueChange={v => setModForm({...modForm, modification_type: v})}>
                                    <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-black"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["Hardware Upgrade", "Software Install", "Preventative Maintenance", "Component Replace", "Network Refactor"].map(t => (
                                            <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action Summary</Label>
                            <Textarea value={modForm.description} onChange={e => setModForm({...modForm, description: e.target.value.toUpperCase()})} className="min-h-[100px] rounded-xl bg-slate-50 border-slate-100 font-bold uppercase" placeholder="DESCRIBE THE TECHNICAL INTERVENTION..." />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Cost</Label>
                                <Input type="number" value={modForm.cost} onChange={e => setModForm({...modForm, cost: parseFloat(e.target.value) || 0})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technician / Vendor</Label>
                                <Input value={modForm.performed_by} onChange={e => setModForm({...modForm, performed_by: e.target.value.toUpperCase()})} className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-10 pt-8 border-t border-slate-50">
                        <Button className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl uppercase tracking-[0.4em]" onClick={handleAddModification}>Commit Technical Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
