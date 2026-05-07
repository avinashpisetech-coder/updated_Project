"use client";

import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  LabelList
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Ticket, 
  Clock, 
  Target,
  Zap
} from "lucide-react";
import { DashboardV2Data } from "./types";
import { cn } from "@/lib/utils";

interface MetricRowProps {
  myTickets?: DashboardV2Data["myTickets"];
  myPerformance?: DashboardV2Data["myPerformance"];
  loading?: boolean;
}

import { motion } from "framer-motion";

export function MetricRow({ myTickets, myPerformance, loading }: MetricRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* My Tickets Bento Card */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="lg:col-span-6 rounded-[2.5rem] border border-white bg-white/60 backdrop-blur-xl shadow-2xl shadow-indigo-100/50 hover:shadow-indigo-200/50 transition-all group overflow-hidden"
      >
        <div className="p-8 pb-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-[1.25rem] bg-[#4f46e5] flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
                <Ticket className="h-6 w-6 text-white" />
             </div>
             <div>
                <h3 className="text-[14px] font-black uppercase text-slate-900 tracking-[0.25em]">Queue Metrics</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Operational State</p>
             </div>
          </div>
          <div className="flex items-baseline gap-2 px-5 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
             <span className="text-[18px] font-black text-[#4f46e5] tracking-tight">{myTickets?.total || 0}</span>
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Total</span>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4">
             <TicketMetric label="New Signal" value={myTickets?.new || 0} totalValue={myTickets?.total || 1} color="blue" borderRight borderBottom pulse />
             <TicketMetric label="Assigned" value={myTickets?.assigned || 0} totalValue={myTickets?.total || 1} color="cyan" borderRight borderBottom />
             <TicketMetric label="In Progress" value={myTickets?.in_progress || 0} totalValue={myTickets?.total || 1} color="violet" borderRight borderBottom />
             <TicketMetric label="Pending Sync" value={myTickets?.pending || 0} totalValue={myTickets?.total || 1} color="amber" borderBottom />
             
             <TicketMetric label="Waiting User" value={myTickets?.pending_user || 0} totalValue={myTickets?.total || 1} color="rose" borderRight />
             <TicketMetric label="Resolved Hub" value={myTickets?.resolved || 0} totalValue={myTickets?.total || 1} color="emerald" borderRight />
             <TicketMetric label="Closed Archive" value={myTickets?.closed || 0} totalValue={myTickets?.total || 1} color="slate" borderRight />
             <TicketMetric label="Operational" value={myTickets?.other || 0} totalValue={myTickets?.total || 1} color="indigo" />
          </div>
        </CardContent>
      </motion.div>

      {/* Performance Analytics Bento Card */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="lg:col-span-6 rounded-[2.5rem] border border-white bg-white/60 backdrop-blur-xl shadow-2xl shadow-emerald-100/50 hover:shadow-emerald-200/50 transition-all group overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-slate-100">
           <SparklineMetric 
             data={myPerformance?.resolutionRate} 
             color="#4f46e5" 
             icon={Zap} 
           />
           <SparklineMetric 
             data={myPerformance?.pendingDelta} 
             color="#10b981" 
             icon={Target} 
           />
        </div>
      </motion.div>
    </div>
  );
}

function TicketMetric({ 
  label, 
  value, 
  totalValue,
  color, 
  pulse, 
  borderRight, 
  borderBottom 
}: { 
  label: string; 
  value: number; 
  totalValue: number;
  color: string; 
  pulse?: boolean; 
  borderRight?: boolean; 
  borderBottom?: boolean; 
}) {
   const colors: Record<string, string> = {
    indigo: "text-[#4f46e5] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#4f46e5]",
    blue: "text-[#2563eb] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#2563eb]",
    cyan: "text-[#0891b2] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#0891b2]",
    violet: "text-[#7c3aed] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#7c3aed]",
    emerald: "text-[#10b981] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#10b981]",
    amber: "text-[#f59e0b] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#f59e0b]",
    rose: "text-[#e11d48] bg-white/20 hover:bg-white/40 border-slate-100 fill-[#e11d48]",
    slate: "text-slate-600 bg-white/20 hover:bg-white/40 border-slate-100 fill-slate-400"
  };

  const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

  return (
    <div className={cn(
      "p-8 transition-all cursor-default flex flex-col justify-center relative group/metric", 
      colors[color],
      borderRight && "border-r border-slate-100",
      borderBottom && "border-b border-slate-100"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 leading-tight truncate">{label}</span>
        {pulse && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black tracking-tighter drop-shadow-md group-hover/metric:scale-110 transition-transform origin-left">{value}</span>
        <span className="text-[10px] font-black opacity-30 mb-2">{percentage}%</span>
      </div>
      <div className="mt-5 w-full h-[4px] bg-slate-100/50 rounded-full overflow-hidden">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${percentage}%` }}
           transition={{ duration: 1.5, ease: "circOut" }}
           className={cn("h-full", colors[color].split(" ")[0].replace("text-", "bg-"))} 
         />
      </div>
    </div>
  );
}

function SparklineMetric({ data, color, icon: Icon }: { data?: any, color: string, icon: any }) {
  if (!data) return null;

  return (
    <div className="p-10 group/spark relative overflow-hidden h-full flex flex-col justify-between">
      <div className="flex justify-between items-start z-10 relative">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[1.25rem] bg-white border border-slate-100 flex items-center justify-center shadow-lg group-hover/spark:-translate-y-1 transition-transform">
            <Icon className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em] leading-none mb-1.5">{data.label}</p>
            <h4 className="text-4xl font-black text-slate-900 tracking-tighter drop-shadow-md">{data.value}</h4>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 font-black text-[11px] uppercase px-2.5 py-1 rounded-full bg-white border border-slate-100 shadow-sm", data.trend > 0 ? "text-emerald-500" : "text-rose-500")}>
          {data.trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(data.trend)}%
        </div>
      </div>

      <div className="h-32 w-full mt-8 absolute bottom-0 left-0 right-0 group-hover/spark:opacity-100 opacity-60 transition-all duration-700">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.sparklineData}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="100%">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={4}
              fillOpacity={1} 
              fill={`url(#gradient-${color})`} 
              isAnimationActive={true}
              animationDuration={2000}
            >
               <LabelList dataKey="value" position="top" fill={color} fontSize={8} fontWeight={900} offset={12} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
