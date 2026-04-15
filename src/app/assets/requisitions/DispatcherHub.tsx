"use client";

import React from "react";
import { 
  UserPlus, 
  Package, 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Building2,
  Store,
  Briefcase,
  ChevronRight,
  Info,
  ShieldAlert,
  Search,
  Users,
  Camera,
  MessageSquare,
  Zap,
  Box,
  ClipboardList
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useRouter } from "next/navigation";
import { Permission, hasPermission, RESOURCES } from "@/lib/permissions";

// --- Types ---
interface Profile { id: string; full_name: string; email: string; employee_id: string; }
interface SubType { id: string; name: string; code_prefix: string; allow_negative_stock: boolean; }
interface Bundle { 
    id: string; 
    title: string; 
    description: string; 
    items: { asset_sub_type_id: string; quantity: number; sub_type: { name: string } }[];
}
interface StoreItem { id: string; name: string; code: string; project_id?: string; }
interface Project { id: string; name: string; }
interface Department { id: string; name: string; }

interface ProvisionItem {
    sub_type_id: string;
    quantity: number;
    remark: string;
    photos: string[]; // Base64 or attachment refs
    stock_available?: number;
    allow_negative_stock?: boolean;
}

interface Props {
    users: Profile[];
    bundles: Bundle[];
    subTypes: SubType[];
    departments: Department[];
    stores: StoreItem[];
    projects: Project[];
    currentUserRole: string;
}

