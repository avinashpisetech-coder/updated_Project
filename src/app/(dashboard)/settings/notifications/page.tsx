"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Bell, Mail, Info } from "lucide-react";

export default function NotificationSettings() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase.from("notification_templates").select("*").order("event_type");
      if (data) setTemplates(data);
      setLoading(false);
    }
    fetchTemplates();
  }, []);

  const handleSave = async (id: string, updates: any) => {
    const { error } = await supabase.from("notification_templates").update(updates).eq("id", id);
    if (error) {
      toast.error("Failed to save template.");
    } else {
      toast.success("Template updated successfully!");
    }
  };

  if (loading) return <div className="p-10 text-center font-bold animate-pulse">Loading Governance Templates...</div>;

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-8 font-sans">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Notification Governance</h1>
        <p className="text-sm text-muted-foreground font-medium">Configure automated messaging for the Requirement Lifecycle.</p>
      </div>

      <div className="grid gap-8">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="border-border/40 bg-card/60 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 p-6 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight uppercase">{tpl.event_type.replace('_', ' ')}</CardTitle>
                  <CardDescription className="text-xs font-medium">Define messaging for this lifecycle event.</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-primary/40 uppercase tracking-widest">
                  <Info className="w-3.5 h-3.5" /> Use tokens: {'{{user}}'}, {'{{id}}'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <Bell className="w-3 h-3" /> UI Notification Body
                    </Label>
                    <Textarea 
                      defaultValue={tpl.body_template} 
                      onBlur={(e) => handleSave(tpl.id, { body_template: e.target.value })}
                      className="min-h-[80px] rounded-xl bg-white/50 border-border/40 text-xs font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email Subject Line
                    </Label>
                    <Input 
                      defaultValue={tpl.subject_template} 
                      onBlur={(e) => handleSave(tpl.id, { subject_template: e.target.value })}
                      className="h-10 rounded-xl bg-white/50 border-border/40 text-xs font-bold" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> Email HTML Body
                    </Label>
                    <Textarea 
                      defaultValue={tpl.email_template} 
                      onBlur={(e) => handleSave(tpl.id, { email_template: e.target.value })}
                      className="min-h-[80px] rounded-xl bg-white/50 border-border/40 text-xs font-medium" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
