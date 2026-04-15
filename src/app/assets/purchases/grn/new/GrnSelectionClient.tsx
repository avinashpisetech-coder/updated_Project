"use client";

import React, { useState } from "react";
import { 
    ChevronLeft,
    Package,
    ArrowRight,
    Search,
    ChevronRight,
    SearchCheck,
    Truck,
    Building2,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Purchase {
    id: string;
    po_number: string;
    project_id: string;
    supplier: { name: string };
    purchase_items: { quantity: number; received_quantity: number }[];
}

interface Project {
    id: string;
    name: string;
}

interface Props {
    projects: Project[];
    purchases: Purchase[];
}

export function GrnSelectionClient({ projects, purchases }: Props) {
    const router = useRouter();
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Filter POs by project and search term
    const filteredPurchases = purchases.filter(p => {
        const matchesProject = selectedProjectId === "all" || p.project_id === selectedProjectId;
        const matchesSearch = p.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Only show POs that actually have items to be received
        const hasPendingItems = p.purchase_items.some(i => i.quantity > (i.received_quantity || 0));
        
        return matchesProject && matchesSearch && hasPendingItems;
    });

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc] text-slate-800 font-sans">
            {/* 1. Official Protocol Header */}
            <header className="h-[64px] shrink-0 bg-[#001529] flex items-center justify-between px-8 shadow-2xl relative overflow-hidden">
                {/* Protocol Identity Stamp Overlay */}
                <div className="absolute left-0 top-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center text-[10vw] font-black text-white select-none whitespace-nowrap">
                   LOGISTICS_GATEWAY
                </div>
                
                <div className="flex items-center gap-6 relative z-10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push("/assets/purchases/grn")}
                        className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 transition-all rounded-xl border border-white/5"
                    >
                        <ChevronLeft size={20} />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="h-4 w-1 bg-blue-500 rounded-full" />
                            <h1 className="text-[15px] font-black text-white uppercase tracking-tight">Inbound Logistics Loop</h1>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Step 1: Selection Node // Origin Identification Registry</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-5 space-y-3 no-scrollbar pb-20">
                {/* 2. Control Matrix */}
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.02)] w-full">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Source Entity Selection <span className="text-red-500">*</span></label>
                                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                    <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-100 text-[11px] font-bold uppercase tracking-tight shadow-none focus:ring-blue-600/10 transition-all">
                                        <SelectValue placeholder="Global Resource Pool" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 bg-white">
                                        <SelectItem value="all" className="text-[10px] font-bold uppercase py-2.5">Global View (All Projects)</SelectItem>
                                        {projects.map(project => (
                                            <SelectItem 
                                                key={project.id} 
                                                value={project.id}
                                                className="text-[10px] font-bold uppercase py-2.5"
                                            >
                                                {project.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Protocol Search Filter</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                    <input 
                                        placeholder="SEARCH_BY_PO_NUMBER_OR_VENDOR..." 
                                        className="h-10 w-full pl-9 pr-4 text-[11px] font-bold bg-white border border-slate-100 focus:border-blue-600/50 transition-all placeholder:text-slate-300 rounded-xl outline-none shadow-none"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Section Divider */}
                <div className="w-full flex items-center gap-6 py-2 px-4">
                    <div className="h-px flex-1 bg-slate-100" />
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Eligible Protocol Registry</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* 4. Protocol Matrix */}
                <div className="w-full bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="h-12 border-slate-100 hover:bg-transparent">
                                    <TableHead className="w-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 font-sans">#</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10 font-sans">Origin Protocol (PO)</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Vendor Hub</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8 font-sans">Logistics Context</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPurchases.length > 0 ? filteredPurchases.map((po, idx) => (
                                    <TableRow 
                                        key={po.id}
                                        onClick={() => router.push(`/assets/purchases/${po.id}/grn/new`)}
                                        className="h-16 group hover:bg-slate-50 border-b border-slate-50 transition-all cursor-pointer font-sans"
                                    >
                                        <TableCell className="pl-8 text-[11px] font-black text-slate-200/40 text-center">
                                            {String(idx + 1).padStart(2, "0")}
                                        </TableCell>
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600/5 group-hover:text-blue-600 transition-all">
                                                    <Package size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">{po.po_number}</span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ASM_PROC_NODE_ID</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 size={12} className="text-slate-300" />
                                                <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tight">{po.supplier?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex items-center justify-end gap-5">
                                                <div className="flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Awaiting Receipt</span>
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter italic font-sans">Authorize Entry</span>
                                                </div>
                                                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-sm">
                                                    <ArrowRight size={14} />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow className="h-48 hover:bg-transparent border-none">
                                        <TableCell colSpan={4} className="text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-10">
                                                <SearchCheck size={40} />
                                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Eligible_Protocols_Detected</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>

            {/* 5. Sticky Global Action (Matching PO creation style) */}
            <footer className="shrink-0 h-16 bg-white border-t border-slate-100 flex items-center justify-between px-12 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">PROTO_STATUS</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter leading-none">Awaiting Selection Hub</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.4em] text-right max-w-xs leading-relaxed">
                        Authorized users can initiate goods receipt for all approved purchase protocols.
                    </p>
                </div>
            </footer>
        </div>
    );
}

