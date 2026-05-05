"use client";

import React, { Suspense } from "react";
import { format } from "date-fns";
import Link from "next/link";
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
const EliteKPI = ({ label, value, icon: Icon, color, subLabel, href }: any) => (
  <Link href={href || "#"} className={cn("group block", !href && "pointer-events-none")}>
    <Card className="relative overflow-hidden rounded-[16px] bg-white border-none shadow-[rl_8px_15px_rgba(100,116,139,0.03)] group-hover:shadow-[0_12px_25px_rgba(100,116,139,0.06)] transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-1.5">
          <div className={cn(
            "p-1.5 rounded-lg transition-all duration-500 shadow-sm",
            color === 'rose' ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : 
            color === 'violet' ? "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white" : 
            color === 'teal' ? "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white" : 
            color === 'sky' ? "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white" :
            "bg-slate-50 text-slate-600 group-hover:bg-slate-600 group-hover:text-white"
          )}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          {subLabel && (
            <span className="text-[7.5px] font-bold text-slate-400/40 uppercase tracking-widest">{subLabel}</span>
          )}
        </div>
        <div className="space-y-0">
          <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-normal">{label}</span>
          <h3 className="text-lg font-black text-slate-900 tracking-tighter tabular-nums leading-none">{value}</h3>
        </div>
      </CardContent>
    </Card>
  </Link>
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

  return (
    <div className="min-h-screen bg-[#fcfcfc] px-6 py-6 space-y-6 font-sans selection:bg-[#f97316]/10 selection:text-[#f97316]">
      {/* Elite Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
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
      </div>

      {/* KPI Matrix - 4 Column Top Roll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
           <EliteKPI key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Personal Pulse: User Cockpit */}
        <Card className="md:col-span-2 rounded-[25px] bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-2xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Ticket className="h-48 w-48 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Operational Assignment Control</span>
                <h3 className="text-3xl font-black text-white tracking-tight italic uppercase">Active_Service_Queue</h3>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-7xl font-black text-white tracking-tighter tabular-nums">{data?.myTickets?.total || 0}</span>
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global_Load</span>
                   <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest mt-1">Status: Active</span>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xl grid grid-cols-2 sm:grid-cols-4 gap-4">
               {[
                 { label: "New", value: data?.myTickets?.new || 0, color: "text-blue-400" },
                 { label: "Assigned", value: data?.myTickets?.assigned || 0, color: "text-indigo-400" },
                 { label: "Pending", value: (data?.myTickets?.pending_user || 0) + (data?.status_distribution?.pending_dept || 0), color: "text-amber-400" },
                 { label: "In Progress", value: data?.myTickets?.in_progress || 0, color: "text-sky-400" },
               ].map((stat) => (
                 <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                   <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                   <div className={cn("text-xl font-black tabular-nums", stat.color)}>{stat.value}</div>
                 </div>
               ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest h-10 px-6">
                <Link href="/tickets">
                  View Full Registry
                </Link>
              </Button>
              <Button asChild variant="link" className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] p-0 h-auto hover:text-white">
                <Link href="/workspace/tasks" className="flex items-center gap-2">
                  <PlusCircle className="h-3 w-3" /> Quick Task Entry
                </Link>
              </Button>
            </div>
          </div>
        </Card>

      {/* WORKFLOW STATUS GRID - Absolute Parity Check */}
      <div className="bg-white p-6 rounded-[25px] shadow-[rl_15px_30px_rgba(100,116,139,0.03)] border border-slate-50">
        <div className="flex items-center gap-2 mb-4">
           <Layers className="h-4 w-4 text-slate-400" />
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Workflow status distribution (Parity Active)</span>
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
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{badge.label}</p>
                   <p className="text-lg font-black text-slate-900 leading-none">{loading ? "..." : badge.value}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Activity Hub */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <Card className="rounded-[30px] bg-white border-none shadow-[0_15px_30px_rgba(100,116,139,0.04)] overflow-hidden">
             <CardHeader className="px-8 py-6 border-b border-slate-50 flex flex-row items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
                   <Activity className="h-4 w-4 text-white" />
                 </div>
                 <CardTitle className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Operational activity log</CardTitle>
               </div>
               <Link href="/tickets" className="text-[9px] font-black text-slate-400 hover:text-slate-900 transition-all flex items-center gap-1.5 tracking-widest">
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
      </div>
    </div>
  );
}
