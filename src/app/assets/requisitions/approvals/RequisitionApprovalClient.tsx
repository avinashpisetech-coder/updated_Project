"use client";

import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  ChevronRight, 
  Box, 
  Store,
  ArrowRight,
  ShieldCheck,
  FileText,
  BadgeAlert,
  Search,
  Check,
  Info,
  Activity,
  UserPlus,
  Shield,
  Layers,
  ArrowUpRight,
  Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

// --- Types ---
interface RequisitionItem {
    id: string;
    sub_type_id: string;
    quantity: number;
    specifications: any;
    sub_type: { name: string };
    stock_status?: 'checking' | 'available' | 'shortage';
    available_qty?: number;
}

interface Requisition {
    id: string;
    requisition_number: string;
    status: string;
    created_at: string;
    requester: { full_name: string };
    recipient?: { full_name: string };
    project?: { id: string; name: string };
    store: { id: string; name: string; code: string };
    department: { id: string; name: string };
    items: RequisitionItem[];
    justification?: string;
}

interface Props {
    initialRequisitions: Requisition[];
    stores: { id: string; name: string; code: string }[];
}

export function RequisitionApprovalClient({ initialRequisitions, stores }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [requisitions, setRequisitions] = React.useState<Requisition[]>(initialRequisitions);
    const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

    const checkStock = async (requisitionId: string) => {
        setIsProcessing(requisitionId);
        const req = requisitions.find(r => r.id === requisitionId);
        if (!req) return;

        try {
            const updatedItems = [...req.items];
            for (let item of updatedItems) {
                // Query active stock for this subtype in the specific target store
                const { count, error } = await supabase
                    .from("assets")
                    .select("*", { count: "exact", head: true })
                    .eq("status", "in_stock")
                    .eq("sub_type_id", item.sub_type_id)
                    .eq("store_id", req.store.id);

                if (error) throw error;

                item.available_qty = count || 0;
                item.stock_status = (count || 0) >= item.quantity ? 'available' : 'shortage';
            }

            setRequisitions(prev => prev.map(r => r.id === requisitionId ? { ...r, items: updatedItems } : r));
            toast.success("Stock Verification Cycle Complete");
        } catch (error: any) {
            toast.error(`Verification Failed: ${error.message}`);
        } finally {
            setIsProcessing(null);
        }
    };

    const handleAction = async (requisitionId: string, action: 'approve' | 'indent' | 'reject') => {
        setIsProcessing(requisitionId);
        const req = requisitions.find(r => r.id === requisitionId);
        if (!req) return;

        try {
            if (action === 'approve') {
                const { error } = await supabase.from("asset_requisitions").update({ status: 'approved' }).eq("id", requisitionId);
                if (error) throw error;
                toast.success("Protocol APPROVED for Handover sequence.");
            } else if (action === 'reject') {
                const { error } = await supabase.from("asset_requisitions").update({ status: 'rejected' }).eq("id", requisitionId);
                if (error) throw error;
                toast.error("Protocol REJECTED. Execution Terminated.");
            } else if (action === 'indent') {
                // 1. Update Requisition
                const { error: reqErr } = await supabase.from("asset_requisitions").update({ status: 'partially_fulfilled' }).eq("id", requisitionId);
                if (reqErr) throw reqErr;

                // 2. Create Indents for shortage items
                for (let item of req.items) {
                    if (item.stock_status === 'shortage') {
                        const indentNumber = `IND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                        const { error: indentErr } = await supabase.from("asset_indents").insert([{
                            indent_number: indentNumber,
                            requisition_item_id: item.id,
                            sub_type_id: item.sub_type_id,
                            quantity: item.quantity - (item.available_qty || 0),
                            status: 'pending',
                            project_id: req.project?.id || null,
                            store_id: req.store.id,
                            department_id: req.department.id
                        }]);
                        if (indentErr) throw indentErr;
                    }
                }
                toast.warning("INDENTS GENERATED. Procurement Admin notified for fulfillment sequence.");
            }

            router.refresh();
        } catch (error: any) {
            toast.error(`Action Failure: ${error.message}`);
        } finally {
            setIsProcessing(null);
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
                            <h1 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">REQUISITION_APPROVAL_HUB</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-60">Provisioning Approval Protocol v4.0</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-8 h-10 px-8 rounded-xl bg-white/50 border border-white/50 shadow-sm mr-2">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={14} className="text-emerald-500/40" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">STOCK_READY</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <BadgeAlert size={14} className="text-red-500/40" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">SHORTAGE_CUE</span>
                        </div>
                    </div>
                    <Button variant="outline" className="h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                        Registry_Archive
                    </Button>
                </div>
            </header>

            {/* 2. Unified Content Matrix */}
            <main className="flex-1 overflow-auto p-10 no-scrollbar space-y-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {requisitions.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[3.5rem] shadow-sm opacity-20">
                            <FileText size={64} className="mb-4 text-slate-300" />
                            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400">No Pending Requisition Nodes</p>
                        </div>
                    ) : (
                        requisitions.map((req) => (
                            <Card key={req.id} className="rounded-[3.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-primary/5 group">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row min-h-[400px]">
                                        
                                        {/* Status Plate: Snow White Style */}
                                        <div className="lg:w-[350px] p-12 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                                            <div className="space-y-8">
                                                <Badge className="h-7 px-5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
                                                    {req.requisition_number}
                                                </Badge>
                                                <div className="space-y-2">
                                                    <h3 className="text-[28px] font-black uppercase tracking-tighter text-slate-800 italic leading-none">
                                                        {req.recipient?.full_name || "SYSTEM_PROVISION"}
                                                    </h3>
                                                    <p className="text-[11px] font-black text-primary/40 uppercase tracking-[0.3em] font-sans">For {req.department.name}</p>
                                                </div>

                                                <div className="space-y-5 pt-4">
                                                    <div className="flex items-center gap-4 group/st">
                                                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover/st:text-primary transition-colors">
                                                            <Store size={16} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{req.store.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 group/pj">
                                                        <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover/pj:text-primary transition-colors">
                                                            <Layers size={16} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{req.project?.name || "Global_Pool"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-10 border-t border-slate-200">
                                                <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                                                    <Activity size={12} className="opacity-40" />
                                                    DISPATCHED: {format(new Date(req.created_at), 'HH:mm dd MMM yyyy')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Verification & Action Zone */}
                                        <div className="flex-1 p-12 space-y-12">
                                            <div className="space-y-10">
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                            <Zap size={20} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h4 className="text-[18px] font-black uppercase tracking-tighter text-slate-800 leading-none mb-1">Manifest_Verification</h4>
                                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Stock Sync Engine v.2.04</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-10 px-6 rounded-xl text-slate-400 hover:text-primary text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-primary/5"
                                                            onClick={() => router.push('/settings/masters/users')}
                                                        >
                                                            <UserPlus size={16} />
                                                            Registry_Lookup
                                                        </Button>
                                                        <Button 
                                                            variant="default" 
                                                            size="sm" 
                                                            className="h-10 px-8 rounded-xl bg-slate-900 border-none hover:bg-black text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 gap-3 transition-all active:scale-95"
                                                            onClick={() => checkStock(req.id)}
                                                            disabled={isProcessing === req.id}
                                                        >
                                                            {isProcessing === req.id ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                                            Sync Availability
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-6">
                                                    {req.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-primary/5 group-hover:border-slate-200 transition-all duration-700">
                                                            <div className="flex items-center gap-8">
                                                                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm transition-colors group-hover:text-primary">
                                                                    <Box size={24} />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[15px] font-black uppercase tracking-tight text-slate-800 leading-none">{item.sub_type.name}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requirement: {item.quantity} Nos.</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-12">
                                                                {item.stock_status && (
                                                                    <div className={cn(
                                                                        "flex items-center gap-4 px-6 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-sm",
                                                                        item.stock_status === 'available' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                                                    )}>
                                                                        {item.stock_status === 'available' ? <CheckCircle2 size={14} /> : <BadgeAlert size={14} />}
                                                                        {item.stock_status === 'available' ? `STOCK_OK: ${item.available_qty}` : `SHORTAGE: ${item.quantity - (item.available_qty || 0)}`}
                                                                    </div>
                                                                )}
                                                                <ChevronRight size={18} className="text-slate-200 group-hover:text-primary transition-colors" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Final Authorization Strip */}
                                            <div className="pt-10 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                                        <Shield size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 leading-none mb-1">ADMIN_SIGNATURE_PENDING</span>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting Atomic Protocol Clearance</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-6">
                                                    <Button 
                                                        variant="ghost" 
                                                        className="h-12 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                        onClick={() => handleAction(req.id, 'reject')}
                                                        disabled={isProcessing === req.id || req.status !== 'pending_approval'}
                                                    >
                                                        REJECT_PROTOCOL
                                                    </Button>
                                                    
                                                    {req.items.some(i => i.stock_status === 'shortage') ? (
                                                         <Button 
                                                            className="h-14 px-12 rounded-[2rem] bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/30 transition-all hover:-translate-y-1 active:scale-95 border-none"
                                                            onClick={() => handleAction(req.id, 'indent')}
                                                            disabled={isProcessing === req.id || req.status !== 'pending_approval'}
                                                         >
                                                            ACTIVATE INDENT PROTOCOL
                                                         </Button>
                                                    ) : (
                                                        <Button 
                                                            className="h-14 px-12 rounded-[2rem] bg-primary hover:bg-emerald-500 text-white text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:shadow-emerald-500/30 transition-all hover:-translate-y-1 active:scale-95 border-none"
                                                            onClick={() => handleAction(req.id, 'approve')}
                                                            disabled={isProcessing === req.id || !req.items.every(i => i.stock_status === 'available') || req.status !== 'pending_approval'}
                                                        >
                                                            AUTHORIZE_HANDOVER
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </main>

            {/* 3. Global Protocol Signal Footer */}
            <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-emerald-500" /> MESH_SYNCED: {format(new Date(), "HH:mm")}</span>
                    <div className="h-3 w-[1px] bg-slate-100" />
                    <span>AUTHORIZATION_DOMAIN: PROVISIONING_ADMIN</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="hover:text-primary transition-colors cursor-help flex items-center gap-2"><ArrowUpRight size={10} /> v4.0.18_EXEC</span>
                    <span className="text-primary/40 flex items-center gap-2"><ShieldCheck size={10} /> INTEGRITY_LOCKED</span>
                </div>
            </footer>
        </div>
    );
}
