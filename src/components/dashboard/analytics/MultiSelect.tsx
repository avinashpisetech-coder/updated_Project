"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  icon?: React.ElementType;
}

export function MultiSelect({ label, options, selectedIds, onChange, placeholder = "All", icon: Icon }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    onChange(newIds);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="relative flex flex-col gap-1 min-w-[140px]" ref={containerRef}>
      <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest pl-1">
        {label}
      </span>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-[#20233d]/70 backdrop-blur border rounded-lg cursor-pointer transition-all duration-300 group",
          isOpen ? "border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.1)]" : "border-[#2d314d] hover:border-[#3c416e]",
          selectedCount > 0 && "border-[#00f2ff]/40 bg-[#00f2ff]/5"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={12} className={cn("shrink-0", selectedCount > 0 ? "text-[#fde047]" : "text-[#64748b] group-hover:text-white transition-colors")} />}
          <span className={cn(
            "text-[10px] font-bold truncate max-w-[100px]",
            selectedCount > 0 ? "text-[#fde047]" : "text-white/40"
          )}>
            {selectedCount === 0 ? placeholder : `${selectedCount} Selected`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {selectedCount > 0 && (
            <X 
              size={10} 
              className="text-[#64748b] hover:text-red-400 transition-colors" 
              onClick={clearAll}
            />
          )}
          <ChevronDown size={12} className={cn("text-[#64748b] transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-[110%] left-0 right-0 z-[600] bg-[#1a1d33] border border-[#2d314d] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 min-w-[200px]">
          <div className="max-h-[300px] overflow-y-auto no-scrollbar py-1">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-[10px] text-white/30 italic">No options available</div>
            ) : (
                options.map((option) => {
                    const isSelected = selectedIds.includes(option.id);
                    return (
                        <div 
                            key={option.id}
                            onClick={() => toggleOption(option.id)}
                            className={cn(
                                "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all text-[11px] font-bold border-l-2",
                                isSelected 
                                    ? "bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]" 
                                    : "text-[#78dce8]/70 border-transparent hover:bg-[#4ade80]/10 hover:text-[#4ade80]"
                            )}
                        >
                            <span className="truncate pr-2">{option.name}</span>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                    );
                })
            )}
          </div>
          {selectedCount > 0 && (
            <div 
              onClick={clearAll}
              className="px-4 py-2 border-t border-[#2d314d] bg-red-950/20 text-[9px] font-extrabold text-red-400 uppercase tracking-[0.2em] text-center cursor-pointer hover:bg-red-400/10 transition-all"
            >
              Reset Matrix
            </div>
          )}
        </div>
      )}
    </div>
  );
}
