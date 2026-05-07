"use client";

import React, { Suspense } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { 
  PlusCircle, 
  Activity, 
  Ticket, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Timer, 
  ArrowUpRight,
  LayoutDashboard,
  BarChart3,
  Settings2,
  Users,
  Bell,
  UserCheck,
  Radio,
  Calendar,
  Layers,
  Archive,
  ArrowRight,
  ExternalLink,
  ListTodo,
  Kanban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDashboardDataV2 } from "@/hooks/useDashboardData";
import { ActivityFeedSkeleton } from "./ActivityFeedSkeleton";

// elite KPI Card (Ultra-Compact Executive Footprint)
const EliteKPI = ({ label, value, icon: Icon, color, subLabel, href }: any) => {
  const glowColor = 
    color === 'rose' ? 'rgba(225, 29, 72, 0.15)' : 
    color === 'violet' ? 'rgba(124, 58, 237, 0.15)' : 
    color === 'teal' ? 'rgba(13, 148, 136, 0.15)' : 
    color === 'sky' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(100, 116, 139, 0.1)';

  return (
    <Link href={href || "#"} className={cn("group block", !href && "pointer-events-none")}>
      <Card className="relative overflow-hidden rounded-[20px] bg-white border-none shadow-[rl_8px_15px_rgba(100,116,139,0.03)] group-hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-1">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
          style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }} 
        />
        <CardContent className="p-4 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className={cn(
              "p-2 rounded-xl transition-all duration-500 shadow-sm",
              color === 'rose' ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : 
              color === 'violet' ? "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white" : 
              color === 'teal' ? "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white" : 
              color === 'sky' ? "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white" :
              "bg-slate-50 text-slate-600 group-hover:bg-slate-600 group-hover:text-white"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            {subLabel && (
              <span className="text-[8px] font-black text-slate-400/40 uppercase tracking-[0.2em]">{subLabel}</span>
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
            <div className="flex items-baseline gap-1">
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{value}</h3>
               {href && <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-slate-900 transition-colors" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const HealthRadar = () => (
  <div className="relative h-40 w-40 flex items-center justify-center">
    <div className="absolute inset-0 bg-[#f97316]/10 rounded-full blur-3xl animate-pulse" />
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
      <circle
        cx="80"
        cy="80"
        r="70"
        fill="transparent"
        stroke="currentColor"
        strokeWidth="1"
        className="text-white/5"
      />
      {[0.2, 0.5, 0.8].map((i) => (
        <motion.circle
          key={i}
          cx="80"
          cy="80"
          r="70"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2"
          className="text-emerald-400/20"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 3, delay: i * 2, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.line
        x1="80"
        y1="80"
        x2="80"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
        className="text-emerald-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ originX: "80px", originY: "80px" }}
      />
    </svg>
    <div className="absolute flex flex-col items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" 
      />
      <span className="text-[8px] font-black text-white mt-2 uppercase tracking-widest">Nominal</span>
    </div>
  </div>
);

export function HomeDashboard({ initialData, myTasks, children }: { initialData: any, myTasks?: any[], children: React.ReactNode }) {
  const emptyFilters = React.useMemo(() => ({}), []);
  const { data: dashboardData, loading } = useDashboardDataV2(emptyFilters, 1, 5);
  const data = dashboardData || initialData;

  const kpis = [
    { label: "TOTAL USERS", value: data?.user_stats?.total || 0, icon: UserCheck, color: "violet", subLabel: `${data?.user_stats?.active || 0} ACTIVE`, href: "/settings/masters/users" },
    { label: "TOTAL TICKETS", value: data?.myTickets?.total || 0, icon: Layers, color: "sky", subLabel: "SCOPE", href: "/tickets" },
    { label: "RESOLVED", value: (data?.myTickets?.resolved || 0) + (data?.myTickets?.closed || 0), icon: CheckCircle2, color: "teal", subLabel: "COMPLETED", href: "/tickets?status=resolved" },
    { label: "Alert Escalations", value: data?.myTickets?.escalated || 0, icon: AlertCircle, color: "rose", subLabel: "ACTION REQUIRED", href: "/tickets?status=escalated" },
  ];

  const workflowBadges = [
    { label: "New", value: data?.myTickets?.new || 0, status: "new", color: "blue", icon: Bell },
    { label: "Assigned", value: data?.myTickets?.assigned || 0, status: "assigned", color: "blue", icon: Users },
    { label: "In Progress", value: data?.myTickets?.in_progress || 0, status: "in_progress", color: "blue", icon: Timer },
    { label: "Pending (User)", value: data?.myTickets?.pending_user || 0, status: "pending_user", color: "amber", icon: Clock },
    { label: "Pending (Dept)", value: data?.status_distribution?.pending_dept || 0, status: "pending_dept", color: "amber", icon: Layers },
    { label: "Pending (3rd)", value: data?.status_distribution?.pending_third_party || 0, status: "pending_third_party", color: "amber", icon: ExternalLink },
    { label: "Scheduled", value: data?.myTickets?.scheduled || 0, status: "scheduled", color: "indigo", icon: Calendar },
    { label: "Resolved", value: data?.myTickets?.resolved || 0, status: "resolved", color: "emerald", icon: CheckCircle2 },
    { label: "Closed", value: data?.myTickets?.closed || 0, status: "closed", color: "slate", icon: Archive },
    { label: "Cancelled", value: (data?.status_distribution?.cancelled || 0), status: "cancelled", color: "slate", icon: AlertCircle },
  ];

  const shortcuts = [
    { label: "Support Queue", href: "/tickets", icon: Ticket, color: "sky" },
    { label: "Live Analytics", href: "/service-analytics", icon: BarChart3, color: "violet", isVersion: true },
    { label: "My Tasks", href: "/workspace/my-tasks", icon: Kanban, color: "teal" },
    { label: "User Directory", href: "/settings/masters/users", icon: Users, color: "rose" },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="min-h-screen bg-[#fcfcfc] px-6 py-6 space-y-6 font-sans selection:bg-[#f97316]/10 selection:text-[#f97316]"
    >
      {/* Elite Executive Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
             <div className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Node: Master</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Workplace Hub</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest pl-0.5">Role-based Analytical Feed · {data?.scope || 'Standard'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="lg" variant="outline" className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 px-5 h-11 transition-all duration-300 hover:scale-[1.02] active:scale-95 group">
            <Link href="/workspace/tasks" className="flex items-center gap-2.5">
              <ListTodo className="h-4 w-4 text-violet-500 transition-transform group-hover:scale-110 duration-300" />
              <span className="text-[9px] font-black uppercase tracking-widest">Add Task</span>
            </Link>
          </Button>
          <Button asChild size="lg" className="rounded-2xl bg-[#f97316] hover:bg-[#ea580c] text-white px-6 h-11 shadow-[0_10px_20px_rgba(249,115,22,0.15)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.25)] border-none transition-all duration-500 hover:scale-[1.02] active:scale-95 group">
            <Link href="/tickets/new" className="flex items-center gap-2.5">
              <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90 duration-500" />
              <span className="text-[9px] font-black uppercase tracking-widest">Create Ticket</span>
            </Link>
          </Button>
        </div>
      </motion.div>
 
       {/* KPI Matrix - 4 Column Top Roll */}
       <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {kpis.map((kpi) => (
            <EliteKPI key={kpi.label} {...kpi} />
         ))}
       </motion.div>
 
       {/* Personal Pulse: User Cockpit */}
       <motion.div variants={itemVariants}>
         <Card className="md:col-span-2 rounded-[30px] bg-white border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
            <Ticket className="h-48 w-48 text-slate-900" />
          </div>
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="space-y-4 min-w-[240px]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 bg-primary rounded-full" />
                  <span className="text-[8px] font-black text-slate-900 uppercase tracking-[0.2em]">Operational Assignment Control</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Active Service Queue</h3>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{data?.myTickets?.total || 0}</span>
                <div className="flex flex-col gap-0">
                   <div className="flex items-center gap-1.5">
                     <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-bold text-slate-900 uppercase tracking-widest leading-none">Global Load</span>
                   </div>
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em]">Status: Active</span>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
               {[
                 { label: "New", value: data?.myTickets?.new || 0, color: "text-blue-600", bg: "bg-blue-50/40", border: "border-blue-100/40" },
                 { label: "Assigned", value: data?.myTickets?.assigned || 0, color: "text-indigo-600", bg: "bg-indigo-50/40", border: "border-indigo-100/40" },
                 { label: "Pending", value: (data?.myTickets?.pending_user || 0) + (data?.status_distribution?.pending_dept || 0), color: "text-amber-600", bg: "bg-amber-50/40", border: "border-amber-100/40" },
                 { label: "In Progress", value: data?.myTickets?.in_progress || 0, color: "text-sky-600", bg: "bg-sky-50/40", border: "border-sky-100/40" },
               ].map((stat) => (
                 <div key={stat.label} className={cn("border rounded-xl p-3 flex flex-col justify-center min-h-[70px] transition-all duration-500 hover:bg-white hover:shadow-md", stat.bg, stat.border)}>
                   <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-1 truncate">{stat.label}</div>
                   <div className={cn("text-xl font-black tabular-nums leading-none", stat.color)}>{stat.value}</div>
                 </div>
               ))}
            </div>

            <div className="hidden 2xl:block">
              <div className="scale-50 opacity-30 hover:opacity-100 transition-opacity">
                 <HealthRadar />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[140px]">
              <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest h-9 px-4 shadow-md shadow-slate-200">
                <Link href="/tickets" className="flex items-center gap-2">
                  View Registry <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-slate-400 text-[8px] font-black uppercase tracking-widest h-8 hover:text-slate-900 hover:bg-slate-50 transition-all">
                <Link href="/workspace/tasks" className="flex items-center gap-1.5">
                  <PlusCircle className="h-2.5 w-2.5" /> Quick Task
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Performance Intelligence Analytics Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="rounded-[25px] bg-white border-none shadow-sm p-5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-1">
               <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">SLA Compliance</span>
               <h4 className="text-2xl font-black text-slate-900 tabular-nums">98.4<span className="text-emerald-500">%</span></h4>
               <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "98.4%" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                  />
               </div>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500/20 group-hover:text-emerald-500 transition-colors duration-500" />
         </Card>

         <Card className="rounded-[25px] bg-white border-none shadow-sm p-5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-1">
               <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Resolution Velocity</span>
               <h4 className="text-2xl font-black text-slate-900 tabular-nums">1.4<span className="text-[10px] text-slate-400 ml-1">h/AVG</span></h4>
               <div className="flex gap-1 mt-2">
                  {[1,2,3,4,5].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 8, 4] }}
                      transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                      className="w-1.5 bg-indigo-500/30 rounded-full" 
                    />
                  ))}
               </div>
            </div>
            <Timer className="h-8 w-8 text-indigo-500/20 group-hover:text-indigo-50 transition-colors duration-500" />
         </Card>

         <Card className="rounded-[25px] bg-white border-none shadow-sm p-5 flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10 space-y-1">
               <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">System Stability</span>
               <h4 className="text-2xl font-black text-slate-900">NOMINAL</h4>
               <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping" />
                  <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Live telemetry active</span>
               </div>
            </div>
            <Radio className="h-8 w-8 text-orange-500/20 group-hover:text-orange-500 transition-colors duration-500" />
         </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white p-6 rounded-[25px] shadow-[rl_15px_30px_rgba(100,116,139,0.03)] border border-slate-50">
        <div className="flex items-center gap-2 mb-4">
           <Layers className="h-4 w-4 text-slate-900" />
           <span className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Workflow status distribution</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {workflowBadges.map((badge) => (
            <Link key={badge.label} href={`/tickets?status=${badge.status}`} className="block group">
              <div className="p-3.5 rounded-[18px] bg-slate-50 border border-transparent group-hover:border-slate-200 group-hover:bg-white transition-all duration-300">
                <div className="flex justify-between items-center mb-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    badge.color === 'blue' ? "bg-blue-100 text-blue-600" :
                    badge.color === 'emerald' ? "bg-emerald-100 text-emerald-600" :
                    badge.color === 'amber' ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-600"
                  )}>
                    <badge.icon className="h-3.5 w-3.5" />
                  </div>
                  <ArrowRight className="h-2.5 w-2.5 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-1.5 group-hover:translate-x-0 transition-all" />
                </div>
                <div className="space-y-0.5">
                   <p className="text-[8px] font-black text-slate-900 uppercase tracking-tight">{badge.label}</p>
                   <p className="text-lg font-black text-slate-900 leading-none">{loading ? "..." : badge.value}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Activity Hub */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <Card className="rounded-[30px] bg-white border-none shadow-[0_15px_30px_rgba(100,116,139,0.04)] overflow-hidden">
             <CardHeader className="px-8 py-6 border-b border-slate-50 flex flex-row items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
                   <Activity className="h-4 w-4 text-white" />
                 </div>
                 <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Operational activity log</CardTitle>
               </div>
               <Link href="/tickets" className="text-[10px] font-black text-slate-500 hover:text-primary transition-all flex items-center gap-1.5 tracking-widest">
                 FULL AUDIT <ArrowUpRight className="h-3 w-3" />
               </Link>
             </CardHeader>
             <CardContent className="p-0 h-[440px] overflow-y-auto border-t border-slate-50">
                <Suspense fallback={<ActivityFeedSkeleton />}>
                  {children}
                </Suspense>
             </CardContent>
           </Card>
        </div>

        {/* Tactical Monitor */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* My Active Tasks */}
          <Card className="rounded-[30px] bg-white border-none shadow-[0_15px_30px_rgba(100,116,139,0.04)] overflow-hidden">
             <CardHeader className="px-6 py-5 border-b border-slate-50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-orange-500 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <CardTitle className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">My Active Tasks</CardTitle>
                  </div>
                  <Link href="/workspace/tasks" className="text-[8px] font-black text-slate-400 hover:text-primary transition-colors">VIEW_ALL</Link>
                </div>
             </CardHeader>
             <CardContent className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                {myTasks?.slice(0, 5).map((task) => (
                  <Link 
                    key={task.id} 
                    href={`/workspace/${task.workspace_projects?.workspace_id}/project/${task.project_id}/task/${task.id}`}
                    className="flex flex-col p-3 rounded-[18px] bg-slate-50/50 hover:bg-white hover:shadow-lg border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[180px]">{task.title}</span>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest",
                        task.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                        task.status === 'in_progress' ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-600"
                      )}>
                        {task.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{task.workspace_projects?.name || "Project"}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Due: {task.due_date ? format(new Date(task.due_date), "MMM dd, yyyy") : 'N/A'}</span>
                    </div>
                  </Link>
                ))}
                {(!myTasks || myTasks.length === 0) && (
                  <div className="py-8 text-center bg-slate-50/20 rounded-2xl border border-dashed border-slate-100">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">No Active Assignments</p>
                  </div>
                )}
             </CardContent>
          </Card>

          {/* Shortcuts */}
          <Card className="rounded-[30px] bg-white border-none shadow-[0_15px_30px_rgba(100,116,139,0.04)] overflow-hidden">
             <CardHeader className="px-6 py-5 border-b border-slate-50">
                <CardTitle className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Command Shortcuts</CardTitle>
             </CardHeader>
             <CardContent className="p-4 grid grid-cols-1 gap-2">
                {shortcuts.map((shortcut) => (
                  <Link 
                    key={shortcut.label} 
                    href={shortcut.href}
                    target={shortcut.isVersion ? "_blank" : undefined}
                    className="flex items-center justify-between p-3.5 rounded-[18px] bg-slate-50 border border-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-100 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-105 transition-all",
                        shortcut.color === 'sky' ? "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white" :
                        shortcut.color === 'violet' ? "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white" :
                        shortcut.color === 'teal' ? "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white" :
                        shortcut.color === 'rose' ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : "bg-white text-slate-500"
                      )}>
                        <shortcut.icon className="h-4.5 w-4.5 transition-colors" />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tight group-hover:text-slate-900 transition-colors",
                        shortcut.color === 'sky' ? "text-sky-600/70" :
                        shortcut.color === 'violet' ? "text-violet-600/70" :
                        shortcut.color === 'teal' ? "text-teal-600/70" :
                        shortcut.color === 'rose' ? "text-rose-600/70" : "text-slate-600"
                      )}>
                        {shortcut.label.split(' ')[0]} <span className="opacity-40">{shortcut.label.split(' ')[1] || ""}</span>
                      </span>
                    </div>
                    <ArrowUpRight className={cn(
                      "h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0",
                      shortcut.color === 'sky' ? "text-sky-400" :
                      shortcut.color === 'violet' ? "text-violet-400" :
                      shortcut.color === 'teal' ? "text-teal-400" :
                      shortcut.color === 'rose' ? "text-rose-400" : "text-slate-300"
                    )} />
                  </Link>
                ))}
             </CardContent>
          </Card>

          {/* Live User Session Monitor */}
          <Card className="rounded-[30px] bg-white border-none shadow-[rl_20px_40px_rgba(100,116,139,0.06)] overflow-hidden">
             <CardHeader className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-[#fcfcfc]">
                <div className="flex items-center gap-3">
                   <div className="relative">
                      <Radio className="h-4 w-4 text-slate-900 animate-pulse" />
                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
                   </div>
                   <CardTitle className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Live Session Monitor</CardTitle>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{data?.live_users?.length || 0} LIVE</span>
                </div>
             </CardHeader>
             <CardContent className="p-4 space-y-2">
                {data?.live_users?.map((user: any) => (
                   <div key={user.id} className="flex items-center justify-between p-3 rounded-[18px] bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9 rounded-xl border border-white shadow-sm transition-transform group-hover:scale-105">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-white text-[10px] font-black text-slate-400">
                               {user.full_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tighter leading-none truncate max-w-[120px]">{user.full_name}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user.role}</span>
                         </div>
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                   </div>
                ))}
                {(data?.live_users?.length || 0) === 0 && (
                   <div className="p-8 text-center bg-slate-50/20 rounded-[22px] border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Active Sessions</p>
                   </div>
                )}
             </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
