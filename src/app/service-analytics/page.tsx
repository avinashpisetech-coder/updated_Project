"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { AnalyticsHeader } from "@/components/dashboard/analytics/AnalyticsHeader";
import { GaugeChart } from "@/components/dashboard/analytics/GaugeChart";
import { VolumeChart } from "@/components/dashboard/analytics/VolumeChart";
import { StatusBarList } from "@/components/dashboard/analytics/StatusBarList";
import { Leaderboard } from "@/components/dashboard/analytics/Leaderboard";
import { MetricBlock, AlertCard } from "@/components/dashboard/analytics/AnalyticsMetrics";
import { AnalyticsTable } from "@/components/dashboard/analytics/AnalyticsTable";
import { DistributionChart } from "@/components/dashboard/analytics/DistributionChart";
import { User, ShieldCheck, UserCheck, RefreshCcw, AlertTriangle, Monitor, X, Building2, Layers, Tag, Activity, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAnalytics, type AnalyticsData } from "./actions";
import { MultiSelect } from "@/components/dashboard/analytics/MultiSelect";
import { toast } from "sonner";
import { format } from "date-fns";
import { MiniPerformanceChart } from "./TemporalCharts";
import { useSearchParams } from "next/navigation";
import { DashboardV2 } from "@/components/dashboard/v2/DashboardV2";
import { IntelligenceReports } from "@/components/dashboard/analytics/IntelligenceReports";

