"use client";

import React, { useState, useTransition } from "react";
import { 
  Search, 
  Ticket as TicketIcon,
  ChevronRight,
  Activity,
  Layers,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  ExternalLink,
  Shield,
  Zap,
  User,
  MoreVertical
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
  module: { name: string } | null;
  category: { name: string } | null;
  requester: { 
    full_name: string;
    department: { name: string } | null;
  } | null;
}

interface TicketListClientProps {
  tickets: Ticket[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function TicketListClient({ tickets: initialTickets, pagination }: TicketListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [isPending, startTransition] = useTransition();

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    if (!updates.page) params.set("page", "1");
    
    startTransition(() => {
      router.push(`/tickets?${params.toString()}`);
    });
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (searchParams.get("q") || "")) {
        updateQueryParams({ q: searchTerm || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleRowClick = (id: string) => {
    startTransition(() => {
      router.push(`/tickets/${id}`);
    });
  };

  const getStatusConfig = (status: string) => {
    const s = (status || 'new').toLowerCase();
    switch (s) {
      case 'resolved': return { label: 'SUCCESS', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
      case 'in_progress': return { label: 'ACTIVE', class: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
      case 'assigned': return { label: 'QUEUE', class: 'bg-sky-500/10 text-sky-600 border-sky-500/20' };
      case 'pending_user': return { label: 'PENDING', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
      case 'closed': return { label: 'ARCHIVE', class: 'bg-slate-500/10 text-slate-500 border-slate-500/20 opacity-60' };
      case 'new': return { label: 'INGESTED', class: 'bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse' };
      default: return { label: status.toUpperCase(), class: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    const p = String(priority || 'low').toLowerCase();
    switch (p) {
      case 'critical': return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]";
      case 'high': return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]";
      case 'medium': return "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.2)]";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden font-sans">
      {/* ── Deployment-Ready Stats Deck ── */}
      <div className="grid grid-cols-3 gap-px bg-border/40 border-b border-border/40 shrink-0">
        {[
          { label: "TOTAL_INGRESS", value: pagination.total, icon: Layers, color: "text-primary" },
          { label: "ACTIVE_SESSIONS", value: initialTickets.filter(t => t.status === 'in_progress').length, icon: Activity, color: "text-indigo-500" },
          { label: "SLA_BREACH_RISK", value: initialTickets.filter(t => t.priority === 'critical').length, icon: Zap, color: "text-rose-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-background/40 backdrop-blur-sm p-3 flex items-center justify-between group hover:bg-background/60 transition-colors">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              <p className={cn("text-lg font-black tracking-tighter", stat.color)}>{stat.value}</p>
            </div>
            <stat.icon className={cn("h-5 w-5 opacity-10 group-hover:opacity-30 transition-opacity", stat.color)} />
          </div>
        ))}
      </div>
            {/* ── Refined Command Control Bar ── */}
       <div className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-border/40 bg-white/40 backdrop-blur-xl z-20">
         <div className="flex items-center gap-3 flex-1">
           <div className="relative group max-w-xs w-full">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="FILTER_MATRIX..." 
              className={cn(
                "h-8 w-full pl-9 pr-3 text-[10px] font-bold bg-muted/30 border-transparent focus:bg-white focus:border-primary/20 transition-all rounded-lg shadow-inner-sm",
                isPending && "opacity-50 pointer-events-none"
              )}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              disabled={isPending}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-6 w-[1px] bg-border/40 mx-1" />
            <Select 
              value={statusFilter} 
              disabled={isPending}
              onValueChange={(v) => {
                setStatusFilter(v);
                updateQueryParams({ status: v === 'all' ? null : v });
              }}
            >
               <SelectTrigger className="h-8 w-40 bg-muted/30 border-transparent text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-muted/50 transition-colors px-3">
                   <div className="flex items-center gap-2">
                     <Filter className="h-3 w-3 text-muted-foreground" />
                     <SelectValue placeholder="Lifecycle" />
                   </div>
               </SelectTrigger>
               <SelectContent className="rounded-xl border-border/40 shadow-2xl backdrop-blur-xl">
                   <SelectItem value="all">ALL_SEQUENCES</SelectItem>
                   <SelectItem value="new">NEW_INGESTION</SelectItem>
                   <SelectItem value="assigned">ASSIGNED_GROUPS</SelectItem>
                   <SelectItem value="in_progress">ACTIVE_PROCESSING</SelectItem>
                   <SelectItem value="pending_user">PENDING_RESPONSE</SelectItem>
                   <SelectItem value="resolved">ARCHIVE_SUCCESS</SelectItem>
               </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" className="h-8 w-8 border border-border/40 rounded-lg hover:bg-muted font-bold">
              <MoreVertical className="h-3.5 w-3.5" />
           </Button>
        </div>
      </div>

      {/* ── Professional Data Matrix Deck ── */}
      <div className="flex-1 overflow-auto bg-background/20 relative custom-scrollbar">
        {isPending && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 w-full h-[2px] bg-primary/20 overflow-hidden z-[60]"
          >
             <motion.div 
               animate={{ x: ["-100%", "400%"] }}
               transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
               className="h-full bg-primary w-1/3" 
             />
          </motion.div>
        )}
        
        <Table className="border-collapse min-w-[1200px]">
          <TableHeader className="bg-background/80 sticky top-0 z-50 backdrop-blur-md">
            <TableRow className="h-10 border-b border-border/40 hover:bg-transparent">
              <TableHead className="pl-10 w-[160px] text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol</TableHead>
              <TableHead className="w-[140px] text-[9px] font-black text-muted-foreground uppercase tracking-widest">Timestamp</TableHead>
              <TableHead className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-4">Entity_Subject</TableHead>
              <TableHead className="w-[120px] text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Zone</TableHead>
              <TableHead className="w-[240px] text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-8">Operator_Node</TableHead>
              <TableHead className="w-[140px] text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Lifecycle</TableHead>
              <TableHead className="w-[80px] text-right pr-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {initialTickets.length > 0 ? initialTickets.map((t, idx) => {
                const status = getStatusConfig(t.status);
                return (
                    <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.3 }}
                    whileHover={{ 
                        scale: 1.002, 
                        backgroundColor: "rgba(255, 255, 255, 1)",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)"
                    }}
                    key={t.id} 
                    className={cn(
                        "h-16 group border-b border-border/20 transition-all cursor-pointer relative z-10",
                        isPending ? "opacity-50" : ""
                    )}
                    onClick={() => handleRowClick(t.id)}
                  >
                    <TableCell className="pl-10">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className={cn("h-8 w-1 lg:w-1.5 rounded-full transition-all duration-500 group-hover:h-10", getPriorityStyle(t.priority))} />
                            <div className={cn("absolute inset-0 blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500", getPriorityStyle(t.priority))} />
                        </div>
                        <span className="text-xs font-black text-foreground tracking-tight uppercase group-hover:text-primary transition-colors">{t.ticket_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-0.5 text-[10px] font-bold text-muted-foreground transition-colors group-hover:text-foreground">
                          <div className="flex items-center gap-1.5">
                             <Calendar className="h-3 w-3 opacity-40" />
                             <span>{format(new Date(t.created_at), "dd.MM.yy")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <Clock className="h-3 w-3 opacity-40" />
                             <span className="opacity-60 italic">{format(new Date(t.created_at), "HH:mm")}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col max-w-[450px]">
                        <span className="text-sm font-bold text-foreground/90 tracking-tight leading-none group-hover:text-foreground mb-1 truncate">
                          {t.subject}
                        </span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">
                              Category: {t.category?.name || 'Unclassified'}
                           </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[9px] font-black text-muted-foreground bg-muted/50 border border-border/40 px-2 py-1 rounded-md group-hover:text-primary group-hover:border-primary/20 transition-all uppercase tracking-widest">
                        {t.module?.name || 'CORE'}
                      </span>
                    </TableCell>
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-muted/80 border border-border/40 flex items-center justify-center text-xs font-black text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-sm">
                           {t.requester?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground tracking-tight leading-none mb-1 truncate">{t.requester?.full_name}</span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 truncate">
                            {t.requester?.department?.name || 'ROOT_ACCESS'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "inline-flex items-center h-7 px-4 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm",
                        status.class
                      )}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                       <div className="flex justify-end opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                            <ExternalLink className="h-4 w-4" />
                          </div>
                       </div>
                    </TableCell>
                  </motion.tr>
                );
              }) : (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[400px] hover:bg-transparent"
                >
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-6 opacity-40">
                      <div className="h-24 w-24 rounded-[2rem] bg-muted border border-border flex items-center justify-center shadow-inner relative">
                        <Layers size={48} className="text-muted-foreground/40" />
                        <div className="absolute inset-0 rounded-[2rem] border border-primary/20 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black text-foreground uppercase tracking-[0.4em]">VOID_RESULT_DETECTED</p>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest italic max-w-xs mx-auto">
                          Unified registry is currently clear. No protocol matches for the current query filter.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </motion.tr>
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
          background-clip: content-box;
        }
        .shadow-inner-sm {
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
}
