"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MetricBlockProps {
  label: string;
  value: string;
  subLabel?: string;
  variant?: "default" | "warning" | "success" | "destructive";
}

export function MetricBlock({ label, value, subLabel, variant = "default" }: MetricBlockProps) {
  const colors = {
    default: "text-white opacity-90",
    warning: "text-[#fde047]",
    success: "text-[#4ade80]",
    destructive: "text-red-500"
  };

  return (
    <div className="p-5 bg-[#20233d] rounded-lg border border-[#2d314d] hover:border-[#00f2ff]/30 hover:bg-[#252845] transition-all duration-300 group shadow-md shadow-black/10">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b] group-hover:text-[#00f2ff] transition-colors mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className={cn("text-2xl font-black tracking-tighter font-sans", colors[variant])}>
          {value}
        </p>
        {subLabel && (
          <span className="text-[10px] font-bold text-[#64748b] opacity-60">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function AlertCard({ title, value, subTitle }: { title: string; value: number | string; subTitle?: string }) {
  return (
    <div className="p-6 bg-[#3b1e2a] rounded-lg border border-[#4d2d38] group transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(239,68,68,0.15)] relative overflow-hidden h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <div className="h-12 w-12 rounded-full bg-red-500 animate-ping duration-[3000ms]" />
      </div>
      <p className="text-4xl font-black text-red-500 tracking-tighter mb-1 animate-pulse">
        {value}
      </p>
      <p className="text-xs font-bold uppercase tracking-widest text-red-400 opacity-90">
        {title}
      </p>
      {subTitle && (
        <p className="mt-4 text-[9px] font-medium text-red-400 opacity-50 uppercase tracking-widest">
          {subTitle}
        </p>
      )}
    </div>
  );
}
