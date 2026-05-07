"use client";

import React from "react";
import { useTheme } from "next-themes";

export function PageBackground() {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden bg-background transition-colors duration-700">
      {/* 1. Universal Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />

      {/* 2. Dynamic Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full">
        {/* Top Right Glow */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse transition-all duration-1000" />
        
        {/* Bottom Left Glow */}
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] rounded-full bg-primary/5 blur-[120px] transition-all duration-1000" />
        
        {/* Center Mesh */}
        <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--primary) 1px, transparent 0)`,
            backgroundSize: '48px 48px'
          }} 
        />
      </div>

      {/* 3. Gradient Overlay for Depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/80" />
    </div>
  );
}
