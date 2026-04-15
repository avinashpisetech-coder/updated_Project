"use client";

import React from "react";
import { 
  Package, 
  CheckCircle2, 
  ArrowRightLeft, 
  AlertTriangle, 
  Wrench, 
  History, 
  Plus, 
  TrendingUp, 
  Zap, 
  ChevronRight,
  Database,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  ShieldCheck,
  Smartphone,
  Monitor,
  MousePointer2,
  Tag,
  Layers,
  Activity,
  Cpu,
  User,
  ExternalLink,
  Settings2,
  Shield,
  ReceiptIndianRupee,
  Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";

interface Props {
  stats: any;
  movements: any[];
  lowStock: any[];
  budgets: any[];
  role: string;
}

export function AssetDashboardClient({ stats, movements, lowStock, budgets, role }: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  
  const isPrivileged = role === "super_admin" || role === "dept_admin" || role === "module_agent";

  const statCards = [
    { label: "Asset Pool", value: stats.total || 0, sub: "Total Lifecycle", icon: Package, color: "text-blue-600", border: "border-blue-100", accent: "bg-blue-600" },
    { label: "Available", value: stats.available || stats.in_store || 0, sub: "Ready to Deploy", icon: CheckCircle2, color: "text-emerald-600", border: "border-emerald-100", accent: "bg-emerald-600" },
    { label: "Active Nodes", value: stats.assigned || stats.active || 0, sub: "Field Assets", icon: Activity, color: "text-indigo-600", border: "border-indigo-100", accent: "bg-indigo-600" },
    { label: "Maintenance", value: (stats.repair || 0) + (stats.damaged || 0), sub: "In Repair / Damaged", icon: Wrench, color: "text-rose-600", border: "border-rose-100", accent: "bg-rose-600" },
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Statistics & Action Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="group relative p-4 rounded-xl bg-white border border-border/40 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
            <div className={cn("absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity", stat.accent)} />
            <div className="flex items-center justify-between mb-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-105", stat.border, "shadow-sm bg-background")}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest opacity-60 rounded-full py-0.5">
                {stat.sub}
              </Badge>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-0.5">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-2xl font-black tracking-tighter text-foreground leading-none">{stat.value}</h2>
                <TrendingUp className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Quick Actions & Budget */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* Action Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/assets/inventory" className="group h-full">
                    <div className="p-5 rounded-xl bg-white border border-border/40 hover:border-primary/50 hover:shadow-lg transition-all duration-500 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="h-9 w-9 rounded-lg bg-primary shadow-lg shadow-primary/20 flex items-center justify-center mb-3 text-white">
                            <Plus size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black uppercase tracking-tighter text-foreground mb-0.5">Commit Stock</h3>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Record New Hardware</p>
                        </div>
                        <ArrowUpRight className="absolute top-5 right-5 text-muted-foreground/30 group-hover:text-primary transition-colors" size={16} />
                    </div>
                </Link>

                <Link href="/assets/deployment" className="group h-full">
                    <div className="p-5 rounded-xl bg-white border border-border/40 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-500 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="h-9 w-9 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-600/20 flex items-center justify-center mb-3 text-white">
                            <Zap size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black uppercase tracking-tighter text-foreground mb-0.5">Handover</h3>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Deploy Asset Node</p>
                        </div>
                        <ArrowUpRight className="absolute top-5 right-5 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" size={16} />
                    </div>
                </Link>

                <Link href="/assets/return" className="group h-full">
                    <div className="p-5 rounded-xl bg-white border border-border/40 hover:border-amber-500/50 hover:shadow-lg transition-all duration-500 relative overflow-hidden h-full flex flex-col justify-between">
                        <div className="h-9 w-9 rounded-lg bg-amber-600 shadow-lg shadow-amber-600/20 flex items-center justify-center mb-3 text-white">
                            <History size={16} />
                        </div>
                        <div>
                          <h3 className="text-base font-black uppercase tracking-tighter text-foreground mb-0.5">Recovery</h3>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none">Reverse Custody</p>
                        </div>
                        <ArrowUpRight className="absolute top-5 right-5 text-muted-foreground/30 group-hover:text-amber-500 transition-colors" size={16} />
                    </div>
                </Link>
            </div>

            {/* Budget Monitoring Matrix */}
            <div className="p-5 rounded-xl bg-white border border-border/40 shadow-sm">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center">
                          <ReceiptIndianRupee size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-foreground">Fiscal Protocol Matrix</p>
                          <p className="text-[7px] font-black text-muted-foreground uppercase tracking-[0.1em]">FY 26-27 Monitoring</p>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgets.length === 0 ? (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-border/40 rounded-3xl">
                            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest italic opacity-50">No Active Fiscal Protocols Defined</p>
                        </div>
                    ) : budgets.slice(0, 6).map((b, i) => {
                        const percent = Math.min((b.spent_amount / b.allocated_amount) * 100, 100);
                        const isHigh = percent > 85;
                        return (
                            <div key={i} className="group space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase text-foreground tracking-widest">{b.asset_type?.name}</span>
                                    <span className={cn("text-[10px] font-black font-mono", isHigh ? "text-rose-600" : "text-primary")}>{percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border/20">
                                    <div 
                                        className={cn("h-full transition-all duration-1000", isHigh ? "bg-rose-500" : "bg-primary")}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/20">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Utilitized</span>
                                      <span className="text-[10px] font-black text-foreground">₹{mounted ? b.spent_amount.toLocaleString('en-IN') : b.spent_amount}</span>
                                    </div>
                                    <div className="h-6 w-px bg-border/40" />
                                    <div className="flex flex-col text-right">
                                      <span className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Allocation</span>
                                      <span className="text-[10px] font-black text-foreground/60">₹{mounted ? b.allocated_amount.toLocaleString('en-IN') : b.allocated_amount}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Right Column: Threshold Alerts & Governance */}
        <div className="lg:col-span-4 space-y-5">
            <div className="p-6 rounded-[1.25rem] bg-white border border-border/40 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Threshold Warnings</span>
                    </div>
                    {lowStock.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/20">
                          {lowStock.length}
                        </span>
                    )}
                </div>
                
                <div className="space-y-2">
                    {lowStock.length === 0 ? (
                        <div className="py-6 text-center flex flex-col items-center gap-2 opacity-30">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nodes Healthy</p>
                        </div>
                    ) : lowStock.slice(0, 5).map((alert, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/10 border border-rose-500/10 hover:bg-rose-50/20 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                                <Monitor size={12} className="text-rose-400 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-tight text-foreground truncate">{alert.sub_type_name}</span>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-black text-rose-600 border-rose-200 bg-white px-1.5 h-5">
                               {alert.current_count}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>

            {/* Governance Master Entry */}
            <Link href="/assets/masters" className="block text-white">
                <div className="group p-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-black transition-all duration-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                            <Settings2 size={16} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-tight leading-none mb-0.5">Policy Matrix</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">System Administration</span>
                         </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                </div>
            </Link>

            {/* External Links / Help */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                    <ShieldCheck size={12} /> Compliance Registry
                </h4>
                <div className="space-y-1.5">
                    {["Lifecycle Policy", "Security SOP", "Retirement Log"].map((link, j) => (
                        <div key={j} className="flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                            <span className="truncate">{link}</span>
                            <ArrowUpRight size={10} className="opacity-40" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-border/40 bg-background/50 overflow-hidden shadow-sm mb-12">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-white/40 backdrop-blur-xl min-w-[1000px]">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                         <Activity size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground uppercase tracking-tight leading-none mb-0.5">System Chronology</h3>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">Synchronized Movement Ledger</p>
                    </div>
                </div>
                <Link href="/assets/movements">
                    <Button variant="outline" className="h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest border-border/60 text-muted-foreground hover:bg-primary hover:text-white transition-all group">
                        Full Audit
                        <ArrowRightLeft className="ml-2 h-3 w-3 transition-transform group-hover:rotate-180" />
                    </Button>
                </Link>
          </div>
          
          <div className="overflow-auto custom-scrollbar">
            <Table className="min-w-[1000px] border-collapse">
                <TableHeader className="bg-background/80 sticky top-0 z-10 backdrop-blur-md">
                    <TableRow className="h-10 border-b border-border/40 hover:bg-transparent">
                        <TableHead className="pl-10 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol_Type</TableHead>
                        <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Action_Class</TableHead>
                        <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Entity_Identity</TableHead>
                        <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Custodian_Node</TableHead>
                        <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Timestamp</TableHead>
                        <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right pr-10">Operator</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movements.length === 0 ? (
                        <TableRow className="h-48 border-none hover:bg-transparent">
                            <TableCell colSpan={6} className="text-center">
                                <p className="text-[11px] font-black text-slate-200 uppercase tracking-[0.4em]">Audit Ledger Invariant</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        movements.slice(0, 10).map((move) => (
                           <TableRow key={move.id} className="h-16 border-b border-border/20 hover:bg-white transition-all group cursor-default">
                                <TableCell className="pl-10">
                                    <div className={cn(
                                        "h-9 w-9 rounded-xl flex items-center justify-center shadow-sm border transition-transform group-hover:scale-110",
                                        move.direction === 'in' ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-primary/5 text-primary border-primary/10"
                                    )}>
                                        {move.direction === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-md border transition-colors",
                                        move.type === 'handover' && "bg-blue-50 text-blue-700 border-blue-100",
                                        move.type === 'return' && "bg-amber-50 text-amber-700 border-amber-100",
                                        move.type === 'purchase_inward' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        move.type === 'damaged' && "bg-rose-50 text-rose-700 border-rose-100"
                                    )}>
                                        {move.type.replace(/_/g, ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[12px] font-black text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">{move.asset?.asset_code}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground leading-none uppercase tracking-wider">{move.asset?.sub_type?.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {move.to_user_profile ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/40">
                                                <User size={12} />
                                            </div>
                                            <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{move.to_user_profile.full_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-black text-muted-foreground uppercase italic tracking-widest opacity-40">Stock Repository</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-[11px] font-bold text-muted-foreground tabular-nums uppercase tracking-tighter">
                                    {format(new Date(move.created_at), 'dd_MMM_yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{move.performed_by_profile?.full_name}</span>
                                </TableCell>
                           </TableRow>
                        ))
                    )}
                </TableBody>
             </Table>
          </div>
        </div>
      </div>
    );
}
