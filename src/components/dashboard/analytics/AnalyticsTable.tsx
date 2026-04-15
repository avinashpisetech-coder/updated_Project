import React from "react";
import { cn } from "@/lib/utils";

interface UserMetric {
  name: string;
  raised: number;
  assigned: number;
  resolved: number;
  percentage: number;
  rating: number;
}

export function AnalyticsTable({ data }: { data: UserMetric[] }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#20233d] rounded-lg border border-[#2d314d] overflow-hidden group">
      <div className="p-5 border-b border-[#2d314d] flex justify-between items-center bg-[#252845]/50">
        <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-[0.2em]">Service Performance Registry</span>
        <div className="h-1.5 w-1.5 rounded-full bg-[#00f2ff] shadow-[0_0_8px_#00f2ff] animate-pulse" />
      </div>
      
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2d314d] bg-[#16192c]/30">
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider">Agent Node</th>
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider text-center">Raised</th>
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider text-center">Assigned</th>
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider text-center">Resolved</th>
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider text-center">Res %</th>
              <th className="px-4 py-3 text-[9px] font-bold text-[#64748b] uppercase tracking-wider text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d314d]/50">
            {data.map((user, i) => (
              <tr key={i} className="hover:bg-[#00f2ff]/5 transition-colors group/row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-[#2d314d] flex items-center justify-center text-[10px] font-bold text-white group-hover/row:bg-[#00f2ff] group-hover/row:text-[#16192c] transition-colors">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-[#78dce8]">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-[11px] font-mono text-[#a5abbf]">{user.raised}</td>
                <td className="px-4 py-3 text-center text-[11px] font-mono text-[#64748b]">{user.assigned}</td>
                <td className="px-4 py-3 text-center text-[11px] font-mono text-[#4ade80]">{user.resolved}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    user.percentage >= 80 ? "bg-[#4ade80]/10 text-[#4ade80]" : "bg-[#fde047]/10 text-[#fde047]"
                  )}>
                    {user.percentage}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                   <div className="flex items-center justify-end gap-1">
                      <div className="h-1 w-8 bg-[#2d314d] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#00f2ff]" 
                          style={{ width: `${user.rating * 20}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/50">{user.rating}</span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
