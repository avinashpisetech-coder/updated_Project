import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/supabase/server";
import { AssetSystemSidebar } from "@/components/AssetSystemSidebar";
import { NavigationProvider } from "@/components/providers/NavigationProvider";
import { cn } from "@/lib/utils";
import { AssetMainContent } from "./AssetMainContent";

export default async function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  if (!user) redirect("/login");

  return (
    <NavigationProvider>
      <div className="relative min-h-screen flex bg-background text-foreground selection:bg-primary/10 selection:text-primary overflow-hidden font-sans antialiased">
        {/* Background Visual Protocol - Synchronized with ADIOS Theme Matrix */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,var(--theme-spot-a),transparent)] opacity-40" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse:60%_50%_at:50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <AssetSystemSidebar />
        
        <AssetMainContent>
            {children}
        </AssetMainContent>

      </div>
    </NavigationProvider>
  );
}
