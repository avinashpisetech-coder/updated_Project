"use client";

import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from "recharts";
import { format } from "date-fns";

export function VolumeChart({ data }: { data: { date: string; count: number }[] }) {
  const chartData = data.map(d => ({
    day: format(new Date(d.date), "d MMM"),
    volume: d.count
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00f2ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
            hide
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#20233d", 
              border: "1px solid #2d314d",
              borderRadius: "8px",
              fontSize: "10px",
              color: "#fff"
            }}
            itemStyle={{ color: "#00f2ff" }}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#00f2ff"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVolume)"
            animationBegin={300}
            animationDuration={2000}
          >
            <LabelList 
              dataKey="volume" 
              position="top" 
              style={{ fill: "#00f2ff", fontSize: 9, fontWeight: 700, opacity: 0.8 }} 
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
