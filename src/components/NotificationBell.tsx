"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsRead } from "@/app/(dashboard)/tickets/actions";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

interface Props {
  initial: Notification[];
}

export function NotificationBell({ initial }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [, startTransition] = useTransition();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const supabase = createClient();
    
    // Subscribe to GLOBAL notifications
    const channel = supabase
      .channel('global_notifications_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    startTransition(async () => {
      await markNotificationsRead(ids);
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    });
  };

  if (!hasMounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="relative h-8 w-8 rounded-lg p-0"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-8 w-8 rounded-lg p-0"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
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
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || "#"}
                onClick={() => {
                  if (!n.is_read) {
                    startTransition(async () => {
                      await markNotificationsRead([n.id]);
                      setNotifications((prev) =>
                        prev.map((notif) =>
                          notif.id === n.id ? { ...notif, is_read: true } : notif
                        )
                      );
                    });
                  }
                }}
                className={`flex flex-col gap-0.5 border-b border-border/40 px-4 py-3 text-sm transition-colors hover:bg-muted/50 last:border-0 ${
                  n.is_read ? "opacity-60" : ""
                }`}
              >
                <span className="text-xs font-semibold text-primary uppercase tracking-tighter">
                  {n.title}
                </span>
                <span className={n.is_read ? "text-muted-foreground" : "text-foreground font-medium"}>
                  {n.message}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(n.created_at), "MMM dd, yyyy HH:mm")}
                </span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
