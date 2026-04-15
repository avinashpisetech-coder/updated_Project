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
  LogOut,
  ChevronDown,
  Settings,
  Monitor,
  Layout,
  Fingerprint,
  Zap,
  Home,
  Package,
  Palette,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigation } from "./providers/NavigationProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileRow } from "@/lib/ensure-profile";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "./BackButton";
import { DashboardVersionSwitcher } from "./dashboard/DashboardVersionSwitcher";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
}

function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      target={label === "Intelligence" ? "_blank" : undefined}
      rel={label === "Intelligence" ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 group relative",
        isActive 
          ? "text-primary bg-primary/5" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
      )} />
      <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span>
      {isActive && (
        <span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
      )}
    </Link>
  );
}

import { Permission, hasPermission, RESOURCES } from "@/lib/permissions";

export function Navbar({ 
  canAccessMasters, 
  canAccessSecurity,
  profile,
  permissions = []
}: { 
  canAccessMasters: boolean; 
  canAccessSecurity: boolean;
  profile: ProfileRow | null;
  permissions?: Permission[];
}) {
  const { navMode, toggleNavMode } = useNavigation();
  const pathname = usePathname();

  if (navMode === "vertical") return null;

  const searchParams = useSearchParams();
  const isVersioned = searchParams.get("version") !== null;

  // Standalone analytical view: hide navbar on main dashboards
  if (pathname === "/service-analytics" || isVersioned) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-500 font-sans antialiased">
      <div className="mx-auto max-w-7xl h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 mr-4 select-none group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/20 ring-1 ring-primary/20 transition-transform active:scale-95">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight uppercase text-foreground/90 group-hover:text-primary transition-colors tracking-[0.1em]">EIRMS</span>
              <span className="text-[8px] text-primary uppercase tracking-[0.2em] font-bold opacity-40">Portal</span>
            </div>
          </Link>

          <div className="mr-4 h-8 w-px bg-border/40" />
          <BackButton showLabel={true} variant="ghost" className="mr-2" />

          <div className="flex items-center gap-1 font-sans">
            {hasPermission(permissions, RESOURCES.DASHBOARD) && <NavItem href="/dashboard" label="Home" icon={Home} />}
            {hasPermission(permissions, RESOURCES.INTEL) && <NavItem href="/service-analytics" label="Intelligence" icon={BarChart3} />}
            {hasPermission(permissions, RESOURCES.TICKETS) && <NavItem href="/tickets" label="Support Queue" icon={Ticket} />}
            {hasPermission(permissions, RESOURCES.ASSETS) && <NavItem href="/assets" label="Assets" icon={Package} />}
            {hasPermission(permissions, RESOURCES.THEMES) && <NavItem href="/settings?tab=themes" label="Themes" icon={Palette} />}
            {hasPermission(permissions, RESOURCES.TICKETS, "create") && <NavItem href="/tickets/new" label="Create Ticket" icon={PlusCircle} />}
            
            {canAccessMasters && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-bold uppercase tracking-tight",
                      pathname.startsWith("/settings/masters") && !pathname.includes("access-control")
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="text-[13px]">Administration</span>
                    <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-hover:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-2 rounded-2xl border-border/40 bg-card/95 backdrop-blur shadow-2xl mt-1 animate-in fade-in slide-in-from-top-2 duration-300 font-sans">
                  {hasPermission(permissions, RESOURCES.USERS) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/masters/users" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">User Directory</Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(permissions, RESOURCES.ERP) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/masters/erp" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">ERP Systems</Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(permissions, RESOURCES.HELP_DESK_MASTER) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/masters/help-desk" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">Help Desk Setup</Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(permissions, RESOURCES.ORGS) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/masters/organizations" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">Org Entities</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {canAccessSecurity && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-bold uppercase tracking-tight",
                      pathname.startsWith("/settings") && (!pathname.includes("masters") || pathname.includes("access-control")) || pathname.includes("/settings/mail")
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-[13px]">Systems</span>
                    <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-hover:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-2 rounded-2xl border-border/40 bg-card/95 backdrop-blur shadow-2xl mt-1 animate-in fade-in slide-in-from-top-2 duration-300 font-sans">
                  {hasPermission(permissions, RESOURCES.THEMES) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">Core Parameters</Link>
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-border/40 my-1 mx-1" />
                  {hasPermission(permissions, RESOURCES.ACCESS) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/masters/access-control" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">Security & IAM</Link>
                    </DropdownMenuItem>
                  )}
                  {hasPermission(permissions, RESOURCES.MAIL) && (
                    <DropdownMenuItem asChild className="rounded-xl focus:bg-primary/10 focus:text-primary">
                      <Link href="/settings/mail" className="cursor-pointer text-[11px] font-bold uppercase tracking-widest p-3">Mail Protocol</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <NavItem href="/profile" label="My Account" icon={User} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DashboardVersionSwitcher />
          
          {/* User Info */}
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-muted/20 border border-border/40 overflow-hidden font-sans">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary opacity-60" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-foreground truncate">
                {profile?.full_name || "Authorized User"}
              </span>
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider opacity-60">
                {profile?.role?.replace("_", " ") || "Member"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-border/40 pl-4 font-sans">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNavMode}
              className="rounded-xl h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group/mode"
              title="Switch to Sidebar Layout"
            >
              <Layout className="h-5 w-5 rotate-90 transition-transform group-hover:scale-110" />
            </Button>

            <form action="/api/auth/signout" method="POST">
              <Button 
                type="submit" 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all group/logout"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
