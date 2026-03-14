import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ensureProfile } from "@/lib/ensure-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  if (profile?.force_password_change && !user.app_metadata?.bypass_force_change) {
    redirect("/change-password");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold">
          EIRMS
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">Profile</Link>
          </Button>
          <form action="/api/auth/signout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
