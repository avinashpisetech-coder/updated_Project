import { getWorkloadData } from "../actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Briefcase, Ticket, AlertCircle, 
  TrendingUp, BarChart3, ChevronRight, LayoutGrid 
} from "lucide-react";
import Link from "next/link";

export default async function WorkloadPage() {
  const workload = await getWorkloadData();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
            <BarChart3 className="w-4 h-4" />
            Operational_Intelligence
          </div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Resource_Workload</h1>
          <p className="text-zinc-500 max-w-lg">Unified monitoring of human capital across Workspace Projects and Service Desk Tickets.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="px-4 py-2 text-center border-r border-zinc-100 dark:border-zinc-800">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active_Staff</div>
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{workload.length}</div>
          </div>
          <div className="px-4 py-2 text-center">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total_Load</div>
            <div className="text-xl font-black text-primary">{workload.reduce((acc, curr) => acc + curr.totalLoad, 0)}</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {workload.map((user) => (
          <Card key={user.id} className="border-none shadow-xl shadow-zinc-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden group hover:ring-2 hover:ring-primary/20 transition-all rounded-3xl">
            <CardHeader className="pb-4 border-b border-zinc-50 dark:border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-white dark:border-zinc-800 shadow-md">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-zinc-950 text-white font-bold">
                        {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {user.totalLoad > 5 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center animate-pulse">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-zinc-900 dark:text-zinc-100">{user.full_name}</CardTitle>
                    <div className="text-xs text-zinc-500 font-medium">{user.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Load_Score</div>
                  <div className={`text-2xl font-black ${user.totalLoad > 8 ? 'text-rose-500' : user.totalLoad > 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {user.totalLoad}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* Load Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span>Capacity_Utilization</span>
                  <span>{Math.min(100, (user.totalLoad / 10) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${(user.taskCount / (user.totalLoad || 1)) * 100}%` }}
                    title={`Tasks: ${user.taskCount}`}
                  />
                  <div 
                    className="h-full bg-purple-500 transition-all duration-1000" 
                    style={{ width: `${(user.ticketCount / (user.totalLoad || 1)) * 100}%` }}
                    title={`Tickets: ${user.ticketCount}`}
                  />
                </div>
              </div>

              {/* Bifurcated List */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Workspace Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    <Briefcase className="w-3 h-3" /> Workspace_Tasks ({user.taskCount})
                  </div>
                  <div className="space-y-2">
                    {user.tasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className="p-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/30 text-xs">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">{task.title}</div>
                        <div className="flex items-center gap-2 mt-1 opacity-60">
                          <Badge variant="outline" className="text-[8px] h-4 bg-white dark:bg-zinc-950 uppercase">{task.priority}</Badge>
                          <Badge variant="outline" className="text-[8px] h-4 bg-white dark:bg-zinc-950 uppercase">{task.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {user.taskCount > 3 && (
                      <div className="text-[9px] font-bold text-blue-500 uppercase text-center py-1">
                        + {user.taskCount - 3} more tasks
                      </div>
                    )}
                    {user.taskCount === 0 && (
                      <div className="text-[9px] italic text-zinc-400 py-2">No active tasks assigned</div>
                    )}
                  </div>
                </div>

                {/* Service Tickets */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest">
                    <Ticket className="w-3 h-3" /> Service_Tickets ({user.ticketCount})
                  </div>
                  <div className="space-y-2">
                    {user.tickets.slice(0, 3).map((ticket: any) => (
                      <div key={ticket.id} className="p-3 bg-purple-50/30 dark:bg-purple-900/10 rounded-xl border border-purple-100/50 dark:border-purple-900/30 text-xs">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">{ticket.subject}</div>
                        <div className="flex items-center gap-2 mt-1 opacity-60">
                          <Badge variant="outline" className="text-[8px] h-4 bg-white dark:bg-zinc-950 uppercase">{ticket.priority}</Badge>
                          <Badge variant="outline" className="text-[8px] h-4 bg-white dark:bg-zinc-950 uppercase">{ticket.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {user.ticketCount > 3 && (
                      <div className="text-[9px] font-bold text-purple-500 uppercase text-center py-1">
                        + {user.ticketCount - 3} more tickets
                      </div>
                    )}
                    {user.ticketCount === 0 && (
                      <div className="text-[9px] italic text-zinc-400 py-2">No active tickets assigned</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="pt-4 flex justify-end">
                <Link href={`/workspace/tasks?assignee=${user.id}`}>
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-3 transition-all cursor-pointer">
                    View_Full_Audit <ChevronRight className="w-3 h-3" />
                  </div>
                </Link>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="p-8 bg-zinc-900 dark:bg-zinc-950 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Protocol_Optimization</h3>
            <p className="text-zinc-400 text-sm max-w-md">Use this data to redistribute operational tasks and prevent burnout across the workforce.</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total_Capacity</div>
              <div className="text-2xl font-black">100%</div>
           </div>
           <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System_Health</div>
              <div className="text-2xl font-black text-emerald-500">Stable</div>
           </div>
        </div>
      </div>

    </div>
  );
}
