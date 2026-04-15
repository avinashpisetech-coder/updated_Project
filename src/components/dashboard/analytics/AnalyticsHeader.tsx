"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, ChevronLeft } from "lucide-react";

export function AnalyticsHeader() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => setTime(format(new Date(), "HH:mm:ss"));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentVersion = searchParams.get("version") || "v1";

  const handleVersionChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("version", v);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-[#16192c] border-b border-[#2d314d] text-white gap-4 print:hidden">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#00f2ff] hover:bg-[#00f2ff]/10 hover:border-[#00f2ff]/30 transition-all text-[10px] font-black uppercase tracking-widest group"
          >
             <Home size={12} className="group-hover:scale-110 transition-transform" />
             Back to Home
          </button>
          <div className="h-4 w-px bg-[#2d314d] mr-2" />
          <div className="h-2 w-2 rounded-full bg-[#00f2ff] animate-pulse shadow-[0_0_8px_#00f2ff]" />
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase opacity-90">
             Intelligence Hub
          </h1>
        </div>

        {/* Dynamic Version Hub */}
        <div className="flex items-center gap-2 bg-[#20233d] p-1 rounded-lg border border-[#2d314d]">
          <button 
            onClick={() => handleVersionChange("v1")}
            className={cn(
              "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all",
              currentVersion === "v1" 
                ? "bg-[#00f2ff] text-[#16192c] shadow-[0_0_10px_#00f2ff/40]" 
                : "text-white/40 hover:text-white/70"
            )}
          >
            v1
          </button>
          <button 
            onClick={() => handleVersionChange("v2")}
            className={cn(
              "px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all",
              currentVersion === "v2" 
                ? "bg-[#00f2ff] text-[#16192c] shadow-[0_0_10px_#00f2ff/40]" 
                : "text-white/40 hover:text-white/70"
            )}
          >
            v2
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono tracking-wider opacity-60">
        <div className="hidden md:flex items-center gap-2 mr-4 border-r border-[#2d314d] pr-4">
           <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
           <span className="text-[9px] font-bold uppercase text-emerald-500/60 tracking-widest">System Online</span>
        </div>
        <span className="px-2 py-1 bg-[#20233d] rounded border border-[#2d314d]">
          {time}
        </span>
        <span className="hidden sm:inline opacity-40">UTC+05:30</span>
      </div>
    </header>
  );
}
