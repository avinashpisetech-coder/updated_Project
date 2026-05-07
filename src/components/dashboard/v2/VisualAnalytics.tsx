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

import { motion } from "framer-motion";

export function VisualAnalytics({ openOverview, monthwisePerformance, yearwisePerformance, groupData, feedback, loading }: VisualAnalyticsProps) {
  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Open Tickets Overview Bento */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="lg:col-span-8 rounded-[3.5rem] border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 hover:shadow-indigo-200/30 transition-all overflow-hidden group"
        >
          <CardHeader className="p-10 flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/30">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Activity className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                   <CardTitle className="text-[14px] font-black uppercase text-slate-900 tracking-[0.25em]">Response Matrix</CardTitle>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">10-Day Analytical Pulse</p>
                </div>
             </div>
             <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm text-[10px] font-black text-slate-600 uppercase tracking-widest">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                Active Capacity
             </div>
          </CardHeader>
          <CardContent className="p-10 h-[420px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={openOverview} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                   <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                         <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} 
                     dy={15}
                   />
                   <YAxis 
                     axisLine={false} 
                      tickLine={false} 
                     tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                   />
                   <Tooltip 
                     cursor={{ fill: '#f8fafc', radius: 10 }}
                     contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 800, fontSize: '11px', padding: '15px' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar dataKey="Open" stackId="a" fill="url(#barGradient)" radius={[0, 0, 0, 0]}>
                      <LabelList dataKey="Open" position="center" fill="#ffffff" fontSize={10} fontWeight={900} />
                   </Bar>
                   <Bar dataKey="New" stackId="a" fill="#10b981" radius={[15, 15, 0, 0]}>
                      <LabelList dataKey="New" position="top" fill="#10b981" fontSize={10} fontWeight={900} />
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </motion.div>

        {/* Side Column: Groups Bento */}
        <div className="lg:col-span-4 flex flex-col gap-10">
           <motion.div 
             whileHover={{ y: -5 }}
             className="flex-1 rounded-[3.5rem] border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 hover:shadow-emerald-200/30 transition-all overflow-hidden group"
           >
              <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-row items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                       <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    </div>
                    <CardTitle className="text-[13px] font-black uppercase text-slate-900 tracking-[0.25em]">Load Distribution</CardTitle>
                 </div>
                 <Users className="h-5 w-5 text-slate-300" />
              </CardHeader>
              <CardContent className="p-8 h-[550px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupData} layout="vertical" margin={{ left: 10, right: 50, top: 0, bottom: 10 }}>
                       <XAxis type="number" hide />
                       <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false}
                          tickLine={false} 
                          width={110}
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }}
                       />
                       <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '11px' }}
                       />
                       <Bar dataKey="count" fill="#6366f1" radius={[0, 15, 15, 0]} barSize={25}>
                          <LabelList dataKey="count" position="right" fill="#64748b" fontSize={11} fontWeight={900} offset={15} />
                          {groupData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </CardContent>
           </motion.div>
        </div>
      </div>

      {/* Row: Historical Evolution Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <motion.div 
            whileHover={{ y: -5 }}
            className="rounded-[3.5rem] border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 hover:shadow-amber-200/30 transition-all overflow-hidden group"
          >
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/30">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Activity className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                     <CardTitle className="text-[14px] font-black uppercase text-slate-900 tracking-[0.25em]">Monthly Dynamics</CardTitle>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">Long-Term Scalability</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthwisePerformance} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false}
                       tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} 
                       dy={10}
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} />
                     <Tooltip contentStyle={{ borderRadius: '1.25rem', border: 'none', fontWeight: 800, fontSize: '11px', padding: '15px' }} />
                     <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900 }} />
                     <Bar dataKey="Raised" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                     <Bar dataKey="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="rounded-[3.5rem] border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 hover:shadow-violet-200/30 transition-all overflow-hidden group"
          >
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/30">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Activity className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                     <CardTitle className="text-[14px] font-black uppercase text-slate-900 tracking-[0.25em]">Yearly Core Velocity</CardTitle>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">Historical Benchmark</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearwisePerformance} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false}
                       tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} 
                       dy={10}
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 900 }} />
                     <Tooltip contentStyle={{ borderRadius: '1.25rem', border: 'none', fontWeight: 800, fontSize: '11px', padding: '15px' }} />
                     <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900 }} />
                     <Bar dataKey="Raised" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                     <Bar dataKey="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </motion.div>
      </div>

      {/* Customer Feedback Bento */}
      <motion.div 
        whileHover={{ y: -5 }}
        className="rounded-[4rem] border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-rose-100/50 hover:shadow-rose-200/50 transition-all overflow-hidden group w-full"
      >
          <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-row items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center group-hover:rotate-12 transition-transform">
                   <MessageSquare className="h-7 w-7 text-rose-600" />
                </div>
                <div>
                   <CardTitle className="text-[16px] font-black uppercase text-slate-900 tracking-[0.3em]">Integrity Hub</CardTitle>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">Quality Assurance Ecosystem</p>
                </div>
             </div>
             <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                   <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   <span className="text-[12px] font-black text-slate-600 uppercase tracking-[0.15em]">{feedback.positive}% Positive Signals</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="px-6 py-2 bg-slate-900 text-white rounded-2xl text-[14px] font-black tracking-tight shadow-xl">NET CSAT: 92%</div>
             </div>
          </CardHeader>
          <CardContent className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {(feedback.categoryDistribution || []).map((cat, idx) => {
                     const percentage = cat.resolvedPercentage || 0;
                     return (
                         <motion.div 
                            key={idx} 
                            whileHover={{ scale: 1.02 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-indigo-200 group/item relative overflow-hidden"
                         >
                             <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-12 -mt-12" />
                             <div className="flex justify-between items-start mb-6 relative z-10">
                                 <div>
                                     <h4 className="text-[16px] font-black uppercase text-slate-900 tracking-tight leading-none mb-2 group-hover/item:text-indigo-600 transition-colors">{cat.name || 'Uncategorised'}</h4>
                                     <div className="flex items-center gap-2.5">
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{cat.raised} Volume</span>
                                         <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{cat.resolved} Solved</span>
                                     </div>
                                 </div>
                                 <div className={cn(
                                     "px-4 py-2 rounded-2xl text-[11px] font-black uppercase shadow-lg shadow-current/10",
                                     percentage >= 90 ? "bg-emerald-500 text-white" : percentage >= 70 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                                 )}>
                                     {percentage}%
                                 </div>
                             </div>
                             <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative z-10 shadow-inner">
                                 <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: `${percentage}%` }}
                                     transition={{ duration: 2, ease: "circOut" }}
                                     className={cn(
                                         "h-full",
                                         percentage >= 90 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : percentage >= 70 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                                     )}
                                 />
                             </div>
                         </motion.div>
                     );
                 })}
              </div>
          </CardContent>
      </motion.div>
    </div>
  );
}

