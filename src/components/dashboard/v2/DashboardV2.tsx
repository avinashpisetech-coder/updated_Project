"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDashboardDataV2 } from "@/hooks/useDashboardData";
import { ExecutiveFilters } from "./ExecutiveFilters";
import { MetricRow } from "./MetricRow";
import { VisualAnalytics } from "./VisualAnalytics";
import { TicketTable } from "./TicketTable";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Layout, RefreshCcw, Home, Package } from "lucide-react";
import Link from "next/link";

export function DashboardV2({ initialData }: { initialData: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentVersion = searchParams.get("version") || "v2";

  const handleVersionChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("version", v);
    router.push(`${pathname}?${params.toString()}`);
  };

  const deptId = searchParams.get("dept") || null;
  const moduleId = searchParams.get("module") || null;
  const categoryId = searchParams.get("category") || null;
  const userId = searchParams.get("agent") || null;
  const status = searchParams.get("status") || null;
  const start = searchParams.get("start") || null;
  const end = searchParams.get("end") || null;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 10;

  const filters = useMemo(() => ({
    deptId,
    moduleId,
    categoryId,
    userId,
    status,
    start,
    end
  }), [deptId, moduleId, categoryId, userId, status, start, end]);

  const { data: dashboardData, loading, error, refetch } = useDashboardDataV2(filters, page, pageSize);
  
  const data = dashboardData || initialData;

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-destructive/20 shadow-xl">
        <h2 className="text-xl font-bold text-destructive">Data Error</h2>
        <p className="text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-1000 bg-[#F9FAFB] min-h-screen p-4 md:p-6 space-y-6 font-sans">
      {/* Streamlined Header Container */}
      <div className="flex flex-col gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        {/* Top Row: Title & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-10 w-1 flex flex-col gap-1">
               <div className="flex-1 w-full bg-primary rounded-full" />
               <div className="h-2 w-full bg-primary/20 rounded-full" />
            </div>
            <div>
               <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1 shadow-sm shadow-slate-100">EXECUTIVE DASHBOARD</h1>
               <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Operational Pulse</span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full tracking-widest">V2.1_CORE</span>
               </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
             {/* Version Toggle */}
             <div className="flex items-center bg-white p-1 rounded-xl border border-slate-100">
                <button 
                  onClick={() => handleVersionChange("v1")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    currentVersion === "v1" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  v1
                </button>
                <button 
                  onClick={() => handleVersionChange("v2")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    currentVersion === "v2" ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  v2
                </button>
             </div>

             <div className="h-5 w-px bg-slate-200 mx-0.5" />

             {/* Live Status Badge */}
             <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest">Live Telemetry</span>
             </div>

             <div className="h-5 w-px bg-slate-200 mx-0.5" />

             {/* Actions */}
             <div className="flex items-center gap-2">
                <button 
                  onClick={refetch}
                  disabled={loading}
                  className="flex items-center gap-2 h-9 w-9 justify-center rounded-xl bg-white border border-slate-200 hover:border-primary hover:text-primary transition-all group/ref"
                >
                   <RefreshCcw className={cn("h-4 w-4 text-slate-400 group-hover/ref:text-primary transition-all", loading && "animate-spin")} />
                </button>
                 <Link 
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 border border-slate-200 hover:border-primary hover:text-primary transition-all group/home"
                >
                   <Home size={14} className="text-slate-500 group-hover/home:text-primary transition-colors" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 group-hover/home:text-primary">Home</span>
                </Link>
                 <Link 
                  href="/assets"
                  className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 border border-slate-200 hover:border-primary hover:text-primary transition-all group/asset"
                >
                   <Package size={14} className="text-slate-500 group-hover/asset:text-primary transition-colors" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 group-hover/asset:text-primary">Assets</span>
                </Link>
                <Link 
                  href="/tickets"
                  className="flex items-center gap-2 px-4 h-9 rounded-xl bg-slate-100 border border-slate-200 hover:border-primary hover:text-primary transition-all group/app"
                >
                   <Layout size={14} className="text-slate-500 group-hover/app:text-primary transition-colors" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 group-hover/app:text-primary">App Hub</span>
                </Link>
             </div>
          </div>
        </div>

        <ExecutiveFilters 
          filterOptions={data?.filterOptions || { 
             departments: [], 
               modules: [], 
               categories: [], 
               users: [], 
               statuses: [] 
          }} 
        />
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-8">
          <MetricRow 
            myTickets={data?.myTickets} 
            myPerformance={data?.myPerformance} 
            loading={loading}
          />
          
          <VisualAnalytics 
            openOverview={data?.openTicketsOverview || []} 
            monthwisePerformance={data?.monthwisePerformance || []}
            yearwisePerformance={data?.yearwisePerformance || []}
            groupData={data?.ticketsByGroup || []}
            feedback={data?.customerFeedback || { positive: 0, negative: 0, categoryDistribution: [] }}
            loading={loading}
          />
          
          <TicketTable 
            tickets={data?.recentTickets?.data || []} 
            totalCount={data?.recentTickets?.totalCount || 0}
            page={page}
            pageSize={pageSize}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-[2rem] bg-white shadow-sm" />
        <Skeleton className="h-64 rounded-[2rem] bg-white shadow-sm" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Skeleton className="lg:col-span-8 h-[500px] rounded-[3rem] bg-white shadow-sm" />
        <Skeleton className="lg:col-span-4 h-[500px] rounded-[3rem] bg-white shadow-sm" />
      </div>
      <Skeleton className="h-[600px] rounded-[4rem] bg-white shadow-sm" />
    </div>
  );
}
