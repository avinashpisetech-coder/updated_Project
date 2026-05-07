"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { RefreshCcw, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardDataV2 } from "@/hooks/useDashboardData";
import { MetricRow } from "./MetricRow";
import { VisualAnalytics } from "./VisualAnalytics";
import { TicketTable } from "./TicketTable";
import { ExecutiveFilters } from "./ExecutiveFilters";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1, 
    transition: { 
      type: "spring" as const, 
      stiffness: 100 
    } 
  }
};

export function DashboardV2({ initialData, _myTasks }: { initialData: any, _myTasks?: any[] }) {
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
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8 font-sans selection:bg-primary/20">
      {/* Premium Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col gap-6 bg-white/70 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-16 w-1 flex flex-col gap-1.5">
               <div className="flex-1 w-full bg-primary rounded-full shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
               <div className="h-4 w-full bg-primary/20 rounded-full" />
            </div>
            <div>
               <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">EXECUTIVE HUB</h1>
               <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Telemetry</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full tracking-widest border border-primary/20">V2.2_STABLE</span>
               </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-100/50 p-2 rounded-[1.5rem] border border-slate-200/50 shadow-inner">
             <div className="flex items-center bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                <button 
                  onClick={() => handleVersionChange("v1")}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    currentVersion === "v1" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Legacy
                </button>
                <button 
                  onClick={() => handleVersionChange("v2")}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    currentVersion === "v2" ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Modern
                </button>
             </div>

             <div className="h-6 w-px bg-slate-200 mx-1" />

             <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Live Sync</span>
             </div>

             <div className="h-6 w-px bg-slate-200 mx-1" />

             <div className="flex items-center gap-2">
                <button 
                  onClick={refetch}
                  disabled={loading}
                  className="flex items-center gap-2 h-10 w-10 justify-center rounded-xl bg-white border border-slate-200 hover:border-primary hover:text-primary transition-all group/ref shadow-sm active:scale-95"
                >
                   <RefreshCcw className={cn("h-4 w-4 text-slate-400 group-hover/ref:text-primary transition-all", loading && "animate-spin")} />
                </button>
                  <Link 
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-5 h-10 rounded-xl bg-white border border-slate-200 hover:border-primary hover:text-primary transition-all group/home shadow-sm active:scale-95"
                >
                   <Home size={15} className="text-slate-500 group-hover/home:text-primary transition-colors" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 group-hover/home:text-primary">Home</span>
                </Link>
             </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
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
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && !data ? (
          <DashboardSkeleton key="skeleton" />
        ) : (
          <motion.div 
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-10"
          >
            <motion.div variants={itemVariants}>
              <MetricRow 
                myTickets={data?.myTickets} 
                myPerformance={data?.myPerformance} 
                loading={loading}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <VisualAnalytics 
                openOverview={data?.openTicketsOverview || []} 
                monthwisePerformance={data?.monthwisePerformance || []}
                yearwisePerformance={data?.yearwisePerformance || []}
                groupData={data?.ticketsByGroup || []}
                feedback={data?.customerFeedback || { positive: 0, negative: 0, categoryDistribution: [] }}
                loading={loading}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <TicketTable 
                tickets={data?.recentTickets?.data || []} 
                totalCount={data?.recentTickets?.totalCount || 0}
                page={page}
                pageSize={pageSize}
                loading={loading}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-72 rounded-[3rem] bg-white shadow-sm" />
        <Skeleton className="h-72 rounded-[3rem] bg-white shadow-sm" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <Skeleton className="lg:col-span-8 h-[550px] rounded-[3.5rem] bg-white shadow-sm" />
        <Skeleton className="lg:col-span-4 h-[550px] rounded-[3.5rem] bg-white shadow-sm" />
      </div>
      <Skeleton className="h-[700px] rounded-[4rem] bg-white shadow-sm" />
    </div>
  );
}

