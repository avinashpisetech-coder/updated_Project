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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  // Performance: fetch profile with explicit ID filter to bypass heavy RLS scans
  const [profile, notifications] = await Promise.all([
    supabase.from("profiles").select("id, force_password_change, role, full_name").eq("id", user.id).single()
      .then(res => res.data || ensureProfile(supabase, user, res.data)),
    getUnreadNotifications().catch(() => [])
  ]);

  if (profile?.force_password_change && !user.app_metadata?.bypass_force_change) {
    redirect("/change-password");
  }

  const userRole = profile?.role ?? "end_user";
  const canManageMasters = userRole === "super_admin" || userRole === "dept_admin";
  const isSuperAdmin = userRole === "super_admin";

  return (
    <NavigationProvider>
      <div className="relative min-h-screen flex flex-col text-foreground selection:bg-primary/30 selection:text-white overflow-x-hidden">
        <ThemeOrnaments />
        <Navbar canManageMasters={canManageMasters} isSuperAdmin={isSuperAdmin} profile={profile} />
        <Sidebar canManageMasters={canManageMasters} isSuperAdmin={isSuperAdmin} profile={profile} />
        
        {/* Top right utility bar for notifications */}
        <div className="fixed top-6 right-[8%] z-[110] flex items-center gap-3">
          <NotificationBell initial={notifications} />
        </div>

        <DashboardShell>
          {children}
        </DashboardShell>
      </div>
    </NavigationProvider>
  );
}
