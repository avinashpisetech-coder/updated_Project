"use client";

import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";

interface TemporalStats {
  label: string;
  raised: number;
  resolved: number;
}

export function MiniPerformanceChart({ data, title }: { data: TemporalStats[], title: string }) {
  // Take last 6 entries if monthwise to keep it compact
  const displayData = data.slice(-6);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-between items-baseline underline decoration-[#64748b]/30 underline-offset-4">
        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex-1 min-h-[120px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 20, right: 0, left: -40, bottom: 0 }}>
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 8, fontWeight: 700 }}
              dy={5}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#20233d", 
                border: "1px solid #2d314d",
                borderRadius: "4px",
                fontSize: "9px"
              }}
              labelStyle={{ color: "#64748b" }}
            />
            <Bar dataKey="raised" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} name="Raised">
              <LabelList 
                dataKey="raised" 
                position="top" 
                style={{ fill: "#00f2ff", fontSize: 8, fontWeight: 800 }} 
              />
            </Bar>
            <Bar dataKey="resolved" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} name="Resolved">
              <LabelList 
                dataKey="resolved"
                position="top"
                content={(props: any) => {
                    const { x, y, width, value, payload } = props;
                    const raised = payload?.raised || 0;
                    const perc = raised > 0 ? Math.round((value / raised) * 100) : 0;
                    if (!value) return null;
                    return (
                        <text 
                            x={x + width / 2} 
                            y={y - 8} 
                            fill="#ffffff" 
                            fontSize={7} 
                            fontWeight={900} 
                            textAnchor="middle"
                        >
                            {`${value} (${perc}%)`}
                        </text>
                    );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
          <span className="text-[8px] font-bold text-[#64748b] uppercase">Raised</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span className="text-[8px] font-bold text-[#64748b] uppercase">Resolved</span>
        </div>
      </div>
    </div>
  );
}
