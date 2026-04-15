"use client";

import React from "react";
import { 
  FileText, 
  Download, 
  Printer, 
  LayoutDashboard, 
  UserCheck, 
  Activity, 
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface IntelligenceReportsProps {
  data: any;
  filters: any;
  startDate?: string;
  endDate?: string;
  onViewDashboard?: () => void;
  hideDashboardButton?: boolean;
}

export function IntelligenceReports({ data, filters, startDate, endDate, onViewDashboard, hideDashboardButton }: IntelligenceReportsProps) {
  const [activeTab, setActiveTab] = React.useState<'summary' | 'tickets'>('summary');

  
  const getFilterSummary = () => {
    const summary = [];
    if (startDate || endDate) {
      summary.push(`Period: ${startDate || 'Any'} to ${endDate || 'Any'}`);
    }
    if (filters.dept_ids?.length > 0) {
      summary.push(`Departments: ${filters.dept_ids.length} selected`);
    }
    if (filters.module_ids?.length > 0) {
      summary.push(`Modules: ${filters.module_ids.length} selected`);
    }
    if (filters.statuses?.length > 0) {
      summary.push(`Statuses: ${filters.statuses.join(', ')}`);
    }
    return summary.length > 0 ? summary.join(' | ') : "All Operational Data";
  };

  const exportCSV = (type: 'agent' | 'dept' | 'status' | 'tickets') => {
    let rows: (string | number)[][] = [];
    let headers: string[] = [];
    let fileName = `report_${type}_${format(new Date(), "yyyyMMdd")}.csv`;

    if (type === 'agent') {
      headers = ['Agent Name', 'Raised', 'Assigned', 'Resolved', 'Efficiency %', 'Avg Rating'];
      rows = (data?.agent_intel || []).map((a: any) => [
        a.name,
        a.raised,
        a.assigned,
        a.resolved,
        a.assigned > 0 ? Math.round((a.resolved / a.assigned) * 100) : 0,
        a.avg_rating
      ]);
    } else if (type === 'dept') {
      headers = ['Department', 'Raised Volume', 'Resolved Volume', 'Active Backlog'];
      rows = (data?.department_distribution || []).map((d: any) => [
        d.name,
        d.raised,
        d.resolved,
        d.active
      ]);
    } else if (type === 'status') {
      headers = ['Metric', 'Count'];
      rows = Object.entries(data?.status_distribution || {}).map(([s, c]) => [
         s.toUpperCase().replace(/_/g, ' '),
         c as number
      ]);
    } else if (type === 'tickets') {
      headers = ['Ticket #', 'Subject', 'Status', 'Priority', 'Department', 'Module', 'Category', 'Requester', 'Assignee', 'Created At'];
      rows = (data?.tickets || []).map((t: any) => [
        t.ticket_number,
        t.subject,
        t.status,
        t.priority,
        t.requester?.department?.name || 'N/A',
        t.module?.name || 'N/A',
        t.category?.name || 'N/A',
        t.requester?.full_name || 'N/A',
        t.assigned_to?.full_name || 'Unassigned',
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm')
      ]);
    }

    const filterHeader = `REPORT SUMMARY: ${getFilterSummary()}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    const csvContent = filterHeader + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 print:p-0 print:m-0">
      <div className="flex flex-col gap-8">
        
        {/* Reports Navigation & Global Controls */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-6 border-b border-[#2d314d] print:hidden">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <FileText className="h-5 w-5 text-[#00f2ff]" />
               <h2 className="text-2xl font-black text-white/90 uppercase tracking-tight">Analytical Reports</h2>
            </div>
            <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest pl-7">
               Generate and export operational intelligence snapshots
            </p>
          </div>

          <div className="flex items-center gap-3">
             {onViewDashboard && !hideDashboardButton && (
               <button 
                 onClick={onViewDashboard}
                 className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#2d314d] text-white/60 hover:text-white hover:bg-[#20233d] transition-all text-xs font-bold uppercase tracking-widest"
               >
                  <LayoutDashboard size={14} />
                  Dashboard
               </button>
             )}
             <div className="h-6 w-px bg-[#2d314d]" />
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-[#16192c] hover:bg-white/90 transition-all text-xs font-bold uppercase tracking-widest shadow-xl shadow-white/10"
             >
                <Printer size={14} />
                Generate PDF
             </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-1 bg-[#1c203b]/50 border border-[#2d314d] rounded-2xl w-fit print:hidden">
           <button 
             onClick={() => setActiveTab('summary')}
             className={cn(
               "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'summary' ? "bg-[#00f2ff] text-[#16192c]" : "text-white/40 hover:text-white/60"
             )}
           >
              Executive Summary
           </button>
           <button 
             onClick={() => setActiveTab('tickets')}
             className={cn(
               "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'tickets' ? "bg-[#00f2ff] text-[#16192c]" : "text-white/40 hover:text-white/60"
             )}
           >
              Detailed Ticket List
           </button>
        </div>

        {activeTab === 'summary' ? (
          <>
            {/* IT Operations Pulse - GLOBAL KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
               <ReportMetric 
                 label="Total Operational Load" 
                 value={`${data?.total_tickets || 0} RAISED`} 
                 icon={Activity} 
                 color="text-[#00f2ff]" 
               />
               <ReportMetric 
                 label="Resolution Efficiency" 
                 value={`${Math.round(((data?.status_distribution?.resolved || 0) + (data?.status_distribution?.closed || 0)) / (data?.total_tickets || 1) * 100)}% SUCCESS`} 
                 icon={CheckCircle2} 
                 color="text-emerald-400" 
               />
               <ReportMetric 
                 label="Active Overload (Backlog)" 
                 value={`${data?.active_load || 0} PENDING`} 
                 icon={AlertCircle} 
                 color="text-amber-500" 
               />
               <ReportMetric 
                 label="CSAT Audit Pending" 
                 value={`${data?.csat_pending_count || 0} REVIEWS`} 
                 icon={UserCheck} 
                 color="text-[#fde047]" 
               />
            </div>

            {/* Global Summary Context - VISIBLE ON PDF */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <ReportMetric 
                 label="Data filtration Context" 
                 value={getFilterSummary()} 
                 icon={Filter} 
                 color="text-white/40" 
                 fullWidth 
               />
            </div>

            {/* SECTION 1: SYSTEM-WIDE VOLUME BREAKDOWN */}
            <div className="space-y-6">
               <div className="flex items-center justify-between border-l-4 border-[#00f2ff] pl-4">
                  <div>
                     <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">Departmental Volume Matrix</h3>
                     <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Cross-functional load distribution analysis</p>
                  </div>
                  <button 
                    onClick={() => exportCSV('dept')}
                    className="p-2 rounded-lg bg-[#20233d] border border-[#2d314d] text-[#00f2ff] hover:bg-[#00f2ff]/10 transition-all print:hidden"
                    title="Export Department CSV"
                  >
                     <Download size={14} />
                  </button>
               </div>

               <div className="bg-[#20233d]/40 rounded-2xl border border-[#2d314d] overflow-hidden">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-[#20233d] border-b border-[#2d314d]">
                        <tr>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Department Identity</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Raised</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Resolved</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Active Load</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#2d314d]">
                        {data?.department_distribution?.map((d: any) => (
                           <tr key={d.name} className="hover:bg-[#00f2ff]/5 transition-colors group">
                              <td className="px-6 py-4 font-bold text-white/80 flex items-center gap-3">
                                 <Building2 size={12} className="text-[#64748b]" />
                                 {d.name}
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-right text-white/60">{d.raised}</td>
                              <td className="px-6 py-4 font-mono font-bold text-right text-emerald-400">{d.resolved}</td>
                              <td className="px-6 py-4 font-mono font-bold text-right text-amber-500">{d.active}</td>
                           </tr>
                        ))}
                        <tr className="bg-[#20233d]/60 font-black">
                           <td className="px-6 py-4 uppercase tracking-[0.2em] text-[#00f2ff]">Grand Intelligence Total</td>
                           <td className="px-6 py-4 text-right text-white">{data?.total_tickets || 0}</td>
                           <td className="px-6 py-4 text-right text-emerald-400">
                              {(data?.status_distribution?.resolved || 0) + (data?.status_distribution?.closed || 0)}
                           </td>
                           <td className="px-6 py-4 text-right text-amber-500">
                              {(data?.total_tickets || 0) - ((data?.status_distribution?.resolved || 0) + (data?.status_distribution?.closed || 0))}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>

            {/* SECTION 2: AGENT PERFORMANCE REGISTRY */}
            <div className="space-y-6">
               <div className="flex items-center justify-between border-l-4 border-amber-500 pl-4">
                  <div>
                     <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">Technician Performance Pulse</h3>
                     <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Individual efficiency and quality metrics</p>
                  </div>
                  <button 
                    onClick={() => exportCSV('agent')}
                    className="p-2 rounded-lg bg-[#20233d] border border-[#2d314d] text-amber-500 hover:bg-amber-500/10 transition-all print:hidden"
                    title="Export Agent CSV"
                  >
                     <Download size={14} />
                  </button>
               </div>

               <div className="bg-[#20233d]/40 rounded-2xl border border-[#2d314d] overflow-hidden">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-[#20233d] border-b border-[#2d314d]">
                        <tr>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Agent Credential</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Self Raised</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Assigned</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Resolved</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Efficiency</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Rating</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#2d314d]">
                        {data?.agent_intel?.map((a: any) => {
                           const perc = a.assigned > 0 ? Math.round((a.resolved / a.assigned) * 100) : 0;
                           return (
                            <tr key={a.name} className="hover:bg-amber-500/5 transition-colors group">
                               <td className="px-6 py-4 font-bold text-white/80 flex items-center gap-3">
                                  <UserCheck size={12} className="text-[#64748b]" />
                                  {a.name}
                               </td>
                               <td className="px-6 py-4 font-mono font-bold text-right text-white/60">{a.raised}</td>
                               <td className="px-6 py-4 font-mono font-bold text-right text-amber-500/70">{a.assigned}</td>
                               <td className="px-6 py-4 font-mono font-bold text-right text-emerald-400">{a.resolved}</td>
                               <td className="px-6 py-4 text-right">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded-full text-[10px] font-black",
                                     perc > 70 ? "bg-emerald-500/10 text-emerald-400" : perc > 40 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                                  )}>
                                     {perc}%
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right text-amber-400 font-bold">{a.avg_rating || '5.0'}</td>
                            </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* SECTION 3: TECHNICAL INTELLIGENCE REGISTRY */}
            <div className="space-y-6">
               <div className="flex items-center justify-between border-l-4 border-[#a855f7] pl-4">
                  <div>
                     <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">Problem Category Distribution</h3>
                     <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Volume analysis by technical incident type</p>
                  </div>
               </div>

               <div className="bg-[#20233d]/40 rounded-2xl border border-[#2d314d] overflow-hidden">
                  <table className="w-full text-left text-xs">
                     <thead className="bg-[#20233d] border-b border-[#2d314d]">
                        <tr>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Category Specification</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Volume</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px] text-right">Impact Share</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#2d314d]">
                        {data?.category_distribution?.map((c: any) => (
                           <tr key={c.name} className="hover:bg-[#a855f7]/5 transition-colors group">
                              <td className="px-6 py-4 font-bold text-white/80 flex items-center gap-3">
                                 <Tag size={12} className="text-[#64748b]" />
                                 {c.name}
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-right text-white/60">{c.count}</td>
                              <td className="px-6 py-4 text-right pr-6">
                                 <div className="w-[100px] h-1.5 bg-[#2d314d] rounded-full inline-block ml-auto overflow-hidden">
                                    <div 
                                      className="h-full bg-[#a855f7]" 
                                      style={{ width: `${Math.min(100, (c.count / (data?.total_tickets || 1)) * 100)}%` }} 
                                    />
                                 </div>
                                 <span className="ml-3 text-[9px] font-mono text-white/40">
                                    {Math.round((c.count / (data?.total_tickets || 1)) * 100)}%
                                 </span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* SECTION 4: OPERATIONAL STATE BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-4">
                       <div>
                          <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">Status Lifecycle Snapshot</h3>
                       </div>
                       <button 
                         onClick={() => exportCSV('status')}
                         className="p-2 rounded-lg bg-[#20233d] border border-[#2d314d] text-emerald-500 hover:bg-emerald-500/10 transition-all print:hidden"
                       >
                          <Download size={14} />
                       </button>
                    </div>
                    <div className="bg-[#20233d]/40 rounded-2xl border border-[#2d314d] p-6 space-y-4">
                       {Object.entries(data?.status_distribution || {}).map(([s, c]: [string, any]) => (
                          <div key={s} className="flex items-center justify-between group">
                             <div className="flex items-center gap-3">
                                <Activity size={12} className="text-[#64748b] group-hover:text-[#00f2ff] transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b] group-hover:text-white transition-colors">
                                   {s.replace(/_/g, ' ')}
                                </span>
                             </div>
                             <span className="font-mono font-bold text-white">{c}</span>
                          </div>
                       ))}
                    </div>
                </div>

                <div className="p-10 border-2 border-dashed border-[#2d314d] rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-[#20233d]/10 print:hidden">
                   <Printer className="h-8 w-8 text-[#64748b] opacity-20" />
                   <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-white/40 tracking-[0.2em]">Ready for Generation</h4>
                      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest max-w-[200px]">
                         Configure filters in the top HUD before generating the final report.
                      </p>
                   </div>
                </div>
            </div>
          </>
        ) : (
          <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between border-l-4 border-[#00f2ff] pl-4">
               <div>
                  <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">Global Ticket Inventory</h3>
                  <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Filtered list of all matching tickets</p>
               </div>
               <button 
                 onClick={() => exportCSV('tickets')}
                 className="flex items-center gap-2 px-4 py-2 bg-[#00f2ff]/10 border border-[#00f2ff]/20 text-[#00f2ff] text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-[#00f2ff]/20 transition-all print:hidden"
               >
                  <Download size={14} />
                  Export All
               </button>
            </div>

            <div className="bg-[#20233d]/40 rounded-2xl border border-[#2d314d] overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                     <thead className="bg-[#20233d] border-b border-[#2d314d]">
                        <tr>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Ticket #</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Subject</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Status</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Priority</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Requester</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Department</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Assignee</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Module/Category</th>
                           <th className="px-6 py-4 font-black uppercase tracking-widest text-[#64748b] text-[9px]">Created At</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#2d314d]">
                        {(data?.tickets || []).length > 0 ? (
                          data.tickets.map((t: any) => (
                            <tr key={t.id} className="hover:bg-[#00f2ff]/5 transition-colors group">
                               <td className="px-6 py-4 font-mono font-bold text-[#00f2ff]">{t.ticket_number}</td>
                               <td className="px-6 py-4 font-bold text-white/80 max-w-[200px] truncate">{t.subject}</td>
                               <td className="px-6 py-4 text-center">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                     t.status === 'resolved' || t.status === 'closed' ? "bg-emerald-500/10 text-emerald-400" :
                                     t.status === 'new' ? "bg-blue-500/10 text-blue-400" :
                                     t.status === 'pending_user' ? "bg-amber-500/10 text-amber-500" : "bg-[#64748b]/10 text-[#64748b]"
                                  )}>
                                     {t.status.replace(/_/g, ' ')}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                     t.priority === 'urgent' ? "bg-red-500/10 text-red-500" :
                                     t.priority === 'high' ? "bg-orange-500/10 text-orange-400" : "bg-[#64748b]/10 text-[#64748b]"
                                  )}>
                                     {t.priority}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-white/60">{t.requester?.full_name || 'Unknown'}</td>
                               <td className="px-6 py-4 text-white/40">{t.requester?.department?.name || 'N/A'}</td>
                               <td className="px-6 py-4 text-[#00f2ff]/70 font-bold">{t.assigned_to?.full_name || 'Unassigned'}</td>
                               <td className="px-6 py-4 text-white/40 italic">
                                  {t.module?.name} / {t.category?.name}
                               </td>
                               <td className="px-6 py-4 text-white/30 font-mono">
                                  {format(new Date(t.created_at), 'yyyy/MM/dd HH:mm')}
                                </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-[#64748b] font-bold uppercase tracking-widest italic">
                               No operational records found for current filters
                            </td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .bg-\\[\\#16192c\\] { background: white !important; }
          .bg-\\[\\#20233d\\] { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .text-white { color: #0f172a !important; }
          .text-white\\/60 { color: #64748b !important; }
          .text-white\\/80 { color: #0f172a !important; }
          .text-\\[\\#64748b\\] { color: #94a3b8 !important; }
          .border-\\[\\#2d314d\\] { border-color: #e2e8f0 !important; }
          .rounded-2xl { border-radius: 0.5rem !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          .text-emerald-400 { color: #059669 !important; }
          .text-amber-500 { color: #d97706 !important; }
          .text-\\[\\#00f2ff\\] { color: #0f172a !important; font-weight: 800 !important; }
        }
      `}</style>
    </div>
  );
}

function ReportMetric({ label, value, icon: Icon, color, fullWidth = false }: { label: string; value: string; icon: any; color: string; fullWidth?: boolean }) {
  return (
    <div className={cn(
       "bg-[#20233d]/40 rounded-xl border border-[#2d314d] p-4 flex items-center gap-4",
       fullWidth ? "md:col-span-4" : ""
    )}>
       <div className={cn("h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center", color)}>
          <Icon size={18} />
       </div>
       <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-[#64748b] tracking-widest mb-1">{label}</span>
          <span className="text-xs font-bold text-white/90">{value}</span>
       </div>
    </div>
  );
}
