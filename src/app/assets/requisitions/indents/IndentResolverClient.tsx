"use client";

import React from "react";
import { 
  ArrowRightLeft, 
  ShoppingCart, 
  MapPin, 
  Building2, 
  ChevronRight, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  PackageCheck,
  RefreshCcw,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Box,
  Zap,
  Radio
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";

// --- Types ---
interface Indent {
    id: string;
    indent_number: string;
    status: string;
    quantity: number;
    created_at: string;
    sub_type: { name: string };
    store: { name: string; code: string };
    department: { name: string };
    project?: { name: string };
    resolution_type?: string;
    source_store_id?: string;
    sub_type_id: string;
}

interface Props {
    initialIndents: Indent[];
    stores: { id: string; name: string; code: string }[];
}

export function IndentResolverClient({ initialIndents, stores }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [indents, setIndents] = React.useState<Indent[]>(initialIndents);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [selectedIndent, setSelectedIndent] = React.useState<string | null>(null);
    const [otherStocks, setOtherStocks] = React.useState<any[]>([]);
    const [transferStoreId, setTransferStoreId] = React.useState<string>("");

    const fetchOtherStocks = async (indent: Indent) => {
        setIsRefreshing(true);
        try {
            const { data, error } = await supabase
                .from("assets")
                .select("store_id, asset_stores(name, code)")
                .eq("status", "in_stock")
                .eq("sub_type_id", indent.sub_type_id)
                .neq("store_id", indent.store.id);

            if (error) throw error;

            const grouped = data.reduce((acc: any, curr: any) => {
                const storeId = curr.store_id;
                if (!acc[storeId]) {
                    acc[storeId] = { name: curr.asset_stores.name, code: curr.asset_stores.code, count: 0 };
                }
                acc[storeId].count += 1;
                return acc;
            }, {});

            setOtherStocks(Object.entries(grouped).map(([id, info]: any) => ({ id, ...info })));
            setSelectedIndent(indent.id);
        } catch (error: any) {
            toast.error(`Stock Scan Failure: ${error.message}`);
        } finally {
            setIsRefreshing(false);
        }
    };

    const resolveIndent = async (indentId: string, type: 'transfer' | 'purchase') => {
        const payload: any = { 
            resolution_type: type,
            status: type === 'transfer' ? 'transfer_initiated' : 'po_conversion'
        };
        if (type === 'transfer' && transferStoreId) {
            payload.source_store_id = transferStoreId;
        }

        try {
            const { error } = await supabase.from("asset_indents").update(payload).eq("id", indentId);
            if (error) throw error;

            toast.success(`Indent ${type === 'transfer' ? 'Transfer Activated' : 'Authorized for Purchase'}.`);
            router.refresh();
            setSelectedIndent(null);
        } catch (error: any) {
            toast.error(`Resolution Fault: ${error.message}`);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Awaiting Action', class: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock };
            case 'transfer_initiated': return { label: 'Transfer Protocol', class: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: ArrowRightLeft };
            case 'po_conversion': return { label: 'PO Authorization', class: 'bg-blue-50 text-blue-600 border-blue-100', icon: ShoppingCart };
            case 'fulfilled': return { label: 'Fulfilled', class: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 };
            default: return { label: status, class: 'bg-slate-50 text-slate-400 border-slate-200', icon: AlertCircle };
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
            
            {/* 1. Snow White Header */}
            <header className="h-[72px] shrink-0 bg-[#D9EAF7] border-b border-[#B5D1E8] flex items-center justify-between px-10 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="h-4 w-1 bg-primary rounded-full shadow-sm" />
                            <h1 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">SHORTAGE_RESOLVER_HUB</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Indent Fulfillment Registry v4.2</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 px-6 h-10 rounded-xl bg-white/50 border border-white/50 shadow-sm mr-2">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-primary/40" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Governance: ACTIVE_POLICY</span>
                        </div>
                    </div>
                    <Button variant="outline" className="h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                        Archive_History
                    </Button>
                </div>
            </header>

            {/* 2. Unified Content Matrix */}
            <main className="flex-1 overflow-auto p-10 no-scrollbar space-y-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {indents.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[3.5rem] shadow-sm opacity-20">
                            <PackageCheck size={64} className="mb-4 text-slate-300" />
                            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400">Global Shortage Ledger Empty</p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {indents.map((indent) => {
                                const config = getStatusConfig(indent.status);
                                const isActive = selectedIndent === indent.id;

                                return (
                                    <div key={indent.id} className={cn(
                                        "rounded-[3.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-primary/5 group",
                                        isActive && "ring-2 ring-primary/20 scale-[1.01]"
                                    )}>
                                        <div className="flex flex-col lg:flex-row min-h-[300px]">
                                            {/* Technical Identification Sidebar */}
                                            <div className="lg:w-[350px] p-12 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                                                <div className="space-y-6">
                                                    <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-7 px-5 rounded-full border-none shadow-sm", config.class)}>
                                                        {config.label}
                                                    </Badge>
                                                    <div className="space-y-2">
                                                        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] font-sans">{indent.indent_number}</h3>
                                                        <p className="text-3xl font-black uppercase tracking-tighter text-slate-800 italic leading-none">{indent.sub_type.name}</p>
                                                    </div>
                                                </div>
                                                <div className="pt-8 border-t border-slate-200">
                                                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                                                        <Clock size={14} className="opacity-40" />
                                                        Registered: {format(new Date(indent.created_at), 'dd MMMM yyyy')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Operational Strategy Zone */}
                                            <div className="flex-1 p-12 flex flex-col lg:flex-row gap-16">
                                                <div className="flex-1 space-y-12">
                                                    <div className="grid grid-cols-2 gap-10">
                                                        <div className="space-y-1.5 px-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-white group">
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1 group-hover:text-primary transition-colors">Target_Entity</span>
                                                            <p className="text-[13px] font-black uppercase tracking-tight text-slate-700">{indent.department.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                                <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{indent.project?.name || "GLOBAL_PRO_CLUSTER"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5 px-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-white group">
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1 group-hover:text-primary transition-colors">Target_Store_Node</span>
                                                            <p className="text-[13px] font-black uppercase tracking-tight text-slate-700">{indent.store.name}</p>
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{indent.store.code}</span>
                                                        </div>
                                                        <div className="col-span-2 p-8 rounded-[2rem] bg-red-50 text-red-900 border border-red-100/50 flex items-center justify-between">
                                                            <div className="flex items-center gap-5">
                                                                <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-sm">
                                                                    <Zap size={22} className="animate-pulse" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Critical_Shortage_Detected</p>
                                                                    <p className="text-[14px] font-bold text-red-900 uppercase tracking-tight">System requires replenishment for fulfillment</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-4xl font-black text-red-500 tracking-tighter italic leading-none">{indent.quantity} <span className="text-[12px] font-black uppercase ml-1">Units</span></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isActive && (
                                                        <div className="p-10 rounded-[3rem] bg-primary/5 border border-primary/10 animate-in slide-in-from-top-6 duration-700">
                                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/10">
                                                                <div className="flex items-center gap-4">
                                                                    <Radio size={16} className="text-primary animate-pulse" />
                                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Cross_Store_Connectivity_Mesh_Scan</h4>
                                                                </div>
                                                            </div>
                                                            {otherStocks.length === 0 ? (
                                                                <div className="p-12 text-center space-y-4">
                                                                    <AlertCircle size={32} className="mx-auto text-primary/20" />
                                                                    <p className="text-[11px] font-black uppercase text-primary/40 tracking-[0.3em]">Global Shortage Confirmed // External Fulfillment Required</p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 gap-6">
                                                                    {otherStocks.map(s => (
                                                                        <div key={s.id} className="flex items-center justify-between p-6 rounded-3xl bg-white border border-primary/20 shadow-sm group/store hover:border-primary/50 transition-all">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/store:text-primary transition-colors">
                                                                                    <Building2 size={20} />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <p className="text-[12px] font-black uppercase text-slate-800 tracking-tight">{s.name}</p>
                                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{s.code}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-2xl font-black text-primary tracking-tighter italic leading-none">{s.count}</span>
                                                                                <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">STOCK_OK</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Global Protocol Decision Matrix */}
                                                <div className="lg:w-[400px] flex flex-col justify-center gap-6">
                                                    {indent.status === 'pending' ? (
                                                        <div className="space-y-6">
                                                            <Button 
                                                                variant="default" 
                                                                className="w-full h-20 rounded-[2.5rem] bg-slate-900 hover:bg-black text-white text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all duration-300 active:scale-95 flex flex-col gap-1"
                                                                onClick={() => fetchOtherStocks(indent)}
                                                                disabled={isRefreshing}
                                                            >
                                                                {isRefreshing ? <RefreshCcw size={20} className="animate-spin" /> : <ArrowRightLeft size={20} />}
                                                                <span>Scan_Global_Pool</span>
                                                            </Button>

                                                            {isActive && otherStocks.length > 0 && (
                                                                <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 space-y-6 animate-in zoom-in-95 duration-500">
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Source Node Authorization</Label>
                                                                        <Select value={transferStoreId} onValueChange={setTransferStoreId}>
                                                                            <SelectTrigger className="h-14 rounded-2xl border-indigo-200 bg-white text-[11px] font-black uppercase tracking-widest pl-6 shadow-sm"><SelectValue placeholder="SELECT_SOURCE_NODE" /></SelectTrigger>
                                                                            <SelectContent className="rounded-2xl">
                                                                                {otherStocks.map(s => (
                                                                                    <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.name} ({s.count}_NET)</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <Button 
                                                                        className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white text-[12px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                                                                        onClick={() => resolveIndent(indent.id, 'transfer')}
                                                                        disabled={!transferStoreId}
                                                                    >
                                                                        START_INTERNAL_TRANSFER
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            <Button 
                                                                className="w-full h-20 rounded-[2.5rem] bg-blue-600 hover:bg-black text-white text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-600/20 transition-all duration-300 active:scale-95 flex flex-col gap-1"
                                                                onClick={() => resolveIndent(indent.id, 'purchase')}
                                                            >
                                                                <ShoppingCart size={20} />
                                                                <span>Raise_PO_Protocol</span>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-10 rounded-[3rem] bg-slate-50/50 border border-slate-100 flex flex-col items-center justify-center space-y-6 text-center">
                                                            <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm">
                                                                <config.icon size={32} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <p className="text-[14px] font-black uppercase tracking-tight text-slate-700">Protocol_Settled</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                                                    Indent resolved via {indent.resolution_type === 'transfer' ? 'Internal Transfer Protocol' : 'Purchase Order Authorization'}.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* 3. Global Protocol Signal Footer */}
            <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500 shadow-sm" /> MESH_SYNCED: {format(new Date(), "HH:mm")}</span>
                    <div className="h-3 w-[1px] bg-slate-100" />
                    <span>AUTHORITY_NODE: SHORTAGE_FULFILLMENT</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="hover:text-primary transition-colors cursor-help flex items-center gap-2"><Layers size={10} /> v4.2.18_PRO</span>
                    <span className="text-primary/40 flex items-center gap-2"><Activity size={10} /> SYSTEM_READY</span>
                </div>
            </footer>
        </div>
    );
}
