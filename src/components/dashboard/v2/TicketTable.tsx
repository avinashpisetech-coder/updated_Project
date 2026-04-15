"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Star,
  User,
  Clock,
  ExternalLink
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketSummary } from "./types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TicketTableProps {
  tickets: TicketSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading?: boolean;
}

export function TicketTable({ tickets, totalCount, page, pageSize, loading }: TicketTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-600 border-blue-200",
    open: "bg-emerald-50 text-emerald-600 border-emerald-200",
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    resolved: "bg-indigo-50 text-indigo-600 border-indigo-200",
    closed: "bg-slate-50 text-slate-600 border-slate-200",
    escalated: "bg-rose-50 text-rose-600 border-rose-200"
  };

  return (
    <Card className="rounded-[4rem] border border-border/40 bg-white shadow-2xl hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all overflow-hidden group/table">
      <CardHeader className="p-10 pb-0 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="h-14 w-14 rounded-[2rem] bg-slate-900 flex items-center justify-center shadow-xl group-hover/table:scale-105 transition-transform">
              <PlusCircle className="h-7 w-7 text-white" />
           </div>
           <div>
              <CardTitle className="text-[18px] font-black uppercase text-slate-900 tracking-tight">Active Signal Registry</CardTitle>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-dimensional ticket feed</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
           <div className="relative flex-1 md:w-80 group/search">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-primary transition-colors" />
             <input 
               type="text" 
               placeholder="SEARCH_SIGNAL_LOGS..." 
               className="h-12 w-full pl-12 pr-4 rounded-xl border border-border/40 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-[11px] font-bold tracking-widest uppercase outline-none"
             />
           </div>
           <Button variant="outline" className="h-12 rounded-xl border-border/40 font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm">
             <Filter className="h-4 w-4" />
             Filters
           </Button>
        </div>
      </CardHeader>

      <CardContent className="p-10 pt-8">
        <div className="rounded-3xl border border-border/40 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-border/40">
              <TableRow className="hover:bg-transparent h-16">
                <TableHead className="w-[50px] pl-8">
                   <Checkbox className="rounded-md border-slate-300" />
                </TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Customer Entity</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Signal Subject</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Assigned Specialist</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">ID_TAG</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-center">Timestamp</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-center">Status</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right pr-8">Priority_Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-20 animate-pulse">
                    <TableCell colSpan={8} className="p-0">
                      <div className="h-px bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : tickets.length > 0 ? (
                tickets.map((ticket, i) => (
                  <TableRow key={ticket.id} className="h-20 hover:bg-slate-50/50 transition-colors cursor-pointer group/row border-b border-border/20 last:border-0" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                    <TableCell className="w-[50px] pl-8" onClick={(e) => e.stopPropagation()}>
                       <Checkbox className="rounded-md border-slate-200 group-hover/row:border-primary transition-colors" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white ring-1 ring-slate-100 shadow-sm transition-transform group-hover/row:scale-110">
                          <AvatarImage src={ticket.customer.avatar} />
                          <AvatarFallback className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-tighter">
                            {ticket.customer.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-black text-slate-700 tracking-tight truncate max-w-[150px]">{ticket.customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-black text-slate-900 group-hover/row:text-primary transition-colors tracking-tight line-clamp-1">{ticket.subject}</span>
                        <div className="flex items-center gap-2 opacity-40">
                           <Clock className="h-3 w-3" />
                           <span className="text-[9px] font-bold uppercase tracking-widest">Active Link</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.assignedTech ? (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 w-fit">
                          <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                             {ticket.assignedTech.avatar ? (
                               <img src={ticket.assignedTech.avatar} alt="" className="h-full w-full object-cover" />
                             ) : (
                               <User className="h-3 w-3 text-slate-400" />
                             )}
                          </div>
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight">{ticket.assignedTech.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-none py-1">UNASSIGNED</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] font-black font-mono text-slate-400 tracking-widest leading-none bg-slate-100/50 px-2 py-1 rounded">#{ticket.id}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[11px] font-black text-slate-500 tabular-nums">{format(new Date(ticket.createdAt), "dd/MM/yyyy")}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest border shadow-none", statusColors[ticket.status])}>
                         {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex items-center justify-end gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                             <Star key={i} className={cn("h-3 w-3", i < ticket.priority ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                          ))}
                       </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">No signals found in current registry.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination HUD */}
        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
           <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Showing <span className="text-slate-900">{tickets.length}</span> of <span className="text-slate-900">{totalCount}</span> Global Nodes</p>
           </div>
           
           <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-[1.5rem] border-slate-200 shadow-sm"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2">
                 {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                   const p = i + 1;
                   return (
                     <Button 
                       key={p} 
                       variant={p === page ? "default" : "ghost"}
                       className={cn("h-12 w-12 rounded-[1.5rem] text-[12px] font-black transition-all", p === page ? "shadow-lg shadow-primary/20 scale-110" : "text-slate-400")}
                       onClick={() => handlePageChange(p)}
                       disabled={loading}
                     >
                       {p}
                     </Button>
                   );
                 })}
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-[1.5rem] border-slate-200 shadow-sm"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
