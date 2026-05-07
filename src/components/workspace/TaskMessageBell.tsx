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
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface TaskNotification {
  id: string;
  task_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tasks?: { 
    title: string; 
    project_id: string;
    workspace_projects?: { workspace_id: string } | null;
  } | null;
}

export function TaskMessageBell({ initial = [] }: { initial?: TaskNotification[] }) {
  const [notifications, setNotifications] = useState<TaskNotification[]>(initial);
  const [, startTransition] = useTransition();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const supabase = createClient();
    
    // Initial fetch and subscription setup
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initial fetch
      const fresh = await getUnreadTaskNotifications();
      setNotifications(fresh as any);

      // Subscribe to ONLY this user's notifications
      const channel = supabase
        .channel(`task_notifications_${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'task_notifications',
          filter: `profile_id=eq.${user.id}`
        }, async (payload) => {
          // If we have a new notification, just fetch all unread again to be sync
          const fresh = await getUnreadTaskNotifications();
          setNotifications(fresh as any);
        })
        .subscribe();

      return channel;
    };

    let channel: any;
    setupRealtime().then(c => channel = c);

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm shadow-primary/40">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 shadow-xl rounded-xl border-border/60 z-[200]"
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
            notifications.map((n) => {
              // Safely extract workspace and project IDs
              const tasksData = n.tasks as any;
              const wp = tasksData?.workspace_projects;
              const workspaceId = Array.isArray(wp) ? wp[0]?.workspace_id : wp?.workspace_id;
              const projectId = tasksData?.project_id;
              
              // Fallback to a safe route if IDs are missing to avoid 404
              const targetHref = (workspaceId && projectId) 
                ? `/workspace/${workspaceId}/project/${projectId}/task/${n.task_id}`
                : `/workspace`;

              return (
                <Link
                  key={n.id}
                  href={targetHref}
                  onClick={() => {
                    startTransition(async () => {
                      await markTaskNotificationsRead(n.task_id);
                      setNotifications(prev => prev.filter(notif => notif.task_id !== n.task_id));
                    });
                  }}
                  className="flex flex-col gap-0.5 border-b border-border/40 px-4 py-3 text-sm transition-colors hover:bg-muted/50 last:border-0"
                >
                  <span className="text-[10px] font-black text-primary uppercase tracking-tight">
                    {n.tasks?.title || "TASK_UPDATE"}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {n.message}
                  </span>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">
                    {format(new Date(n.created_at), "MMM dd, HH:mm")}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
