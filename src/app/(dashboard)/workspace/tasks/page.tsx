import { getAllTasks } from "../actions";
import { ModuleHeader } from "@/components/ModuleHeader";
import TaskListClient from "./TaskListClient";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalTasksPage() {
  const tasks = await getAllTasks();

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans antialiased text-slate-900">
      <ModuleHeader 
        title="Task_Registry"
        subtitle="Global Operations. Task Tracking. Unified Matrix."
        actions={
          <Button
            asChild
            size="sm"
            className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 group"
          >
            <Link href="/workspace" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Log_Task
            </Link>
          </Button>
        }
      />

      <main className="flex-1 overflow-hidden bg-slate-50/40">
        <TaskListClient tasks={tasks as any} />
      </main>
    </div>
  );
}
