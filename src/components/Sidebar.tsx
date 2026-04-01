"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  Settings2, 
  Mail, 
  User,
  Shield,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Layout,
  ChevronDown,
  Settings,
  LogOut,
  Fingerprint,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "./providers/NavigationProvider";
import { Button } from "@/components/ui/button";
import { BackButton } from "./BackButton";
import React, { useState } from "react";
import { ProfileRow } from "@/lib/ensure-profile";
import { Badge } from "@/components/ui/badge";

interface SidebarItemProps {
  href?: string;
  label: string;
  icon: React.ElementType;
  isOpen: boolean;
  isActive?: boolean;
  onClick?: () => void;
  hasSubItems?: boolean;
  isSubItemExpanded?: boolean;
  variant?: "default" | "destructive";
}

function SidebarItem({ href, label, icon: Icon, isOpen, isActive: propActive, onClick, hasSubItems, isSubItemExpanded, variant = "default" }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = propActive ?? (href ? (pathname === href || (href !== "/dashboard" && pathname.startsWith(href))) : false);

  const content = (
    <div className={cn(
      "flex items-center gap-3 w-full px-3 py-1.5 rounded-lg transition-all duration-200 group relative",
      isActive && !hasSubItems 
        ? "text-primary bg-primary/5 shadow-sm shadow-primary/5" 
        : (variant === "destructive" ? "text-destructive hover:bg-destructive/5" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")
    )}>
      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-colors duration-200",
        isActive ? "text-primary" : (variant === "destructive" ? "text-destructive" : "text-muted-foreground group-hover:text-primary")
      )} />
      {isOpen && (
        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {label}
        </span>
      )}
      {isOpen && hasSubItems && (
        <ChevronDown className={cn(
          "h-3 w-3 shrink-0 opacity-50 transition-transform duration-200 ml-auto",
          isSubItemExpanded && "rotate-180"
        )} />
      )}
      {isActive && !hasSubItems && (
        <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-full animate-in slide-in-from-left duration-300" />
      )}
    </div>
  );

  if (hasSubItems) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={href || "#"} className="w-full">
      {content}
    </Link>
  );
}

function SidebarSubItem({ href, label, isOpen }: { href: string; label: string; isOpen: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isOpen) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 py-1 pl-10 pr-3 rounded-lg text-[12px] font-medium transition-colors",
        isActive 
          ? "text-primary bg-primary/5 font-semibold" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span className="truncate">{label}</span>
      {isActive && <div className="h-1 w-1 rounded-full bg-primary" />}
    </Link>
  );
}

