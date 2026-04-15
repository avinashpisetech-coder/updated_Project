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
  Printer
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
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, differenceInMonths } from "date-fns";

interface Relationship {
    id: string;
    child_asset: {
        id: string;
        asset_code: string;
        brand: string;
        model: string;
        sub_type: { name: string };
    };
    relationship_type: string;
}

interface Props {
    asset: any;
    onUpdate?: () => void;
}

export function AssetDetailPro({ asset, onUpdate }: Props) {
    const supabase = createClient();
    const [relationships, setRelationships] = React.useState<Relationship[]>([]);
    const [availablePeripherals, setAvailablePeripherals] = React.useState<any[]>([]);
    const [selectedPeripheral, setSelectedPeripheral] = React.useState<string>("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [logs, setLogs] = React.useState<any[]>([]);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = React.useState(false);
    const [maintenanceForm, setMaintenanceForm] = React.useState({
        category: "MAINTENANCE",
        description: "",
        notes: ""
    });

    // --- Financial Engine Logic ---
    const cost = parseFloat(asset.purchase_cost || asset.unit_cost || 0);
    const rate = parseFloat(asset.depreciation_rate || 15); // Default 15%
    const salvage = parseFloat(asset.salvage_value || 0);
    const purchaseDate = new Date(asset.purchase_date || asset.created_at);
    const monthsPassed = differenceInMonths(new Date(), purchaseDate);
    
    // SLM: (Cost - Salvage) * Rate * (Time/12)
    const annualDep = (cost - salvage) * (rate / 100);
    const totalDepSLM = (annualDep / 12) * monthsPassed;
    const currentValSLM = Math.max(salvage, cost - totalDepSLM);

    // WDV: Cost * (1 - Rate)^Time
    const currentValWDV = cost * Math.pow((1 - (rate/100/12)), monthsPassed);

    React.useEffect(() => {
        fetchRelationships();
        fetchAvailablePeripherals();
        fetchLogs();
    }, [asset.id]);

    const fetchLogs = async () => {
        const { data } = await supabase
            .from("asset_activity_logs")
            .select("*, performer:profiles(full_name)")
            .eq("asset_id", asset.id)
            .order("created_at", { ascending: false });
        setLogs(data || []);
    };

    const fetchRelationships = async () => {
        const { data } = await supabase
            .from("asset_relationships")
            .select("*, child_asset:child_asset_id(id, asset_code, brand, model, sub_type:asset_sub_types(name))")
            .eq("parent_asset_id", asset.id);
        setRelationships(data || []);
    };

    const fetchAvailablePeripherals = async () => {
        const { data } = await supabase
            .from("assets")
            .select("id, asset_code, brand, model, sub_type:asset_sub_types(name)")
            .eq("status", "in_stock")
            .ilike("sub_type.name", "%input device%")
            .limit(10);
        setAvailablePeripherals(data || []);
    };

    const handleLink = async () => {
        if (!selectedPeripheral) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from("asset_relationships").insert({
                parent_asset_id: asset.id,
                child_asset_id: selectedPeripheral,
                relationship_type: 'connected'
            });
            if (error) throw error;
            toast.success("Peripheral Mesh Synced.");
            fetchRelationships();
            setSelectedPeripheral("");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlink = async (relId: string) => {
        const { error } = await supabase.from("asset_relationships").delete().eq("id", relId);
        if (error) toast.error("Mesh Severed Failure");
        else fetchRelationships();
    };

    const handleLogMaintenance = async () => {
        if (!maintenanceForm.description) return;
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("asset_activity_logs").insert({
                asset_id: asset.id,
                provisioning_id: asset.provisioning_id,
                action_type: 'MAINTENANCE_LOG',
                audit_category: maintenanceForm.category,
                description: maintenanceForm.description,
                metadata: { notes: maintenanceForm.notes },
                performed_by: user?.id
            });

            if (error) throw error;
            toast.success("Chronology Updated.");
            setIsMaintenanceModalOpen(false);
            setMaintenanceForm({ category: "MAINTENANCE", description: "", notes: "" });
            fetchLogs();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <Tabs defaultValue="logistics" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-10 mb-8 flex items-center justify-between">
                    <TabsList className="bg-slate-200 h-11 p-1 rounded-xl border border-slate-300/60 shadow-inner">
                        <TabsTrigger value="logistics" className="text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl px-8 rounded-lg h-full transition-all">01_IDENT_LOGISTICS</TabsTrigger>
                        <TabsTrigger value="mesh" className="text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl px-8 rounded-lg h-full transition-all">02_RELATIONSHIP_MESH</TabsTrigger>
                        <TabsTrigger value="finance" className="text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl px-8 rounded-lg h-full transition-all">03_FINANCE_INTEL</TabsTrigger>
                        <TabsTrigger value="history" className="text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-xl px-8 rounded-lg h-full transition-all">04_AUDIT_TRAIL</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                             <ShieldCheck size={16} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Auth_Context: SECURE</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-10 no-scrollbar">
                    
                    {/* 1. LOGISTICS: High Density Static Data */}
                    <TabsContent value="logistics" className="m-0 space-y-10 animate-in fade-in duration-500">
                        <div className="grid grid-cols-3 gap-8">
                            <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 space-y-3 shadow-sm transition-all hover:shadow-md">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">Hardware ID Code</span>
                                <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{asset.asset_code}</p>
                                <div className="h-1 w-8 bg-primary/20 rounded-full" />
                            </div>
                            <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 space-y-3 shadow-sm transition-all hover:shadow-md">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">Invariant Serial ID</span>
                                <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{asset.serial_number || 'NULL_LOGGED'}</p>
                                <div className="h-1 w-8 bg-blue-500/20 rounded-full" />
                            </div>
                            <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100/50 space-y-3 shadow-sm transition-all hover:shadow-md">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-1">OEM Brand/Model</span>
                                <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{asset.brand} <span className="text-slate-300 font-bold">{asset.model}</span></p>
                                <div className="h-1 w-8 bg-emerald-500/20 rounded-full" />
                            </div>
                        </div>

                        <div className="p-10 rounded-[3rem] bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Layers size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h5 className="text-[11px] font-black text-indigo-800 uppercase tracking-widest">Metadata Registry Statistics</h5>
                                    <p className="text-[14px] font-bold text-indigo-600/80 uppercase tracking-tight">System Class: {asset.sub_type?.name} // Protocol Version 2.4</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Created On Registry</p>
                                <p className="text-[18px] font-black text-indigo-900 uppercase">{format(new Date(asset.created_at), 'MMMM dd, yyyy')}</p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 2. MESH: Peripheral Mapping */}
                    <TabsContent value="mesh" className="m-0 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                         <div className="flex items-center justify-between px-2">
                             <div className="space-y-1">
                                 <h4 className="text-[18px] font-black uppercase text-slate-800 tracking-tighter">Hardware_Relationship_Mesh</h4>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daughter cards and linked peripherals mapped to this chassis</p>
                             </div>
                             <Network className="text-primary opacity-10 animate-pulse" size={48} />
                         </div>

                         <div className="grid grid-cols-2 gap-6">
                             {relationships.length === 0 ? (
                                 <div className="col-span-2 p-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem] opacity-20 bg-slate-50">
                                     <Link2 size={40} className="mb-4 text-slate-400" />
                                     <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500">Mesh_Empty // No_Nodes_Mapped</p>
                                 </div>
                             ) : (
                                 relationships.map(rel => (
                                     <div key={rel.id} className="p-6 rounded-[2rem] bg-white border border-slate-100 hover:border-primary/40 transition-all flex items-center justify-between shadow-sm group">
                                         <div className="flex items-center gap-5">
                                             <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                                 <MousePointer2 size={22} />
                                             </div>
                                             <div className="flex flex-col">
                                                 <span className="text-[14px] font-black text-slate-800 uppercase tracking-tight mb-1">{rel.child_asset.brand} {rel.child_asset.model}</span>
                                                 <div className="flex items-center gap-2">
                                                     <Badge variant="outline" className="h-5 px-3 text-[9px] font-black bg-slate-50 border-slate-100 text-slate-400 uppercase">{rel.child_asset.asset_code}</Badge>
                                                     <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{rel.child_asset.sub_type.name}</span>
                                                 </div>
                                             </div>
                                         </div>
                                         <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500/20 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 rounded-xl" onClick={() => handleUnlink(rel.id)}>
                                             <Unlink size={18} />
                                         </Button>
                                     </div>
                                 ))
                             )}
                         </div>

                         <div className="p-10 rounded-[2.5rem] bg-[#E8F0F7]/40 border border-slate-200/50 space-y-6">
                             <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block pl-2">MESH_SYNERGY: Authorize New Relationship</Label>
                             <div className="flex gap-4">
                                 <Select value={selectedPeripheral} onValueChange={setSelectedPeripheral}>
                                     <SelectTrigger className="h-12 rounded-xl bg-white border-slate-100 text-[11px] font-black uppercase tracking-widest pl-6 shadow-sm"><SelectValue placeholder="SELECT_AVAILABLE_HARDWARE_NODE" /></SelectTrigger>
                                     <SelectContent className="rounded-xl">
                                         {availablePeripherals.map(p => (
                                             <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.brand} {p.model} ({p.asset_code})</SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                                 <Button className="h-12 px-12 rounded-xl bg-primary hover:bg-black text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95" onClick={handleLink} disabled={isLoading || !selectedPeripheral}>
                                     Authorize_Link
                                 </Button>
                             </div>
                         </div>
                    </TabsContent>

                    {/* 3. FINANCE: Asset Valuation Matrix */}
                    <TabsContent value="finance" className="m-0 space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="p-10 rounded-[3rem] bg-emerald-50 text-emerald-900 border border-emerald-100/50 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <DollarSign size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/60">CAP_EX_PROTOCOL</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-4xl font-black tracking-tighter italic">₹{cost.toLocaleString('en-IN')}</p>
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Original Inward Acquisition Cost</p>
                                </div>
                                <div className="h-1 w-12 bg-emerald-500/30 rounded-full" />
                            </div>

                            <div className="p-10 rounded-[3rem] bg-amber-50 text-amber-900 border border-amber-100/50 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <TrendingDown size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/60">WDV_VALUATION</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-4xl font-black tracking-tighter italic">₹{Math.floor(currentValWDV).toLocaleString('en-IN')}</p>
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Estimated Current Net Residue</p>
                                </div>
                                <div className="h-1 w-12 bg-amber-500/30 rounded-full" />
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl space-y-10 relative overflow-hidden group">
                            <div className="absolute right-[-10%] top-[-20%] h-96 w-96 bg-white/5 rounded-full blur-3xl transition-transform group-hover:scale-110 duration-1000" />
                            
                            <div className="flex items-center justify-between relative z-10">
                                <div className="space-y-1">
                                    <h5 className="text-[20px] font-black uppercase tracking-tighter">Depreciation_Lifecycle_Matrix</h5>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Global Fiscal Policy v3.2 Enforced</p>
                                </div>
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40 text-[9px] font-black uppercase h-8 px-6 rounded-xl">{asset.depreciation_method || 'WDV_MODEL'}</Badge>
                            </div>

                            <div className="grid grid-cols-3 gap-12 relative z-10">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Temporal Tenure</p>
                                    <p className="text-2xl font-black text-white">{monthsPassed} <span className="text-slate-600 text-[14px]">Months</span></p>
                                    <div className="h-0.5 w-6 bg-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Cumulative Dep.</p>
                                    <p className="text-2xl font-black text-red-400">₹{(cost - currentValWDV).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                    <div className="h-0.5 w-6 bg-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Straight Line Ref</p>
                                    <p className="text-2xl font-black text-slate-400">₹{Math.floor(currentValSLM).toLocaleString('en-IN')}</p>
                                    <div className="h-0.5 w-6 bg-slate-700" />
                                </div>
                            </div>
                            
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <BadgeAlert className="text-amber-400" size={18} />
                                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
                                        Valuation integrity depends on accuracy of inward cost and the {rate}% annual rate defined in the fiscal master policy.
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white">Detailed_Report</Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* 4. HISTORY: Operational Chronology */}
                    <TabsContent value="history" className="m-0 space-y-10 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-1">
                                <h4 className="text-[20px] font-black uppercase text-slate-800 tracking-tighter">Operational_Chronology</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Immutable audit trails and lifecycle engagement history</p>
                            </div>
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl shadow-slate-900/10"
                                onClick={() => setIsMaintenanceModalOpen(true)}
                            >
                                <Plus size={14} />
                                Commit_Audit_Event
                            </Button>
                        </div>

                        {asset.provisioning_id && (
                            <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100/50 flex items-center justify-between group shadow-sm">
                                <div className="flex items-center gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <Zap size={22} className="animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] leading-none">Deployment_Root_Source</p>
                                        <p className="text-[15px] font-black text-indigo-900 uppercase tracking-tight">Provisioning Hierarchy: {asset.requisition?.requisition_number || 'STABLE_ORIGIN_OK'}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-indigo-500 text-white border-none text-[9px] font-black uppercase tracking-widest h-8 px-6 rounded-xl">Traceable_Source</Badge>
                            </div>
                        )}

                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                            {logs.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem] opacity-20 bg-slate-50">
                                    <History size={48} className="mb-4 text-slate-400" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500">Chronology_Data_Pool_Empty</p>
                                </div>
                            ) : (
                                logs.map((log: any) => (
                                    <div key={log.id} className="relative pl-12 pb-10 last:pb-0 group/log">
                                        <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-slate-100 group-last/log:h-5" />
                                        <div className={cn(
                                            "absolute left-0 top-1.5 h-[48px] w-[48px] rounded-2xl border-4 border-white shadow-xl flex items-center justify-center z-10 transition-transform group-hover/log:scale-110 duration-300",
                                            log.audit_category === 'MAINTENANCE' ? "bg-amber-500 shadow-amber-500/20" : 
                                            log.audit_category === 'DEPLOYMENT' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-[#475569] shadow-slate-900/20"
                                        )}>
                                            <History size={18} className="text-white" />
                                        </div>

                                        <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100/50 space-y-4 group-hover/log:bg-white group-hover/log:shadow-lg transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[16px] font-black uppercase text-slate-800 tracking-tight leading-none">{log.description}</span>
                                                    <Badge variant="outline" className="text-[9px] font-black text-slate-400 border-slate-200 uppercase px-3">{log.audit_category || 'SYSTEM_EVENT'}</Badge>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300 font-mono italic uppercase tracking-widest">{format(new Date(log.created_at), 'dd MMM yyyy // HH:mm')}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[12px] font-bold text-slate-500/80 leading-relaxed uppercase tracking-tight">{log.metadata?.notes || "PROTOCOL_EXECUTION_COMPLETED_SUCCESSFULLY"}</p>
                                                <div className="flex items-center gap-2 opacity-40">
                                                    <Activity size={10} className="text-primary" />
                                                    <span className="text-[9px] font-black text-slate-900 uppercase">Performer: {log.performer?.full_name || 'AUTHENTICATED_SYSTEM'}</span>
                                                </div>
                                            </div>
                                            {log.metadata?.handover_number && (
                                                <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <ImageIcon size={18} className="text-primary/40" />
                                                        <span className="text-[11px] font-black text-primary/80 uppercase">Handover_Protocol_Document: {log.metadata.handover_number}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black text-primary uppercase">View_Chain</Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </div>

                {/* --- Logic Matrix Footer --- */}
                <div className="h-[96px] shrink-0 border-t border-slate-100 flex items-center justify-between px-10 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.02)] relative z-50">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4">
                            <FileText className="text-primary opacity-20" size={24} />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 leading-none">Security Status</p>
                                <p className="text-[14px] font-black text-emerald-500 uppercase tracking-tight leading-none">Chain_Integrity_Locked</p>
                            </div>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100" />
                        <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sync_Node_OK</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" className="h-12 px-10 rounded-2xl border-slate-100 shadow-sm text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                            <Printer size={16} className="mr-3 text-slate-300" /> Print_Profile
                        </Button>
                        <Button className="h-12 px-12 rounded-2xl bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/10 transition-all active:scale-95">
                            Gate_Pass_Protocol
                        </Button>
                    </div>
                </div>
            </Tabs>

            {/* --- Maintenance Modal --- */}
            {isMaintenanceModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-slate-50 relative bg-[radial-gradient(ellipse:80%_60%_at:50%_0%,rgba(16,185,129,0.05),transparent_100%)]">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <FileCheck size={28} className="text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/40 leading-none">Protocol Engagement</p>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Log_Audit_Event</h3>
                                </div>
                            </div>
                        </div>

                        <div className="p-12 space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Event Category Hierarchy</Label>
                                <Select value={maintenanceForm.category} onValueChange={v => setMaintenanceForm({...maintenanceForm, category: v})}>
                                    <SelectTrigger className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-[12px] font-black uppercase tracking-widest pl-6 shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="MAINTENANCE" className="text-[11px] font-black uppercase">Standard_Maintenance</SelectItem>
                                        <SelectItem value="AUDIT" className="text-[11px] font-black uppercase">Physical_Verification_Audit</SelectItem>
                                        <SelectItem value="UPGRADE" className="text-[11px] font-black uppercase">Technical_Performance_Upgrade</SelectItem>
                                        <SelectItem value="SYSTEM_EDIT" className="text-[11px] font-black uppercase">Core_Registry_Metadata_Correction</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Protocol Action Summary</Label>
                                <Input 
                                    placeholder="e.g. BATTERY_REPLACEMENT_SYNC"
                                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl text-[12px] font-black uppercase tracking-tight pl-6 shadow-sm"
                                    value={maintenanceForm.description}
                                    onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value.toUpperCase()})}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Detailed Operational Telemetry</Label>
                                <Textarea 
                                    placeholder="Enter exhaustive technical overview of the amendment or event..."
                                    className="h-40 bg-slate-50 border-slate-100 rounded-3xl text-[12px] font-medium p-6 focus-visible:ring-primary/20 no-scrollbar shadow-sm"
                                    value={maintenanceForm.notes}
                                    onChange={e => setMaintenanceForm({...maintenanceForm, notes: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                            <Button variant="ghost" className="flex-1 h-14 rounded-2xl text-[12px] font-black uppercase tracking-widest text-slate-400" onClick={() => setIsMaintenanceModalOpen(false)}>
                                Abort_Entry
                            </Button>
                            <Button 
                                className="flex-1 h-14 rounded-2xl bg-primary hover:bg-black text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95"
                                onClick={handleLogMaintenance}
                                disabled={isLoading || !maintenanceForm.description}
                            >
                                {isLoading ? "Synchronizing..." : "Authorize_Log_Entry"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
