"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Settings2,
  LayoutTemplate,
  Building2,
  ShieldCheck,
  Fingerprint,
  Activity,
  Layers,
  Zap,
  ChevronRight,
  Database,
  Globe
} from "lucide-react";

export default async function MastersHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await ensureProfile(supabase, user);
  const role = profile?.role || "end_user";

  if (role !== "super_admin") {
    redirect("/dashboard");
  }

  const cards = [
    {
      title: "User Directory",
      label: "User Management",
      description: "Manage system access, user profiles, departments, and designations.",
      href: "/settings/masters/users",
      cta: "Manage Users",
      icon: Users,
      badge: "Identity",
    },
    {
      title: "ERP Systems",
      label: "System configuration",
      description: "Configure ERP modules, sub-modules, and system visibility.",
      href: "/settings/masters/erp",
      cta: "Configure ERP",
      icon: Settings2,
      badge: "Logistics",
    },
    {
      title: "Help Desk Setup",
      label: "Support Governance",
      description: "Manage ticket categories and support system routing.",
      href: "/settings/masters/help-desk",
      cta: "Configure Support",
      icon: LayoutTemplate,
      badge: "Support",
    },
    {
      title: "Legal Entities",
      label: "Corporate Structure",
      description: "Define company structure and project assignments.",
      href: "/settings/masters/organizations",
      cta: "Manage Entities",
      icon: Building2,
      badge: "Enterprise",
    },
    {
      title: "Security & Access",
      label: "Access Control",
      description: "Manage system permissions and role-based access control.",
      href: "/settings/masters/access-control",
      cta: "Manage Security",
      icon: ShieldCheck,
      badge: "Security",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 font-sans overflow-hidden">
      {/* Masters Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pb-6 border-b border-border/40 relative">
        <div className="technical-heading-node mb-0 border-primary/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Administration Panel</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-none m-0">System Masters</h1>
          <p className="text-sm font-medium text-muted-foreground/60 mt-2">
            Manage core system parameters and organizational data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 px-6 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-3">
            <Fingerprint className="h-4 w-4 text-primary opacity-40" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Authorized Access</p>
          </div>
        </div>
      </div>

      {/* Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.href}
              className="technical-card p-6 h-full min-h-[220px] flex flex-col justify-between hover:border-primary/40 transition-all hover:-translate-y-0.5 relative group overflow-hidden bg-card/40 border-border/40"
            >
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all duration-700 group-hover:bg-primary/20" />

              <div className="flex items-center justify-between mb-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/10 group-hover:border-primary/20 shadow-inner">
                  <Icon className="h-7 w-7 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <Badge variant="outline" className="text-[9px] h-6 px-3 border-border/40 bg-muted/20 text-muted-foreground font-bold uppercase tracking-widest rounded-full">
                  {card.badge}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <div className="flex items-center gap-2 opacity-40 group-hover:opacity-60 transition-opacity mb-1">
                    <Layers className="h-3 w-3 text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground m-0">
                    {card.title}
                  </h3>
                </div>

                <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="w-full rounded-xl h-10 px-6 text-[10px] font-bold uppercase tracking-wider border border-border/40 bg-muted/10 hover:bg-primary hover:text-primary-foreground transition-all group"
                >
                  <Link href={card.href} className="flex items-center justify-between w-full">
                    <span>{card.cta}</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}

        {/* System Health / Status Card */}
        <div className="technical-card !rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center group border-dashed hover:border-solid transition-all duration-700 bg-card/20 border-border/40">
           <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
             <Activity className="w-8 h-8 text-primary opacity-40" />
           </div>
            <h3 className="m-0 text-sm font-bold uppercase tracking-widest text-foreground">System Health</h3>
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] max-w-[200px] text-center mt-3">
              All services operational · Security protocols active
            </p>
        </div>
      </div>
    </div>
  );
}
