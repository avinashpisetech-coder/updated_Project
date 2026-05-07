"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark";
type ColorTheme = 
  | "amber-mono"
  | "purple-rain"
  | "playable"
  | "india"
  | "stella"
  | "mocha"
  | "black-pink"
  | "sukuna"
  | "cyberpunk"
  | "agora";

interface ThemeContextType {
  mode: Mode;
  colorTheme: ColorTheme;
  setMode: (mode: Mode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("amber-mono");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initial load from localStorage
    const savedMode = localStorage.getItem("theme-mode") as Mode;
    const savedColor = localStorage.getItem("theme-color") as ColorTheme;
    
    if (savedMode) setModeState(savedMode);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setModeState("dark");
    
    if (savedColor) setColorThemeState(savedColor);
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Apply Mode (Light/Dark)
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme-mode", mode);
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    // Apply Color Theme
    console.log("🎨 THEME_ENGINE: Applying Color Theme ->", colorTheme);
    document.documentElement.setAttribute("data-theme", colorTheme);
    localStorage.setItem("theme-color", colorTheme);
  }, [colorTheme, mounted]);

  const toggleMode = () => {
    setModeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setMode = (m: Mode) => setModeState(m);
  const setColorTheme = (c: ColorTheme) => setColorThemeState(c);

  return (
    <ThemeContext.Provider value={{ mode, colorTheme, setMode, setColorTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
