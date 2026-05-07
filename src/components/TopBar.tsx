"use client";

import React from "react";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "./providers/NavigationProvider";
import { NotificationBell } from "./NotificationBell";
import { TaskMessageBell } from "./workspace/TaskMessageBell";
import { ProfileRow } from "@/lib/ensure-profile";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "./ui/button";

export function TopBar({ 
  profile,
  notifications = []
}: { 
  profile: ProfileRow | null;
  notifications?: any[];
}) {
  const { navMode, isSidebarOpen } = useNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isVersioned = searchParams.get("version") !== null;

  // Only show in vertical (sidebar) mode
  if (navMode !== "vertical") return null;

  // Hide on analytical dashboards
  if (pathname === "/service-analytics" || isVersioned) return null;

  return (
    <header 
      className={cn(
        "fixed top-0 right-0 z-[90] h-16 flex items-center justify-end px-8 bg-white border-b border-slate-200/60 shadow-sm transition-all duration-500",
        isSidebarOpen ? "left-64" : "left-20"
      )}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
           <TaskMessageBell />
           <NotificationBell initial={notifications} />
        </div>
        
        <div className="h-8 w-px bg-slate-200" />

        {/* User Info */}
        <div className="flex items-center gap-3 font-sans">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[11px] font-black text-slate-900 truncate max-w-[150px] uppercase tracking-tight">
              {profile?.full_name || "Authorized User"}
            </span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-widest opacity-60">
              {profile?.role?.replace("_", " ") || "Member"}
            </span>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm transition-all group-hover:scale-110">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <form action={signOut}>
          <Button 
            type="submit" 
            variant="ghost" 
            size="icon" 
            className="rounded-xl h-10 w-10 text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-all group"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </Button>
        </form>
      </div>
    </header>
  );
}
