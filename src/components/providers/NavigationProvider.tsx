"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface NavigationContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  navMode: "horizontal" | "vertical";
  toggleNavMode: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [navMode, setNavMode] = useState<"horizontal" | "vertical">("vertical");

  // Load state from localStorage on mount
  useEffect(() => {
    const savedSidebar = localStorage.getItem("sidebar-open");
    if (savedSidebar !== null) {
      setIsSidebarOpen(savedSidebar === "true");
    }
    const savedMode = localStorage.getItem("nav-mode");
    if (savedMode === "horizontal" || savedMode === "vertical") {
      setNavMode(savedMode);
    }
  }, []);

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
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
