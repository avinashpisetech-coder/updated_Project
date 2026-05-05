"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { AnalyticsHeader } from "@/components/dashboard/analytics/AnalyticsHeader";
import { IntelligenceReports } from "@/components/dashboard/analytics/IntelligenceReports";
import { getAnalytics, getDetailedTicketReport, type AnalyticsData } from "../actions";
import { MultiSelect } from "@/components/dashboard/analytics/MultiSelect";
import { toast } from "sonner";
import { 
  Building2, 
  Layers, 
  Tag, 
  User, 
  Activity, 
  Calendar, 
  RefreshCcw, 
  X, 
  FilePieChart,
  BarChart4,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ServiceReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    dept_ids: [] as string[],
    module_ids: [] as string[],
    category_ids: [] as string[],
    user_ids: [] as string[],
    statuses: [] as string[]
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchStats = useCallback(() => {
    startTransition(async () => {
      const { data: result, error } = await getAnalytics(filters, startDate || undefined, endDate || undefined);
      if (error) {
        toast.error(`Failed to fetch report data: ${error}`);
        return;
      }
      
      // Fetch detailed tickets if needed or just fetch them always for reports
      const { data: tickets, error: ticketError } = await getDetailedTicketReport(filters, startDate || undefined, endDate || undefined);
      
      if (result) {
        if (tickets) result.tickets = tickets;
        setData(result);
      }
    });
  }, [filters, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateFilter = (key: keyof typeof filters, ids: string[]) => {
    setFilters(prev => ({ ...prev, [key]: ids }));
  };

  const clearAllFilters = () => {
    setFilters({
      dept_ids: [],
      module_ids: [],
      category_ids: [],
      user_ids: [],
      statuses: []
    });
    setStartDate("");
    setEndDate("");
  };

  if (!data && isPending) {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#16192c] text-[#00f2ff]">
        <RefreshCcw size={48} className="animate-spin mb-4 opacity-70" />
        <span className="text-sm font-bold tracking-[0.3em] uppercase animate-pulse">Compiling Intelligence Reports...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#16192c] text-white font-sans selection:bg-[#00f2ff]/30 min-h-screen w-full relative pb-12">
      <AnalyticsHeader />

      {/* Global Filter Matrix - PINNED IN REPORTS */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-6 mb-8 mt-6 animate-in fade-in slide-in-from-top-2 duration-700 print:hidden">
        <div className="flex items-center gap-3 bg-[#1c203b]/50 p-2 px-4 rounded-lg border border-[#2d314d] shadow-lg">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-widest mb-1 pl-1">Start Date</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-white outline-none focus:text-[#00f2ff] transition-colors"
            />
          </div>
          <div className="h-4 w-px bg-[#2d314d]" />
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-widest mb-1 pl-1">End Date</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-white outline-none focus:text-[#00f2ff] transition-colors"
            />
          </div>
        </div>

        <MultiSelect 
            label="Department" 
            options={data?.filter_options?.departments || []} 
            selectedIds={filters.dept_ids} 
            onChange={(ids) => updateFilter('dept_ids', ids)}
            placeholder="All Depts"
            icon={Building2}
        />
        <MultiSelect 
            label="Agent" 
            options={data?.filter_options?.users || []} 
            selectedIds={filters.user_ids} 
            onChange={(ids) => updateFilter('user_ids', ids)}
            placeholder="All Users"
            icon={User}
        />
        <MultiSelect 
            label="Module" 
            options={data?.filter_options?.modules || []} 
            selectedIds={filters.module_ids} 
            onChange={(ids) => updateFilter('module_ids', ids)}
            placeholder="All Scopes"
            icon={Layers}
        />
        <MultiSelect 
            label="Category" 
            options={data?.filter_options?.categories || []} 
            selectedIds={filters.category_ids} 
            onChange={(ids) => updateFilter('category_ids', ids)}
            placeholder="All Types"
            icon={Tag}
        />
        <MultiSelect 
            label="Status" 
            options={(data?.filter_options?.statuses || []).map(s => ({ id: s, name: s.replace(/_/g, ' ').toUpperCase() }))} 
            selectedIds={filters.statuses} 
            onChange={(ids) => updateFilter('statuses', ids)}
            placeholder="All Status"
            icon={Activity}
        />
        
        <button 
          onClick={clearAllFilters}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-[0.2em] rounded-lg hover:bg-red-500/10 transition-all group h-[42px]"
        >
          <X className="h-3 w-3 group-hover:rotate-90 transition-transform" />
          Reset Matrix
        </button>
      </div>

      <main className="flex-1 px-4 md:px-6 flex flex-col gap-8 transition-opacity duration-300">
         <IntelligenceReports 
           data={data} 
           filters={filters} 
           startDate={startDate} 
           endDate={endDate} 
           hideDashboardButton={true}
         />
      </main>

      {/* Report Sync HUD */}
      <div className="fixed bottom-6 right-6 flex items-center gap-4 z-[400] print:hidden">
        <button 
          onClick={() => fetchStats()}
          disabled={isPending}
          className="flex items-center justify-center h-12 w-12 bg-[#00f2ff] border border-[#00f2ff]/30 rounded-full hover:bg-[#00f2ff]/80 transition-all text-[#16192c] shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 group"
        >
          <RefreshCcw size={18} className={cn("font-bold", isPending && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
