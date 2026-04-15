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

export function MetricRow({ myTickets, myPerformance, loading }: MetricRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 scale-in-95 duration-700">
      {/* My Tickets Table-like Grid */}
      <Card className="lg:col-span-6 rounded-[2rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
        <div className="p-8 pb-4 flex items-center justify-between border-b border-border/40 bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-[#4f46e5] flex items-center justify-center shadow-lg shadow-indigo-200">
                <Ticket className="h-5 w-5 text-white" />
             </div>
             <div>
                <h3 className="text-[12px] font-black uppercase text-slate-900 tracking-[0.2em]">Queue Registry</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Global Operational Volume</p>
             </div>
          </div>
          <div className="flex items-baseline gap-1.5 px-4 py-2 bg-white rounded-full border border-border/40 shadow-sm transition-transform hover:scale-105">
             <span className="text-[14px] font-black text-[#4f46e5] tracking-tight">{myTickets?.total || 0}</span>
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Tickets</span>
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
             <TicketMetric label="Operational Hub" value={myTickets?.other || 0} totalValue={myTickets?.total || 1} color="indigo" />
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics Sparklines */}
      <Card className="lg:col-span-6 rounded-[2rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-x divide-border/40">
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
      </Card>
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
    indigo: "text-[#4f46e5] bg-white hover:bg-[#4f46e5]/5 border-border/40 fill-[#4f46e5]",
    blue: "text-[#2563eb] bg-white hover:bg-[#2563eb]/5 border-border/40 fill-[#2563eb]",
    cyan: "text-[#0891b2] bg-white hover:bg-[#0891b2]/5 border-border/40 fill-[#0891b2]",
    violet: "text-[#7c3aed] bg-white hover:bg-[#7c3aed]/5 border-border/40 fill-[#7c3aed]",
    emerald: "text-[#10b981] bg-white hover:bg-[#10b981]/5 border-border/40 fill-[#10b981]",
    amber: "text-[#f59e0b] bg-white hover:bg-[#f59e0b]/5 border-border/40 fill-[#f59e0b]",
    rose: "text-[#e11d48] bg-white hover:bg-[#e11d48]/5 border-border/40 fill-[#e11d48]",
    slate: "text-slate-600 bg-white hover:bg-slate-50 border-border/40 fill-slate-400"
  };

  const percentage = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

  return (
    <div className={cn(
      "p-6 transition-all cursor-default flex flex-col justify-center", 
      colors[color],
      borderRight && "border-r border-border/40",
      borderBottom && "border-b border-border/40"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] opacity-50 leading-tight truncate">{label}</span>
        {pulse && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-black tracking-tighter drop-shadow-sm">{value}</span>
        <span className="text-[9px] font-black opacity-30 mt-auto mb-1.5">{percentage}%</span>
      </div>
      <div className="mt-3 w-full h-[3px] bg-slate-100 rounded-full overflow-hidden">
         <div 
           className={cn("h-full transition-all duration-1000", colors[color].split(" ")[0].replace("text-", "bg-"))} 
           style={{ width: `${percentage}%` }} 
         />
      </div>
    </div>
  );
}

function SparklineMetric({ data, color, icon: Icon }: { data?: any, color: string, icon: any }) {
  if (!data) return null;

  return (
    <div className="p-8 group/spark relative overflow-hidden h-full flex flex-col justify-between">
      <div className="flex justify-between items-start z-10 relative">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-transform group-hover/spark:-translate-y-1">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1">{data.label}</p>
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{data.value}</h4>
          </div>
        </div>
        <div className={cn("flex items-center gap-1 font-bold text-[10px] uppercase", data.trend > 0 ? "text-emerald-500" : "text-rose-500")}>
          {data.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(data.trend)}%
        </div>
      </div>

      <div className="h-24 w-full mt-6 absolute bottom-0 left-0 right-0 group-hover/spark:opacity-100 opacity-80 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.sparklineData}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="100%">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={3}
              fillOpacity={1} 
              fill={`url(#gradient-${color})`} 
              isAnimationActive={true}
              animationDuration={1500}
            >
               <LabelList dataKey="value" position="top" fill={color} fontSize={7} fontWeight={900} offset={10} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