export default function ServiceAnalyticsDashboard() {
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
  const searchParams = useSearchParams();
  const version = searchParams.get("version") || "v1";

  const fetchStats = useCallback(() => {
    startTransition(async () => {
      const { data: result, error } = await getAnalytics(filters, startDate || undefined, endDate || undefined);
      if (error) {
        toast.error(`Failed to fetch live analytics: ${error}`);
        return;
      }
      if (result) setData(result);
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

  const deptComparison = (data?.department_distribution ?? [])
    .sort((a, b) => b.raised - a.raised)
    .map(d => ({ 
      name: d.name, 
      score: `${d.raised} Raised | ${d.resolved} Solved`,
      detail: `${d.active} Active`
    }));

  const statusMetrics = Object.entries(data?.status_distribution ?? {})
    .filter(([_, count]) => count > 0)
    .sort((a,b) => b[1] - a[1])
    .map(([status, count]) => ({
      label: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: count
    }));

  const updateMetrics = (data?.update_distribution ?? [])
    .map(d => ({
      label: d.date === "Older" ? "Legacy Nodes" : format(new Date(d.date), "dd MMM (EEE)"),
      value: d.count
    }));

  // Map agent intel to tabular format (Service Performance Registry)
  const tableData = (data?.agent_intel ?? []).map(a => {
    const assigned = a.assigned as number;
    const resolved = a.resolved as number;
    return {
      name: a.name,
      raised: a.raised as number,
      assigned: assigned,
      resolved: resolved,
      percentage: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0,
      rating: a.avg_rating
    };
  }).sort((a,b) => b.resolved - a.resolved);

  // Map category distribution for Scope/Request Intel
  const categoryData = (data?.category_distribution ?? []).map(c => ({
    name: c.name,
    count: c.count
  }));

  // Map module distribution for Department Load Flow (Scopewise)
  const scopewiseData = (data?.module_distribution ?? []).map(m => ({
    name: m.name,
    count: m.count
  }));

  const getStatusCount = (target: string) => {
    if (!data?.status_distribution) return 0;
    const entry = Object.entries(data.status_distribution).find(
      ([key]) => key.toLowerCase() === target.toLowerCase()
    );
    return entry ? (entry[1] as number) : 0;
  };

  const solvedCount = getStatusCount('resolved') + getStatusCount('closed');
  const csatPendingPerc = data && solvedCount > 0
    ? Math.round((data.csat_pending_count / solvedCount) * 100)
    : 0;

  // Map scope distribution for Department Load Flow
  const scopeData = Object.entries(data?.channel_distribution ?? {}).map(([name, count]) => ({
    name,
    count: count as number
  }));

  if (!data && isPending) {
    return (
      <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#16192c] text-[#00f2ff]">
        <RefreshCcw size={48} className="animate-spin mb-4 opacity-70" />
        <span className="text-sm font-bold tracking-[0.3em] uppercase animate-pulse">Expanding Tactical Intel Hub...</span>
      </div>
    );
  }

  const resPerc = data ? (data.total_tickets > 0 ? Math.round((( (data.status_distribution?.resolved ?? 0) + (data.status_distribution?.closed ?? 0)) / data.total_tickets) * 100) : 0) : 0;
  
  // Calculate average agent rating for the QA metrics
  const avgAgentRating = tableData.length > 0 
    ? (tableData.reduce((acc, curr) => acc + curr.rating, 0) / tableData.length).toFixed(1)
    : "0.0";
  const qaPercentage = Math.round(parseFloat(avgAgentRating) * 20);



  if (version === "v2") {
    return <DashboardV2 initialData={data} />;
  }

  return (
    <div className="flex flex-col bg-[#16192c] text-white font-sans selection:bg-[#00f2ff]/30 min-h-screen w-full relative pb-12">
      <AnalyticsHeader />
      
      {/* Unified Filter Matrix HUD */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-6 mb-8 mt-6 animate-in fade-in slide-in-from-top-2 duration-700">
        {/* Temporal Core */}
        <div className="flex items-center gap-3 bg-[#1c203b]/50 p-2 px-4 rounded-lg border border-[#2d314d] shadow-lg hover:border-[#fde047]/30 transition-colors duration-300">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3 w-3 text-[#fde047] drop-shadow-[0_0_5px_#fde047]" />
                <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-widest">From</span>
            </div>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-white outline-none focus:text-[#fde047] transition-colors"
            />
          </div>
          <div className="h-4 w-px bg-[#2d314d]" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3 w-3 text-[#fde047] drop-shadow-[0_0_5px_#fde047]" />
                <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-widest">To</span>
            </div>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-white outline-none focus:text-[#fde047] transition-colors appearance-none"
            />
          </div>
          <button 
            onClick={() => fetchStats()}
            disabled={isPending}
            className={cn(
              "p-2 rounded-md hover:bg-[#00f2ff]/10 transition-all group/refresh",
              isPending ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            )}
            title="Update Matrix"
          >
            <RefreshCcw className={cn("h-4 w-4 text-[#00f2ff] transition-transform duration-700", isPending ? "animate-spin" : "group-hover/refresh:rotate-180")} />
          </button>
        </div>

        {/* Categorical Diagnostics */}
        <MultiSelect 
            label="Department" 
            options={data?.filter_options?.departments || []} 
            selectedIds={filters.dept_ids} 
            onChange={(ids) => updateFilter('dept_ids', ids)}
            placeholder="All Depts"
            icon={Building2}
        />
        <MultiSelect 
            label="Module (Scope)" 
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
            placeholder="All Categories"
            icon={Tag}
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
            label="Status" 
            options={(data?.filter_options?.statuses || []).map(s => ({ id: s, name: s.toUpperCase() }))} 
            selectedIds={filters.statuses} 
            onChange={(ids) => updateFilter('statuses', ids)}
            placeholder="All Status"
            icon={Activity}
        />
        
        {/* Global Reset */}
        <button 
          onClick={clearAllFilters}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-[0.2em] rounded-lg hover:bg-red-500/10 transition-all group h-[42px]"
        >
          <X className="h-3 w-3 group-hover:rotate-90 transition-transform" />
          Clear Matrix
        </button>
      </div>

      <main className={cn(
        "flex-1 px-4 md:px-6 flex flex-col gap-8 transition-opacity duration-300",
        isPending ? "opacity-50 pointer-events-none" : "opacity-100"
      )}>
        {/* ROW 1: CORE TELEMETRY */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Column A: Key Metrics */}
          <section className="flex flex-col gap-6 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-[#20233d] rounded-lg border border-[#2d314d] p-5 flex flex-col min-h-[250px] group shadow-lg">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em]">Resolution Parity</span>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
                  <span>{data?.total_tickets} Raised</span>
                  <div className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[#4ade80]">{(data?.status_distribution?.resolved ?? 0) + (data?.status_distribution?.closed ?? 0)} Solved</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <GaugeChart 
                  values={[{ value: resPerc, label: "Efficiency", fill: "#a855f7" }]} 
                  label="Resolution Matrix" 
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              <div className="p-5 bg-[#20233d] rounded-lg border border-[#2d314d] hover:border-[#3b82f6]/30 transition-all duration-300 shadow-md">
                <MiniPerformanceChart 
                  title="Yearwise raised VS resolved" 
                  data={(data?.yearwise_performance || []).map(y => ({ label: y.year, raised: y.raised, resolved: y.resolved }))}
                />
              </div>
              <div className="p-5 bg-[#20233d] rounded-lg border border-[#2d314d] hover:border-[#10b981]/30 transition-all duration-300 shadow-md">
                <MiniPerformanceChart 
                  title="Actual Year Progress (Status)" 
                  data={(data?.monthwise_performance || []).map(m => ({ label: m.month, raised: m.raised, resolved: m.resolved }))}
                />
              </div>
              <div className="min-h-[120px]">
                <AlertCard title="Unassigned Priority" value={data?.unassigned_count ?? 0} subTitle="Action Requested" />
              </div>
            </div>
          </section>

          {/* Column B: Volume & Solvers */}
          <section className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex-1 min-h-[300px]">
              <Leaderboard 
                title="Dept Performance Node" 
                items={deptComparison} 
                accentColor="#4ade80"
              />
            </div>
            <div className="bg-[#20233d] rounded-lg border border-[#2d314d] p-5 h-[280px] flex flex-col group overflow-hidden shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em]">Ticket Volume Analysis</span>
                <span className="text-[10px] font-bold text-[#00f2ff] uppercase tracking-widest bg-[#00f2ff]/10 px-2 py-0.5 rounded">30D</span>
              </div>
              <VolumeChart data={data?.volume_trend ?? []} />
            </div>
          </section>

          {/* Column C: Dynamic Backlog */}
          <section className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-900">
            <div className="bg-[#20233d] rounded-lg border border-[#2d314d] p-6 h-full flex flex-col min-h-[500px] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em]">Queue Pulse</span>
                  <h3 className="text-xl font-bold tracking-tight text-white/90">Workload Breakdown</h3>
                </div>
                <div className={cn(
                  "h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]",
                  isPending ? "text-[#fde047] animate-spin" : "text-[#4ade80] shadow-[0_0_10px_#4ade80]"
                )} />
              </div>
              
              <div className="flex-1 flex flex-col gap-8 overflow-y-auto pr-2 no-scrollbar">
                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-[#00f2ff]/60 uppercase tracking-widest border-l-2 border-[#00f2ff] pl-2">Statuswide Intel</span>
                  <StatusBarList data={statusMetrics} />
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest border-l-2 border-amber-500/50 pl-2">Datewise Refresh</span>
                  <StatusBarList data={updateMetrics} />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2d314d] flex items-center justify-between opacity-40">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#00f2ff]">
                  Total Nodes: {data?.total_tickets}
                </div>
              </div>
            </div>
          </section>

          {/* Column D: Quality Assurance */}
          <section className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-[#20233d] rounded-lg border border-[#2d314d] p-5 h-1/2 flex flex-col items-center justify-center shadow-xl">
              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em] self-start mb-4">CSAT Distribution</span>
              <div className="flex flex-col gap-4 w-full">
                <GaugeChart 
                  values={[{ value: data?.active_load_perc ?? 0, label: "Active Nodes", fill: "#f97316" }]} 
                  label="Backlog HUD"
                />
                <div className="flex justify-between px-4 opacity-70">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748b]">Total Workload Scope</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#00f2ff]">{data?.active_load ?? 0} Active Nodes</span>
                </div>
              </div>
            </div>
            <div className="bg-[#20233d] rounded-lg border border-[#2d314d] p-5 h-1/2 flex flex-col items-center justify-center shadow-xl">
              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em] self-start mb-4">Resolution Efficiency HUB</span>
              <GaugeChart 
                values={[
                  { value: resPerc, label: "Resolved", fill: "#4ade80" },
                  { value: data?.active_load_perc ?? 0, label: "Pending", fill: "#00f2ff" }
                ]}
                label="Efficiency Matrix" 
                secondaryLabel={`${(data?.status_distribution?.resolved ?? 0) + (data?.status_distribution?.closed ?? 0)} SOLVED / ${data?.total_tickets ?? 0} RAISED`}
              />
            </div>
          </section>
        </div>

        {/* ROW 2: DETAILED DISTRIBUTIONS & TABULAR LIST */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-1000">
          <div className="flex flex-col gap-6">
            <DistributionChart title="Department Load Flow (Scopewise)" data={scopewiseData} />
            <DistributionChart title="Scope/Request Intel (Category)" data={categoryData} />
          </div>
          <div className="xl:col-span-2 min-h-[500px]">
            <AnalyticsTable data={tableData} />
          </div>
        </div>
      </main>

      {/* Manual Refresh Control */}
      <div className="fixed bottom-6 right-6 flex items-center gap-4 z-[400] print:hidden">
        <button 
          onClick={() => fetchStats()}
          disabled={isPending}
          className="flex items-center justify-center h-10 w-10 bg-[#2b2f4d]/90 backdrop-blur-sm border border-[#3c416e] rounded-full hover:border-[#00f2ff]/50 transition-all text-[#a5abbf] hover:text-[#00f2ff] shadow-2xl active:scale-90"
        >
          <RefreshCcw size={14} className={cn(isPending && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
