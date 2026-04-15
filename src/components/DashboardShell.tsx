"use client";

import { useNavigation } from "./providers/NavigationProvider";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageScene } from "@/components/page-scene";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, navMode } = useNavigation();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isVersioned = searchParams.get("version") !== null;

  // Standalone analytical view: remove shell constraints (but not for main dashboard anymore)
  if (pathname === "/service-analytics" || isVersioned) {
    return (
      <main className="flex-1 w-full relative">
         <PageScene>{children}</PageScene>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "dashboard-shell relative z-10 flex-1 p-2 sm:p-4 bg-muted/20 transition-all duration-300 ease-in-out",
        navMode === "horizontal" ? "pt-20" : "pt-4"
      )}
      style={{
        marginLeft: navMode === "vertical" ? "var(--sidebar-width, 256px)" : 0,
        width: navMode === "vertical"
          ? "calc(100vw - var(--sidebar-width, 256px))"
          : "100vw",
        minHeight: "100vh",
      }}
    >
      <div className="w-full h-full transition-all duration-500 ease-in-out">
        <PageScene>{children}</PageScene>
      </div>
    </main>
  );
}
