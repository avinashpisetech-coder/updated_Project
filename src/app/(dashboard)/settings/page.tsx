"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { 
  Palette, 
  Shield, 
  Mail, 
  ArrowRight, 
  User, 
  Settings2,
  Monitor,
  Sparkles,
  Command,
  Cpu,
  Layers,
  Fingerprint
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const isSuperAdmin = profile?.role === "super_admin";

  const settingsCards = [
    {
      title: "Mail Infrastructure",
      description: "Relay nodes, SMTP clusters, and notification logic.",
      icon: Mail,
      href: "/settings/mail",
      color: "text-primary",
      bg: "bg-primary/5",
      adminOnly: true,
      tag: "INFRA-01"
    },
    {
      title: "Access Control",
      description: "RBAC matrices, permission vectors, and security logs.",
      icon: Shield,
      href: "/settings/masters/access-control",
      color: "text-amber-500",
      bg: "bg-amber-500/5",
      adminOnly: true,
      tag: "SEC-02"
    },
    {
      title: "Masters Hub",
      description: "Operational nodes, structures, and system constants.",
      icon: Settings2,
      href: "/settings/masters",
      color: "text-indigo-500",
      bg: "bg-indigo-500/5",
      adminOnly: true,
      tag: "CORE-03"
    },
    {
      title: "Identity Profile",
      description: "Personal telemetry, credentials, and UI preferences.",
      icon: User,
      href: "/profile",
      color: "text-emerald-500",
      bg: "bg-emerald-500/5",
      adminOnly: false,
      tag: "ID-04"
    }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 font-sans overflow-hidden">
      {/* Settings Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pb-6 border-b border-border/40 relative">
        <div className="technical-heading-node mb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-technical-pulse" />
            <span className="noted-heading">GLOBAL_SETTINGS_PROTOCOL</span>
          </div>
          <h1 className="leading-none m-0">SETTINGS_HUB</h1>
          <p className="opacity-60 mt-2">
            Orchestrate system-wide application parameters and visual state.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 px-6 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="noted-heading opacity-40">Session_Verified</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Appearance Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="technical-card p-8 space-y-8 group">
            <div className="flex items-center gap-2 opacity-60">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span className="noted-heading text-muted-foreground/60 mb-2 block">ACTIVE_SESSION_TELEMETRY</span>
            </div>
            
            <div className="space-y-3">
              <h3 className="flex items-center justify-between m-0">
                <span>COLOR_MATRIX</span>
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </h3>
              <p className="text-[10px] text-muted-foreground leading-tight uppercase opacity-60">
                Switch between high-precision professional display profiles.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col items-center gap-6 transition-all group-hover:bg-primary/10">
               <ThemeToggle />
               <div className="flex items-center gap-2 noted-heading opacity-40">
                 <Monitor className="h-3 w-3" />
                 STATE: ACTIVE
               </div>
            </div>
          </div>
        </div>

        {/* Configuration Hub Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {settingsCards.filter(c => !c.adminOnly || isSuperAdmin).map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href} className="group">
                  <div className="technical-card p-4 group">
                    <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700", card.bg)} />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner border border-border/20", card.bg, card.color)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="noted-heading opacity-30 group-hover:opacity-100 transition-opacity">
                          [{card.tag}]
                        </span>
                      </div>
                      
                      <h3 className="text-foreground m-0">
                        {card.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-tight uppercase opacity-40 group-hover:opacity-70 transition-opacity">
                        {card.description}
                      </p>
                    </div>

                    <div className="flex justify-end mt-6 relative z-10">
                      <div className="p-2 rounded-xl bg-muted/50 border border-border/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
