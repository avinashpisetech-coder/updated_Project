"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { LayoutDashboard } from "lucide-react";

export function DashboardVersionSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Only show on dashboard/analytics pages
  if (pathname !== "/dashboard" && pathname !== "/analytics" && pathname !== "/service-analytics") {
    return null;
  }

  const currentVersion = searchParams.get("version") || "v1";

  const handleVersionChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("version", value);
    window.open(`${pathname}?${params.toString()}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentVersion} onValueChange={handleVersionChange}>
        <SelectTrigger className="h-9 w-[180px] rounded-xl border-border/40 bg-background/50 backdrop-blur-sm transition-all hover:bg-muted/50 font-sans">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-tight">
              {currentVersion === "v1" ? "Dashboard v1" : "Dashboard v2"}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-md shadow-2xl font-sans">
          <SelectItem value="v1" className="rounded-lg text-[11px] font-bold uppercase tracking-widest focus:bg-primary/10 focus:text-primary py-2.5">
            Protocol Alpha (v1)
          </SelectItem>
          <SelectItem value="v2" className="rounded-lg text-[11px] font-bold uppercase tracking-widest focus:bg-primary/10 focus:text-primary py-2.5">
            Enterprise Grid (v2)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
