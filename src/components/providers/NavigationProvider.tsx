"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface NavigationContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  navMode: "horizontal" | "vertical";
  toggleNavMode: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// ── Sidebar width tokens ──────────────────────────────────────────────────────
// These must exactly match the sidebar widths declared in Sidebar.tsx and
// AssetSystemSidebar.tsx so that content areas are always true-full-screen.
const SIDEBAR_EXPANDED_PX  = 256; // w-64 (ticketing Sidebar)
const ASSET_SIDEBAR_EXPANDED_PX = 288; // w-72 (AssetSystemSidebar)
const SIDEBAR_COLLAPSED_PX_TICKET = 80; // w-20 (ticketing Sidebar)
const SIDEBAR_COLLAPSED_PX_ASSET  = 64; // w-16 (AssetSystemSidebar)

/** Applies sidebar width CSS tokens to <html> so every layout can stay full-screen */
function applySidebarTokens(open: boolean, mode: "horizontal" | "vertical", isAssetPage: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "horizontal") {
    // Horizontal nav has no sidebar offset
    root.style.setProperty("--sidebar-width", "0px");
    root.style.setProperty("--sidebar-width-num", "0");
  } else {
    const expandedPx = isAssetPage ? ASSET_SIDEBAR_EXPANDED_PX : SIDEBAR_EXPANDED_PX;
    const collapsedPx = isAssetPage ? SIDEBAR_COLLAPSED_PX_ASSET : SIDEBAR_COLLAPSED_PX_TICKET;
    const px = open ? expandedPx : collapsedPx;
    root.style.setProperty("--sidebar-width", `${px}px`);
    root.style.setProperty("--sidebar-width-num", String(px));
  }
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [navMode, setNavMode] = useState<"horizontal" | "vertical">("vertical");
  const pathname = usePathname();
  const isAssetPage = pathname.startsWith("/assets");

  // Apply tokens on every state change or navigation
  useEffect(() => {
    applySidebarTokens(isSidebarOpen, navMode, isAssetPage);
  }, [isSidebarOpen, navMode, isAssetPage]);

  // Load state from localStorage on mount and apply initial tokens
  useEffect(() => {
    const savedSidebar = localStorage.getItem("sidebar-open");
    const open = savedSidebar !== null ? savedSidebar === "true" : true;
    if (savedSidebar !== null) setIsSidebarOpen(open);

    const savedMode = localStorage.getItem("nav-mode");
    const mode: "horizontal" | "vertical" =
      savedMode === "horizontal" || savedMode === "vertical" ? savedMode : "vertical";
    if (savedMode) setNavMode(mode);

    // Apply immediately so there is no layout flash on first paint
    applySidebarTokens(open, mode, isAssetPage);
  }, [isAssetPage]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-open", String(next));
      return next;
    });
  };

  const setSidebarOpen = (open: boolean) => {
    setIsSidebarOpen(open);
    localStorage.setItem("sidebar-open", String(open));
  };

  const toggleNavMode = () => {
    setNavMode((prev) => {
      const next = prev === "horizontal" ? "vertical" : "horizontal";
      localStorage.setItem("nav-mode", next);
      return next;
    });
  };

  return (
    <NavigationContext.Provider value={{ isSidebarOpen, toggleSidebar, setSidebarOpen, navMode, toggleNavMode }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  // Return a safe default instead of throwing to support standalone pages
  return context || { 
    isSidebarOpen: true, 
    toggleSidebar: () => {}, 
    setSidebarOpen: () => {},
    navMode: "vertical",
    toggleNavMode: () => {} 
  };
}
