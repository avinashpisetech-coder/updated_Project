"use client";

import React from "react";
import { 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Truck, 
  Navigation, 
  ChevronRight,
  ShieldCheck,
  FileText,
  Package,
  ArrowLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
    initialGatePasses: any[];
    stores: { id: string; name: string }[];
    assets: any[];
}

export function GatePassClient({ initialGatePasses, stores, assets }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [gatePasses, setGatePasses] = React.useState(initialGatePasses);
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    // Form State
    const [form, setForm] = React.useState({
        source_store_id: "",
        destination: "",
        purpose: "service",
        carrier_name: "",
        vehicle_number: "",
        selectedAssets: [] as string[]
    });

    const handleCreate = async () => {
        if (!form.destination || form.selectedAssets.length === 0) {
            toast.error("Protocol Error: Destination and Asset selection required."); return;
        }

        setIsLoading(true);
        try {
            // 1. Generate GP Number
            const { data: seq } = await supabase.from('asset_gate_passes').select('gp_number').order('gp_number', { ascending: false }).limit(1);
            let nextNum = 1;
            if (seq && seq.length > 0) {
                const lastNum = seq[0].gp_number.split('/').pop();
                nextNum = parseInt(lastNum) + 1;
            }
            const gpNumber = `GP/${format(new Date(), 'yyMM')}/${String(nextNum).padStart(4, '0')}`;

            // 2. Insert Header
            const { data: gp, error: gpError } = await supabase.from('asset_gate_passes').insert({
                gp_number: gpNumber,
                source_store_id: form.source_store_id || null,
                destination: form.destination,
                purpose: form.purpose,
                carrier_name: form.carrier_name,
                vehicle_number: form.vehicle_number,
                status: 'issued',
                issued_by: (await supabase.auth.getUser()).data.user?.id
            }).select().single();

            if (gpError) throw gpError;

            // 3. Insert Items
            const items = form.selectedAssets.map(id => ({
                gate_pass_id: gp.id,
                asset_id: id
            }));
            const { error: itemsError } = await supabase.from('asset_gate_pass_items').insert(items);
            if (itemsError) throw itemsError;

            toast.success(`PASS ISSUED: ${gpNumber} registered in manifest.`);
            setIsCreateModalOpen(false);
            window.location.reload(); // Quick refresh
        } catch (e: any) {
            toast.error(`Authorization Fault: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAsset = (assetId: string) => {
        setForm(prev => ({
            ...prev,
            selectedAssets: prev.selectedAssets.includes(assetId)
                ? prev.selectedAssets.filter(id => id !== assetId)
                : [...prev.selectedAssets, assetId]
        }));
    };

    return (
        <div className="space-y-10 font-sans">
            
            {/* Control Strip */}
            <div className="flex items-center justify-between">
                <div className="relative w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                    <Input placeholder="SEARCH_MANIFEST_DB..." className="h-12 pl-12 rounded-2xl bg-white border-slate-100 shadow-sm text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 px-10 rounded-2xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.05] active:scale-95">
                    + Authorize Movement
                </Button>
            </div>

            {/* Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gatePasses.map((pass) => (
                    <div key={pass.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group relative">
                        <div className="absolute top-8 right-8">
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest">{pass.status}</Badge>
                        </div>
                        
                        <div className="space-y-1 mb-8">
                            <h3 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{pass.gp_number}</h3>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">{format(new Date(pass.gp_date), 'dd MMM yyyy // HH:mm')}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Navigation size={14} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-300 uppercase leading-none">Destination Context</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase">{pass.destination}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Truck size={14} />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-300 uppercase leading-none">Logistics Partner</span>
                                    <p className="text-[11px] font-bold text-slate-700 uppercase">{pass.carrier_name || 'SELF_TRANSPORT'} // {pass.vehicle_number || 'NA'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500 opacity-40" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Issued by {pass.issuer?.full_name?.split(' ')[0]}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all">
                                <Printer size={18} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Creation Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-4xl rounded-[3rem] p-12 border-none bg-white shadow-2xl font-sans overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <DialogHeader className="mb-10">
                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Physical Movement Authorization</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/30">
                            Issuing mandatory gate pass for equipment exit
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Source Origin</label>
                                <Select value={form.source_store_id} onValueChange={v => setForm({...form, source_store_id: v})}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none text-xs font-bold uppercase">
                                        <SelectValue placeholder="SELECT_SOURCE" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {stores.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Final Destination</label>
                                <Input placeholder="PROJECT_SITE_ID / SERVICE_CENTER_NAME..." className="h-12 rounded-2xl bg-slate-50 border-none text-xs font-bold uppercase" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Movement Purpose</label>
                                <Select value={form.purpose} onValueChange={v => setForm({...form, purpose: v})}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none text-xs font-bold uppercase">
                                        <SelectValue placeholder="SELECT_PURPOSE" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="deployment" className="text-[10px] font-bold uppercase text-blue-500">Project Deployment</SelectItem>
                                        <SelectItem value="service" className="text-[10px] font-bold uppercase text-amber-500">Service / Repair</SelectItem>
                                        <SelectItem value="transfer" className="text-[10px] font-bold uppercase text-emerald-500">Inter-Store Transfer</SelectItem>
                                        <SelectItem value="disposal" className="text-[10px] font-bold uppercase text-red-500">Disposal Exit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Carrier Entity</label>
                                <Input placeholder="LOGISTICS_COMPANY_NAME..." className="h-12 rounded-2xl bg-slate-50 border-none text-xs font-bold uppercase" value={form.carrier_name} onChange={e => setForm({...form, carrier_name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Vehicle Signature</label>
                                <Input placeholder="REG_NUMBER (E.G. MH-12-XX-0000)..." className="h-12 rounded-2xl bg-slate-50 border-none text-xs font-bold uppercase" value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-12">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Asset Selection Pool ({form.selectedAssets.length})</label>
                        <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                            {assets.map(asset => {
                                const isSelected = form.selectedAssets.includes(asset.id);
                                return (
                                    <div key={asset.id} onClick={() => toggleAsset(asset.id)} className={cn(
                                        "p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between group",
                                        isSelected ? "bg-primary/5 border-primary/20" : "bg-slate-50/50 border-transparent hover:border-slate-200"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-all", isSelected ? "bg-primary text-white" : "bg-white text-slate-300")}>
                                                <Package size={14} />
                                            </div>
                                            <div className="space-y-0.5 font-sans">
                                                <p className="text-[11px] font-black uppercase tracking-tight">{asset.asset_code}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{asset.sub_type.name} // {asset.brand}</p>
                                            </div>
                                        </div>
                                        {isSelected && <Badge className="bg-primary text-white text-[8px] rounded-full px-2">SELECTED</Badge>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button className="h-14 w-full rounded-[1.5rem] bg-slate-950 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all hover:scale-[1.02] active:scale-95" onClick={handleCreate} disabled={isLoading}>
                            {isLoading ? 'EXECUTING_PROTOCOL...' : 'ISSUE_GATE_PASS_AUTHORIZATION'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
