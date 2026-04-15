"use client";

import React from "react";
import { 
  ArrowRightLeft, 
  Search, 
  User, 
  Package, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  History,
  Info,
  ShieldCheck,
  Zap,
  Camera,
  ExternalLink,
  ChevronRight,
  Monitor,
  Printer,
  FileCheck,
  ArrowUpRight,
  ArrowRight,
  Box,
  Fingerprint
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

// --- Types ---
interface AssetRaw {
    id: string;
    asset_code: string;
    brand: string;
    model: string;
    serial_number: string;
    sub_type: { name: string } | null;
}

interface UserRaw {
    id: string;
    full_name: string;
    email: string;
}

interface Props {
    assets: AssetRaw[];
    users: UserRaw[];
}

export function HandoverClient({ assets, users }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
    const [notes, setNotes] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [hasConsented, setHasConsented] = React.useState(false);

    const asset = assets.find(a => a.id === selectedAssetId);
    const user = users.find(u => u.id === selectedUserId);

    const handleExecuteProtocol = async () => {
        if (!selectedAssetId || !selectedUserId) {
            toast.error("Both Asset and Recipient must be defined.");
            return;
        }

        if (!hasConsented) {
            toast.error("Handover protocol requires terminal confirmation.");
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user: operator } } = await supabase.auth.getUser();
            if (!operator) throw new Error("Operator authentication missing.");

            const { error: assetError } = await supabase
                .from("assets")
                .update({ 
                    current_holder_id: selectedUserId,
                    status: 'assigned',
                    received_status: 'pending' // Explicitly set for acknowledgement flow
                })
                .eq("id", selectedAssetId);
            
            if (assetError) throw assetError;

            // Trigger Mock Email Notification
            console.log(`[Lifecycle Sync] Automated Email Sent to ${user?.email}: Handover Confirmation Required.`);
            toast.info(`NOTIFICATION_SENT: ${user?.full_name} has been cued for digital acknowledgement.`);

            const { error: moveError } = await supabase
                .from("stock_movements")
                .insert([{
                    asset_id: selectedAssetId,
                    type: 'handover',
                    direction: 'out',
                    from_user_id: null,
                    to_user_id: selectedUserId,
                    performed_by: operator.id,
                    notes: notes || "Formal handover execution sequence run."
                }]);

            if (moveError) throw moveError;

            toast.success("Protocol execution complete: Asset deployed.");
            router.push("/assets");
            router.refresh();
        } catch (error: any) {
            toast.error(`Execution Failure: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Left Protocol Configuration - Sharp Alignment */}
            <div className="lg:col-span-7 space-y-10">
                
                {/* 1. Asset Selection */}
                <div className="technical-card p-10 bg-white border border-border/40 relative group overflow-hidden rounded-[2.5rem] shadow-sm transition-all hover:bg-muted/10">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 duration-1000 text-primary">
                        <Box size={100} />
                    </div>
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-border/5">
                        <div className="h-11 w-11 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center">
                            <Package size={20} className="text-primary opacity-60" />
                        </div>
                        <div className="space-y-1 font-sans">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40 leading-none">Stage 01: Identification</p>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Access Hardware Gear</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 ml-2 font-sans">Locate Available Serial Node</Label>
                        <Select value={selectedAssetId || ""} onValueChange={setSelectedAssetId}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40 shadow-sm transition-all pl-8 text-[10px] font-black uppercase tracking-widest text-foreground outline-none focus:ring-primary/20 font-sans group-hover:bg-white text-left">
                                <SelectValue placeholder="LOCATE OPERATIONAL UNIT..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[350px] rounded-2xl bg-white text-foreground outline-none border-border/40">
                                {assets.map(a => (
                                    <SelectItem key={a.id} value={a.id} className="rounded-xl h-12 gap-3 text-[9px] font-black uppercase tracking-widest focus:bg-primary focus:text-white transition-all font-sans text-left">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm leading-none mb-1 group-focus:text-white text-foreground">{a.asset_code} » {a.brand}</span>
                                            <span className="text-[8px] opacity-30 group-focus:text-white/40 uppercase tracking-widest">{a.sub_type?.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 2. Recipient Selection */}
                <div className="technical-card p-10 bg-white border border-border/40 relative group overflow-hidden rounded-[2.5rem] shadow-sm transition-all hover:bg-muted/10">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 duration-1000 text-emerald-500">
                        <User size={100} />
                    </div>
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-border/5">
                        <div className="h-11 w-11 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                            <Fingerprint size={20} className="text-emerald-500 opacity-60" />
                        </div>
                        <div className="space-y-1 font-sans">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/40 leading-none">Stage 02: Destination</p>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Authorized Recipient</h3>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 ml-2 font-sans">Designated Custodian Profile</Label>
                        <Select value={selectedUserId || ""} onValueChange={setSelectedUserId}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40 shadow-sm transition-all pl-8 text-[10px] font-black uppercase tracking-widest text-foreground outline-none focus:ring-primary/20 font-sans group-hover:bg-white text-left">
                                <SelectValue placeholder="SEARCH CUSTODIAN POOL..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[350px] rounded-2xl bg-white text-foreground outline-none border-border/40">
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="rounded-xl h-12 gap-3 text-[9px] font-black uppercase tracking-widest focus:bg-emerald-500 focus:text-white transition-all font-sans text-left">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm leading-none mb-1 group-focus:text-white text-foreground">{u.full_name}</span>
                                            <span className="text-[8px] opacity-30 group-focus:text-white/40 uppercase tracking-widest">{u.email}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Right Settlement Hub - Precise Alignment */}
            <div className="lg:col-span-5 space-y-10">
                
                <div className="p-10 rounded-[3rem] border border-border/40 bg-white shadow-sm relative bg-[radial-gradient(ellipse:80%_60%_at:50%_0%,rgba(59,130,246,0.03),transparent_100%)] overflow-hidden">
                    <div className="space-y-12">
                        <div className="flex items-center gap-4 pb-8 border-b border-border/10 relative">
                            <ShieldCheck className="h-4 w-4 text-primary opacity-60" />
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 leading-none">Manifest Node Execution</span>
                        </div>
                        
                        <div className="space-y-12 pb-4">
                            <div className="flex items-start gap-5">
                                <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted border border-border/40 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                                    <Package className={cn("h-6 w-6 transition-all duration-1000", asset ? "text-primary opacity-60" : "opacity-5")} />
                                </div>
                                <div className="space-y-1.5 font-sans">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground/20 tracking-widest leading-none">Registry Unit</p>
                                    <div className={cn("text-md font-black uppercase tracking-tight leading-none h-4 transition-all", asset ? "text-foreground" : "text-muted-foreground/5")}>
                                        {asset ? `${asset.asset_code} » ${asset.brand}` : 'AWAITING_SIGNAL_NODE'}
                                    </div>
                                    {asset && <p className="text-[9px] font-bold text-primary uppercase tracking-[0.3em] opacity-40 leading-none">{asset.model}</p>}
                                </div>
                            </div>

                            <div className="flex items-start gap-5">
                                <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted border border-border/40 flex items-center justify-center shadow-lg">
                                    <User className={cn("h-6 w-6 transition-all duration-1000", user ? "text-emerald-500 opacity-60" : "opacity-5")} />
                                </div>
                                <div className="space-y-1.5 font-sans">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground/20 tracking-widest leading-none">Recipient Source</p>
                                    <div className={cn("text-md font-black uppercase tracking-tight leading-none h-4 transition-all", user ? "text-foreground" : "text-muted-foreground/5")}>
                                        {user ? user.full_name : 'HOLDER_TARGET_EMPTY'}
                                    </div>
                                    {user && <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.3em] opacity-40 leading-none truncate max-w-[150px]">{user.email}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-border/10 space-y-10">
                            <div 
                                className={cn(
                                    "flex items-center gap-5 p-6 rounded-[2rem] bg-white border transition-all duration-500 cursor-pointer select-none",
                                    hasConsented ? "border-primary/40 bg-primary/5" : "border-muted hover:border-primary/20"
                                )} 
                                onClick={() => setHasConsented(!hasConsented)}
                            >
                                <div className={cn("h-7 w-7 rounded-lg border flex items-center justify-center transition-all", hasConsented ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-muted bg-white")}>
                                    {hasConsented && <CheckCircle2 size={14} className="text-white" />}
                                </div>
                                <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em] leading-relaxed flex-1 font-sans", hasConsented ? "text-primary" : "text-muted-foreground/30")}>
                                    Certify inspection of physical gear unit completion.
                                </p>
                            </div>

                            <Button 
                                onClick={handleExecuteProtocol}
                                disabled={isLoading || !selectedAssetId || !selectedUserId || !hasConsented}
                                className={cn(
                                    "w-full h-18 rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.4em] shadow-xl transition-all duration-500 font-sans border-none text-white",
                                    hasConsented && !isLoading ? "bg-primary shadow-primary/40 -translate-y-1" : "bg-muted text-muted-foreground/10 opacity-20 shadow-none grayscale"
                                )}
                            >
                                {isLoading ? 'SYNCING_DEPLOYMENT...' : 'EXECUTE_DEPLOY'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-white border border-border/40 shadow-sm space-y-6 font-sans">
                    <div className="flex items-center gap-3 border-b border-border/10 pb-4">
                         <Info size={14} className="text-primary/20" />
                         <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground/10">System Rules Matrix</span>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest font-sans">
                            <span className="h-1 w-1 rounded-full bg-primary/20 shrink-0" />
                            Final Serial Sync Authorization
                        </li>
                        <li className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest font-sans opacity-40">
                            <span className="h-1 w-1 rounded-full bg-emerald-500/20 shrink-0" />
                            Security Integrity Lock Commit
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
