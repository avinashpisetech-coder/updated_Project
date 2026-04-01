"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-12 relative overflow-hidden transition-all duration-700 ease-in-out">
      {/* Structural Ambience */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-20" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-20" />
      
      {/* Main Quantum Hub */}
      <div className="relative group">
        {/* Pulsing Aura */}
        <div className="absolute -inset-16 bg-primary/5 rounded-full blur-[80px] animate-pulse" />
        
        {/* Orbital Rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-8 md:-inset-12 rounded-full border-[0.5px] border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
            style={{ opacity: 0.8 - (i * 0.2) }}
          />
        ))}

        {/* Central Core - Professional Insight Design */}
        <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-3xl bg-card/60 backdrop-blur-2xl border border-border/60 shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-50" />
          
          <div className="flex flex-col items-center gap-1 relative z-10 scale-90">
            <motion.div 
               animate={{ height: ["20%", "60%", "20%"] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="w-1 bg-primary rounded-full"
            />
            <div className="flex items-end gap-1.5 h-8">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: ["40%", "100%", "40%"] }}
                  transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </div>

          {/* Scanning Line */}
          <motion.div 
            animate={{ top: ["100%", "-100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-primary/10 to-transparent blur-md"
          />
        </div>
      </div>

      <div className="text-center mt-12 space-y-3 relative z-10 max-w-sm">
        <h3 className="text-base font-bold uppercase tracking-[0.4em] text-foreground transition-all duration-300">
           Quantum <span className="text-primary opacity-80">Synchrony</span>
        </h3>
        <div className="flex items-center justify-center gap-4">
           <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/30" />
           <p className="text-[9px] font-black italic text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">
              Operational Telemetry Active
           </p>
           <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/30" />
        </div>
      </div>

      {/* Numerical Data Micro-Feed */}
      <div className="mt-8 flex gap-6 text-[8px] font-mono text-muted-foreground/40 font-bold tracking-widest uppercase">
          <span>TX: 0.12ms</span>
          <span>SY: 0.X49</span>
          <span>ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
      </div>
    </div>
  );
}
