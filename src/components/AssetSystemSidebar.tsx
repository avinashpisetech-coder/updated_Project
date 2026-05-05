"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ArrowRightLeft, 
  History, 
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  ChevronLeft,
  Settings2,
  Box,
  ReceiptIndianRupee,
  Menu,
  UserPlus,
  ClipboardCheck,
  FileSearch,
  Layers,
  Palette,
  Trash2,
  Package,
  Shield,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
    href: string;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    isMinimized: boolean;
}

function AssetSidebarItem({ href, label, icon: Icon, isActive, isMinimized }: SidebarItemProps) {
    return (
        <Link href={href} className="w-full">
            <div className={cn(
                "flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                isActive 
                    ? "text-primary bg-primary/5 shadow-sm border border-primary/10" 
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
                isMinimized && "justify-center px-0"
            )}>
                <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300",
                    isActive ? "text-primary scale-110" : "group-hover:text-primary group-hover:rotate-12"
                )} />
                {!isMinimized && (
                    <span className="text-[11px] font-bold uppercase tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                        {label}
                    </span>
                )}
                {isActive && !isMinimized && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
                )}
            </div>
        </Link>
    );
}

import { useNavigation } from "./providers/NavigationProvider";

export function AssetSystemSidebar() {
    const pathname = usePathname();
    const { isSidebarOpen, toggleSidebar } = useNavigation();
    const isMinimized = !isSidebarOpen;

    // Sync with layout via global event or just local state for now
    // In a real app, use a Context for the ml-72 shift.
    // For this task, we'll try to handle it gracefully.

    const deploymentItems = [
        { href: "/assets", label: "Dashboard", icon: LayoutDashboard },
        { href: "/assets/inventory", label: "Asset Register", icon: Box },
        { href: "/assets/deployment", label: "Deployment", icon: ArrowRightLeft },
        { href: "/assets/handover", label: "Direct Handover", icon: ShieldCheck },
        { href: "/assets/return", label: "Recovery", icon: History },
        { href: "/assets/gate-pass", label: "Gate Pass", icon: Truck },
        { href: "/assets/maintenance", label: "Service Hub", icon: Settings2 },
        { href: "/assets/disposal", label: "Disposal", icon: Trash2 },
        { href: "/assets/movements", label: "Chronology", icon: FileSearch },
        { href: "/assets/software", label: "Software SAM", icon: Layers },
        { href: "/assets/requisitions", label: "Indents & PR", icon: ClipboardCheck },
    ];

    const procurementItems = [
        { href: "/assets/purchases", label: "Purchase Order", icon: ReceiptIndianRupee },
        { href: "/assets/purchases/grn", label: "GRN Registry", icon: Package },
    ];

    const settingItems = [
        { href: "/assets/settings", label: "Protocol Governance", icon: Shield },
        { href: "/assets/masters", label: "Master Taxonomy", icon: Settings2 },
        { href: "/assets/themes", label: "Visual Themes", icon: Palette },
    ];

    return (
        <aside className={cn(
            "h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-[100] flex flex-col font-sans select-none transition-all duration-300 shadow-sm",
            isMinimized ? "w-16" : "w-72"
        )}>
            
            {/* 1. Toggle Button */}
            <button 
                onClick={toggleSidebar}
                className="absolute -right-3 top-10 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background shadow-lg hover:scale-110 active:scale-95 transition-all z-[110]"
            >
                {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Header Block */}
            <div className={cn("p-6 pb-6 bg-gradient-to-b from-muted/20 to-transparent", isMinimized && "p-3 px-4")}>
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/dashboard" className="h-10 w-10 rounded-xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 ring-1 ring-primary/20 transition-transform active:scale-95">
                        A
                    </Link>
                    {!isMinimized && (
                        <div className="flex flex-col">
                            <span className="text-xs font-black tracking-tight uppercase text-foreground leading-none">ASM_CORE</span>
                            <span className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase mt-1 opacity-60 leading-none">Isolated_v1.0</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Area */}
            <div className="flex-1 px-4 space-y-8 overflow-y-auto no-scrollbar py-4">
                <div className="space-y-1.5">
                    {!isMinimized && <p className="px-4 mb-3 text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em] font-sans">Personal Portal</p>}
                    <AssetSidebarItem 
                        href="/assets/my-assets" 
                        label="Assigned Inventory" 
                        icon={ShieldCheck} 
                        isActive={pathname === "/assets/my-assets"}
                        isMinimized={isMinimized}
                    />
                </div>

                <div className="space-y-1.5">
                    {!isMinimized && <p className="px-4 mb-3 text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.4em] font-sans">Tactical Suite</p>}
                    {deploymentItems.map(item => (
                        <AssetSidebarItem 
                            key={item.href}
                            {...item}
                            isActive={pathname === item.href}
                            isMinimized={isMinimized}
                        />
                    ))}
                </div>

                <div className="space-y-1.5">
                    {!isMinimized && <p className="px-4 mb-3 text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.4em] font-sans">Supply Chain</p>}
                    {procurementItems.map(item => (
                        <AssetSidebarItem 
                            key={item.href}
                            {...item}
                            isActive={item.href === "/assets/purchases" ? pathname === "/assets/purchases" || (pathname.startsWith("/assets/purchases/") && !pathname.includes("/grn")) : pathname.startsWith(item.href)}
                            isMinimized={isMinimized}
                        />
                    ))}
                </div>

                <div className="space-y-1.5">
                    {!isMinimized && <p className="px-4 mb-3 text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.4em] font-sans">Protocol Admin</p>}
                    {settingItems.map(item => (
                        <AssetSidebarItem 
                            key={item.href}
                            {...item}
                            isActive={pathname === item.href}
                            isMinimized={isMinimized}
                        />
                    ))}
                </div>
            </div>

            {/* Footer Block */}
            {!isMinimized ? (
                <div className="p-6 border-t border-border/40 bg-muted/5">
                    <div className="p-5 rounded-[1.5rem] bg-background/40 border border-border/40 relative overflow-hidden group shadow-inner backdrop-blur-sm">
                        <div className="absolute top-0 right-0 h-10 w-10 bg-primary/10 blur-xl" />
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">PROTOCOL_SECURE</span>
                        </div>
                        <p className="text-[10px] font-bold text-foreground/40 leading-relaxed font-sans uppercase">
                            Authenticated_Session_Verified
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-4 flex justify-center border-t border-border/40">
                    <ShieldCheck size={16} className="text-muted-foreground/40" />
                </div>
            )}
        </aside>
    );
}
