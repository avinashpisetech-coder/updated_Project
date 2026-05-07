"use client";

import * as React from "react";
import { 
  Moon, Sun, Palette, Zap, Droplets, 
  Flame, Sparkles, Terminal, Shield, 
  Activity, Crown, Heart 
} from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "amber-mono",   label: "Amber Mono 2.0", icon: Terminal, color: "#f59e0b" },
  { id: "purple-rain",  label: "Purple Rain",    icon: Droplets, color: "#a855f7" },
  { id: "playable",     label: "Playable",       icon: Zap,      color: "#fbbf24" },
  { id: "india",        label: "India Spice",    icon: Flame,    color: "#f97316" },
  { id: "stella",       label: "Stella",         icon: Sparkles, color: "#fb7185" },
  { id: "mocha",        label: "Mocha",          icon: Crown,    color: "#c084fc" },
  { id: "black-pink",   label: "Cyber Pink",     icon: Activity, color: "#ec4899" },
  { id: "sukuna",       label: "Sukuna",         icon: Shield,   color: "#ef4444" },
  { id: "cyberpunk",    label: "Cyberpunk",      icon: Palette,  color: "#d946ef" },
  { id: "agora",        label: "Agora Night",    icon: Heart,    color: "#7c3aed" },
];

export function ThemeToggle() {
  const { mode, colorTheme, setColorTheme, toggleMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group overflow-hidden rounded-xl border border-white/10 hover:border-primary/50 transition-all duration-500">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all group-hover:rotate-90 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all group-hover:rotate-0 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2 bg-card/80 backdrop-blur-2xl border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
          Premium Registry
        </div>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => {
              setColorTheme(t.id as any);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300",
              colorTheme === t.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-primary/5 border border-transparent"
            )}
          >
            <t.icon className="h-4 w-4" style={{ color: colorTheme === t.id ? undefined : t.color }} />
            <span className="text-[11px] font-bold uppercase tracking-widest">{t.label}</span>
            {colorTheme === t.id && (
              <div className="ml-auto flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
              </div>
            )}
          </DropdownMenuItem>
        ))}
        <div className="h-px bg-white/5 my-2" />
        <DropdownMenuItem
          onClick={() => toggleMode()}
          className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-primary/5"
        >
          {mode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="text-[11px] font-bold uppercase tracking-widest">
            {mode === "light" ? "Switch to Dark" : "Switch to Light"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
