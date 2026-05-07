"use client";

import { useNavigation } from "./providers/NavigationProvider";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, navMode } = useNavigation();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isVersioned = searchParams.get("version") !== null;

  // Standalone analytical view: remove shell constraints (but not for main dashboard anymore)
  if (pathname === "/service-analytics" || isVersioned) {
    return (
      <main className="flex-1 w-full relative">
         {children}
      </main>
    );
  }

  return (
    <main
      className={cn(
        "dashboard-shell relative z-10 flex-1 p-2 sm:p-4 bg-muted/20 transition-all duration-300 ease-in-out",
        "pt-24"
      )}
      style={{
        paddingTop: "64px",
        marginLeft: navMode === "vertical" ? "var(--sidebar-width, 256px)" : 0,
        width: navMode === "vertical"
          ? "calc(100% - var(--sidebar-width, 256px))"
          : "100%",
        minHeight: "100vh",
      }}
    >
      <div className="w-full h-full transition-all duration-500 ease-in-out">
        {children}
      </div>
    </main>
  );
}
