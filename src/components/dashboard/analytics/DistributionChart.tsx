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

const COLORS = ["#00f2ff", "#4ade80", "#fde047", "#f472b6", "#a78bfa", "#2dd4bf"];

export function DistributionChart({ data, title }: { data: { name: string; count: number }[], title: string }) {
  // Sort data descending to show high volume first
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="w-full h-full flex flex-col bg-[#20233d] rounded-lg border border-[#2d314d] p-5 group">
      <div className="flex justify-between items-baseline mb-6">
        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em]">{title}</span>
        <div className="h-1.5 w-1.5 rounded-full bg-[#00f2ff] opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
      </div>
      
      <div className="flex-1 w-full min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ left: -20, right: 30 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
              width={80}
            />
            <Tooltip 
              cursor={{ fill: "rgba(0, 242, 255, 0.05)" }}
              contentStyle={{ 
                backgroundColor: "#20233d", 
                border: "1px solid #2d314d",
                borderRadius: "8px",
                fontSize: "10px",
                color: "#fff"
              }}
              itemStyle={{ color: "#00f2ff" }}
            />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]} 
              barSize={8}
              animationBegin={500}
              animationDuration={1500}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList 
                dataKey="count" 
                position="right" 
                style={{ fill: "#fff", fontSize: 9, fontWeight: 700, opacity: 0.6 }} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
