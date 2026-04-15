import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { ThemeOrnaments } from "@/components/theme-ornaments";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const supabase = await createClient();

  if (!user) redirect("/login");

  const profile = await supabase.from("profiles").select("id, force_password_change, role, full_name").eq("id", user.id).single()
      .then(res => res.data || (user ? ensureProfile(supabase, user, res.data) : null));

  if (profile?.force_password_change && !user.app_metadata?.bypass_force_change) {
    redirect("/change-password");
  }

  const userRole = profile?.role ?? "end_user";
  const canManageMasters = userRole === "super_admin" || userRole === "dept_admin";
  const isSuperAdmin = userRole === "super_admin";

  return (
    <div className="relative min-h-screen flex flex-col bg-[#16192c] text-white selection:bg-[#00f2ff]/30 overflow-x-hidden">
      <ThemeOrnaments />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
