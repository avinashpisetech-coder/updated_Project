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

interface Notification {
  id: string;
  ticket_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  ticket?: { ticket_number: string } | null;
}

interface Props {
  initial: Notification[];
}

export function NotificationBell({ initial }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
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
        className="w-80 p-0 shadow-xl rounded-xl border-border/60"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
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
                href={n.ticket_id ? `/tickets/${n.ticket_id}` : "#"}
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
                {n.ticket && (
                  <span className="text-xs font-semibold text-primary">
                    {n.ticket.ticket_number}
                  </span>
                )}
                <span className={n.is_read ? "text-muted-foreground" : "text-foreground font-medium"}>
                  {n.message}
                </span>
                <span className="text-xs text-muted-foreground">
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
