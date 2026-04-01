"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Mail, Shield, Server, User, Key, Info, Cpu, Activity, Database, Lock, Send, Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const SMTP_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
  "smtp_from_address",
  "smtp_from_name"
];

export default function MailSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", SMTP_KEYS);

      if (error) {
        toast.error("Failed to load mail settings.");
      } else if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach(item => {
          settingsMap[item.key] = item.value;
        });
        setSettings(settingsMap);
      }
      setLoading(false);
    }
    fetchSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("system_settings")
      .upsert(updates);

    if (error) {
      toast.error(`Error saving: ${error.message}`);
    } else {
      toast.success("Mail Infrastructure Synchronized");
      setTimeout(() => {
        router.refresh();
      }, 1000);
    }
    setSaving(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] animate-pulse">
        <Cpu className="h-8 w-8 text-primary/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-8 font-sans antialiased">

      {/* Header Matrix */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2 opacity-60">
            <Send className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Notification Engine Protocol</p>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-foreground">
            Mail <span className="text-primary/60">Infrastructure</span>
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic opacity-60">
            Configure SMTP nodes for enterprise telemetry and alerting
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* SMTP Core Node */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Server className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.20em]">Primary SMTP Relay Cluster</h2>
            </div>
            <div className="rounded-3xl border border-border/40 bg-card/60 p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Relay Host Address</Label>
                  <div className="relative group">
                    <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="smtp.relay-node.com" 
                      value={settings.smtp_host || ""} 
                      onChange={e => updateSetting("smtp_host", e.target.value)}
                      className="h-12 pl-11 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Network Port</Label>
                  <div className="relative group">
                    <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="587" 
                      value={settings.smtp_port || ""} 
                      onChange={e => updateSetting("smtp_port", e.target.value)}
                      className="h-12 pl-11 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-sm transition-all tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Encryption Protocol</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                  <Select 
                    value={settings.smtp_secure || "false"} 
                    onValueChange={v => updateSetting("smtp_secure", v)}
                  >
                    <SelectTrigger className="h-12 pl-11 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none font-black italic text-[11px] uppercase tracking-wider transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 bg-card p-1">
                      <SelectItem value="false" className="rounded-xl text-[10px] font-black uppercase italic tracking-widest focus:bg-primary focus:text-white">STARTTLS (Standard_Vector_587)</SelectItem>
                      <SelectItem value="true" className="rounded-xl text-[10px] font-black uppercase italic tracking-widest focus:bg-primary focus:text-white">SSL/TLS (Legacy_Node_465)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication Matrix */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.20em]">Infrastructure Access Credentials</h2>
            </div>
            <div className="rounded-3xl border border-border/40 bg-card/60 p-8 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Identity Secret / API Key</Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    autoComplete="off"
                    value={settings.smtp_user || ""} 
                    onChange={e => updateSetting("smtp_user", e.target.value)}
                    className="h-12 pl-11 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-sm transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Access Passphrase</Label>
                <div className="relative group">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="password" 
                    autoComplete="new-password"
                    placeholder="••••••••••••••••"
                    value={settings.smtp_pass || ""} 
                    onChange={e => updateSetting("smtp_pass", e.target.value)}
                    className="h-12 pl-11 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Identity Vector */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 opacity-60">
              <Mail className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.20em]">Outbound Telemetry Identity</h2>
            </div>
            <div className="rounded-3xl border border-border/40 bg-card/60 p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Source Address</Label>
                  <Input 
                    placeholder="telemetry@enterprise.hub" 
                    value={settings.smtp_from_address || ""} 
                    onChange={e => updateSetting("smtp_from_address", e.target.value)}
                    className="h-12 px-4 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-xs transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Display Alias</Label>
                  <Input 
                    placeholder="EIRMS_NOTIFICATION_SYSTEM" 
                    value={settings.smtp_from_name || ""} 
                    onChange={e => updateSetting("smtp_from_name", e.target.value)}
                    className="h-12 px-4 rounded-2xl bg-muted/20 border-border/40 focus:border-primary/50 focus:ring-primary/20 font-bold italic text-xs transition-all uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>
          </section>

          <Button 
            type="submit" 
            disabled={saving}
            className="w-full h-14 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black uppercase italic tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px]"
          >
            <Save className="w-4 h-4 mr-3" />
            {saving ? "SYNCING_INFRASTRUCTURE..." : "COMMIT_INFRASTRUCTURE_STATE"}
          </Button>
        </div>

        {/* Sidebar Diagnostics */}
        <aside className="space-y-8">
          <div className="rounded-3xl border border-border/40 bg-muted/20 p-8 space-y-6">
            <div className="flex items-center gap-2 opacity-60">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">System Diagnostics</p>
            </div>
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic uppercase">
                Infrastructure nodes defined here override baseline environment variables. Ensure SMTP relay validity to maintain system alert integrity.
              </p>
              <div className="space-y-3 pt-6 border-t border-border/20">
                <div className="flex items-center justify-between opacity-60">
                  <p className="text-[9px] font-black uppercase tracking-widest">Database Sync</p>
                  <Activity className="h-3 w-3 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between opacity-60">
                  <p className="text-[9px] font-black uppercase tracking-widest">TLS_READY</p>
                  <Shield className="h-3 w-3 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
