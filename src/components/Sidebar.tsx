"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  BarChart3,
  FileText,
  ExternalLink,
  ChevronDown,
  Settings,
  LogOut,
  Fingerprint,
  Home,
  Package,
  Box,
  ReceiptIndianRupee,
  Building2,
  Database,
  Boxes,
  FileCode,
  Percent,
  Ruler,
  PackageSearch,
  History,
  CreditCard,
  Kanban,
  ListTodo,
  CheckSquare,
  Activity,
  Clock,
  Archive,
  ShieldCheck,
  CheckCircle2,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { useNavigation } from "./providers/NavigationProvider";
import { Button } from "@/components/ui/button";
import { BackButton } from "./BackButton";
import React, { useState } from "react";
import { ProfileRow } from "@/lib/ensure-profile";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "./NotificationBell";
import { TaskMessageBell } from "./workspace/TaskMessageBell";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarItemProps {
  href?: string;
  label: string;
  icon: React.ElementType;
  isOpen: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hasSubItems?: boolean;
  isSubItemExpanded?: boolean;
  variant?: "default" | "destructive";
  subItems?: { href: string; label: string; icon?: React.ElementType }[];
}

function SidebarItem({ 
  href, 
  label, 
  icon: Icon, 
  isOpen, 
  isActive: propActive, 
  onClick, 
  onMouseEnter,
  onMouseLeave,
  hasSubItems, 
  isSubItemExpanded, 
  variant = "default",
  subItems
}: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = propActive ?? (href ? (pathname === href || (href !== "/dashboard" && pathname.startsWith(href))) : false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    // Add a small delay to bridge the physical gap between trigger and content
    setTimeout(() => {
      setIsHovered(false);
      onMouseLeave?.();
    }, 200);
  };

  const content = (
    <motion.div 
      whileHover={{ x: 4 }}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-1.5 rounded-lg transition-all duration-200 group relative",
        isActive && !hasSubItems 
          ? "text-primary bg-primary/10 shadow-sm shadow-primary/10 border border-primary/20" 
          : (variant === "destructive" ? "text-destructive hover:bg-destructive/5" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")
      )}
    >
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
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick?.();
          }}
          className="p-1 hover:bg-muted rounded-md transition-colors ml-auto"
        >
          <ChevronDown className={cn(
            "h-3 w-3 shrink-0 opacity-50 transition-transform duration-200",
            isSubItemExpanded && "rotate-180"
          )} />
        </div>
      )}
      {isActive && !hasSubItems && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.5)]" 
        />
      )}
    </motion.div>
  );

  const isExternalIdentifier = label === "Tactical Command Center" || label === "Intelligence Hub";
  const isActionOnly = !href || href === "#";

  return (
    <div 
      className="w-full relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isActionOnly ? (
        <div 
          className="w-full cursor-pointer"
          onClick={() => {
            if (hasSubItems) {
              onClick?.();
            }
          }}
        >
          {content}
        </div>
      ) : (
        <Link 
          href={href || "#"} 
          target={isExternalIdentifier ? "_blank" : undefined}
          rel={isExternalIdentifier ? "noopener noreferrer" : undefined}
          className="w-full"
        >
          {content}
        </Link>
      )}

      {/* FLY-OUT MENU (Collapsed Mode) - USING TOOLTIP FOR PORTAL TO PREVENT CLIPPING */}
      {!isOpen && hasSubItems && subItems && (
        <Tooltip open={isHovered || isMenuHovered}>
          <TooltipTrigger asChild>
            <div className="absolute inset-0 pointer-events-none" />
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            align="start" 
            sideOffset={10}
            className="p-0 border-none bg-transparent shadow-none"
            onMouseEnter={() => setIsMenuHovered(true)}
            onMouseLeave={() => setIsMenuHovered(false)}
          >
            <div className="py-2 px-1 bg-background border border-border/60 shadow-xl rounded-xl min-w-[180px] z-[200] animate-in fade-in slide-in-from-left-2 duration-200 backdrop-blur-md">
              <div className="px-3 py-1.5 mb-1 border-b border-border/40">
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{label}</span>
              </div>
              <div className="space-y-0.5">
                {subItems.map((si, idx) => (
                  <Link
                    key={idx}
                    href={si.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {si.icon && <si.icon size={12} className="opacity-60" />}
                    {si.label}
                  </Link>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function SidebarSubItem({ href, label, isOpen, icon: Icon }: { href: string; label: string; isOpen: boolean; icon?: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (!isOpen) return null;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 py-1 pl-10 pr-3 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-colors",
        isActive 
          ? "text-primary bg-primary/5 shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {Icon && <Icon size={12} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground/50")} />}
      <span className="truncate">{label}</span>
      {isActive && <div className="ml-auto animate-pulse h-1 w-1 rounded-full bg-primary" />}
    </Link>
  );
}


import { Permission, hasPermission, RESOURCES } from "@/lib/permissions";

export function Sidebar({ 
  canAccessMasters, 
  canAccessSecurity,
  canAccessWorkspace,
  canAccessTickets,
  profile,
  permissions = [],
  notifications = []
}: { 
  canAccessMasters: boolean; 
  canAccessSecurity: boolean;
  canAccessWorkspace: boolean;
  canAccessTickets: boolean;
  profile: ProfileRow | null;
  permissions?: Permission[];
  notifications?: any[];
}) {
  const { isSidebarOpen, toggleSidebar, navMode, toggleNavMode } = useNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (pathname.startsWith("/settings/masters")) setExpandedGroup("masters");
    else if (pathname.startsWith("/tickets/requests")) setExpandedGroup("requirements");
    else if (pathname.startsWith("/tickets")) setExpandedGroup("support");
    else if (pathname.startsWith("/workspace")) setExpandedGroup("workspace");
    else if (pathname.startsWith("/settings/notifications")) setExpandedGroup("requirements");
    else if (pathname.startsWith("/settings") || pathname.includes("/settings/mail")) setExpandedGroup("settings");
  }, [pathname]);

  const isVersioned = searchParams.get("version") !== null;

  if (navMode === "horizontal") return null;
  if (!mounted) return null; // Prevent hydration mismatch on gated items

  const toggleGroup = (group: string) => {
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  // Standalone analytical view: hide sidebar on main dashboards
  if (pathname === "/service-analytics" || isVersioned) {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-[100] border-r border-border/40 bg-background transition-all duration-500 ease-in-out group/sidebar hidden lg:flex flex-col",
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

      <div className="flex flex-col h-full pt-4 pb-0">
        {/* Branding */}
        <div className="px-5 mb-6 flex items-center gap-3 select-none overflow-hidden h-10 shrink-0">
          <Link 
            href="/dashboard" 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 ring-1 ring-primary/20 transition-transform active:scale-95"
          >
            A
          </Link>
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-sm font-bold tracking-tight uppercase text-foreground tracking-[0.1em]">ADIOS</span>
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
          <TooltipProvider delayDuration={0}>
            {hasPermission(permissions, RESOURCES.DASHBOARD) && (
            <SidebarItem 
              href="/dashboard" 
              label="Home" 
              icon={Home} 
              isOpen={isSidebarOpen} 
              isActive={pathname === "/dashboard"} 
            />
          )}
          {hasPermission(permissions, RESOURCES.INTEL) && (
            <SidebarItem 
              href="/service-analytics" 
              label="Intelligence Hub" 
              icon={BarChart3} 
              isOpen={isSidebarOpen} 
              isActive={pathname === "/service-analytics"} 
            />
          )}
          {hasPermission(permissions, RESOURCES.REPORTS) && (
            <SidebarItem 
              href="/service-analytics/reports" 
              label="Analytical Reports" 
              icon={FileText} 
              isOpen={isSidebarOpen} 
              isActive={pathname === "/service-analytics/reports"} 
            />
          )}
          {canAccessWorkspace && (
            <>
              <SidebarItem 
                label="Workspace" 
                icon={Kanban} 
                isOpen={isSidebarOpen} 
                isActive={pathname.startsWith("/workspace")}
                href="/workspace/my-tasks"
                onClick={() => toggleGroup("workspace")}
                onMouseEnter={() => isSidebarOpen && setExpandedGroup("workspace")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "workspace"}
                subItems={[
                  { href: "/workspace", label: "All Workspaces", icon: Kanban },
                  { href: "/workspace/my-tasks", label: "My Tasks", icon: CheckSquare },
                  { href: "/workspace/tasks", label: "Add Task", icon: ListTodo },
                ]}
              />
              {expandedGroup === "workspace" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SidebarSubItem href="/workspace" label="All Workspaces" isOpen={isSidebarOpen} icon={Kanban} />
                  <SidebarSubItem href="/workspace/my-tasks" label="My Tasks" isOpen={isSidebarOpen} icon={CheckSquare} />
                  <SidebarSubItem href="/workspace/tasks" label="Add Task" isOpen={isSidebarOpen} icon={ListTodo} />
                </div>
              )}
            </>
          )}

          {canAccessTickets && (
            <>
              <SidebarItem 
                label="Support Queue" 
                icon={Ticket} 
                isOpen={isSidebarOpen} 
                isActive={pathname.startsWith("/tickets") && !pathname.includes("catalog") && pathname !== "/tickets/new"} 
                onClick={() => toggleGroup("support")}
                onMouseEnter={() => isSidebarOpen && setExpandedGroup("support")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "support"}
                subItems={[
                  { href: "/tickets", label: "All Tickets", icon: Ticket },
                  { href: "/tickets?status=new", label: "New Tickets", icon: PlusCircle },
                  { href: "/tickets?status=assigned", label: "Assigned", icon: User },
                  { href: "/tickets?status=in_progress", label: "In Progress", icon: Activity },
                  { href: "/tickets?status=pending_user", label: "Pending (User)", icon: Clock },
                  { href: "/tickets?status=resolved", label: "Resolved", icon: CheckCircle2 },
                  { href: "/tickets?status=closed", label: "Closed Archive", icon: Archive },
                ]}
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
            </>
          )}

          {canAccessTickets && (
            <>
              <SidebarItem 
                label="Requirement Registry" 
                icon={FileCode} 
                isOpen={isSidebarOpen} 
                isActive={pathname.startsWith("/tickets/requests")} 
                onClick={() => toggleGroup("requirements")}
                onMouseEnter={() => isSidebarOpen && setExpandedGroup("requirements")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "requirements"}
                subItems={[
                  { href: "/tickets/requests", label: "All Requirements", icon: FileCode },
                  { href: "/settings/notifications", label: "Message Governance", icon: Mail },
                ]}
              />
              {expandedGroup === "requirements" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <SidebarSubItem href="/tickets/requests" label="All Requirements" isOpen={isSidebarOpen} />
                  <SidebarSubItem href="/settings/notifications" label="Message Governance" isOpen={isSidebarOpen} />
                </div>
              )}
            </>
          )}

          {hasPermission(permissions, RESOURCES.TICKETS, "create") && (
            <SidebarItem 
              href="/tickets/new" 
              label="Create Ticket" 
              icon={PlusCircle} 
              isOpen={isSidebarOpen} 
              isActive={pathname === "/tickets/new"} 
            />
          )}
          

          {canAccessMasters && (
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
                isActive={pathname.startsWith("/settings/masters") && !pathname.includes("access-control") && !pathname.includes("assets")}
                onClick={() => toggleGroup("masters")}
                onMouseEnter={() => isSidebarOpen && setExpandedGroup("masters")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "masters"}
                subItems={[
                  ...(hasPermission(permissions, RESOURCES.USERS) ? [{ href: "/settings/masters/users", label: "User Directory", icon: User }] : []),
                  ...(hasPermission(permissions, RESOURCES.ERP) ? [{ href: "/settings/masters/erp", label: "ERP Systems", icon: Fingerprint }] : []),
                  ...(hasPermission(permissions, RESOURCES.HELP_DESK_MASTER) ? [{ href: "/settings/masters/help-desk", label: "Help Desk Setup", icon: Zap }] : []),
                  ...(hasPermission(permissions, RESOURCES.ORGS) ? [{ href: "/settings/masters/organizations", label: "Org Entities", icon: Building2 }] : []),
                ]}
              />
              {expandedGroup === "masters" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {hasPermission(permissions, RESOURCES.USERS) && <SidebarSubItem href="/settings/masters/users" label="User Directory" isOpen={isSidebarOpen} />}
                  {hasPermission(permissions, RESOURCES.ERP) && <SidebarSubItem href="/settings/masters/erp" label="ERP Systems" isOpen={isSidebarOpen} />}
                  {hasPermission(permissions, RESOURCES.HELP_DESK_MASTER) && <SidebarSubItem href="/settings/masters/help-desk" label="Help Desk Setup" isOpen={isSidebarOpen} />}
                  {hasPermission(permissions, RESOURCES.ORGS) && <SidebarSubItem href="/settings/masters/organizations" label="Org Entities" isOpen={isSidebarOpen} />}
                </div>
              )}
            </div>
          )}

          {canAccessSecurity && (
            <div className="py-1">
              {isSidebarOpen && (
                <div className="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 font-sans">
                  System Config
                </div>
              )}
              <SidebarItem 
                label="Security & Mail" 
                icon={Shield} 
                isOpen={isSidebarOpen} 
                isActive={pathname.includes("access-control") || pathname.includes("mail")}
                onClick={() => toggleGroup("settings")}
                onMouseEnter={() => isSidebarOpen && setExpandedGroup("settings")}
                hasSubItems
                isSubItemExpanded={expandedGroup === "settings"}
                subItems={[
                  ...(hasPermission(permissions, RESOURCES.ACCESS) ? [{ href: "/settings/masters/access-control", label: "Permissions & Roles", icon: ShieldCheck }] : []),
                  ...(hasPermission(permissions, RESOURCES.MAIL) ? [{ href: "/settings/mail", label: "Mail Protocol", icon: Mail }] : []),
                ]}
              />
              {expandedGroup === "settings" && isSidebarOpen && (
                <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {hasPermission(permissions, RESOURCES.ACCESS) && <SidebarSubItem href="/settings/masters/access-control" label="Permissions & Roles" isOpen={isSidebarOpen} />}
                  {hasPermission(permissions, RESOURCES.MAIL) && <SidebarSubItem href="/settings/mail" label="Mail Protocol" isOpen={isSidebarOpen} />}
                </div>
              )}
            </div>
          )}

          {hasPermission(permissions, RESOURCES.THEMES) && (
            <div className="py-1">
               {isSidebarOpen && (
                  <div className="px-4 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 font-sans">
                    Preferences
                  </div>
                )}
                <SidebarItem 
                  href="/settings?tab=themes"
                  label="Settings & Themes" 
                  icon={Settings} 
                  isOpen={isSidebarOpen} 
                  isActive={pathname === "/settings"} 
                />
            </div>
          )}

          <SidebarItem 
            href="/profile" 
            label="My Account" 
            icon={User} 
            isOpen={isSidebarOpen} 
            isActive={pathname === "/profile"}            
          />
          </TooltipProvider>
        </div>

        <div className="px-3 pt-2 border-t border-border/20 mt-auto pb-0">
          <button
            onClick={toggleNavMode}
            className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all text-[9px] font-bold uppercase tracking-widest group/mode font-sans"
          >
            <Layout className={cn("h-3.5 w-3.5 shrink-0 transition-transform group-hover/mode:rotate-90", !isSidebarOpen && "mx-auto")} />
            {isSidebarOpen && <span className="truncate">Horizontal View</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