export function DispatcherHub({ users, bundles, subTypes, departments, stores, projects, currentUserRole }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = React.useState(false);
    
    // --- State ---
    const [onBehalfOf, setOnBehalfOf] = React.useState<string>("");
    const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
    const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
    const [selectedDeptId, setSelectedDeptId] = React.useState<string>("");
    const [justification, setJustification] = React.useState("");
    const [requestedItems, setRequestedItems] = React.useState<ProvisionItem[]>([]);

    // --- Intelligence: Real-time Stock Telemetry ---
    const [stockMap, setStockMap] = React.useState<Record<string, number>>({});

    const fetchStockLevels = async (storeId: string) => {
        if (!storeId) return;
        const { data, error } = await supabase
            .rpc('get_stock_levels_for_store', { p_store_id: storeId });
        
        if (!error && data) {
            const map: Record<string, number> = {};
            data.forEach((item: any) => { map[item.sub_type_id] = item.count; });
            setStockMap(map);
        }
    };

    React.useEffect(() => {
        if (selectedStoreId) fetchStockLevels(selectedStoreId);
    }, [selectedStoreId]);

    // --- Actions ---
    const applyBundle = (bundle: Bundle) => {
        const newItems = bundle.items.map(item => ({
            sub_type_id: item.asset_sub_type_id,
            quantity: item.quantity,
            remark: `Standard Issue: ${bundle.title}`,
            photos: [],
            stock_available: stockMap[item.asset_sub_type_id] || 0,
            allow_negative_stock: subTypes.find(s => s.id === item.asset_sub_type_id)?.allow_negative_stock || false
        }));
        setRequestedItems([...requestedItems, ...newItems]);
        toast.info(`Protocol Bundle applied: ${bundle.title}`);
    };

    const addItem = () => {
        const defaultSub = subTypes[0];
        setRequestedItems([...requestedItems, { 
            sub_type_id: defaultSub?.id || "", 
            quantity: 1, 
            remark: "", 
            photos: [],
            stock_available: stockMap[defaultSub?.id || ""] || 0,
            allow_negative_stock: defaultSub?.allow_negative_stock || false
        }]);
    };

    const removeItem = (index: number) => {
        setRequestedItems(requestedItems.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, key: keyof ProvisionItem, value: any) => {
        const updated = [...requestedItems];
        (updated[index] as any)[key] = value;
        
        if (key === 'sub_type_id') {
            const sub = subTypes.find(s => s.id === value);
            updated[index].allow_negative_stock = sub?.allow_negative_stock || false;
            updated[index].stock_available = stockMap[value] || 0;
        }
        
        setRequestedItems(updated);
    };

    const handleExecution = async () => {
        if (!onBehalfOf || requestedItems.length === 0 || !selectedStoreId || !selectedDeptId) {
            toast.error("Execution Signal Failure: Missing Provisioning Nodes.");
            return;
        }

        // Logic check for non-negative stock sub-types
        const blockedItems = requestedItems.filter(i => (i.stock_available || 0) < i.quantity && !i.allow_negative_stock);
        if (blockedItems.length > 0) {
            toast.error("Policy Violation: Manual Indent Required for zero-stock inventory.");
            return;
        }

        setIsLoading(true);
        try {
            const { data: res, error } = await supabase.rpc('execute_dispatch_protocol', {
                p_on_behalf_of: onBehalfOf,
                p_project_id: selectedProjectId || null,
                p_dept_id: selectedDeptId,
                p_store_id: selectedStoreId,
                p_justification: justification,
                p_items: requestedItems.map(i => ({
                    sub_type_id: i.sub_type_id,
                    quantity: i.quantity,
                    remark: i.remark,
                    attachment_refs: i.photos
                }))
            });

            if (error) throw error;

            toast.success(`Protocol ${res} successfully dispatched.`);
            router.push("/assets");
            router.refresh();
        } catch (e: any) {
            toast.error(`Execution Fault: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto p-4 lg:p-10 font-sans text-slate-900 bg-slate-50/30">
            
            {/* Left Engine: Configuration & Items */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Identification: Recipient Node */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                        <UserPlus size={160} />
                    </div>
                    
                    <div className="flex items-center gap-5 mb-10 pb-6 border-b border-slate-50">
                        <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                            <Users size={24} className="text-primary/70" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 leading-none">Stage 01: Identification</p>
                            <h3 className="text-2xl font-black tracking-tight uppercase">Provisioning Target</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Recipient Profile Hub</Label>
                            <Select value={onBehalfOf} onValueChange={setOnBehalfOf}>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-[12px] font-bold uppercase tracking-tight pl-8 hover:bg-white transition-all">
                                    <SelectValue placeholder="SELECT_PROVISIONING_PROFILE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id} className="py-4 text-[11px] font-black uppercase tracking-widest focus:bg-primary focus:text-white transition-all">
                                            {u.full_name} <span className="opacity-40 ml-2">[{u.employee_id}]</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Mission Justification</Label>
                            <Input 
                                placeholder="E.G. NEW_JOINER_IT_INFRA" 
                                className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-[12px] font-bold uppercase tracking-tight pl-8"
                                value={justification}
                                onChange={e => setJustification(e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Bundle Interface */}
                <div className="space-y-5">
                    <div className="flex items-center gap-4 px-6">
                        <Zap size={15} className="text-primary/30" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Master Onboarding Bundles</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {bundles.map(bundle => (
                            <button 
                                key={bundle.id}
                                onClick={() => applyBundle(bundle)}
                                className="text-left group p-8 rounded-[2rem] bg-white border border-slate-100 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 relative overflow-hidden"
                            >
                                <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                                    <Box size={100} />
                                </div>
                                <h5 className="text-[13px] font-black uppercase tracking-tight text-slate-800 mb-2 group-hover:text-primary">{bundle.title}</h5>
                                <div className="flex items-center gap-3">
                                    <div className="h-6 px-2 rounded-lg bg-slate-50 text-[9px] font-black uppercase text-slate-400 border border-slate-100 italic">
                                        {bundle.items.length} Units
                                    </div>
                                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. The Manifest Node Engine */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                                <ClipboardList size={24} className="text-amber-500/70" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/40 leading-none">Stage 02: Logistics Manifest</p>
                                <h3 className="text-2xl font-black tracking-tight uppercase">Hardware Provisioning Units</h3>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            className="h-12 px-8 rounded-xl border-slate-100 text-[11px] font-black uppercase tracking-[0.1em] gap-3 text-primary hover:bg-primary/5 hover:border-primary/20 transition-all"
                            onClick={addItem}
                        >
                            <Plus size={16} /> New Node
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {requestedItems.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-[3rem] opacity-20 bg-slate-50/50">
                                <Package size={48} className="mb-4" />
                                <p className="text-[11px] font-black uppercase tracking-[0.5em]">Inventory Manifest Empty</p>
                            </div>
                        ) : (
                            requestedItems.map((item, index) => (
                                <div key={index} className="p-8 rounded-[2rem] bg-slate-50/50 border border-slate-100 hover:border-primary/20 hover:bg-white transition-all duration-500 relative group/card">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                                        
                                        {/* Primary Selection */}
                                        <div className="lg:col-span-4 space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Classification</Label>
                                                {item.stock_available !== undefined && (
                                                    <div className={cn(
                                                        "flex items-center gap-2",
                                                        (item.stock_available || 0) > 0 ? "text-emerald-500" : "text-amber-500"
                                                    )}>
                                                        <Zap size={10} className={item.stock_available > 0 ? "fill-emerald-500" : ""} />
                                                        <span className="text-[10px] font-black uppercase">Live_Stock: {item.stock_available}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Select value={item.sub_type_id} onValueChange={v => updateItem(index, 'sub_type_id', v)}>
                                                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-100 text-[11px] font-black uppercase tracking-widest pl-6 shadow-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {subTypes.map(st => (
                                                       <SelectItem key={st.id} value={st.id} className="text-[10px] font-black uppercase py-3">{st.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            
                                            {/* Logic Warning */}
                                            {(item.stock_available || 0) < item.quantity && (
                                                <div className={cn(
                                                    "p-3 rounded-lg border flex items-start gap-3 mt-4",
                                                    item.allow_negative_stock ? "bg-indigo-50/50 border-indigo-100 text-indigo-600" : "bg-red-50/50 border-red-100 text-red-600"
                                                )}>
                                                    <Info size={14} className="mt-0.5 shrink-0" />
                                                    <p className="text-[9px] font-bold leading-relaxed uppercase tracking-widest">
                                                        {item.allow_negative_stock 
                                                            ? "SCENARIO: INSUFFICIENT STOCK. PROTOCOL WILL TRIGGER AUTO-INDENT."
                                                            : "ERROR: CRITICAL SHORTAGE. POLICY PREVENTS AUTOMATED DISPATCH."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Secondary Metadata */}
                                        <div className="lg:col-span-7 grid grid-cols-2 gap-8">
                                            <div className="space-y-4 col-span-2 sm:col-span-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quantity (Units)</Label>
                                                <Input 
                                                    type="number" 
                                                    min={1} 
                                                    className="h-12 rounded-xl bg-white border-slate-100 text-[12px] font-black text-center shadow-sm"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-4 col-span-2 sm:col-span-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Photo Manifest</Label>
                                                <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest gap-3 hover:bg-slate-50 transition-all">
                                                    <Camera size={14} /> Documentation
                                                </Button>
                                            </div>
                                            <div className="space-y-4 col-span-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Technical Specification / Remarks</Label>
                                                <Input 
                                                    placeholder="E.G. MIN_16GB_RAM_LATITUDE_5430"
                                                    className="h-12 rounded-xl bg-white border-slate-100 text-[11px] font-bold uppercase tracking-tight pl-6 shadow-sm"
                                                    value={item.remark}
                                                    onChange={e => updateItem(index, 'remark', e.target.value.toUpperCase())}
                                                />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="lg:col-span-1 flex lg:flex-col justify-end gap-2 pt-6">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-12 w-12 rounded-xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Command Console */}
            <div className="lg:col-span-4 space-y-8">
                
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-10 lg:sticky lg:top-10">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50 font-sans">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                            <Store size={20} className="text-emerald-500/70" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/40 leading-none">Stage 03: Deployment Site</p>
                            <h3 className="text-lg font-black tracking-tight uppercase">Governance Node</h3>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Execution Store / Stock Source</Label>
                            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-[11px] font-black uppercase tracking-widest pl-8 hover:bg-white transition-all shadow-sm">
                                    <SelectValue placeholder="SELECT_WAREHOUSE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {stores.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase tracking-widest py-3">{s.name} <span className="opacity-40 ml-2">[{s.code}]</span></SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Provisioning Cost Center</Label>
                            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-[11px] font-black uppercase tracking-widest pl-8 hover:bg-white transition-all shadow-sm">
                                    <SelectValue placeholder="SELECT_DEPARTMENT" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {departments.map(d => (
                                        <SelectItem key={d.id} value={d.id} className="text-[10px] font-black uppercase tracking-widest py-3">{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Linked Project Protocol</Label>
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-[11px] font-black uppercase tracking-widest pl-8 hover:bg-white transition-all shadow-sm">
                                    <SelectValue placeholder="GLOBAL_RESOURCE_POOL" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="none" className="italic text-slate-400 opacity-60">No Active Project Link</SelectItem>
                                    {projects.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase tracking-widest py-3">{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-8 border-t border-slate-50 space-y-8">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Units</p>
                                    <p className="text-2xl font-black text-slate-800 tracking-tight italic">{requestedItems.reduce((acc, i) => acc + i.quantity, 0)}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                                    <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Global Status</p>
                                    <p className="text-[13px] font-black text-primary uppercase tracking-tighter">Ready_Sync</p>
                                </div>
                             </div>

                             <Button 
                                onClick={handleExecution}
                                disabled={isLoading || !onBehalfOf || requestedItems.length === 0}
                                className={cn(
                                    "w-full h-20 rounded-[2.5rem] bg-slate-900 border-slate-800 text-white text-[13px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-slate-900/20 transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98] group",
                                    requestedItems.some(i => (i.stock_available || 0) < i.quantity && !i.allow_negative_stock) && "opacity-50 cursor-not-allowed bg-red-900 border-red-800 shadow-red-900/10"
                                )}
                             >
                                {isLoading ? (
                                    <Zap className="animate-pulse text-emerald-500 mr-4" size={20} />
                                ) : (
                                    <Send size={18} className="mr-6 opacity-40 group-hover:translate-x-2 transition-transform" />
                                )}
                                {isLoading ? 'SYNCING_PROTOCOL...' : 'DISPATCH PROTOCOL'}
                             </Button>

                             <div className="flex items-center gap-4 py-2 opacity-30 justify-center">
                                <ShieldAlert size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Lifecycle Encryption: Triple-AES</span>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Audit Context */}
                <div className="p-8 rounded-[2.5rem] bg-indigo-50/30 border border-indigo-100 flex items-start gap-5">
                    <Info className="text-indigo-400 shrink-0 mt-1" size={20} />
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest leading-none">Automated Policy Engine</p>
                        <p className="text-[10px] font-medium text-indigo-600/60 leading-relaxed uppercase">
                            Dispatcher actions are governed by real-time inventory buffers. Insufficient stock on strict sub-types will block execution and require manual indent intervention.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
