import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ThemeOrnaments } from "@/components/theme-ornaments";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  const [profile, permissions] = await Promise.all([
    supabase.from("profiles").select("id, force_password_change, role, full_name").eq("id", user.id).single()
      .then(res => res.data || (user ? ensureProfile(supabase, user, res.data) : null)),
    getUserPermissions(user.id)
  ]);

  if (profile?.force_password_change && !user.app_metadata?.bypass_force_change) {
    redirect("/change-password");
  }

  // HEAVY GATE: Matrix-backed security enforcement
  if (!hasPermission(permissions, RESOURCES.INTEL)) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[#16192c] text-white selection:bg-[#00f2ff]/30 overflow-x-hidden">
      <ThemeOrnaments />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
