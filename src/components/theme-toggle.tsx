"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Leaf,
  Layers3,
  Link2,
  MoonStar,
  Palette,
  Shield,
  Sparkles,
  Sun,
  Trees,
  Zap,
  Globe,
  Cpu,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeId =
  | "astra"
  | "divi"
  | "minify"
  | "oceanwp"
  | "adios"
  | "ana"
  | "webify"
  | "enfold"
  | "gravity"
  | "zelle-pro";

type ThemeDef = {
  id: ThemeId;
  label: string;
  mode: "light" | "dark";
  dot: string;
  Icon: React.ElementType;
};

const THEMES: ThemeDef[] = [
  { id: "astra",      label: "Astra",      mode: "light", dot: "#0073AA", Icon: Sparkles  },
  { id: "divi",       label: "Divi",       mode: "light", dot: "#A855F7", Icon: Crown     },
  { id: "minify",     label: "Minify",     mode: "dark",  dot: "#FFFFFF", Icon: Cpu       },
  { id: "oceanwp",    label: "OceanWP",    mode: "light", dot: "#00A0D2", Icon: Globe     },
  { id: "adios",      label: "Adios",      mode: "light", dot: "#FF4A52", Icon: Flame     },
  { id: "ana",        label: "Ana",        mode: "light", dot: "#FF8E9C", Icon: Heart     },
  { id: "webify",     label: "Webify",     mode: "dark",  dot: "#00D4FF", Icon: Zap       },
  { id: "enfold",     label: "Enfold",     mode: "light", dot: "#34495E", Icon: Shield    },
  { id: "gravity",    label: "Gravity",    mode: "dark",  dot: "#FFC107", Icon: Sun       },
  { id: "zelle-pro",  label: "Zelle PRO",  mode: "light", dot: "#E74C3C", Icon: Palette   },
];

const DEFAULT_THEME: ThemeId = "astra";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const { Icon: SelectedIcon } = selected;

  const applyTheme = (themeId: ThemeId) => {
    const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];
    const root = document.documentElement;
    root.setAttribute("data-theme", t.id);
    root.classList.toggle("dark", t.mode === "dark");
    localStorage.setItem("ui-theme", t.id);
  };

  useEffect(() => {
    const saved = localStorage.getItem("ui-theme") as ThemeId | null;
    const resolved = THEMES.some((t) => t.id === saved) ? (saved as ThemeId) : DEFAULT_THEME;
    setTheme(resolved);
    applyTheme(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onSelect = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    setOpen(false);
  };

  const lightThemes = THEMES.filter((t) => t.mode === "light");
  const darkThemes  = THEMES.filter((t) => t.mode === "dark");

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm hover:border-primary/40 hover:bg-muted/50 transition-all text-xs font-semibold text-foreground"
        aria-label="Select theme"
        aria-expanded={open}
      >
        <Palette size={13} className="text-muted-foreground flex-shrink-0" />
        <span
          className="h-3 w-3 rounded-full flex-shrink-0 border border-black/10 shadow-sm"
          style={{ background: selected.dot }}
        />
        <SelectedIcon size={12} className="text-primary flex-shrink-0" />
        <span className="hidden sm:inline max-w-[90px] truncate">{selected.label}</span>
        <ChevronDown
          size={11}
          className={cn(
            "text-muted-foreground transition-transform duration-200 flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[9999] w-52 rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-xl overflow-hidden">
          {/* Light section */}
          <div className="px-2.5 pt-2.5 pb-1">
            <p className="px-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Light Themes
            </p>
            {lightThemes.map((t) => {
              const { Icon } = t;
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0 border border-black/10 shadow-sm"
                    style={{ background: t.dot }}
                  />
                  <Icon size={11} className="flex-shrink-0 opacity-75" />
                  <span className="truncate flex-1 text-left">{t.label}</span>
                  {active && <Check size={11} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/60 mx-2.5" />

          {/* Dark section */}
          <div className="px-2.5 pt-1 pb-2.5">
            <p className="px-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 mt-1">
              Dark Themes
            </p>
            {darkThemes.map((t) => {
              const { Icon } = t;
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0 border border-white/20 shadow-sm"
                    style={{ background: t.dot }}
                  />
                  <Icon size={11} className="flex-shrink-0 opacity-75" />
                  <span className="truncate flex-1 text-left">{t.label}</span>
                  {active && <Check size={11} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
