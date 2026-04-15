"use server";

import React from "react";
import { 
    Palette, 
    Monitor, 
    Sparkles, 
    Command,
    Zap
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AssetsThemesPage() {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2 opacity-60">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">UI_State_Parameters</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground">COLOR_<span className="text-emerald-500/60">MATRIX</span></h1>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Synchronize visual fidelity and high-contrast display modes for the Asset Hub</p>
            </header>

            <div className="bg-card/40 border border-border/40 p-12 lg:p-20 rounded-[4rem] relative overflow-hidden group backdrop-blur-3xl shadow-2xl shadow-black/5">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03]">
                    <Palette className="h-64 w-64 rotate-12" />
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
                    <div className="space-y-8 max-w-xl">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 opacity-60">
                                <Zap className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Real-time Visualization</span>
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tight leading-none text-foreground">VISUAL_PROFILER</h2>
                            <p className="text-[13px] font-bold text-muted-foreground uppercase leading-relaxed opacity-60">
                                Deploy mathematically balanced color profiles across the Asset Management terminal. Each mode is optimized for 12-hour high-density logistical monitoring and anti-fatigue typography.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                             <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-foreground">System Engine</p>
                                 <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40 italic">Next.js Themes Engine</p>
                             </div>
                             <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Contrast Ratio</p>
                                 <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 opacity-60 italic">WCAG 3.0 Verified</p>
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-8 bg-background/50 p-16 rounded-[3rem] border border-border/40 shadow-inner group-hover:bg-background/80 transition-all duration-700">
                        <ThemeToggle />
                        <div className="flex items-center gap-6 py-3 px-8 rounded-full bg-card border border-border/40 shadow-sm shadow-black/5">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                <Monitor className="h-3 w-3" />
                                GPU_ACCEL
                            </div>
                            <div className="h-4 w-[1px] bg-border/40" />
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                <Sparkles className="h-3 w-3" />
                                SHARP_UI
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 opacity-20 hover:opacity-5 transition-opacity duration-1000 grayscale pointer-events-none">
                     {[1,2,3,4].map(i => (
                         <div key={i} className="h-40 rounded-[2.5rem] border border-dashed border-border/40 flex items-center justify-center">
                             <Command className="h-10 w-10 opacity-10" />
                         </div>
                     ))}
                </div>
            </div>
        </div>
    );
}
