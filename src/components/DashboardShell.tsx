"use client";

import { useNavigation } from "./providers/NavigationProvider";
import { cn } from "@/lib/utils";
import { PageScene } from "@/components/page-scene";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, navMode } = useNavigation();

  return (
    <main className={cn(
      "dashboard-shell relative z-10 flex-1 p-2 sm:p-4 bg-muted/20 transition-all duration-300 ease-in-out",
      navMode === "horizontal" ? "pt-20" : "pt-4",
      navMode === "vertical" ? (isSidebarOpen ? "lg:ml-64 ml-0" : "lg:ml-20 ml-0") : "ml-0"
    )}>
      <div className="max-w-7xl mx-auto">
        <PageScene>{children}</PageScene>
      </div>
    </main>
  );
}
