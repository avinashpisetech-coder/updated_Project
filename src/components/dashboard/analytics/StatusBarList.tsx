"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  label: string;
  value: number;
  total?: number;
  color?: string;
}

function StatusBar({ label, value, total = 500, color = "#00f2ff" }: StatusBarProps) {
  const percentage = Math.min((value / total) * 100, 100);

  return (
    <div className="space-y-1.5 group">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold text-[#64748b] group-hover:text-[#00f2ff] transition-colors uppercase tracking-widest">
          {label}
        </span>
        <div className="flex gap-2 items-center">
          <span className="text-[9px] font-bold text-[#64748b]">
            {Math.round((value / total) * 100)}%
          </span>
          <span className="text-xs font-mono font-bold text-white/90">
            {value}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-[#2d314d] rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,242,255,0.3)]"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function StatusBarList({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map(s => s.value), 1);

  return (
    <div className="space-y-4 py-2">
      {data.map((stat) => (
        <StatusBar 
          key={stat.label} 
          label={stat.label} 
          value={stat.value} 
          total={maxVal * 1.1} 
        />
      ))}
    </div>
  );
}
