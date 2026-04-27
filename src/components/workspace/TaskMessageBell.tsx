"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUnreadTaskNotifications, markTaskNotificationsRead } from "@/app/(dashboard)/workspace/actions";

interface TaskNotification {
  id: string;
  task_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tasks?: { title: string } | null;
}

export function TaskMessageBell({ initial = [] }: { initial?: TaskNotification[] }) {
  const [notifications, setNotifications] = useState<TaskNotification[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Poll for new task messages every 30 seconds
    const interval = setInterval(async () => {
      const fresh = await getUnreadTaskNotifications();
      setNotifications(fresh as any);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.length;

  if (!hasMounted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-8 w-8 rounded-lg p-0"
          aria-label="Task Messages"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 shadow-xl rounded-xl border-border/60"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground tracking-tight uppercase">Task Messages</span>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
              No new messages
            </p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={`/workspace/project/project/task/${n.task_id}`} // Note: using dummy projectId for now if not available
                onClick={() => {
                  startTransition(async () => {
                    await markTaskNotificationsRead(n.task_id);
                    setNotifications(prev => prev.filter(notif => notif.task_id !== n.task_id));
                  });
                }}
                className="flex flex-col gap-0.5 border-b border-border/40 px-4 py-3 text-sm transition-colors hover:bg-muted/50 last:border-0"
              >
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">
                  {n.tasks?.title || "TASK_UPDATE"}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {n.message}
                </span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
