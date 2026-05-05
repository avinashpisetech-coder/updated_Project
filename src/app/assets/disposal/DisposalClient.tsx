"use client";

import React, { useState } from "react";
import { 
    Trash2, 
    Plus, 
    Search, 
    ArrowLeft, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ShieldAlert, 
    FileText, 
    History,
    Upload,
    DollarSign,
    Box,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Database,
    ExternalLink,
    AlertTriangle,
    BadgeCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

interface Props {
    initialDisposals: any[];
    assets: any[];
    profiles: any[];
    canManage: boolean;
    canAuthorize: boolean;
}

export function DisposalClient({ initialDisposals, assets, profiles, canManage, canAuthorize }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [view, setView] = useState<'list' | 'details' | 'form'>('list');
    const [selectedDisposal, setSelectedDisposal] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Form State
    const [form, setForm] = useState({
        disposal_type: "scrap",
        reason: "",
        vendor_name: "",
        sale_value: 0,
        disposal_date: format(new Date(), "yyyy-MM-dd"),
        selected_assets: [] as string[]
    });

    const filteredDisposals = initialDisposals.filter(d => 
        d.disposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateRequest = async () => {
        if (form.selected_assets.length === 0 || !form.reason) {
            toast.error("Protocol Incomplete: Missing assets or justification.");
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Insert Header
            const { data: header, error: hError } = await supabase
                .from("asset_disposals")
                .insert([{
                    disposal_type: form.disposal_type,
                    reason: form.reason,
                    status: 'pending_approval'
                }])
                .select()
                .single();

            if (hError) throw hError;

            // 2. Insert Items
            const items = form.selected_assets.map(assetId => ({
                disposal_id: header.id,
                asset_id: assetId
            }));

            const { error: iError } = await supabase
                .from("asset_disposal_items")
                .insert(items);

            if (iError) throw iError;

            // 3. Log Audit
            await supabase.from("asset_disposal_logs").insert([{
                disposal_id: header.id,
                status: 'pending_approval',
                remarks: "Initial disposal protocol initiated."
            }]);

            toast.success("Disposal Request Authorized & Queued.");
            setView('list');
            router.refresh();
        } catch (error: any) {
            toast.error(`Execution Failure: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string, remarks: string) => {
        setIsProcessing(true);
        try {
            const updateData: any = { status: newStatus };
            if (newStatus === 'approved') {
                updateData.approved_at = new Date().toISOString();
                updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
            }

            const { error } = await supabase
                .from("asset_disposals")
                .update(updateData)
                .eq("id", id);

            if (error) throw error;

            // Update Asset Status if processed
            if (newStatus === 'processed') {
                const disposals = initialDisposals.find(d => d.id === id);
                const assetIds = disposals.items.map((i: any) => i.asset_id);
                
                await supabase
                    .from("assets")
                    .update({ status: 'written_off', is_written_off: true, written_off_at: new Date().toISOString() })
                    .in("id", assetIds);
            }

            await supabase.from("asset_disposal_logs").insert([{
                disposal_id: id,
                status: newStatus,
                remarks: remarks
            }]);

            toast.success(`Protocol transitioned to ${newStatus.toUpperCase()}.`);
            setView('list');
            router.refresh();
        } catch (error: any) {
            toast.error(`Transition Failure: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved': return { label: 'Authorized', icon: BadgeCheck, color: 'text-sky-500 bg-sky-500/10' };
            case 'pending_approval': return { label: 'In_Review', icon: Clock, color: 'text-amber-500 bg-amber-500/10' };
            case 'processed': return { label: 'Scrapped', icon: Trash2, color: 'text-emerald-500 bg-emerald-500/10' };
            case 'cancelled': return { label: 'Rejected', icon: XCircle, color: 'text-destructive bg-destructive/10' };
            default: return { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted/10' };
        }
    };

    if (view === 'form') {
        return (
            <div className="flex flex-col min-h-screen gap-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <header className="flex items-center justify-between pb-8 border-b border-border/40">
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-12 w-12 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all border border-border/40">
                            <ChevronLeft size={20} />
                        </Button>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Initiate_Scrap_Protocol</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Financial Write-off Authorization Matrix</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left: Metadata */}
                    <div className="bg-card/40 border border-border/40 rounded-[2.5rem] p-10 space-y-8 backdrop-blur-xl">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Protocol_Type</label>
                                <Select value={form.disposal_type} onValueChange={v => setForm({...form, disposal_type: v})}>
                                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 font-black uppercase text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/40">
                                        <SelectItem value="scrap" className="text-[10px] font-black py-3 uppercase">Physical_Scrap</SelectItem>
                                        <SelectItem value="sale" className="text-[10px] font-black py-3 uppercase">External_Asset_Sale</SelectItem>
                                        <SelectItem value="donation" className="text-[10px] font-black py-3 uppercase">Social_Donation</SelectItem>
                                        <SelectItem value="theft" className="text-[10px] font-black py-3 uppercase text-red-500">Lost_Or_Stolen</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">Justification_Brief</label>
                                <Textarea 
                                    placeholder="Explain why these assets need to be decommissioned..." 
                                    className="min-h-[160px] rounded-2xl bg-background/50 border-border/40 p-6 text-[13px] font-medium leading-relaxed" 
                                    value={form.reason}
                                    onChange={e => setForm({...form, reason: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button 
                                className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-600/20 gap-3 transition-all active:scale-95"
                                disabled={isProcessing}
                                onClick={handleCreateRequest}
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" /> : <ShieldAlert size={18} />}
                                Queue_For_Authorization
                            </Button>
                        </div>
                    </div>

                    {/* Right: Asset Selector */}
                    <div className="bg-card/40 border border-border/40 rounded-[2.5rem] p-10 space-y-8 backdrop-blur-xl flex flex-col">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground">Select_Hardware_Nodes</h3>
                            <Badge className="bg-primary/5 text-primary border-primary/10 text-[10px]">{form.selected_assets.length} Selected</Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[500px] no-scrollbar space-y-3 pr-2">
                            {assets.map(asset => {
                                const isSelected = form.selected_assets.includes(asset.id);
                                return (
                                    <div 
                                        key={asset.id} 
                                        onClick={() => {
                                            if (isSelected) setForm({...form, selected_assets: form.selected_assets.filter(id => id !== asset.id)});
                                            else setForm({...form, selected_assets: [...form.selected_assets, asset.id]});
                                        }}
                                        className={cn(
                                            "p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                            isSelected ? "bg-primary/5 border-primary/40" : "bg-muted/5 border-border/20 hover:border-primary/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-all", isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                                <Box size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black tracking-tight text-foreground uppercase">{asset.asset_code}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">{asset.brand} {asset.model}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase opacity-40">{asset.status}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Command Bar */}
            <div className="flex items-center justify-between gap-6">
                <div className="relative flex-1 max-w-xl group">
                    <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                    <Input 
                        placeholder="SCAN_PROTOCOL_LOG, DISPOSAL_ID, OR REASON..." 
                        className="h-14 pl-14 rounded-2xl bg-card border-border/40 shadow-sm text-[11px] font-black uppercase tracking-widest focus:ring-primary/20 placeholder:text-muted-foreground/30 transition-all shadow-primary/5 backdrop-blur-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Button 
                    onClick={() => setView('form')}
                    className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-red-600/20 gap-3 transition-all hover:-translate-y-1 active:scale-95 border-none"
                >
                    <Plus size={18} />
                    Initiate_Disposal
                </Button>
            </div>

            {/* Disposal Ledger */}
            <div className="rounded-[3rem] border border-border/40 bg-card/40 overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-2xl">
                <div className="px-10 py-8 border-b border-border/40 flex items-center justify-between bg-muted/10">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-red-500 shadow-sm shadow-red-500/10">
                             <Trash2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">TERMINAL_LEDGER</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] opacity-50">Assets Exit Lifecycle & Write-off Audit Registry</p>
                        </div>
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md border-b border-border/40">
                        <TableRow className="h-14 border-none hover:bg-transparent">
                            <TableHead className="pl-12 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">REF_ID</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">TYPE</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">QUANTITY</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">JUSTIFICATION</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">STATUS</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.3em] pr-12 text-muted-foreground">REQUESTOR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDisposals.length === 0 ? (
                            <TableRow className="h-96 border-none hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center opacity-10">
                                    <div className="flex flex-col items-center gap-6">
                                        <Database size={80} />
                                        <p className="text-[12px] font-black uppercase tracking-[0.8em]">Disposal Ledger Empty // All Assets Active</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDisposals.map((disposal) => {
                                const status = getStatusConfig(disposal.status);
                                return (
                                    <TableRow 
                                        key={disposal.id} 
                                        className="h-28 group hover:bg-primary/5 cursor-pointer border-b border-border/5 transition-all"
                                        onClick={() => { setSelectedDisposal(disposal); setView('details'); }}
                                    >
                                        <TableCell className="pl-12">
                                            <span className="text-[13px] font-black text-foreground uppercase tracking-tighter bg-background/50 px-3 py-1.5 rounded-lg border border-border/40">{disposal.disposal_number}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded-full bg-muted/20 border-none">
                                                {disposal.disposal_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[16px] font-black text-foreground italic">{disposal.items?.length || 0}</span>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Units</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight leading-snug line-clamp-2 max-w-[300px]">
                                                {disposal.reason}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em] h-7 px-5 rounded-full border-none shadow-sm",
                                                status.color
                                            )}>
                                                <status.icon size={12} className="mr-2" />
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-12">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[13px] font-black text-foreground uppercase tracking-tighter leading-none">{disposal.requestor?.full_name || 'SYSTEM'}</span>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none opacity-40">{format(new Date(disposal.created_at), 'dd MMM yyyy')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Disposal Details Modal (Simplified for now) */}
            <Dialog open={view === 'details'} onOpenChange={() => setView('list')}>
                <DialogContent className="max-w-4xl rounded-[2.5rem] p-0 overflow-hidden bg-card border-border/40 backdrop-blur-3xl">
                    {selectedDisposal && (
                        <div className="flex flex-col">
                            <div className="p-8 px-12 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedDisposal.disposal_number}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">Disposal_Detail_Matrix</p>
                                </div>
                                <Badge className={cn("h-8 px-5 rounded-full font-black uppercase tracking-widest text-[10px] border-none shadow-lg shadow-black/5", getStatusConfig(selectedDisposal.status).color)}>
                                    {selectedDisposal.status.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="p-12 space-y-10">
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Justification_Vector</label>
                                        <p className="text-[14px] font-black uppercase text-foreground italic leading-relaxed">{selectedDisposal.reason}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 bg-muted/10 p-8 rounded-[2rem] border border-border/40 font-sans">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Type</p>
                                            <p className="text-[12px] font-black text-foreground uppercase">{selectedDisposal.disposal_type}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Date</p>
                                            <p className="text-[12px] font-black text-foreground uppercase">{format(new Date(selectedDisposal.created_at), "MMM dd, yyyy")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-3">
                                        <Box size={14} /> Affected_Physical_Nodes
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedDisposal.items?.map((item: any) => (
                                            <div key={item.id} className="p-4 rounded-xl bg-background border border-border/40 flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-black text-foreground uppercase">{item.asset?.asset_code}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase">{item.asset?.brand} {item.asset?.model}</span>
                                                </div>
                                                <span className="text-[9px] font-mono text-muted-foreground opacity-20">{item.asset?.serial_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedDisposal.status === 'pending_approval' && canAuthorize && (
                                    <div className="pt-8 flex items-center gap-4">
                                        <Button 
                                            variant="outline"
                                            className="flex-1 h-14 rounded-2xl border-destructive/20 text-destructive font-black uppercase tracking-widest hover:bg-destructive/10"
                                            onClick={() => handleUpdateStatus(selectedDisposal.id, 'cancelled', 'Rejected by authority.')}
                                        >
                                            REJECT_PROTOCOL
                                        </Button>
                                        <Button 
                                            className="flex-1 h-14 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-widest shadow-xl shadow-sky-600/20"
                                            onClick={() => handleUpdateStatus(selectedDisposal.id, 'approved', 'Authorized for disposal.')}
                                        >
                                            AUTHORIZE_DISPOSAL
                                        </Button>
                                    </div>
                                )}

                                {selectedDisposal.status === 'approved' && (
                                    <Button 
                                        className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 gap-3"
                                        onClick={() => handleUpdateStatus(selectedDisposal.id, 'processed', 'Physical disposal finalized.')}
                                    >
                                        <CheckCircle2 size={18} />
                                        Finalize_Physical_Disposal
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