export function Sidebar({ 
  canManageMasters, 
  isSuperAdmin,
  profile
}: { 
  canManageMasters: boolean; 
  isSuperAdmin: boolean;
  profile: ProfileRow | null;
}) {
  const { isSidebarOpen, toggleSidebar, navMode, toggleNavMode } = useNavigation();
  const pathname = usePathname();
  const [expandedGroup, setExpandedGroup] = useState<string | null>("masters");

  if (navMode === "horizontal") return null;

  const toggleGroup = (group: string) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-[100] border-r border-border/40 bg-background/80 backdrop-blur-md transition-all duration-500 ease-in-out group/sidebar hidden lg:flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}
    >
      {/* Toggle Control - Technical Floating Arrow */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-20 h-6 w-6 rounded-full border border-border/60 bg-background shadow-sm flex items-center justify-center transition-all duration-300 z-[110] opacity-0 group-hover/sidebar:opacity-100 hover:scale-110 hover:border-primary/40",
          !isSidebarOpen && "rotate-180 opacity-100"
        )}
        title={isSidebarOpen ? "Collapse Registry" : "Expand Registry"}
      >
        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div className="flex flex-col h-full py-4">
        {/* Branding */}
        <div className="px-5 mb-6 flex items-center gap-3 select-none overflow-hidden h-10 shrink-0">
          <Link href="/dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 ring-1 ring-primary/20 transition-transform active:scale-95">
            E
          </Link>
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-sm font-bold tracking-tight uppercase text-foreground tracking-[0.1em]">EIRMS</span>
              <span className="text-[9px] text-primary uppercase tracking-[0.2em] font-bold opacity-60">Management</span>
            </div>
          )}
        </div>

        {/* Global Back Link */}
        <div className="px-3 mb-2">
          <BackButton showLabel={isSidebarOpen} variant="ghost" className="w-full justify-start px-3 h-10" />
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <SidebarItem 
            href="/dashboard" 
            label="Dashboard" 
            icon={LayoutDashboard} 
            isOpen={isSidebarOpen} 
            isActive={pathname === "/dashboard"} 
          />
          <SidebarItem 
            label="Support Queue" 
            icon={Ticket} 
            isOpen={isSidebarOpen} 
            isActive={pathname.startsWith("/tickets") && pathname !== "/tickets/new"} 
            onClick={() => toggleGroup("support")}
            hasSubItems
            isSubItemExpanded={expandedGroup === "support"}
          />
          {expandedGroup === "support" && isSidebarOpen && (
            <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <SidebarSubItem href="/tickets" label="All Tickets" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=new" label="New Tickets" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=assigned" label="Assigned" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=in_progress" label="In Progress" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=pending_user" label="Pending (User)" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=resolved" label="Resolved" isOpen={isSidebarOpen} />
              <SidebarSubItem href="/tickets?status=closed" label="Closed Archive" isOpen={isSidebarOpen} />
            </div>
          )}
          <SidebarItem 
            href="/tickets/new" 
            label="Create Ticket" 
            icon={PlusCircle} 
            isOpen={isSidebarOpen} 
            isActive={pathname === "/tickets/new"} 
          />

          {canManageMasters && (
            <div className="py-1">
              {isSidebarOpen && (
                <div className="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 font-sans">
                  Administration
                </div>
              )}
              <SidebarItem 
                label="Master Data" 
                icon={Settings2} 
                isOpen={isSidebarOpen} 
                isActive={pathname.startsWith("/settings/masters") && !pathname.includes("access-control")}
                onClick={() => toggleGroup("masters")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "masters"}
              />
              {expandedGroup === "masters" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SidebarSubItem href="/settings/masters/users" label="User Directory" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/masters/erp" label="ERP Systems" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/masters/help-desk" label="Help Desk Setup" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/masters/organizations" label="Org Entities" isOpen={isSidebarOpen} />
                </div>
              )}
            </div>
          )}

          {isSuperAdmin && (
            <div className="py-1">
              {isSidebarOpen && (
                <div className="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 font-sans">
                  System Config
                </div>
              )}
              <SidebarItem 
                label="Infrastructure" 
                icon={Settings} 
                isOpen={isSidebarOpen} 
                isActive={pathname.startsWith("/settings") && (!pathname.includes("masters") || pathname.includes("access-control"))}
                onClick={() => toggleGroup("settings")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "settings"}
              />
              {expandedGroup === "settings" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SidebarSubItem href="/settings" label="Core Parameters" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/masters/access-control" label="Security & IAM" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/mail" label="Mail Protocol" isOpen={isSidebarOpen} />
                </div>
              )}
            </div>
          )}

          <SidebarItem 
            href="/profile" 
            label="My Account" 
            icon={User} 
            isOpen={isSidebarOpen} 
            isActive={pathname === "/profile"} 
          />
        </div>

        {/* Footer & Identity */}
        <div className="px-3 pt-6 border-t border-border/40 space-y-3 mt-auto pb-4">
          {/* Identity Info */}
          <div className={cn(
            "flex items-center gap-3 p-2.5 rounded-2xl bg-muted/20 border border-border/40 transition-all duration-500 overflow-hidden",
            !isSidebarOpen && "justify-center p-1 border-transparent bg-transparent"
          )}>
            <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="h-4.5 w-4.5 text-primary opacity-60" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-500 font-sans">
                <span className="text-[11px] font-bold text-foreground truncate">
                  {profile?.full_name || "Authorized User"}
                </span>
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider opacity-60">
                  {profile?.role?.replace("_", " ") || "Member"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={toggleNavMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all text-[11px] font-bold uppercase tracking-wider group/mode font-sans"
            >
              <Layout className="h-4 w-4 shrink-0 transition-transform group-hover/mode:rotate-90" />
              {isSidebarOpen && <span className="truncate">Horizontal View</span>}
            </button>
            
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all text-[11px] font-bold uppercase tracking-widest group/signout font-sans"
              >
                <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover/signout:-translate-x-1" />
                {isSidebarOpen && <span className="truncate">Sign Out</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
