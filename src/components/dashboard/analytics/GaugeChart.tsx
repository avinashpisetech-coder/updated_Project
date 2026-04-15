"use client";

import React from "react";
import { 
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer, 
  PolarAngleAxis 
} from "recharts";
import { cn } from "@/lib/utils";

interface GaugeValue {
    value: number;
    label: string;
    fill: string;
}

interface GaugeChartProps {
  values: GaugeValue[];
  label: string;
  secondaryLabel?: string;
}

export function GaugeChart({ 
  values, 
  label, 
  secondaryLabel
}: GaugeChartProps) {
  return (
    <div className="relative h-48 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="75%"
          innerRadius="60%"
          outerRadius="135%"
          barSize={12}
          data={values}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            cornerRadius={30}
            dataKey="value"
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-[12%] flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-1">
            {values.map((v, i) => (
                <div key={i} className="flex items-baseline gap-0.5">
                    <span 
                        className={cn("font-extrabold tracking-tighter", i === 0 ? "text-4xl text-white" : "text-xl")}
                        style={{ color: i === 0 ? undefined : v.fill }}
                    >
                        {v.value}
                    </span>
                    <span className="text-[10px] font-extrabold opacity-30">%</span>
                    {i < values.length - 1 && <span className="mx-1 text-white/10">|</span>}
                </div>
            ))}
        </div>
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#64748b] mt-1">
          {label}
        </span>
        {secondaryLabel && (
            <span className="mt-1 text-[8px] font-extrabold text-[#4ade80] uppercase tracking-[0.2em] bg-[#4ade80]/5 px-2 py-0.5 rounded border border-[#4ade80]/10">
                {secondaryLabel}
            </span>
        )}
      </div>
    </div>
  );
}
