"use client";

import React from "react";

interface LeaderboardProps {
  title: string;
  items: { name: string; score: string | number; detail?: string }[];
  accentColor?: string;
}

export function Leaderboard({ title, items, accentColor = "#00f2ff" }: LeaderboardProps) {
  return (
    <div className="flex flex-col h-full bg-[#1a1d33] rounded-lg border border-[#2d314d] overflow-hidden group shadow-2xl">
      <div className="px-4 py-3 bg-[#131526] border-b border-[#2d314d] flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#64748b] group-hover:text-[#00f2ff] transition-colors">
          {title}
        </span>
        <div className="h-1 w-8 rounded-full bg-[#2d314d] animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth divide-y divide-[#2d314d]/30">
        {items.map((item, index) => (
          <div 
            key={`${item.name}-${index}`} 
            className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] hover:pl-5 transition-all duration-300 animate-in fade-in slide-in-from-right-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-[#505a72] w-4 font-mono">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-[11px] font-bold text-[#78dce8] whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]">
                {item.name}
              </span>
            </div>
            <div className="flex flex-col items-end">
                <span 
                className="text-xs font-mono font-black"
                style={{ color: accentColor }}
                >
                {item.score}
                </span>
                {item.detail && (
                    <span className="text-[9px] font-black text-[#8b9bb4] uppercase tracking-tighter">
                        {item.detail}
                    </span>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
