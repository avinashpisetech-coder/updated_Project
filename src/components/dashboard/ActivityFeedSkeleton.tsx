import React from "react";

export function ActivityFeedSkeleton() {
  return (
    <div className="divide-y divide-border/10">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-8 py-6 flex items-start gap-6 relative">
          {/* Subtle pulseline */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted scale-y-0 opacity-20" />
          
          <div className="mt-1 h-3 w-3 rounded-full bg-slate-200 shrink-0 opacity-100 animate-pulse ring-4 ring-slate-100 shadow-inner" />
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex justify-between items-center mb-1.5">
              {/* Actor Name Placeholder */}
              <div className="h-3 w-24 bg-slate-200 rounded-lg animate-pulse" />
              {/* Date/Time Placeholder */}
              <div className="h-2 w-16 bg-slate-100 rounded-md animate-pulse ml-auto" />
            </div>
            
            <div className="space-y-2">
              {/* Activity Content Line 1 */}
              <div className="h-4 w-full md:w-[85%] bg-slate-100 rounded-xl animate-pulse" />
              {/* Activity Content Line 2 (Short) */}
              <div className="h-4 w-[40%] bg-slate-50 rounded-xl animate-pulse" />
            </div>
          </div>
          
          <div className="h-4 w-4 bg-slate-100 rounded-lg animate-pulse hidden md:block" />
        </div>
      ))}
    </div>
  );
}
