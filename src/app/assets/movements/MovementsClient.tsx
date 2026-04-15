"use client";

import React from "react";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Package, 
  History, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  MousePointer2,
  MoreVertical,
  ArrowRight,
  Activity,
  Layers,
  Database,
  Shield,
  ExternalLink,
  ChevronRight,
  Monitor,
  Printer,
  FileCheck
} from "lucide-react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { format } from "date-fns";

// --- Types ---
interface Movement {
    id: string;
    asset_id: string;
    type: string;
    direction: 'in' | 'out';
    from_user_id: string | null;
    to_user_id: string | null;
    performed_by: string;
    notes: string;
    created_at: string;
    asset?: { asset_code: string; brand: string; model: string; serial_number: string; sub_type: { name: string } };
    from_user?: { full_name: string; email: string };
    to_user?: { full_name: string; email: string };
    performed_by_profile?: { full_name: string; role: string };
}

interface Props {
    initialMovements: Movement[];
}

export function MovementsClient({ initialMovements }: Props) {
    const [search, setSearch] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState("all");

    const filteredMovements = initialMovements.filter(m => {
        const matchesSearch = 
            m.asset?.asset_code?.toLowerCase().includes(search.toLowerCase()) || 
            m.asset?.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
            m.notes?.toLowerCase().includes(search.toLowerCase());
        
        const matchesType = typeFilter === "all" || m.type === typeFilter;
        
        return matchesSearch && matchesType;
    });

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'purchase_inward': return { label: 'Inward_Logistics', class: 'bg-emerald-500 text-white shadow-emerald-500/20', icon: Package };
            case 'handover': return { label: 'Deployment_Hub', class: 'bg-blue-500 text-white shadow-blue-500/20', icon: ArrowUpRight };
            case 'return': return { label: 'Recovery_Protocol', class: 'bg-amber-500 text-white shadow-amber-500/20', icon: ArrowDownLeft };
            case 'damaged': return { label: 'Damage_Node', class: 'bg-red-500 text-white shadow-red-500/20', icon: AlertCircle };
            default: return { label: type.toUpperCase(), class: 'bg-slate-400 text-white', icon: History };
        }
    };

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* 1. Precise Filter Matrix - High Density Snow White */}
            <div className="flex items-center justify-between gap-6 px-4">
                <div className="relative flex-1 max-w-xl group">
                    <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-primary transition-colors" />
                    <Input 
                        placeholder="SCAN_ASSET_CODE, SERIAL, OR PROTOCOL_LOG..." 
                        className="h-14 pl-14 rounded-2xl bg-white border-slate-100 shadow-sm text-[11px] font-black uppercase tracking-widest focus:ring-primary/20 placeholder:text-slate-200 transition-all border-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[280px] h-14 bg-white border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                            <SelectValue placeholder="FILTER_PROTOCOL" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 bg-white shadow-2xl">
                            <SelectItem value="all" className="text-[10px] uppercase font-black tracking-widest py-3">ALL PROTOCOL ACTIONS</SelectItem>
                            <SelectItem value="purchase_inward" className="text-[10px] uppercase font-black tracking-widest py-3">STOCK_INWARD (PURCHASE)</SelectItem>
                            <SelectItem value="handover" className="text-[10px] uppercase font-black tracking-widest py-3">DEPLOYMENT (OUTBOUND)</SelectItem>
                            <SelectItem value="return" className="text-[10px] uppercase font-black tracking-widest py-3">RECOVERY (INBOUND)</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button variant="ghost" className="h-14 px-8 rounded-2xl bg-white text-[11px] font-black uppercase tracking-widest border-none text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-sm gap-4">
                        <Calendar size={16} className="text-primary opacity-60" />
                        Temporality: Global
                    </Button>
                </div>
            </div>

            {/* 2. Chronological Registry Table - High Density System Chronology */}
            <div className="rounded-[3rem] border border-slate-100 bg-white overflow-hidden shadow-sm">
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                             <History size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">SYSTEM_CHRONOLOGY</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Synchronized Asset Movement Registry</p>
                        </div>
                    </div>
                </div>
                
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-20 transition-all border-b border-slate-100">
                        <TableRow className="h-14 border-none hover:bg-transparent">
                            <TableHead className="pl-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">SYNC</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">HARDWARE_IDENTITY</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">DEPLOYMENT_PATHWAY</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PROTOCOL_ACTION_LOG</TableHead>
                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">TEMPORAL_NODE</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.3em] pr-12 text-slate-400">SIGNATORY</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMovements.length === 0 ? (
                            <TableRow className="h-96 border-none hover:bg-transparent">
                                <TableCell colSpan={6} className="text-center opacity-10">
                                    <div className="flex flex-col items-center gap-4">
                                        <Database size={64} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.6em] font-sans">Ledger Invariant // Registry Empty</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMovements.map((move) => {
                                const type = getTypeConfig(move.type);
                                
                                return (
                                    <TableRow key={move.id} className="h-24 group hover:bg-slate-50 border-b border-border/50 transition-all">
                                        <TableCell className="pl-12">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-slate-100 bg-white",
                                                move.direction === 'in' ? "text-emerald-500" : "text-blue-500"
                                            )}>
                                                {move.direction === 'in' ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-5">
                                                <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                                    <Package size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{move.asset?.asset_code}</span>
                                                    <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{move.asset?.sub_type?.name}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-5 font-sans min-w-[280px]">
                                                {move.direction === 'in' ? (
                                                    <div className="flex items-center gap-4 group/path">
                                                        <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">FROM_POOL</span>
                                                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm group-hover/path:border-primary/20 transition-all">
                                                            <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><User size={12} /></div>
                                                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-700">{move.from_user?.full_name || 'CENTRAL_REPOSITORY'}</span>
                                                        </div>
                                                        <ArrowRight size={12} className="text-slate-100" />
                                                        <div className="h-2 w-2 rounded-full bg-blue-500/20 animate-pulse" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-4 group/path">
                                                        <span className="text-[9px] font-black text-blue-500/40 uppercase tracking-widest">ASM_HUB</span>
                                                        <ArrowRight size={12} className="text-slate-100" />
                                                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm group-hover/path:border-primary/20 transition-all">
                                                            <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><User size={12} /></div>
                                                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-700">{move.to_user?.full_name || 'FIELD_DEPLOYMENT'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-start gap-2">
                                                <Badge className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded-full border-none shadow-sm min-w-[130px] justify-center",
                                                    type.class
                                                )}>
                                                    {type.label}
                                                </Badge>
                                                <p className="text-[10px] font-bold text-slate-300 truncate max-w-[200px] italic px-1 lowercase tracking-tight">
                                                    {move.notes || 'automated chronological pulse recorded.'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-[16px] font-black text-slate-800 tracking-tighter leading-none">{format(new Date(move.created_at), 'dd MMM yyyy')}</span>
                                                <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest mt-2 leading-none">{format(new Date(move.created_at), 'HH:mm:ss')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-12">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{move.performed_by_profile?.full_name || 'SYSTEM_SYNC'}</span>
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{move.performed_by_profile?.role || 'AUTO_OPERATOR'}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
