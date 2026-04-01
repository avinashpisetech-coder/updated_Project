"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PageBackground() {
  const pathname = usePathname();

  // Subtle beams animation or static effect
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
      {/* Base Scene Gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-[var(--theme-scene-bg-start)] to-[var(--theme-scene-bg-end)] transition-colors duration-700" 
      />
      
      {/* Mesh Layer */}
      <div className="absolute inset-0 scene-mesh transition-opacity duration-1000" />

      {/* Modern Beams / Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] animate-pulse transition-colors duration-700" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[140px] transition-colors duration-700" />
      
      {/* Texture Layer - very subtle noise/grain if desired, but keeping it clean for professional look */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay grayscale pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
}
