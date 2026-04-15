"use client";

import React from "react";

export function AssetMainContent({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="relative z-10 transition-all duration-300 overflow-x-hidden flex flex-col min-h-screen"
      style={{
        marginLeft: "var(--sidebar-width, 288px)",
        width: "calc(100vw - var(--sidebar-width, 288px))",
      }}
    >
      {children}
    </main>
  );
}
