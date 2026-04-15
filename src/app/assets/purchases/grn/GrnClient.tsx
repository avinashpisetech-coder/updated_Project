"use client";

import React from "react";
import { 
  Search, 
  ChevronRight,
  HelpCircle,
  Package,
  FileDown,
  Printer,
  ShieldCheck,
  Activity,
  AlertCircle,
  Truck,
  Plus,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Grn {
    id: string;
    purchase_id: string;
    grn_number: string;
    received_date: string;
    status: string;
    purchase: { 
      po_number: string;
      supplier: { name: string };
    };
}

interface Props {
  initialGrns: Grn[];
}

export function GrnClient({ initialGrns }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredGrns = initialGrns.filter(g => {
    const matchesSearch = (g.grn_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (g.purchase?.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (g.purchase?.supplier?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'approved': return { label: 'Approved', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'received': return { label: 'Received', class: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'cancelled': return { label: 'Cancelled', class: 'bg-red-50 text-red-600 border-red-100' };
      case 'draft': return { label: 'Draft', class: 'bg-slate-50 text-slate-400 border-slate-200' };
      case 'submitted': return { label: 'Submitted', class: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      default: return { label: status, class: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      
       {/* 1. Official Registry Header */}
       <header className="h-[64px] shrink-0 bg-[#001529] flex items-center justify-between px-8 sticky top-0 z-50 shadow-2xl relative overflow-hidden">
          {/* Protocol Identity Stamp Overlay */}
          <div className="absolute left-0 top-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center text-[10vw] font-black text-white select-none whitespace-nowrap">
             LOGISTICS_REGISTRY
          </div>

          <div className="flex items-center gap-6 relative z-10">
             <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                   <h1 className="text-[15px] font-black text-white uppercase tracking-tight">Supply Inbound Registry</h1>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Goods Receipt Protocol (GRN) // Active Nodes</span>
             </div>
             
             <div className="relative group ml-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none group-focus-within:text-emerald-500 transition-colors" />
                 <input 
                    placeholder="SEARCH_LOGISTICS_HUB..." 
                    className="h-10 w-80 pl-10 pr-4 text-[11px] font-black bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-white transition-all placeholder:text-slate-500 rounded-xl outline-none shadow-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
              <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                 <Button variant="outline" className="h-10 px-4 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all">
                     <FileDown size={14} className="mr-2 opacity-50" /> Export
                 </Button>
              </div>

              <Button onClick={() => router.push("/assets/purchases/grn/new")} className="h-10 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl shadow-lg shadow-emerald-900/40 uppercase tracking-[0.1em] transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center gap-2.5">
                 <Plus size={18} /> Create New Inbound (GRN)
              </Button>
          </div>
       </header>

      {/* 2. Tactical Matrix Area */}
      <main className="flex-1 p-5 pt-4">
        <div className="bg-transparent border border-white/10 rounded-[2rem] shadow-none overflow-hidden">
            <Table>
                <TableHeader className="bg-white/5">
                    <TableRow className="h-14 border-slate-100/50 hover:bg-transparent">
                        <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocol_ID</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ingestion_Date</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Origin (PO)</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Supplier_Hub</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Status</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational_Node</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredGrns.length > 0 ? filteredGrns.map((g) => {
                        const status = getStatusConfig(g.status);
                        return (
                             <TableRow 
                                key={g.id} 
                                className="h-[72px] group hover:bg-white/5 border-b border-white/5 transition-all cursor-pointer"
                                onClick={() => router.push(`/assets/purchases/${g.purchase_id}/grn/${g.id}`)}
                             >
                                <TableCell className="pl-10">
                                    <div className="flex items-center gap-5">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600/10 group-hover:text-blue-600 transition-all">
                                            <Package size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-1">{g.grn_number}</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">LOG_ID: {g.id.slice(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-bold text-slate-900 uppercase italic">
                                    {format(new Date(g.received_date), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Truck size={14} className="text-slate-300" />
                                        <span className="text-[12px] font-black text-slate-600 uppercase tracking-tight">{g.purchase?.po_number}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-[12px] font-bold text-slate-700 uppercase tracking-tight">{g.purchase?.supplier?.name}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded-full border-none shadow-sm min-w-[96px] justify-center transition-all group-hover:scale-105", status.class)}>
                                        {status.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-600/5">
                                            <History size={16} />
                                        </Button>
                                        <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </TableCell>
                             </TableRow>
                        );
                    }) : (
                        <TableRow className="h-64 border-none hover:bg-transparent">
                            <TableCell colSpan={6} className="text-center">
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                     <AlertCircle size={48} />
                                     <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Inventory_Signals_Detected</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </main>


    </div>
  );
}
