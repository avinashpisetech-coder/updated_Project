"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Building2, 
  Filter, 
  Layers, 
  Tag, 
  User, 
  Activity, 
  Calendar,
  X,
  RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveFiltersProps {
  filterOptions: {
    departments: { id: string; name: string }[];
    modules: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    users: { id: string; name: string }[];
    statuses: string[];
  };
}

export function ExecutiveFilters({ filterOptions }: ExecutiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAll = () => {
    router.push(pathname);
  };

  const currentFilters = {
    dept: searchParams.get("dept") || "all",
    module: searchParams.get("module") || "all",
    category: searchParams.get("category") || "all",
    agent: searchParams.get("agent") || "all",
    status: searchParams.get("status") || "all",
    start: searchParams.get("start") || "",
    end: searchParams.get("end") || "",
  };

  return (
    <div className="flex flex-col gap-6 w-full lg:w-auto">
      <div className="flex flex-wrap items-center gap-3">
        {/* Department */}
        <FilterSelect 
          label="Department"
          icon={Building2}
          value={currentFilters.dept}
          options={filterOptions.departments}
          onValueChange={(v) => updateParam("dept", v)}
        />

        {/* Module */}
        <FilterSelect 
          label="Scope"
          icon={Layers}
          value={currentFilters.module}
          options={filterOptions.modules}
          onValueChange={(v) => updateParam("module", v)}
        />

        {/* Category */}
        <FilterSelect 
          label="Category"
          icon={Tag}
          value={currentFilters.category}
          options={filterOptions.categories}
          pluralLabel="Categories"
          onValueChange={(v) => updateParam("category", v)}
        />

        {/* Agent */}
        <FilterSelect 
          label="Agent"
          icon={User}
          value={currentFilters.agent}
          options={filterOptions.users}
          onValueChange={(v) => updateParam("agent", v)}
        />

        {/* Status */}
        <FilterSelect 
          label="Status"
          icon={Activity}
          value={currentFilters.status}
          options={filterOptions.statuses.map(s => ({ id: s, name: s.toUpperCase() }))}
          pluralLabel="Statuses"
          onValueChange={(v) => updateParam("status", v)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Temporal Inputs - Premium Calendar Style */}
        <div className="flex items-center gap-3 p-2 px-4 bg-white border border-border/40 rounded-2xl shadow-sm hover:border-primary/40 transition-all group">
           <div className="flex items-center gap-2 pr-3 border-r border-slate-100">
              <Calendar className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter leading-none mb-1">Commencement</span>
                 <input 
                    type="date" 
                    className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer" 
                    value={currentFilters.start}
                    onChange={(e) => updateParam("start", e.target.value)}
                 />
              </div>
              <div className="h-4 w-px bg-slate-100" />
              <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter leading-none mb-1">Termination</span>
                 <input 
                    type="date" 
                    className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer" 
                    value={currentFilters.end}
                    onChange={(e) => updateParam("end", e.target.value)}
                 />
              </div>
           </div>
        </div>

        <button 
          onClick={clearAll}
          className="flex items-center gap-2 px-6 h-[52px] rounded-2xl bg-slate-900 border border-slate-900 text-white hover:bg-white hover:text-rose-600 hover:border-rose-200 transition-all group shadow-lg shadow-slate-900/10"
        >
           <X className="h-4 w-4 group-hover:rotate-90 transition-transform" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clear Matrix</span>
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ 
  label, 
  icon: Icon, 
  value, 
  options, 
  pluralLabel,
  onValueChange 
}: { 
  label: string; 
  icon: any; 
  value: string; 
  options: { id: string; name: string }[]; 
  pluralLabel?: string;
  onValueChange: (v: string) => void;
}) {
  const displayPlural = pluralLabel || `${label}s`;
  
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-[52px] w-[200px] rounded-2xl border-border/40 bg-white shadow-sm font-sans font-bold text-slate-700 hover:border-primary/40 transition-all">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={cn(
             "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
             value !== "all" ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-400"
          )}>
             <Icon className="h-4 w-4 shrink-0" />
          </div>
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</span>
            <div className="truncate w-full max-w-[120px] text-left">
               <SelectValue placeholder={`All ${displayPlural}`} />
            </div>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-border/40 bg-white shadow-2xl font-sans font-bold min-w-[220px]">
        <SelectItem value="all" className="rounded-xl text-[11px] font-bold uppercase tracking-widest focus:bg-primary/5 focus:text-primary py-4">
          All {displayPlural}
        </SelectItem>
        <div className="h-px bg-slate-100 mx-2 my-1" />
        {options.map(opt => (
          <SelectItem key={opt.id} value={opt.id} className="rounded-xl text-[11px] font-bold tracking-tight focus:bg-primary/5 focus:text-primary py-4">
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
