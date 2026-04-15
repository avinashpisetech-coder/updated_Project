"use client";

import React from "react";
import { 
  Plus, 
  Search, 
  ChevronRight,
  HelpCircle,
  Boxes,
  Info,
  LayoutDashboard,
  PieChart,
  TrendingUp,
  AlertCircle,
  FileDown,
  Printer,
  ShieldCheck,
  Activity,
  Package,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigation } from "@/components/providers/NavigationProvider";

interface Purchase {
    id: string;
    po_number: string;
    purchase_date: string;
    grand_total: number;
    status: string;
    amendment_number: number;
    supplier: { name: string };
    project: { name: string };
}

interface Props {
  initialPurchases: Purchase[];
  suppliers: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  budgets: any[];
}

export function PurchasesClient({ initialPurchases, suppliers, projects, budgets }: Props) {
  const { isSidebarOpen } = useNavigation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const filteredPurchases = initialPurchases.filter(p => {
    const matchesSearch = p.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    const s = (status || 'draft').toLowerCase().replace('amend & ', '');
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
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      
      {/* 1. Logistical Premium Header */}
      <header className="h-[64px] shrink-0 bg-slate-900 border-b border-primary/20 flex items-center justify-between px-10 relative overflow-hidden shadow-2xl z-50">
         {/* Decorative subtle gradient overlay */}
         <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
         
         <div className="flex items-center gap-8 relative z-10">
            <div className="flex flex-col">
               <div className="flex items-center gap-2.5 mb-0.5">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h1 className="text-[15px] font-black text-white uppercase tracking-[-0.02em]">PROCUREMENT_CONTROL<span className="text-primary/60 font-medium ml-1">REGISTRY</span></h1>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em] opacity-80 italic">FISCAL_CORE_V4.2.0</span>
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
               </div>
            </div>
            
            <div className="h-6 w-[1px] bg-white/10 mx-2" />
            
            <div className="relative group flex-1 max-w-[420px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none group-focus-within:text-primary transition-colors" />
                <Input 
                   placeholder="SEARCH_BY_PO_VENDOR_OR_DATE..." 
                   className="h-10 w-full pl-11 pr-4 text-[10px] font-black bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:bg-white/10 transition-all uppercase tracking-widest"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
         </div>

         <div className="flex items-center gap-5 relative z-10">
             <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
                <Button variant="ghost" size="sm" className="h-8 px-5 text-[9px] font-black text-slate-400 uppercase hover:bg-white/10 hover:text-white transition-all rounded-lg tracking-widest">
                    <FileDown size={13} className="mr-2 text-primary" /> Export
                </Button>
                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                <Button variant="ghost" size="sm" className="h-8 px-5 text-[9px] font-black text-slate-400 uppercase hover:bg-white/10 hover:text-white transition-all rounded-lg tracking-widest">
                    <Printer size={13} className="mr-2 text-primary" /> Batch_Print
                </Button>
             </div>
 
             <Button onClick={() => router.push("/assets/purchases/new")} className="h-10 px-8 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/30 border border-primary/20 transition-all active:scale-95 group">
                <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-300" /> RAISE_NEW_PROTOCOL
             </Button>
         </div>
      </header>

      {/* 2. Unified Matrix Area */}
      <main className="flex-1 overflow-hidden p-5 flex flex-col gap-4">
        
        {/* Budget Execution Matrix (Horizontal HUD) */}
        <div className="grid grid-cols-4 gap-4 shrink-0">
            {budgets.slice(0, 4).map((budget, i) => {
                const percent = (budget.spent_amount / budget.allocated_amount) * 100;
                const isWarning = percent > 85;
                const isCritical = percent > 100;
                
                return (
                    <div key={budget.id} className="group relative bg-white border border-slate-200/60 rounded-[2.5rem] p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">AUTHORIZATION_FY_{budget.fiscal_year}</p>
                                    <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{budget.asset_type?.name}</h3>
                                </div>
                                <div className={cn(
                                    "h-10 w-10 rounded-2xl flex items-center justify-center transition-all bg-slate-50 border border-slate-100 group-hover:scale-110",
                                    isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-primary"
                                )}>
                                    <PieChart size={18} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className={cn(
                                        "text-2xl font-black tracking-tighter italic",
                                        isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-950"
                                    )}>₹{(budget.spent_amount || 0).toLocaleString('en-IN')}</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">OF ₹{(budget.allocated_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                                    <div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out",
                                            isCritical ? "bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" : isWarning ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "bg-gradient-to-r from-primary to-blue-600 shadow-[0_0_12px_rgba(0,51,102,0.3)]"
                                        )}
                                        style={{ width: `${Math.min(100, percent)}%` }} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Background watermark */}
                        <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-125 transition-all duration-700 pointer-events-none">
                             <TrendingUp size={160} />
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Tactical Registry Grid */}
        <div className="flex-1 overflow-auto rounded-[2.5rem] border border-slate-100 bg-white shadow-sm scrollbar-hide">
            <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-20">
                    <TableRow className="h-12 border-none hover:bg-transparent">
                        <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PROTOCOL_IDENTIFIER</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AUTHORIZATION_STAMP</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SUPPLIER_ENTITY</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">FISCAL_GRAND_TOTAL</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">LIFECYCLE_STATUS</TableHead>
                        <TableHead className="text-right pr-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DETAILS</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredPurchases.length > 0 ? filteredPurchases.map((p) => {
                        const status = getStatusConfig(p.status);
                        return (
                             <TableRow 
                                key={p.id} 
                                className="h-16 group hover:bg-slate-50 border-b border-slate-50 transition-all cursor-pointer"
                                onClick={() => router.push(`/assets/purchases/${p.id}`)}
                             >
                                <TableCell className="pl-10">
                                    <div className="flex items-center gap-5">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                            <Package size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-primary uppercase tracking-tight leading-none mb-1">{p.po_number || 'PENDING_ID'}</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">AMENDMENT_{p.amendment_number || 0}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-[11px] font-black text-slate-400 uppercase italic">
                                    {format(new Date(p.purchase_date), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{p.supplier?.name}</span>
                                        <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{p.project?.name || 'GLOBAL_PROJECT'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="text-[15px] font-black text-slate-900 italic">₹{p.grand_total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge className={cn("text-[8px] font-black uppercase tracking-widest h-5 px-3 rounded-full border-none shadow-sm min-w-[85px] justify-center", status.class)}>
                                        {status.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </TableCell>
                             </TableRow>
                        );
                    }) : (
                        <TableRow className="h-64 border-none hover:bg-transparent">
                            <TableCell colSpan={6} className="text-center opacity-10">
                                <div className="flex flex-col items-center gap-2">
                                     <AlertCircle size={40} />
                                     <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Procurement_Signals_Detected</p>
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
