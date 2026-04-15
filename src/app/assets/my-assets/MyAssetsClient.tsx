"use client";

import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  Monitor, 
  Smartphone, 
  Cpu, 
  PackageCheck, 
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Info,
  Activity,
  Award,
  Zap,
  Layers,
  Shield,
  MonitorSmartphone,
  CheckCircle,
  Box,
  RefreshCw
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
interface Asset {
    id: string;
    asset_code: string;
    sub_type: { name: string; category?: { name: string } };
    brand: string;
    model: string;
    serial_number: string;
    status: string;
    received_status: string;
    received_at?: string;
    created_at: string;
}

interface Props {
    assets: Asset[];
}

export function MyAssetsClient({ assets: initialAssets }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [assets, setAssets] = React.useState<Asset[]>(initialAssets);
    const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

    const handleAcknowledge = async (assetId: string) => {
        setIsProcessing(assetId);
        try {
            const { error } = await supabase.from("assets")
                .update({ 
                    received_status: 'received',
                    received_at: new Date().toISOString()
                })
                .eq("id", assetId);

            if (error) throw error;

            toast.success("Custody Confirmed: Asset receipt finalized in the digital registry.");
            router.refresh();
        } catch (error: any) {
            toast.error(`Confirmation Fault: ${error.message}`);
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700 font-sans">
            
            {/* 1. Custody Telemetry: High Density Snow White */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-primary/5 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active_Custody</span>
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shadow-sm"><Layers size={20} /></div>
                    </div>
                    <div className="mt-8">
                        <p className="text-3xl font-black text-slate-800 italic leading-none">{assets.length} <span className="text-xs text-slate-300 ml-1">UNITS</span></p>
                        <p className="text-[9px] font-black text-primary/40 uppercase tracking-widest mt-2">Current Asset Deployment</p>
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-amber-500/5 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Awaiting_Sync</span>
                        <div className="h-10 w-10 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500 shadow-sm"><Clock size={20} /></div>
                    </div>
                    <div className="mt-8">
                        <p className="text-3xl font-black text-slate-800 italic leading-none">{assets.filter(a => a.received_status === 'pending').length} <span className="text-xs text-slate-300 ml-1">PENDING</span></p>
                        <p className="text-[9px] font-black text-amber-500/40 uppercase tracking-widest mt-2">Digital Acknowledgement Needed</p>
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-20%] h-48 w-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account_Health</span>
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 shadow-sm"><ShieldCheck size={20} /></div>
                    </div>
                    <div className="mt-8 relative z-10">
                        <p className="text-3xl font-black text-white italic leading-none">{Math.round(((assets.length - assets.filter(a => a.received_status === 'pending').length) / (assets.length || 1)) * 100)}%</p>
                        <p className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest mt-2">Compliance Rating: Optimal</p>
                    </div>
                </div>
            </div>

            {/* 2. Portfolio Matrix */}
            <div className="grid grid-cols-1 gap-6">
                {assets.length === 0 ? (
                    <div className="h-80 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[3rem] shadow-sm opacity-20">
                        <MonitorSmartphone size={64} className="mb-4 text-slate-300" />
                        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400">Portfolio Registry Empty</p>
                    </div>
                ) : (
                    assets.map((asset) => (
                        <Card key={asset.id} className="rounded-[3rem] border border-slate-100 bg-white shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-700">
                            <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                    
                                    {/* Visual Identifier Plate */}
                                    <div className="w-full md:w-[280px] p-10 bg-slate-50 border-r border-slate-100 flex flex-col justify-between">
                                        <div className="space-y-6">
                                            <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-300 group-hover:text-primary transition-all group-hover:shadow-primary/10">
                                                {asset.sub_type.name.toLowerCase().includes('laptop') ? <Cpu size={32} /> : 
                                                 asset.sub_type.name.toLowerCase().includes('monitor') ? <Monitor size={32} /> : 
                                                 asset.sub_type.name.toLowerCase().includes('phone') ? <Smartphone size={32} /> : 
                                                 <Box size={32} />}
                                            </div>
                                            <div className="space-y-1">
                                                <Badge className="h-6 px-4 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
                                                    {asset.asset_code}
                                                </Badge>
                                                <h3 className="text-[22px] font-black text-slate-800 uppercase tracking-tighter leading-none italic pt-2">{asset.sub_type.name}</h3>
                                                <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest leading-none">{asset.brand} // {asset.model}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-8 border-t border-slate-200">
                                            <div className="flex items-center gap-3 text-[9px] font-black text-slate-300 uppercase tracking-widest italic group-hover:text-slate-400 transition-colors">
                                                <Activity size={12} className="opacity-40" />
                                                ID_HASH: {asset.id.split('-')[0].toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Technical Specification Hub */}
                                    <div className="flex-1 p-10 space-y-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">System_Serial_ID</span>
                                                <p className="text-xl font-black text-slate-800 tracking-tighter uppercase">{asset.serial_number || 'NA_RECORDED'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Custody_Initiation</span>
                                                <p className="text-xl font-black text-slate-800 tracking-tighter uppercase">{format(new Date(asset.created_at), 'dd MMM yyyy')}</p>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "flex items-center gap-3 px-6 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest shadow-sm",
                                                    asset.received_status === 'received' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {asset.received_status === 'received' ? <CheckCircle size={14} /> : <Zap size={14} className="animate-pulse" />}
                                                    {asset.received_status === 'received' ? `CUSTODY_FINALIZED: ${asset.received_at ? format(new Date(asset.received_at), 'dd MMM') : 'SYNC'}` : 'AWAITING_DIGITAL_ACK'}
                                                </div>
                                            </div>

                                            {asset.received_status === 'pending' && (
                                                <Button 
                                                    className="h-12 px-10 rounded-2xl bg-primary hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95 border-none"
                                                    onClick={() => handleAcknowledge(asset.id)}
                                                    disabled={isProcessing === asset.id}
                                                >
                                                    {isProcessing === asset.id ? <RefreshCw size={14} className="animate-spin mr-3" /> : <ShieldCheck size={16} className="mr-3" />}
                                                    {isProcessing === asset.id ? 'SYNCING_PROTOCOL...' : 'AUTHORIZE_RECEIPT'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* 3. Global Disclaimer Strip */}
            <div className="p-10 rounded-[3rem] bg-indigo-50/20 border border-indigo-100/50 flex items-start gap-6 group hover:bg-indigo-50/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <Info size={20} />
                </div>
                <div className="space-y-2">
                    <p className="text-[12px] font-black text-indigo-900 uppercase tracking-widest leading-none">Security_&_Custody_Policy_v4.1</p>
                    <p className="text-[10px] font-bold text-indigo-400 leading-relaxed uppercase tracking-tight">
                        By authorizing receipt, you finalize physical custody for the equipment identified above. This is an immutable record etched into the ITAM audit ledger. Any operational discrepancies or hardware damage must be reported via the maintenance hub within 48 technical hours.
                    </p>
                </div>
            </div>

        </div>
    );
}
