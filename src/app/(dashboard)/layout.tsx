import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ensureProfile } from "@/lib/ensure-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { getUnreadNotifications } from "@/app/(dashboard)/tickets/actions";
import { NavigationProvider } from "@/components/providers/NavigationProvider";
import { DashboardShell } from "@/components/DashboardShell";
import { TopBar } from "@/components/TopBar";
import { SessionGuard } from "@/components/providers/SessionGuard";

import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

import { CommandPalette } from "@/components/CommandPalette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  // Performance: fetch profile, permissions, notifications, and cross-module assignments in parallel
  const [profile, permissions, notifications, assignmentStatus] = await Promise.all([
    supabase.from("profiles").select("id, force_password_change, role, full_name, current_session_id").eq("id", user.id).single()
      .then(res => res.data || ensureProfile(supabase, user, res.data)),
    getUserPermissions(user.id),
    getUnreadNotifications().catch(() => []),
    Promise.all([
      supabase.from("task_assignees").select("task_id", { count: 'exact', head: true }).eq("profile_id", user.id).then(res => (res.count || 0) > 0),
      // Split OR into two parallel checks for better indexing performance
      Promise.all([
        supabase.from("tickets").select("id", { count: 'exact', head: true }).eq("assigned_to_id", user.id).limit(1).then(res => (res.count || 0) > 0),
        supabase.from("tickets").select("id", { count: 'exact', head: true }).eq("requester_id", user.id).limit(1).then(res => (res.count || 0) > 0)
      ]).then(([assigned, requested]) => assigned || requested)
    ]).then(([tasks, tickets]) => ({ tasks, tickets }))
  ]);

  if (profile?.force_password_change && !user.app_metadata?.bypass_force_change) {
    redirect("/change-password");
  }

  // Dynamic Capability Resolution (Matrix-Backed)
  const canAccessMasters = hasPermission(permissions, RESOURCES.USERS) || 
                           hasPermission(permissions, RESOURCES.ERP) || 
                           hasPermission(permissions, RESOURCES.HELP_DESK_MASTER);
                           
  const canAccessSecurity = hasPermission(permissions, RESOURCES.ACCESS) || 
                       hasPermission(permissions, RESOURCES.MAIL);

  const canAccessWorkspace = hasPermission(permissions, RESOURCES.WORKSPACE) || assignmentStatus.tasks;
  const canAccessTickets = hasPermission(permissions, RESOURCES.TICKETS) || hasPermission(permissions, RESOURCES.SUPPORT_QUEUE) || assignmentStatus.tickets;

  return (
    <NavigationProvider>
      <SessionGuard>
        <div className="relative min-h-screen flex flex-col text-foreground selection:bg-primary/30 selection:text-white overflow-x-hidden">
          <Navbar 
            canAccessMasters={canAccessMasters} 
            canAccessSecurity={canAccessSecurity} 
            profile={profile} 
            permissions={permissions} 
            notifications={notifications} 
          />
          <Sidebar 
            canAccessMasters={canAccessMasters} 
            canAccessSecurity={canAccessSecurity} 
            canAccessWorkspace={canAccessWorkspace}
            canAccessTickets={canAccessTickets}
            profile={profile} 
            permissions={permissions} 
            notifications={notifications} 
          />
          <TopBar profile={profile} notifications={notifications} />

          <DashboardShell>
            {children}
          </DashboardShell>
          
          <CommandPalette />
        </div>
      </SessionGuard>
    </NavigationProvider>
  );
}
