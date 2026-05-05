"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { ModuleHeader } from "@/components/ModuleHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import { getUserPermissions } from "@/lib/permissions-server";

export default async function SettingsPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  const activeTab = searchParams.tab || "overview";
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, permissions] = await Promise.all([
    ensureProfile(supabase, user),
    getUserPermissions(user.id)
  ]);

  const canAccessMasters = hasPermission(permissions, RESOURCES.USERS) || 
                           hasPermission(permissions, RESOURCES.ERP) || 
                           hasPermission(permissions, RESOURCES.HELP_DESK_MASTER) ||
                           hasPermission(permissions, RESOURCES.ACCESS);

  const settingsCards = [
    {
      title: "Masters Hub",
      description: "Operational nodes, structures, and system constants.",
      icon: Settings2,
      href: "/settings/masters",
      color: "text-indigo-500",
      bg: "bg-indigo-500/5",
      canShow: canAccessMasters,
      tag: "CORE-03"
    },
    {
      title: "Identity Profile",
      description: "Personal telemetry, credentials, and UI preferences.",
      icon: User,
      href: "/profile",
      color: "text-emerald-500",
      bg: "bg-emerald-500/5",
      canShow: true,
      tag: "ID-04"
    }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 font-sans antialiased overflow-hidden">
      <ModuleHeader 
        title="SETTINGS_HUB"
        subtitle="Global_Settings_Protocol"
      />

      <Tabs defaultValue={activeTab} className="space-y-8 animate-in fade-in duration-700">
        <TabsList className="h-14 p-1.5 bg-muted/20 border border-border/40 rounded-2xl gap-2">
          <TabsTrigger 
            value="overview" 
            className="px-6 rounded-xl flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Layers className="h-4 w-4" />
            <span className="noted-heading lowercase">Core_Telemetry</span>
          </TabsTrigger>
          <TabsTrigger 
            value="themes" 
            className="px-6 rounded-xl flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Palette className="h-4 w-4" />
            <span className="noted-heading lowercase">Color_Matrix</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {settingsCards.filter(c => c.canShow).map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href} className="group">
                    <div className="technical-card p-6 h-full relative overflow-hidden group">
                      <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-700", card.bg)} />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-inner border border-border/20", card.bg, card.color)}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="noted-heading opacity-30 group-hover:opacity-100 transition-opacity">
                            [{card.tag}]
                          </span>
                        </div>
                        
                        <h3 className="text-foreground m-0 text-sm font-bold group-hover:text-primary transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-[10px] text-muted-foreground leading-tight uppercase opacity-40 group-hover:opacity-70 transition-opacity mt-2">
                          {card.description}
                        </p>

                        <div className="mt-auto flex justify-end pt-6">
                          <div className="p-2 rounded-xl bg-muted/50 border border-border/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="themes" className="mt-0 focus-visible:outline-none">
          <div className="technical-card p-10 space-y-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Command className="h-48 w-48 rotate-12" />
            </div>

            <div className="space-y-4 max-w-2xl relative z-10">
              <div className="flex items-center gap-2 opacity-60">
                <Palette className="h-3.5 w-3.5 text-primary" />
                <span className="noted-heading uppercase tracking-widest">Global_Visual_State</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight m-0">COLOR_MATRIX</h2>
              <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest opacity-60 leading-relaxed max-w-md line-clamp-2">
                Deploy high-fidelity professional display profiles across the entire infrastructure ecosystem. All themes are mathematically verified for anti-collision typography and tiered surface depth.
              </p>
            </div>
            
            <div className="p-12 rounded-[2rem] bg-primary/5 border border-primary/10 flex flex-col items-center gap-8 relative z-10 backdrop-blur-sm transition-all group-hover:bg-primary/[0.08]">
               <ThemeToggle />
               <div className="flex items-center gap-6 py-3 px-8 rounded-full bg-background/50 border border-border/40 shadow-sm">
                 <div className="flex items-center gap-2 noted-heading opacity-60">
                   <Monitor className="h-3.5 w-3.5" />
                   RENDER: GPU_ACCELERATED
                 </div>
                 <div className="h-4 w-[1px] bg-border/40" />
                 <div className="flex items-center gap-2 noted-heading text-primary">
                   <Sparkles className="h-3.5 w-3.5" />
                   SHARP_UI: ACTIVE
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 opacity-40 hover:opacity-10 transition-opacity duration-1000 grayscale pointer-events-none">
               {[1,2,3,4].map(i => (
                 <div key={i} className="h-32 rounded-2xl border border-dashed border-border/40 flex items-center justify-center">
                   <Palette className="h-6 w-6 opacity-10" />
                 </div>
               ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
