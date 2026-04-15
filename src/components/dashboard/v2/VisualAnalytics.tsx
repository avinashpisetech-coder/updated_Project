"use client";

import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Activity, 
  Users, 
  MessageSquare, 
  TrendingUp,
  LayoutGrid
} from "lucide-react";
import { ChartDataPoint, GroupDataPoint, FeedbackData } from "./types";
import { cn } from "@/lib/utils";

interface VisualAnalyticsProps {
  openOverview: ChartDataPoint[];
  monthwisePerformance: ChartDataPoint[];
  yearwisePerformance: ChartDataPoint[];
  groupData: GroupDataPoint[];
  feedback: FeedbackData;
  loading?: boolean;
}

const COLORS = [
  "#4f46e5", // Indigo Deep
  "#10b981", // Emerald Signal
  "#8b5cf6", // Modern Violet
  "#f59e0b", // Sunset Amber
  "#06b6d4", // Cyber Cyan
  "#e11d48"  // Crimson Slate
];
const FEEDBACK_COLORS = ["#10b981", "#ef4444"];

export function VisualAnalytics({ openOverview, monthwisePerformance, yearwisePerformance, groupData, feedback, loading }: VisualAnalyticsProps) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Open Tickets Overview - Stacked Bar Chart */}
        <Card className="lg:col-span-8 rounded-[3rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
          <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-border/40">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                   <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                   <CardTitle className="text-[12px] font-black uppercase text-slate-900 tracking-[0.2em]">Open Tickets Matrix (10D)</CardTitle>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">analytical trend</p>
                </div>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                <TrendingUp className="h-3 w-3 animate-pulse" />
                Status Parity
             </div>
          </CardHeader>
          <CardContent className="p-8 h-[380px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={openOverview} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={{ stroke: '#cbd5e1' }} 
                      tickLine={{ stroke: '#cbd5e1' }} 
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} 
                     dy={10}
                   />
                   <YAxis 
                     axisLine={{ stroke: '#cbd5e1' }} 
                      tickLine={{ stroke: '#cbd5e1' }} 
                     tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                   />
                   <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '10px' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar dataKey="Open" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]}>
                      <LabelList dataKey="Open" position="center" fill="#ffffff" fontSize={9} fontWeight={900} />
                   </Bar>
                   <Bar dataKey="New" stackId="a" fill="#10b981" radius={[12, 12, 0, 0]}>
                      <LabelList dataKey="New" position="top" fill="#10b981" fontSize={9} fontWeight={900} />
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Side Column: Groups */}
        <div className="lg:col-span-4 flex flex-col gap-8">
           {/* Horizontal Bar Chart: Tickets by Group */}
           <Card className="flex-1 rounded-[2.5rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
              <CardHeader className="p-8 border-b border-border/40 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                       <LayoutGrid className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Capacity</CardTitle>
                 </div>
                 <Users className="h-4 w-4 text-slate-300" />
              </CardHeader>
              <CardContent className="p-6 h-[500px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupData} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 10 }}>
                       <XAxis type="number" axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} />
                       <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickLine={{ stroke: '#cbd5e1' }} 
                          width={100}
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                       />
                       <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '10px' }}
                       />
                       <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20}>
                          <LabelList dataKey="count" position="right" fill="#64748b" fontSize={10} fontWeight={900} />
                          {groupData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* New Row: Monthly & Yearly Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthwise Chart */}
          <Card className="rounded-[3rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
            <CardHeader className="p-6 border-b border-border/40">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                     <Activity className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                     <CardTitle className="text-[12px] font-black uppercase text-slate-900 tracking-[0.2em]">Monthwise Evolution</CardTitle>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">longitudinal data</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthwisePerformance} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={{ stroke: '#cbd5e1' }} 
                       tick={{ fill: "#64748b", fontSize: 9, fontWeight: 900 }} 
                     />
                     <YAxis axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: "#64748b", fontSize: 9, fontWeight: 900 }} />
                     <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 700, fontSize: '10px' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                     <Bar dataKey="Raised" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                     <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Yearwise Chart */}
          <Card className="rounded-[3rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden group">
            <CardHeader className="p-6 border-b border-border/40">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                     <Activity className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                     <CardTitle className="text-[12px] font-black uppercase text-slate-900 tracking-[0.2em]">Yearly Core Progress</CardTitle>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">historical parity</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearwisePerformance} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={{ stroke: '#cbd5e1' }} 
                       tick={{ fill: "#64748b", fontSize: 9, fontWeight: 900 }} 
                     />
                     <YAxis axisLine={{ stroke: '#cbd5e1' }} tick={{ fill: "#64748b", fontSize: 9, fontWeight: 900 }} />
                     <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 700, fontSize: '10px' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
                     <Bar dataKey="Raised" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                     <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>

      {/* Customer Feedback Row */}
      <Card className="rounded-[3rem] border border-border/40 bg-white shadow-xl hover:shadow-2xl transition-all overflow-hidden group w-full">
          <CardHeader className="p-8 border-b border-border/40 flex flex-row items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                   <MessageSquare className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                   <CardTitle className="text-[12px] font-black uppercase text-slate-900 tracking-[0.2em]">Integrity Hub</CardTitle>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">quality assurance</p>
                </div>
             </div>
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{feedback.positive}% Positive</span>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="text-[12px] font-black text-slate-900">NET PARITY: 92%</div>
             </div>
          </CardHeader>
          <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {(feedback.categoryDistribution || []).map((cat, idx) => {
                     const percentage = cat.resolvedPercentage || 0;
                     return (
                         <div key={idx} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:shadow-lg hover:border-indigo-100 group/item">
                             <div className="flex justify-between items-start mb-4">
                                 <div>
                                     <h4 className="text-[14px] font-black uppercase text-slate-900 tracking-tight leading-none mb-1 group-hover/item:text-indigo-600 transition-colors">{cat.name || 'Uncategorised'}</h4>
                                     <div className="flex items-center gap-2">
                                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{cat.raised} Signals</span>
                                         <div className="h-1 w-1 rounded-full bg-slate-300" />
                                         <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">{cat.resolved} Solved</span>
                                     </div>
                                 </div>
                                 <div className={cn(
                                     "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase",
                                     percentage >= 90 ? "bg-emerald-500 text-white" : percentage >= 70 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                                 )}>
                                     {percentage}%
                                 </div>
                             </div>
                             <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                 <div 
                                     className={cn(
                                         "h-full transition-all duration-1000",
                                         percentage >= 90 ? "bg-emerald-500" : percentage >= 70 ? "bg-amber-500" : "bg-rose-500"
                                     )}
                                     style={{ width: `${percentage}%` }}
                                 />
                             </div>
                         </div>
                     );
                 })}
              </div>
          </CardContent>
      </Card>
    </div>
  );
}

