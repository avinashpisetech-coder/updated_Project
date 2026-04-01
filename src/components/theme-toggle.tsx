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
} from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeId =
  | "nova"
  | "corporate-blue"
  | "executive-navy"
  | "forest-ledger"
  | "crimson-boardroom"
  | "amber-ledger"
  | "slate-minimal"
  | "midnight-executive"
  | "emerald-night"
  | "charcoal-gold"
  | "plum-enterprise"
  | "cyber-pulse"
  | "indian"
  | "eslinks";

type ThemeDef = {
  id: ThemeId;
  label: string;
  mode: "light" | "dark";
  dot: string;
  Icon: React.ElementType;
};

const THEMES: ThemeDef[] = [
  { id: "nova",               label: "Nova Blaze",      mode: "light", dot: "#4f6ef7", Icon: Sparkles  },
  { id: "corporate-blue",     label: "Ocean Finance",   mode: "light", dot: "#3b7fde", Icon: Building2 },
  { id: "executive-navy",     label: "Royal Navy",      mode: "light", dot: "#334da0", Icon: Shield    },
  { id: "forest-ledger",      label: "Forest Ledger",   mode: "light", dot: "#2e7d52", Icon: Trees     },
  { id: "crimson-boardroom",  label: "Crimson Edge",    mode: "light", dot: "#c0392b", Icon: Flame     },
  { id: "amber-ledger",       label: "Amber Executive", mode: "light", dot: "#c97d1a", Icon: Sun       },
  { id: "slate-minimal",      label: "Silver Minimal",  mode: "light", dot: "#607080", Icon: Layers3   },
  { id: "midnight-executive", label: "Midnight Neon",   mode: "dark",  dot: "#5c7cfa", Icon: MoonStar  },
  { id: "emerald-night",      label: "Emerald Aurora",  mode: "dark",  dot: "#2ecc71", Icon: Leaf      },
  { id: "charcoal-gold",      label: "Obsidian Gold",   mode: "dark",  dot: "#d4a117", Icon: Crown     },
  { id: "plum-enterprise",    label: "Violet Luxe",     mode: "dark",  dot: "#9b59b6", Icon: Crown     },
  { id: "cyber-pulse",        label: "Cyber Pulse",     mode: "dark",  dot: "#00d4ff", Icon: Zap       },
  { id: "indian",             label: "Indian Saffron",  mode: "light", dot: "#e07b22", Icon: Palette   },
  { id: "eslinks",            label: "ESLinks",          mode: "light", dot: "#4f46e5", Icon: Link2     },
];

const DEFAULT_THEME: ThemeId = "nova";

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
