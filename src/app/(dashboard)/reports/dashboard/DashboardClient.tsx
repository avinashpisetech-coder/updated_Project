"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  Fingerprint,
  Info,
  Activity,
  Layout,
  Home,
  Package
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  total_tickets: number;
  active_load: number;
  unassigned_count: number;
  csat_score: number;
  avg_response_min: number;
  avg_resolution_hours: number;
  priority_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  channel_distribution: Record<string, number>;
  category_distribution: Array<{ name: string; count: number }>;
  department_distribution: Array<{ name: string; count: number }>;
  user_distribution: Array<{ name: string; count: number }>;
  raised_vs_solved: { raised: number; solved: number };
  agent_workload: Array<{ 
    name: string; 
    total_assigned: number; 
    status_breakdown: Record<string, number> 
  }>;
  agent_intel: Array<{
    name: string;
    total_assigned: number;
    avg_rating: number;
    status_breakdown: Record<string, number>;
  }>;
  module_distribution: Array<{ name: string; count: number }>;
  sla_stats: {
    on_track: number;
    near_breach: number;
    breached: number;
  };
  volume_trend: Array<{ date: string; count: number }>;
  scope: string;
}

export default function DashboardClient({ 
  initialData,
  _myTasks
}: { 
  initialData: any;
  _myTasks?: any[];
}) {
  const [activeProtocol, setActiveProtocol] = useState<"alpha" | "beta" | "gamma" | "delta">("alpha");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentVersion = searchParams.get("version") || "v1";

  const handleVersionChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("version", v);
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = (Array.isArray(initialData) ? initialData[0] : initialData) as AnalyticsData;

  // Formatting helpers
  const AnimatedNumber = ({ value }: { value: number | string }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const target = typeof value === 'number' ? value : parseInt(value.toString().replace(/\D/g, '')) || 0;
    
    useEffect(() => {
      let start = 0;
      const duration = 1000;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        setDisplayValue(Math.floor(progress * target));
        if (progress < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    }, [target]);

    return <span>{typeof value === 'string' && value.includes('%') ? `${displayValue}%` : displayValue.toLocaleString()}</span>;
  };

  const Scanline = () => (
     <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] mix-blend-overlay">
        <div className="h-[2px] w-full bg-white animate-scanline mb-[4px]" />
     </div>
  );

  const formatSLA = (val: number) => {
    if (!data.total_tickets) return "0%";
    return `${Math.round((val / data.total_tickets) * 100)}%`;
  };

  const getSLAColor = (status: string) => {
    if (status === 'on_track') return 'text-emerald-500';
    if (status === 'near_breach') return 'text-amber-500';
    return 'text-destructive';
  };

  // Derived Intelligence Parity
  const raised_vs_solved = {
    raised: data.total_tickets || 0,
    solved: (data.status_distribution?.resolved || 0) + (data.status_distribution?.closed || 0)
  };

  const sla_parity = {
    on_track: Math.round(((data.status_distribution?.resolved || 0) / (data.total_tickets || 1)) * 100),
    breached: data.status_distribution?.escalated || 0
  };

  const TacticalCorner = () => (
    <>
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-3xl group-hover:border-primary/60 transition-colors" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/20 rounded-tr-3xl group-hover:border-primary/60 transition-colors" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/20 rounded-bl-3xl group-hover:border-primary/60 transition-colors" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/20 rounded-br-3xl group-hover:border-primary/60 transition-colors" />
    </>
  );

  const TacticalInfo = ({ title, value, detail, color = "primary" }: { title: string, value: string | number, detail: string, color?: string }) => (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all group/info">
       <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover/info:text-primary transition-colors">{title}</span>
          <Info className="h-3 w-3 text-white/10 group-hover/info:text-primary" />
       </div>
       <div className="flex items-end gap-2">
          <span className={cn("text-2xl font-black tabular-nums tracking-tighter", `text-${color}`)}>{value}</span>
          <span className="text-[8px] font-bold text-white/40 uppercase mb-1">{detail}</span>
       </div>
    </div>
  );

  const TacticalGauge = ({ value, label, sublabel, color = "cyan" }: { value: number, label: string, sublabel?: string, color?: string }) => {
    const strokeDash = 251.2; // 2 * PI * 40
    const offset = strokeDash - (value / 100) * strokeDash;
    const colorClasses: Record<string, string> = {
      cyan: "stroke-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]",
      emerald: "stroke-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]",
      amber: "stroke-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]",
      rose: "stroke-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]"
    };

    return (
      <div className="flex flex-col items-center gap-4 group/gauge relative">
        <div className="relative">
          <svg className="w-44 h-44 transform -rotate-90 overflow-visible">
            <circle cx="88" cy="88" r="40" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/[0.05]" />
            <circle 
              cx="88" cy="88" r="40" 
              stroke="currentColor" strokeWidth="12" fill="transparent" 
              strokeDasharray={strokeDash}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={cn("transition-all duration-1500 ease-out", colorClasses[color] || colorClasses.cyan)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-4xl font-black tabular-nums tracking-tighter block group-hover/gauge:scale-110 transition-transform">
              <AnimatedNumber value={value} />%
            </span>
            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-none mt-1">{label}</span>
          </div>
        </div>
        {sublabel && (
          <div className="px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 shadow-lg">
            <p className="text-[9px] font-black uppercase tracking-tighter text-white/60">{sublabel}</p>
          </div>
        )}
      </div>
    );
  };

  const renderAlpha = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Gauges (Tactical Precision) */}
        <Card className="lg:col-span-8 border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden group/gauge relative border-2 shadow-2xl">
          <Scanline />
          <TacticalCorner />
          <CardContent className="p-20 flex flex-col md:flex-row items-center justify-around gap-16">
             <div className="relative group/gauge-node">
                <TacticalGauge value={95} label="CSAT_SURVEY" sublabel="TARGET_THRESHOLD: 80%" color="emerald" />
                <div className="absolute -top-4 -right-4 h-8 w-8 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40 animate-pulse">
                   <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
             </div>
             <div className="h-32 w-[2px] bg-white/5 hidden md:block" />
             <div className="relative group/gauge-node">
                <TacticalGauge value={88} label="QA_PRECISION" sublabel="INTERNAL_AUDIT: 85%" color="cyan" />
                <div className="absolute -top-4 -right-4 h-8 w-8 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/40 animate-pulse">
                   <div className="h-2 w-2 rounded-full bg-cyan-500" />
                </div>
             </div>
             <div className="h-32 w-[2px] bg-white/5 hidden md:block" />
             <div className="space-y-12 text-center md:text-left">
                <div className="space-y-4">
                   <p className="text-[14px] font-black uppercase text-white/30 tracking-[0.4em]">ACTIVE_PULSE</p>
                   <h3 className="text-6xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">OPTIMIZED</h3>
                </div>
                <div className="space-y-4">
                   <p className="text-[14px] font-black uppercase text-white/30 tracking-[0.4em]">GLOBAL_PARITY</p>
                   <h3 className="text-6xl font-black text-cyan-400 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">NOMINAL</h3>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Right Column: Performance Signal (Intensity Focus) */}
        <Card className="lg:col-span-4 border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden relative group border-2 shadow-2xl">
           <TacticalCorner />
           <CardContent className="p-16 space-y-16 h-full flex flex-col justify-center">
              <div className="space-y-6 group/metric relative">
                 <div className="flex items-baseline gap-4">
                    <h2 className="text-[10rem] font-black tracking-tighter text-white leading-none group-hover/metric:text-primary transition-all duration-700 drop-shadow-2xl">18</h2>
                    <span className="text-5xl text-primary font-black uppercase tracking-tighter">m</span>
                 </div>
                 <p className="text-[14px] font-black uppercase text-white/40 tracking-[0.4em] border-l-8 border-primary/60 pl-8">AVG_FIRST_RESPONSE</p>
              </div>
              <div className="h-px w-full bg-white/5" />
              <div className="space-y-6 group/metric relative">
                 <div className="flex items-baseline gap-4">
                    <h2 className="text-[10rem] font-black tracking-tighter text-white leading-none group-hover/metric:text-primary transition-all duration-700 drop-shadow-2xl">1</h2>
                    <span className="text-5xl text-primary font-black uppercase tracking-tighter">h</span>
                 </div>
                 <p className="text-[14px] font-black uppercase text-white/40 tracking-[0.4em] border-l-8 border-primary/60 pl-8">AVG_FULL_RESOLUTION</p>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Top Solver Registry (Security Clearanced) */}
        <div className="lg:col-span-4">
          <Card className="border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden relative group h-full border-2 shadow-2xl">
            <Scanline />
            <TacticalCorner />
            <CardHeader className="p-16 pb-8">
               <CardTitle className="text-[16px] font-black uppercase tracking-[0.8em] text-white/20">TOP_SOLVERS_REGISTRY</CardTitle>
            </CardHeader>
            <CardContent className="p-16 pt-0">
               <div className="space-y-8">
                  {[
                    { name: 'ANDREW', count: 156 },
                    { name: 'ADAM', count: 142 },
                    { name: 'STEVE', count: 128 },
                    { name: 'SAM', count: 95 }
                  ].map((agent, i) => (
                    <div key={i} className="flex justify-between items-center group/row p-8 rounded-[2rem] hover:bg-white/5 transition-all border-2 border-transparent hover:border-white/10 shadow-lg">
                       <div className="flex items-center gap-8">
                          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-sm font-black text-primary border border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]">0{i+1}</div>
                          <span className="text-[18px] font-black uppercase tracking-tight text-white group-hover/row:text-primary transition-colors">{agent.name}</span>
                       </div>
                       <div className="text-right">
                          <span className="text-3xl font-black text-white tabular-nums drop-shadow-lg">{agent.count}</span>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">NODES_SOLVED</p>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Volume Trend (Oscilloscope Signal) */}
        <div className="lg:col-span-8">
           <Card className="border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden relative h-full border-2 shadow-2xl">
              <Scanline />
              <TacticalCorner />
              <CardHeader className="p-16 flex flex-row items-center justify-between">
                 <div className="space-y-2">
                    <CardTitle className="text-[16px] font-black uppercase tracking-[0.8em] text-white/20">VOLUME_TREND_ANALYSIS</CardTitle>
                    <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">REAL_TIME_OSCILLOSCOPE_SIGNAL</p>
                 </div>
                 <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-[12px] font-black text-primary uppercase tracking-[0.3em] shadow-lg">
                    <Activity className="w-4 h-4 animate-pulse" />
                    LIVE_FEED
                 </div>
              </CardHeader>
              <CardContent className="p-16 pt-0 h-[500px]">
                 <div className="absolute inset-x-16 top-40 bottom-16 opacity-10 pointer-events-none">
                    <div className="w-full h-full border-l-2 border-b-2 border-white/20" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
                 </div>
                 <svg className="w-full h-full relative z-10 overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                    <defs>
                       <linearGradient id="waveGradientAlpha" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                         <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                       </linearGradient>
                       <filter id="glowAlpha">
                          <feGaussianBlur stdDeviation="5" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                       </filter>
                    </defs>
                    <path
                      d="M 0,300 L 0,200 L 100,180 L 200,220 L 300,150 L 400,190 L 500,100 L 600,160 L 700,90 L 800,120 L 900,50 L 1000,100 L 1000,300 Z"
                      fill="url(#waveGradientAlpha)"
                    />
                    <path
                      d="M 0,200 L 100,180 L 200,220 L 300,150 L 400,190 L 500,100 L 600,160 L 700,90 L 800,120 L 900,50 L 1000,100"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glowAlpha)"
                    />
                 </svg>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );

  const renderBeta = () => (
    <div className="space-y-16 animate-in fade-in slide-in-from-right-12 duration-1500">
      {/* Circular Status Registry (High Glow Beads) */}
      <Card className="border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4rem] overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,0.8)] border-2">
         <TacticalCorner />
         <CardHeader className="p-16">
            <CardTitle className="text-[16px] font-black uppercase tracking-[1em] text-white/20">CIRCULAR_SEQUENTIAL_STATUS_PARITY</CardTitle>
         </CardHeader>
         <CardContent className="p-16 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-16">
            {[
              { label: 'ALL_NODES', count: 445, color: '#3b82f6', glow: 'shadow-blue-500/40' },
              { label: 'OPEN_SIGNAL', count: 45, color: '#ef4444', glow: 'shadow-rose-500/40' },
              { label: 'PENDING_SYNC', count: 15, color: '#f59e0b', glow: 'shadow-amber-500/40' },
              { label: 'RESOLVED_NET', count: 231, color: '#8b5cf6', glow: 'shadow-purple-500/40' },
              { label: 'ON_HOLD_BUF', count: 12, color: '#06b6d4', glow: 'shadow-cyan-500/40' },
              { label: 'CLOSED_FIN', count: 142, color: '#10b981', glow: 'shadow-emerald-500/40' }
            ].map((node, i) => (
              <div key={i} className="flex flex-col items-center gap-10 group/ring cursor-pointer">
                 <div className={cn("h-48 w-48 rounded-full border-[10px] border-white/5 flex items-center justify-center relative transition-all duration-700 group-hover/ring:scale-110", node.glow)}>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-110">
                       <circle cx="96" cy="96" r="88" fill="transparent" stroke={node.color} strokeWidth="10" strokeDasharray="552" strokeDashoffset={552 - 0.75 * 552} className="opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                    </svg>
                    <span className="text-6xl font-black tabular-nums tracking-tighter" style={{ color: node.color }}>{node.count}</span>
                    <div className="absolute -bottom-4 h-6 w-6 rounded-full animate-ping" style={{ backgroundColor: node.color }} />
                 </div>
                 <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white/30 group-hover/ring:text-white transition-colors mt-4">{node.label}</span>
              </div>
            ))}
         </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Success Parity Matrix - Format 2 (Strict Logic) */}
         <Card className="lg:col-span-8 border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4rem] overflow-hidden relative shadow-2xl border-2">
            <TacticalCorner />
            <CardHeader className="p-16 pb-8">
               <CardTitle className="text-[16px] font-black uppercase tracking-[0.8em] text-white/20">AGENT_SUCCESS_PARITY_MATRIX</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <table className="w-full">
                  <thead>
                     <tr className="bg-white/[0.03] border-y border-white/5">
                        <th className="p-12 text-[12px] font-black uppercase tracking-widest text-white/40 text-left pl-16">AGENT_ID_TAG</th>
                        <th className="p-12 text-[12px] font-black uppercase tracking-widest text-rose-500/80 text-center">FAILURE_RATE (%)</th>
                        <th className="p-12 text-[12px] font-black uppercase tracking-widest text-emerald-500 text-center">SUCCESS_PARITY (%)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {[
                       { name: 'ANDREW_A1', bad: 4, good: 96 },
                       { name: 'ADAM_B2', bad: 8, good: 92 },
                       { name: 'STEVE_C3', bad: 12, good: 88 },
                       { name: 'SAM_D4', bad: 5, good: 95 }
                     ].map((agent, i) => (
                       <tr key={i} className="hover:bg-white/[0.03] transition-colors group/row">
                          <td className="p-12 pl-16 text-[18px] font-black uppercase text-white/90 group-hover/row:text-primary transition-colors tracking-tight">{agent.name}</td>
                          <td className="p-12 text-[22px] font-black font-mono text-center text-rose-500/40 tabular-nums">{agent.bad}%</td>
                          <td className="p-12 text-[22px] font-black font-mono text-center text-emerald-500 tabular-nums shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]">{agent.good}%</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </CardContent>
         </Card>

         {/* Multi-Channel Intel Registry */}
         <Card className="lg:col-span-4 border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4rem] overflow-hidden relative shadow-2xl border-2">
            <TacticalCorner />
            <CardHeader className="p-16">
               <CardTitle className="text-[16px] font-black uppercase tracking-[0.8em] text-white/20">INTEL_CHANNELS</CardTitle>
            </CardHeader>
            <CardContent className="p-16 pt-0 space-y-12">
               {[
                 { label: 'MANUAL_ENTRY', count: 12, color: 'bg-blue-600' },
                 { label: 'EXTERNAL_EMAIL', count: 8, color: 'bg-cyan-600' },
                 { label: 'CORE_PORTAL', count: 25, color: 'bg-indigo-600' },
                 { label: 'TACTICAL_CHAT', count: 14, color: 'bg-emerald-600' }
               ].map((chan, i) => (
                 <div key={i} className="space-y-6 group/chan">
                    <div className="flex justify-between text-[12px] font-black uppercase tracking-[0.3em]">
                       <span className="text-white/30 group-hover/chan:text-primary transition-colors">{chan.label}</span>
                       <span className="text-white font-mono tracking-tighter">{chan.count} NODES</span>
                    </div>
                    <div className="h-5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                       <div className={cn("h-full group-hover:brightness-150 transition-all duration-1500", chan.color)} style={{ width: `${(chan.count / 30) * 100}%` }} />
                    </div>
                 </div>
               ))}
            </CardContent>
         </Card>
      </div>
    </div>
  );

  const renderGamma = () => (
    <div className="space-y-16 animate-in fade-in slide-in-from-top-12 duration-1500">
      {/* SharePoint style High-Contrast Health Ribbons (Exact Parity) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
         {[
           { label: 'TICKET_CREATED_SEQ', count: 445, color: 'bg-[#0078d4]', trend: '+12.4%', sub: 'NOMINAL_FLOW' },
           { label: 'OPEN_REGISTRY_NODES', count: 45, color: 'bg-[#d83b01]', trend: '-2.1%', sub: 'URGENT_SYNC' },
           { label: 'CLOSED_SEQUENCE_FIN', count: 142, color: 'bg-[#107c10]', trend: '+5.7%', sub: 'VALIDATED' },
           { label: 'PENDING_SYNC_BUF', count: 15, color: 'bg-[#ff8c00]', trend: 'STABLE', sub: 'AWAITING_INPUT' },
           { label: 'RESOLVED_PARITY_NET', count: 231, color: 'bg-[#00b7c3]', trend: '+8.2%', sub: 'COMPLETED' },
           { label: 'ESCALATED_ALERTS_CRIT', count: 12, color: 'bg-[#a4262c]', trend: 'CRITICAL', sub: 'IMMEDIATE_ACTION' }
         ].map((node, i) => (
           <div key={i} className={cn("p-12 rounded-[3.5rem] relative overflow-hidden group shadow-2xl transition-all hover:-translate-y-6 hover:scale-110 duration-700 border-b-8 border-black/20", node.color)}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl" />
              <div className="flex justify-between items-start relative z-10">
                 <p className="text-[12px] font-black uppercase tracking-[0.3em] text-white/80">{node.label}</p>
                 <span className="text-[10px] font-black bg-black/40 px-4 py-2 rounded-full text-white border border-white/20">{node.trend}</span>
              </div>
              <h3 className="text-7xl font-black text-white tracking-tighter tabular-nums mt-8 relative z-10 drop-shadow-2xl">{node.count}</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-2 relative z-10">{node.sub}</p>
              <div className="absolute bottom-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                 <Activity className="w-24 h-24 text-white" />
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Raised vs Solved Parity Focus (High Resolution) */}
         <Card className="lg:col-span-12 border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4.5rem] overflow-hidden relative group shadow-[0_0_100px_rgba(0,0,0,0.5)] p-20 border-2">
            <TacticalCorner />
            <div className="flex flex-col md:flex-row items-center justify-between gap-20">
               <div className="space-y-8 text-center md:text-left">
                  <div className="space-y-2">
                     <CardTitle className="text-[18px] font-black uppercase tracking-[1em] text-white/20">RAISED_VS_SOLVED_PARITY</CardTitle>
                     <p className="text-[12px] font-black text-primary/60 uppercase tracking-[0.4em]">SYSTEM_EFFICIENCY_REGISTRY</p>
                  </div>
                  <div className="flex items-center gap-16">
                     <div className="space-y-2">
                        <p className="text-[14px] font-black uppercase tracking-widest text-orange-500/80">NODES_RAISED</p>
                        <h3 className="text-9xl font-black text-white tracking-tighter drop-shadow-2xl">286</h3>
                     </div>
                     <div className="h-32 w-[2px] bg-white/10" />
                     <div className="space-y-2">
                        <p className="text-[14px] font-black uppercase tracking-widest text-emerald-500">NODES_SOLVED</p>
                        <h3 className="text-9xl font-black text-white tracking-tighter drop-shadow-2xl">142</h3>
                     </div>
                  </div>
               </div>
               
               <div className="flex-1 w-full space-y-12">
                  <div className="flex justify-between items-end mb-4">
                     <div className="space-y-1">
                        <span className="text-[14px] font-black uppercase tracking-[0.4em] text-white/40">EFFICIENCY_METRIC_Y26</span>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">ALIGNED_WITH_GLOBAL_TARGETS</p>
                     </div>
                     <span className="text-6xl font-black text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">50%</span>
                  </div>
                  <div className="h-10 w-full bg-white/5 rounded-full overflow-hidden border-2 border-white/10 relative shadow-inner">
                     <div className="absolute inset-0 bg-orange-500/10" />
                     <div className="h-full bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.8)] transition-all duration-2000 ease-out" style={{ width: '50%' }} />
                     <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] animate-shimmer" />
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-[0.6em] text-center text-white/25">Operational Intelligence: Balanced Signal Registry</p>
               </div>
            </div>
         </Card>

         {/* Volume Area Waves (Hyper High Res) */}
         <Card className="lg:col-span-12 border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4.5rem] overflow-hidden relative group shadow-2xl border-2">
            <Scanline />
            <TacticalCorner />
            <CardHeader className="p-16 pb-0">
               <CardTitle className="text-[18px] font-black uppercase tracking-[1em] text-white/20">VOLUME_AREA_PULSE_SEQUENCE</CardTitle>
            </CardHeader>
            <CardContent className="p-16 h-[400px]">
               <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300">
                  <defs>
                     <linearGradient id="waveGamma" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                     </linearGradient>
                  </defs>
                  <path 
                     d="M 0,300 L 0,220 L 100,180 L 200,240 L 300,140 L 400,200 L 500,80 L 600,180 L 700,100 L 800,140 L 900,60 L 1000,120 L 1000,300 Z" 
                     fill="url(#waveGamma)"
                  />
                  <path 
                     d="M 0,220 L 100,180 L 200,240 L 300,140 L 400,200 L 500,80 L 600,180 L 700,100 L 800,140 L 900,60 L 1000,120" 
                     fill="none" 
                     stroke="#3b82f6" 
                     strokeWidth="10" 
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                  />
               </svg>
            </CardContent>
         </Card>
      </div>
    </div>
  );

  const renderDelta = () => (
    <div className="space-y-16 animate-in fade-in zoom-in-95 duration-1500">
      {/* High-Impact Urgency Nodes (Extreme Resolution) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
         {[
           { label: 'DUE_TODAY_SYNC', count: 6, color: 'text-cyan-400', glow: 'shadow-[0_0_50px_rgba(34,211,238,0.2)]' },
           { label: 'WEEKLY_DEADLINE_BUF', count: 8, color: 'text-blue-500', glow: 'shadow-[0_0_50px_rgba(59,130,246,0.2)]' },
           { label: 'CRITICAL_OVERDUE', count: 1, color: 'text-rose-500', glow: 'shadow-[0_0_50px_rgba(244,63,94,0.2)]' },
           { label: 'AVG_RESPONSE_INTEL', count: '24hrs', color: 'text-emerald-400', glow: 'shadow-[0_0_50px_rgba(16,185,129,0.2)]' }
         ].map((node, i) => (
           <Card key={i} className={cn("border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden relative group p-16 flex flex-col items-center justify-center text-center shadow-2xl transition-all hover:scale-110 border-2", node.glow)}>
              <h3 className={cn("text-[8rem] font-black tracking-tighter mb-6 leading-none drop-shadow-2xl", node.color)}>
                 {node.count}
              </h3>
              <p className="text-[16px] font-black uppercase tracking-[0.5em] text-white/30">{node.label}</p>
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                 <Zap className="w-12 h-12" />
              </div>
              <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Employee IT Support Velocity - Personnel Registry */}
         <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {[
                 { name: 'SAM_NODAL_LEAD', status: { 'IN_PROGRESS_SYNC': 4, 'OPEN_NODES_BUF': 2, 'CRITICAL_HIGH_ERR': 5 } },
                 { name: 'ANDREW_SYSTEMS', status: { 'IN_PROGRESS_SYNC': 6, 'OPEN_NODES_BUF': 1, 'CRITICAL_HIGH_ERR': 2 } },
                 { name: 'ADAM_OPERATIONS', status: { 'IN_PROGRESS_SYNC': 3, 'OPEN_NODES_BUF': 4, 'CRITICAL_HIGH_ERR': 8 } },
                 { name: 'STEVE_TACTICAL', status: { 'IN_PROGRESS_SYNC': 5, 'OPEN_NODES_BUF': 3, 'CRITICAL_HIGH_ERR': 1 } }
               ].map((agent, i) => (
                 <Card key={i} className="border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4rem] overflow-hidden relative group p-16 hover:border-primary/60 transition-all shadow-2xl border-2">
                    <TacticalCorner />
                    <div className="flex items-center gap-12 mb-12 border-b-2 border-white/5 pb-12">
                       <div className="h-28 w-28 rounded-[3rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center overflow-hidden shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]">
                          <Fingerprint className="w-14 h-14 text-primary opacity-80 animate-pulse" />
                       </div>
                       <div className="space-y-3">
                          <h4 className="text-4xl font-black uppercase text-white tracking-tighter">{agent.name}</h4>
                          <p className="text-[14px] font-black uppercase text-primary/60 tracking-[0.5em]">COMMAND_PROTOCOL_ALPHA</p>
                          <div className="flex items-center gap-3 pt-2">
                             <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping shadow-[0_0_10px_rgba(16,185,129,1)]" />
                             <span className="text-[12px] font-black uppercase text-emerald-500 opacity-80 tracking-widest">ACTIVE_SIGNAL_LOCK</span>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-8">
                       {Object.entries(agent.status).map(([status, count], j) => (
                         <div key={j} className="flex items-center justify-between group/status px-8 py-5 rounded-[2rem] hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                            <div className="flex items-center gap-6">
                               <div className="h-4 w-4 rounded-full bg-white/20 group-hover/status:bg-primary transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                               <span className="text-[14px] font-black uppercase text-white/50 group-hover/status:text-white transition-colors tracking-[0.3em] font-mono">{status.replace('_', ' ')}</span>
                            </div>
                            <span className="text-3xl font-black font-mono text-white group-hover/status:text-primary drop-shadow-lg tabular-nums">{count}</span>
                         </div>
                       ))}
                    </div>
                 </Card>
               ))}
            </div>
         </div>

         {/* Regional Issue Density - Protocol Heatmap */}
         <div className="lg:col-span-4 h-full">
            <Card className="border-white/5 bg-[#0a0a0f]/95 backdrop-blur-3xl rounded-[4rem] overflow-hidden relative group p-16 h-full shadow-[0_0_100px_rgba(0,0,0,0.5)] border-2 flex flex-col justify-between">
               <TacticalCorner />
               <div>
                  <div className="flex flex-col gap-4 mb-16">
                     <CardTitle className="text-[18px] font-black uppercase tracking-[1em] text-white/20">REGIONAL_DENSITY_INTEL</CardTitle>
                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[12px] font-black uppercase text-white/40 tracking-[0.2em]">TIMESTAMP_LOG</span>
                        <Badge className="bg-primary/20 text-primary border-primary/40 text-[12px] px-4 py-1 font-black">UTC_{new Date().getHours()}_SYNC</Badge>
                     </div>
                  </div>
                  <div className="space-y-12">
                     {[
                       { label: 'NEW_YORK_CLUSTER_A1', val: 28, color: 'from-blue-600 to-indigo-600' },
                       { label: 'CALIFORNIA_GRID_B2', val: 22, color: 'from-cyan-500 to-blue-500' },
                       { label: 'OREGON_NODE_C3', val: 12, color: 'from-indigo-600 to-purple-600' },
                       { label: 'TEXAS_RANGE_D4', val: 8, color: 'from-amber-600 to-orange-600' },
                       { label: 'GLOBAL_OFFSET_Z9', val: 3, color: 'from-rose-600 to-red-600' }
                     ].map((region, i) => (
                       <div key={i} className="space-y-6 group/reg">
                          <div className="flex justify-between text-[14px] font-black uppercase tracking-[0.4em]">
                             <span className="text-white/40 group-hover/reg:text-white transition-all duration-500">{region.label}</span>
                             <span className="text-primary font-black text-2xl tracking-tighter">{region.val}%</span>
                          </div>
                          <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border-2 border-white/5 shadow-inner p-1">
                             <div className={cn("h-full bg-gradient-to-r transition-all duration-[2000ms] shadow-lg rounded-full", region.color)} style={{ width: `${region.val}%` }} />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               
               <div className="mt-20 pt-16 border-t-2 border-white/5 flex items-center gap-10">
                  <div className="h-20 w-20 rounded-[2rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse">
                     <Activity className="h-10 w-10 text-primary" />
                  </div>
                  <div className="flex-1">
                     <p className="text-[14px] font-black uppercase text-white/30 tracking-[0.4em] leading-none mb-1">NETWORK_BANDWIDTH_LOAD</p>
                     <p className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-lg">NOMINAL_CAPACITY</p>
                  </div>
               </div>
            </Card>
         </div>
      </div>
    </div>
  );

  const renderProtocol = () => {
    switch(activeProtocol) {
      case 'alpha': return renderAlpha();
      case 'beta': return renderBeta();
      case 'gamma': return renderGamma();
      case 'delta': return renderDelta();
      default: return renderAlpha();
    }
  };

  return (
    <div className="relative min-h-screen bg-[#05050a] text-slate-200 overflow-x-hidden selection:bg-primary/30 font-sans">
      {/* Global Telemetry Mesh Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#0f172a,transparent)] opacity-60" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] animate-grid-drift [mask-image:radial-gradient(ellipse:60%_50%_at:50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] animate-pulse" />
      </div>

      <div className="relative z-10 space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1500 p-16 pt-12">
      
        {/* Absolute HUD Design Header - Strictly as per Screenshots */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-12 pb-12 border-b-2 border-white/5 relative">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-4 w-4 rounded-full bg-primary animate-pulse shadow-[0_0_20px_rgba(59,130,246,1)]" />
              <div className="h-[2px] w-24 bg-primary/40 rounded-full" />
            </div>
            <h1 className="text-8xl font-black tracking-tighter text-white leading-none uppercase drop-shadow-2xl">
              {activeProtocol === 'alpha' && "Helpdesk HUD"}
              {activeProtocol === 'beta' && "Circular Registry"}
              {activeProtocol === 'gamma' && "Sharepoint Tactical"}
              {activeProtocol === 'delta' && "Centraverse Intelligence"}
            </h1>
          </div>
          
          <div className="flex items-center gap-8">
            <Link 
              href="/dashboard"
              className="h-16 px-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 group/home"
            >
               <Home className="h-5 w-5 text-primary group-hover/home:text-white transition-colors" />
               <span className="text-[12px] font-black uppercase tracking-[0.4em] text-primary/80 group-hover/home:text-white transition-colors">Home</span>
            </Link>
             <Link 
              href="/assets"
              className="h-16 px-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 group/asset"
            >
               <Package className="h-5 w-5 text-white/40 group-hover/asset:text-primary transition-colors" />
               <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60 group-hover/asset:text-white transition-colors">Assets</span>
            </Link>
            <Link 
              href="/tickets"
              className="h-16 px-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3 group/app"
            >
               <Layout className="h-5 w-5 text-white/40 group-hover/app:text-primary transition-colors" />
               <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white/60 group-hover/app:text-white transition-colors">App</span>
            </Link>
            {mounted && (
              <Select value={activeProtocol} onValueChange={(val: any) => setActiveProtocol(val)}>
                 <SelectTrigger className="h-16 w-80 rounded-[2.5rem] border-white/10 bg-white/5 text-[14px] font-black uppercase tracking-[0.4em] text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:bg-primary hover:border-primary transition-all">
                    <SelectValue placeholder="HUD_SELECT_FILTER" />
                 </SelectTrigger>
                 <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-[2.5rem] overflow-hidden p-4 shadow-2xl backdrop-blur-3xl">
                    <SelectItem value="alpha" className="rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] focus:bg-primary py-4">PROTOCOL_01 (HUD)</SelectItem>
                    <SelectItem value="beta" className="rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] focus:bg-primary py-4">PROTOCOL_02 (REGISTRY)</SelectItem>
                    <SelectItem value="gamma" className="rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] focus:bg-primary py-4">PROTOCOL_03 (TACTICAL)</SelectItem>
                    <SelectItem value="delta" className="rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] focus:bg-primary py-4">PROTOCOL_04 (INTELLIGENCE)</SelectItem>
                 </SelectContent>
              </Select>
            )}
            
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <button 
                  onClick={() => handleVersionChange("v1")}
                  className={cn(
                    "px-6 h-14 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center",
                    currentVersion === "v1" 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-white/30 hover:text-white"
                  )}
                >
                  Version 1
                </button>
                <button 
                  onClick={() => handleVersionChange("v2")}
                  className={cn(
                    "px-6 h-14 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center",
                    currentVersion === "v2" 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-white/30 hover:text-white"
                  )}
                >
                  Version 2
                </button>
            </div>

            <div className="hidden lg:flex items-center gap-4 h-16 px-8 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.5em]">System: Nominal</span>
            </div>
          </div>
        </div>

        {/* Primary Command Interface */}
        <div className="relative">
           {renderProtocol()}
        </div>
      </div>
    </div>
  );
}


