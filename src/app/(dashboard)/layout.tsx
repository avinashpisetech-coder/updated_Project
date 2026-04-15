import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ensureProfile } from "@/lib/ensure-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeOrnaments } from "@/components/theme-ornaments";
import { PageScene } from "@/components/page-scene";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { getUnreadNotifications } from "@/app/(dashboard)/tickets/actions";
import { NavigationProvider } from "@/components/providers/NavigationProvider";
import { DashboardShell } from "@/components/DashboardShell";

import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  // Performance: fetch profile and permissions in parallel
  const [profile, permissions, notifications] = await Promise.all([
    supabase.from("profiles").select("id, force_password_change, role, full_name").eq("id", user.id).single()
      .then(res => res.data || ensureProfile(supabase, user, res.data)),
    getUserPermissions(user.id),
    getUnreadNotifications().catch(() => [])
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

  return (
    <NavigationProvider>
      <div className="relative min-h-screen flex flex-col text-foreground selection:bg-primary/30 selection:text-white overflow-x-hidden">
        <ThemeOrnaments />
        <Navbar canAccessMasters={canAccessMasters} canAccessSecurity={canAccessSecurity} profile={profile} permissions={permissions} notifications={notifications} />
        <Sidebar canAccessMasters={canAccessMasters} canAccessSecurity={canAccessSecurity} profile={profile} permissions={permissions} notifications={notifications} />

        <DashboardShell>
          {children}
        </DashboardShell>
      </div>
    </NavigationProvider>
  );
}
