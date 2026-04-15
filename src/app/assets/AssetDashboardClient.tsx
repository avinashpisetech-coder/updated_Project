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
    { label: "ASSET_POOL", value: stats.total, sub: "Total_Lifecycle_Stock", icon: Package, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "AVAILABLE_READY", value: stats.available, sub: "Deployment_Capacity", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "ACTIVE_FIELD_NODES", value: stats.assigned, sub: "Operations_Assigned", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "MAINTENANCE_BAY", value: (stats.repair + stats.damaged), sub: "Loss_and_Recovery", icon: Wrench, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ];

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* 1. Precise Telemetry Grid - High Density Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Operational Cluster */}
        <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <div key={i} className={cn(
                        "group relative p-8 rounded-[2.5rem] bg-card/40 border hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 overflow-hidden backdrop-blur-xl shadow-sm",
                        stat.border
                    )}>
                        <div className="flex items-center justify-between mb-5 relative z-10">
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all bg-background shadow-inner border border-border/40", stat.border)}>
                                <stat.icon className={cn("h-6 w-6", stat.color)} />
                            </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 leading-none mb-1">{stat.label}</p>
                            <h2 className="text-4xl font-black tracking-tighter text-foreground italic leading-none">{stat.value}</h2>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 transition-opacity">v.2.0_THEME_NEXUS_SYNC</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Action Matrix - High Density Snow White */}
            <div className="grid grid-cols-3 gap-6">
                <Link href="/assets/inventory" className="group">
                    <div className="h-full p-10 rounded-[3rem] bg-card/60 border border-border/40 hover:border-primary/60 transition-all duration-500 relative overflow-hidden shadow-sm backdrop-blur-2xl">
                        <div className="h-14 w-14 rounded-[1.5rem] bg-primary shadow-2xl shadow-primary/30 flex items-center justify-center mb-8 transform group-hover:-translate-y-1 transition-transform">
                            <Plus size={24} className="text-primary-foreground" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground mb-1 leading-none">COMMIT_STOCK</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none opacity-50">Record New Hardware Node</p>
                        <div className="absolute bottom-[-10%] right-[-10%] p-10 opacity-[0.05] group-hover:scale-125 group-hover:text-primary transition-all duration-700">
                            <Database size={150} />
                        </div>
                    </div>
                </Link>

                <Link href="/assets/deployment" className="group">
                    <div className="h-full p-10 rounded-[3rem] bg-card/60 border border-border/40 hover:border-emerald-500/60 transition-all duration-500 relative overflow-hidden shadow-sm backdrop-blur-2xl">
                        <div className="h-14 w-14 rounded-[1.5rem] bg-emerald-500 shadow-2xl shadow-emerald-500/30 flex items-center justify-center mb-8 transform group-hover:-translate-y-1 transition-transform">
                            <Zap size={24} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground mb-1 leading-none">HANDOVER_PRO</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none opacity-50">Authorize Deployment Cycle</p>
                        <div className="absolute bottom-[-10%] right-[-10%] p-10 opacity-[0.05] group-hover:scale-125 group-hover:text-emerald-500 transition-all duration-700">
                            <ArrowUpRight size={150} />
                        </div>
                    </div>
                </Link>

                <Link href="/assets/return" className="group">
                    <div className="h-full p-10 rounded-[3rem] bg-card/60 border border-border/40 hover:border-amber-500/60 transition-all duration-500 relative overflow-hidden shadow-sm backdrop-blur-2xl">
                        <div className="h-14 w-14 rounded-[1.5rem] bg-amber-500 shadow-2xl shadow-amber-500/30 flex items-center justify-center mb-8 transform group-hover:-translate-y-1 transition-transform">
                            <History size={24} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-foreground mb-1 leading-none">RECOVERY_LOG</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none opacity-50">Reverse Custody Protocol</p>
                        <div className="absolute bottom-[-10%] right-[-10%] p-10 opacity-[0.05] group-hover:scale-125 group-hover:text-amber-500 transition-all duration-700">
                            <ArrowDownLeft size={150} />
                        </div>
                    </div>
                </Link>
            </div>
        </div>

        {/* System Alerts & Master Policy Matrix */}
        <div className="lg:col-span-4 space-y-8">
            {/* Low Stock Alert Matrix */}
            <div className="p-10 rounded-[3rem] bg-amber-500/5 border border-amber-500/20 relative overflow-hidden shadow-sm backdrop-blur-3xl">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-amber-500/10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">INVENTORY_THRESHOLD_ALERT</span>
                    </div>
                    <Badge className="bg-amber-500 text-white border-none text-[8px] font-black h-4 px-2 rounded-full">{lowStock.length}</Badge>
                </div>
                
                <div className="space-y-4">
                    {lowStock.length === 0 ? (
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center py-6 italic opacity-30">Stock Levels Healthy</p>
                    ) : lowStock.slice(0, 3).map((alert, i) => (
                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-card border border-amber-500/10 hover:border-amber-500/30 transition-all shadow-inner">
                            <div className="flex items-center gap-3">
                                <Monitor size={16} className="text-amber-500 opacity-60 shrink-0" />
                                <span className="text-[11px] font-black uppercase tracking-tight text-foreground truncate max-w-[130px]">{alert.sub_type_name}</span>
                            </div>
                            <span className="text-[10px] font-black text-amber-600 tracking-widest">STOCK: {alert.current_count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Masters Policy Entry */}
            <Link href="/assets/masters" className="block">
                <div className="group p-8 rounded-[3rem] bg-foreground text-background border border-foreground/10 hover:brightness-110 transition-all duration-500 flex items-center justify-between shadow-2xl shadow-black/20 relative overflow-hidden">
                    <div className="flex items-center gap-6 relative z-10">
                         <div className="h-12 w-12 rounded-[1.5rem] bg-background/10 backdrop-blur-md flex items-center justify-center text-background">
                            <Settings2 size={24} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[16px] font-black uppercase tracking-tight leading-none mb-1">GOVERNANCE_MASTERS</span>
                            <span className="text-[9px] font-bold opacity-50 uppercase tracking-[0.3em] leading-none">Logic Policy Management</span>
                         </div>
                    </div>
                    <ChevronRight size={22} className="opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-2" />
                </div>
            </Link>

            {/* Capital Matrix (Budget Monitoring) */}
            <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <ReceiptIndianRupee size={16} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">CAPITAL_MATRIX (FY 26-27)</span>
                    </div>
                </div>
                
                <div className="space-y-6">
                    {budgets.length === 0 ? (
                        <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest text-center py-6 italic">No Active Fiscal Protocols</p>
                    ) : budgets.slice(0, 3).map((b, i) => {
                        const percent = Math.min((b.spent_amount / b.allocated_amount) * 100, 100);
                        return (
                            <div key={i} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{b.asset_type?.name}</span>
                                    <span className="text-[13px] font-black text-primary tracking-tighter">₹ {mounted ? b.spent_amount.toLocaleString('en-IN') : b.spent_amount}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">
                                    <span>POOL_LIMIT: ₹{mounted ? b.allocated_amount.toLocaleString('en-IN') : b.allocated_amount}</span>
                                    <span>UTIL: {percent.toFixed(1)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

       {/* 2. Standardized Activity Table - High Fidelity System Chronology */}
      <div className="rounded-[3.5rem] border border-border/40 bg-card/40 overflow-hidden shadow-2xl shadow-black/5 mb-10 backdrop-blur-3xl">
          <div className="px-12 py-10 border-b border-border/40 flex items-center justify-between bg-muted/5">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-[1.5rem] bg-background border border-border/40 flex items-center justify-center text-primary shadow-inner">
                         <Activity size={28} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">SYSTEM_CHRONOLOGY</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-40">Synchronized Asset Movement Ledger</p>
                    </div>
                </div>
                <Link href="/assets/movements">
                    <Button variant="outline" className="h-12 px-10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border-border/40 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                        View_Complete_Audit_Trail
                    </Button>
                </Link>
          </div>
          
          <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
                    <TableRow className="h-14 border-none hover:bg-transparent">
                        <TableHead className="pl-12 text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">PATH</TableHead>
                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">PROTOCOL_ACTION_TYPE</TableHead>
                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">HARDWARE_IDENTITY</TableHead>
                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">TARGET_CUSTODIAN</TableHead>
                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] text-right pr-12">OPERATOR_SYNC</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movements.length === 0 ? (
                        <TableRow className="h-64 border-none hover:bg-transparent">
                            <TableCell colSpan={5} className="text-center opacity-10">
                                <div className="flex flex-col items-center gap-2">
                                    <Shield size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Registry_Ledger_Invariant</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        movements.map((move) => (
                           <TableRow key={move.id} className="h-16 group hover:bg-slate-50 border-b border-border/50 transition-all">
                                <TableCell className="pl-10">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border",
                                        move.direction === 'in' ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-blue-50 text-blue-500 border-blue-100"
                                    )}>
                                        {move.direction === 'in' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase tracking-widest h-5 px-3 rounded-full border-none shadow-sm min-w-[100px] justify-center",
                                        move.type === 'handover' && "bg-blue-500 text-white shadow-blue-500/20",
                                        move.type === 'return' && "bg-amber-500 text-white shadow-amber-500/20",
                                        move.type === 'purchase_inward' && "bg-emerald-500 text-white shadow-emerald-500/20",
                                        move.type === 'damaged' && "bg-red-500 text-white shadow-red-500/20"
                                    )}>
                                        {move.type.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                            <Package size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{move.asset?.asset_code}</span>
                                            <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">{move.asset?.sub_type?.name}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {move.to_user_profile ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                                                <User size={12} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight leading-none">{move.to_user_profile.full_name}</span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{format(new Date(move.created_at), 'dd MMM yyyy')}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 opacity-20 italic">
                                             <Database size={12} />
                                             <span className="text-[10px] font-black uppercase tracking-widest leading-none">CENTRAL_STOCK</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight leading-none mb-1">{move.performed_by_profile?.full_name}</span>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{format(new Date(move.created_at), 'HH:mm:ss')}</span>
                                    </div>
                                </TableCell>
                           </TableRow>
                        ))
                    )}
                </TableBody>
             </Table>
      </div>
    </div>
  );
}
