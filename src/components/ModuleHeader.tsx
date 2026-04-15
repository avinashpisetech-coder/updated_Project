"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function ModuleHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
}: ModuleHeaderProps) {
  return (
    <header 
      className={cn(
        "flex h-14 shrink-0 items-center justify-between px-10 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl z-[60] sticky top-0 font-sans antialiased text-slate-900",
        className
      )}
    >
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            {icon ? (
              <div className="h-4 w-4 text-primary">{icon}</div>
            ) : (
              <div className="h-4 w-1 bg-primary rounded-full shadow-sm" />
            )}
            <h1 className="text-[15px] font-black tracking-tighter uppercase leading-none">
              {title.replace(/ /g, "_")}
            </h1>
          </div>
          {subtitle && (
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-4">
          {actions}
        </div>
      )}
    </header>
  );
}
