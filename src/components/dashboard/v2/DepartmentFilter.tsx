"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Building2, Filter } from "lucide-react";

export function DepartmentFilter({ 
  currentDept, 
  departments = [] 
}: { 
  currentDept: string | null;
  departments?: { id: string, name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("dept");
    } else {
      params.set("dept", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-border/40 shadow-sm transition-all hover:border-primary/40 group">
        <Filter className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
        <span className="text-[11px] font-black uppercase text-slate-400 group-hover:text-primary transition-colors tracking-widest leading-none">Filter By Dept</span>
      </div>
      
      <Select value={currentDept || "all"} onValueChange={handleValueChange}>
        <SelectTrigger className="h-11 w-[220px] rounded-xl border-border/40 bg-white shadow-sm font-sans font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <SelectValue placeholder="Select Department" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/40 bg-white shadow-2xl font-sans font-bold">
          <SelectItem value="all" className="rounded-lg text-[11px] font-bold uppercase tracking-widest focus:bg-primary/5 focus:text-primary py-3">
            All Departments
          </SelectItem>
          {departments.map(dept => (
            <SelectItem key={dept.id} value={dept.id} className="rounded-lg text-[11px] font-bold uppercase tracking-widest focus:bg-primary/5 focus:text-primary py-3">
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
