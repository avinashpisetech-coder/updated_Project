"use client";

import { useMemo, useState } from "react";
import { 
  Download, 
  Filter, 
  Search, 
  ChevronDown, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  ArrowUpDown,
  MoreVertical,
  PlusCircle,
  Save,
  Trash2,
  RefreshCw,
  Zap,
  Tag,
  Flag
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function ReportsClient({ 
  initialTickets, 
  modules, 
  categories 
}: { 
  initialTickets: any[]; 
  modules: any[]; 
  categories: any[]; 
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const filteredTickets = useMemo(() => {
    let list = [...initialTickets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => 
        t.ticket_number.toLowerCase().includes(q) || 
        t.subject.toLowerCase().includes(q) ||
        t.requester?.full_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter(t => t.priority === priorityFilter);
    if (moduleFilter !== "all") list = list.filter(t => t.module?.name === moduleFilter);

    list.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [initialTickets, search, statusFilter, priorityFilter, moduleFilter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Ticket #", "Status", "Priority", "Module", "Category", "Subject", "Requester", "Created At"];
      const rows = filteredTickets.map(t => [
        t.ticket_number,
        t.status,
        t.priority,
        t.module?.name || "N/A",
        t.category?.name || "N/A",
        t.subject,
        t.requester?.full_name || "N/A",
        format(new Date(t.created_at), "yyyy-MM-dd HH:mm")
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `EIRMS_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Report data exported to CSV");
    } catch (err) {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans antialiased animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Intelligence Node */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-6 border-b border-border/40 relative">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Data Intelligence Registry</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground leading-none">
            REPORTS_<span className="text-indigo-500/60">ENGINE</span>
          </h1>
          <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest mt-2">
            Professional record extraction & Export protocol
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 rounded-xl border-border/40 bg-muted/20 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-indigo-500 hover:text-white"
            onClick={() => toast.info("Designer Mode Active - Select columns & filters")}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-2" />
            Design Report
          </Button>
          <Button 
            disabled={isExporting}
            onClick={exportToCSV}
            variant="default"
            size="sm" 
            className="h-10 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
          >
            <Download className={cn("w-3.5 h-3.5 mr-2", isExporting && "animate-spin")} />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Advanced Control Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* Filter Panes */}
        <div className="xl:col-span-12 flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-sm">
           <div className="relative group flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-40 group-focus-within:text-indigo-500 group-focus-within:opacity-100 transition-all" />
              <Input 
                placeholder="Search ticket #, subject, or requester..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10 rounded-xl border-border/40 bg-background/50 focus:border-indigo-500/50 focus:ring-indigo-500/20 text-xs font-medium"
              />
           </div>

           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border border-border/40">
                 <Tag className="w-3 h-3 text-muted-foreground opacity-60" />
                 <select 
                   className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                 >
                   <option value="all">ALL_STATUS</option>
                   <option value="new">NEW</option>
                   <option value="assigned">ASSIGNED</option>
                   <option value="in_progress">IN_PROGRESS</option>
                   <option value="resolved">RESOLVED</option>
                   <option value="closed">CLOSED</option>
                 </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border border-border/40">
                 <Flag className="w-3 h-3 text-muted-foreground opacity-60" />
                 <select 
                   className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                   value={priorityFilter}
                   onChange={(e) => setPriorityFilter(e.target.value)}
                 >
                   <option value="all">ALL_PRIORITY</option>
                   <option value="low">LOW</option>
                   <option value="medium">MEDIUM</option>
                   <option value="high">HIGH</option>
                   <option value="critical">CRITICAL</option>
                 </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border border-border/40">
                 <Layers className="w-3 h-3 text-muted-foreground opacity-60" />
                 <select 
                   className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer"
                   value={moduleFilter}
                   onChange={(e) => setModuleFilter(e.target.value)}
                 >
                   <option value="all">ALL_MODULES</option>
                   {modules.map(m => (
                     <option key={m.id} value={m.name}>{m.name.toUpperCase()}</option>
                   ))}
                 </select>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setModuleFilter("all");
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
           </div>
        </div>

        {/* High-Density Registry Table */}
        <div className="xl:col-span-12 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden shadow-sm shadow-indigo-500/5">
           <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
              <Table>
                 <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
                    <TableRow className="hover:bg-transparent border-border/40 h-14">
                       {[
                         { key: 'ticket_number', label: 'TICKET_ID' },
                         { key: 'subject', label: 'SUBJECT_OR_DESCRIPTION' },
                         { key: 'status', label: 'STATUS' },
                         { key: 'priority', label: 'PRIORITY' },
                         { key: 'module', label: 'MODULE' },
                         { key: 'requester', label: 'REQUESTER' },
                         { key: 'created_at', label: 'TIMESTAMP' },
                         { key: 'sla_due_date', label: 'SLA_DEALINE' }
                       ].map((col) => (
                         <TableHead 
                           key={col.key} 
                           className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer group hover:text-indigo-500 transition-colors"
                           onClick={() => handleSort(col.key)}
                         >
                            <div className="flex items-center gap-1.5 pl-4">
                               {col.label}
                               <ArrowUpDown className={cn(
                                 "w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100",
                                 sortConfig.key === col.key && "opacity-100 text-indigo-500"
                               )} />
                            </div>
                         </TableHead>
                       ))}
                       <TableHead className="w-10 pr-6" />
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {filteredTickets.map((t) => (
                      <TableRow key={t.id} className="hover:bg-indigo-500/5 transition-colors border-border/40 group h-16">
                         <TableCell className="pl-6 font-black tabular-nums tracking-tighter text-[11px] text-indigo-500/80 group-hover:text-indigo-500">
                            {t.ticket_number}
                         </TableCell>
                         <TableCell className="max-w-xs truncate pl-4">
                            <p className="text-[11px] font-bold tracking-tight text-foreground line-clamp-1">{t.subject}</p>
                            <p className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-widest mt-1">
                               {t.category?.name || "Uncategorized"}
                            </p>
                         </TableCell>
                         <TableCell className="pl-4">
                            <Badge className={cn(
                              "text-[8px] font-black uppercase tracking-wider h-6 rounded-lg border shadow-sm",
                              statusStyles[t.status as keyof typeof statusStyles] || "bg-muted text-muted-foreground"
                            )}>
                               {t.status}
                            </Badge>
                         </TableCell>
                         <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                               <div className={cn("h-1.5 w-1.5 rounded-full", priorityStyles[t.priority as keyof typeof priorityStyles] || "bg-muted")} />
                               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{t.priority}</span>
                            </div>
                         </TableCell>
                         <TableCell className="pl-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60">{t.module?.name}</span>
                         </TableCell>
                         <TableCell className="pl-4">
                            <p className="text-[10px] font-bold tracking-tight text-foreground">{t.requester?.full_name}</p>
                            <p className="text-[9px] text-muted-foreground/60 font-medium lowercase truncate max-w-[120px]">{t.requester?.email}</p>
                         </TableCell>
                         <TableCell className="pl-4 text-[10px] font-bold text-muted-foreground tabular-nums">
                            {format(new Date(t.created_at), "MMM dd, HH:mm")}
                         </TableCell>
                         <TableCell className="pl-4">
                            {t.sla_due_date ? (
                              <div className={cn(
                                "flex items-center gap-1.5 text-[10px] font-bold tabular-nums",
                                new Date(t.sla_due_date) < new Date() && t.status !== 'resolved' ? "text-destructive" : "text-emerald-500"
                              )}>
                                 <Clock className="w-3 h-3" />
                                 {format(new Date(t.sla_due_date), "dd/MM HH:mm")}
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-muted-foreground/40 italic">Not Set</span>
                            )}
                         </TableCell>
                         <TableCell className="pr-6 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                               <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                         </TableCell>
                      </TableRow>
                    ))}
                    {!filteredTickets.length && (
                      <TableRow>
                         <TableCell colSpan={9} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center opacity-20">
                               <Search className="w-10 h-10 mb-4 animate-pulse" />
                               <p className="text-sm font-black uppercase tracking-[0.2em]">No records in current scope</p>
                            </div>
                         </TableCell>
                      </TableRow>
                    )}
                 </TableBody>
              </Table>
           </div>
        </div>

        {/* Global Summary Snapshot */}
        <div className="xl:col-span-12 flex items-center justify-between p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 shadow-inner">
           <div className="flex items-center gap-6">
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
                 <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                 <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Report Snapshot</p>
                 <p className="text-xl font-black text-foreground tabular-nums tracking-tighter">
                    {filteredTickets.length} <span className="text-foreground/40 text-[10px] uppercase font-bold tracking-widest border-l border-foreground/20 pl-4 ml-4">Processed Records</span>
                 </p>
              </div>
           </div>
           <div className="flex items-center gap-4">
              <Button variant="outline" className="h-10 rounded-xl border-border/40 bg-background/50 text-[10px] font-bold uppercase tracking-widest">
                 <Save className="w-3.5 h-3.5 mr-2" />
                 Save as Template
              </Button>
              <div className="h-10 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                 <Zap className="h-3.5 w-3.5 text-indigo-500" />
                 <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Latency: 0.2s</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const statusStyles = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  assigned: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-border/40",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20"
};

const priorityStyles = {
  low: "bg-muted-foreground/40",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-destructive"
};
