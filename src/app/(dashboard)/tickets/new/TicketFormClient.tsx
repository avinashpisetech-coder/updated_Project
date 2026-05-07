"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, FileSpreadsheet, HelpCircle, ArrowLeft, Send, Sparkles, Zap, Clock, UserPlus, Info, Activity, Paperclip, X, UploadCloud } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createTicket, uploadTicketAttachment } from "@/app/(dashboard)/tickets/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Profile = { id: string; full_name: string; role: string };
type SoftwareSystem = { id: string; name: string; scope: "erp" | "it"; code?: string | null };
type Scope = "IT" | "ERP" | "General" | null;
type Module = { id: string; name: string; slug: string };
type Category = { id: string; name: string };

interface TicketFormClientProps {
  initialModules: Module[];
  canAssign: boolean;
  assignableUsers: Profile[];
}

export default function TicketFormClient({ initialModules, canAssign, assignableUsers }: TicketFormClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [scope, setScope] = useState<Scope>(null);
  const [modules] = useState<Module[]>(initialModules);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [erpModulesList, setErpModulesList] = useState<{id:string, name:string}[]>([]);
  const [erpSubModulesList, setErpSubModulesList] = useState<{id:string, name:string}[]>([]);
  const [softwareSystems, setSoftwareSystems] = useState<SoftwareSystem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("low");
  const [preferredResolutionDate, setPreferredResolutionDate] = useState("");
  const [affectedPerson, setAffectedPerson] = useState("");
  const [affectedAsset, setAffectedAsset] = useState("");
  const [selectedSoftwareSystemId, setSelectedSoftwareSystemId] = useState("");
  const [erpModule, setErpModule] = useState("");
  const [erpSubModule, setErpSubModule] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRequirement, setIsRequirement] = useState(false);
  const [descriptionOfChange, setDescriptionOfChange] = useState("");
  const [reasonForChange, setReasonForChange] = useState("");
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const isAgent = canAssign;

  // Assignable users are now passed as props from the server to ensure RBAC integrity
  const users = assignableUsers;

  const handleScopeSelect = async (selectedScope: Scope) => {
    setScope(selectedScope);
    const slugToMatch = selectedScope === "IT" ? "help-desk" : 
                      selectedScope === "ERP" ? "erp" : "general";
    
    const mod = modules.find(m => m.slug === slugToMatch);
    if (mod) {
      setSelectedModuleId(mod.id);
      
      // Parallelize context-specific fetches
      const promises: Promise<any>[] = [
        (supabase.from("ticket_categories").select("id, name").eq("module_id", mod.id) as any)
      ];

      if (selectedScope === "IT" || selectedScope === "ERP") {
        promises.push(
          supabase.from("software_systems")
            .select("id, name, scope, code")
            .eq("scope", selectedScope === "ERP" ? "erp" : "it")
            .eq("status", "active")
            .order("name") as any
        );
      }

      if (selectedScope === "ERP") {
        promises.push(supabase.from("erp_modules").select("id, name") as any);
      }

      const results = await Promise.all(promises);
      
      // Index 0: Categories
      if (results[0].data) setCategories(results[0].data);
      
      // Index 1 (if exists): Software Systems
      const systemsRes = (selectedScope === "IT" || selectedScope === "ERP") ? results[1] : null;
      if (systemsRes?.data) setSoftwareSystems(systemsRes.data);
      
      // Index 2 (if exists for ERP): ERP Modules
      const erpRes = selectedScope === "ERP" ? (results.length > 2 ? results[2] : results[1]) : null;
      if (erpRes?.data) setErpModulesList(erpRes.data);
    }
  };

  const handleCategorySelect = async (val: string) => {
    setSelectedCategoryId(val);
    const { data } = await supabase
      .from("ticket_subcategories")
      .select("id, name")
      .eq("category_id", val);
    if (data) setSubcategories(data);
  };

  const handleErpModuleSelect = async (val: string) => {
    setErpModule(val);
    setErpSubModule("");
    const selectedMod = erpModulesList.find(m => m.name === val);
    if (selectedMod) {
      const { data } = await supabase.from("erp_sub_modules").select("id, name").eq("erp_module_id", selectedMod.id);
      if (data) setErpSubModulesList(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRequirement && selectedFiles.length === 0) {
      toast.error("Document attachment is mandatory for Requirements.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("is_requirement", String(isRequirement));
    if (isRequirement) {
      formData.append("description_of_change", descriptionOfChange);
      formData.append("reason_for_change", reasonForChange);
    }
    formData.append("module_id", selectedModuleId);
    formData.append("category_id", selectedCategoryId);
    if (selectedSubcategoryId) formData.append("subcategory_id", selectedSubcategoryId);
    formData.append("subject", subject);
    formData.append("description", description);
    formData.append("priority", priority);
    if (preferredResolutionDate) formData.append("preferred_resolution_date", preferredResolutionDate);
    if (affectedPerson && affectedPerson !== "_none") formData.append("affected_person", affectedPerson);
    if (affectedAsset) formData.append("affected_asset", affectedAsset);
    if (selectedSoftwareSystemId) formData.append("software_system_id", selectedSoftwareSystemId);
    if (scope === 'ERP') {
      if (erpModule) formData.append("erp_module", erpModule);
      if (erpSubModule) formData.append("erp_sub_module", erpSubModule);
    }
    if (selectedAssigneeId && selectedAssigneeId !== "_default") formData.append("assigned_to_id", selectedAssigneeId);

    try {
      const res = await createTicket(formData);
      if (res.success && res.ticket) {
        // Multi-stage commit: Upload attachments if any
        if (selectedFiles.length > 0) {
          toast.info(`Uploading ${selectedFiles.length} attachments...`);
          const uploadPromises = selectedFiles.map(file => {
            const fileData = new FormData();
            fileData.append("file", file);
            return uploadTicketAttachment(res.ticket.id, fileData);
          });
          
          await Promise.all(uploadPromises);
        }

        toast.success("Ticket Submitted Successfully");
        setTimeout(() => {
          router.refresh();
          router.push("/tickets");
        }, 1000);
      } else {
        toast.error(res.error || "Failed to submit ticket.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit ticket.");
      setLoading(false);
    }
  };

  if (!scope) {
    return (
      <div className="w-full py-4 px-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-1">
            <Badge variant="outline" className="px-2 py-0.5 border-primary/30 bg-primary/5 text-primary text-[9px] font-bold uppercase tracking-widest rounded-full">
              Support Services
            </Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">Create Support Request</h1>
          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Select a department to proceed</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { id: "IT", icon: Monitor, label: "IT Infrastructure", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40", desc: "Hardware, Network, Assets & System Access." },
            { id: "ERP", icon: FileSpreadsheet, label: "Enterprise Systems", color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/40", desc: "SAP, Business Software & ERP Modules." },
            { id: "General", icon: HelpCircle, label: "General Support", color: "text-indigo-500", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/40", desc: "Miscellaneous requests & general assistance." }
          ].map((item) => (
            <Card 
              key={item.id}
              className={cn(
                "cursor-pointer group relative overflow-hidden transition-all duration-300 border-border/40 bg-card/60 rounded-2xl hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1",
                item.border
              )} 
              onClick={() => handleScopeSelect(item.id as Scope)}
            >
              <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity", item.bg)} />
              <CardHeader className="text-center pb-1 pt-3 px-4">
                <div className={cn("h-10 w-10 mx-auto rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-sm", item.bg, item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-[9px] font-black tracking-widest uppercase opacity-80">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-[10px] font-medium leading-relaxed text-muted-foreground/60 px-4 pb-4">
                {item.desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full py-4 px-6 font-sans animate-in fade-in slide-in-from-bottom-2">
        <div className="flex gap-4 mb-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-muted-foreground hover:text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-widest opacity-100 transition-all active:scale-95" 
            onClick={() => setScope(null)}
          >
            <ArrowLeft className="w-3 h-3 mr-2" /> Change Category
          </Button>
        </div>
        
        <Card className="border-border/40 bg-card/90 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary/40" />
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary border-primary/40 bg-primary/5">Standard Request</Badge>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Step 2: Details</span>
            </div>
            <CardTitle className="text-xl font-black tracking-tight text-foreground leading-none mb-0.5">
              {scope === 'IT' ? 'IT Infrastructure' : scope === 'ERP' ? 'Enterprise Systems' : 'General Support'}
            </CardTitle>
            <CardDescription className="text-[11px] font-bold text-muted-foreground/80 mt-1">
              Please provide the details of your request to help us assist you better.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-primary" /> Request Type
                  </Label>
                  <Select onValueChange={handleCategorySelect} required>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-[13px] font-semibold">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 bg-card shadow-xl">
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {subcategories.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" /> Classification
                    </Label>
                    <Select onValueChange={setSelectedSubcategoryId}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-[13px] font-semibold">
                        <SelectValue placeholder="Select Sub-category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/40 bg-card shadow-xl">
                        {subcategories.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {scope === 'ERP' && (
                <div className="space-y-3 p-4 rounded-2xl border border-primary/20 bg-primary/5 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">System Context</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2 p-2 px-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Zap className="h-3 w-3 text-primary" />
                    <Label className="text-[10px] font-black uppercase tracking-tight text-primary flex-1">Create as New Requirement / Change Order?</Label>
                    <input 
                      type="checkbox" 
                      checked={isRequirement} 
                      onChange={e => setIsRequirement(e.target.checked)}
                      className="h-4 w-4 rounded-md border-primary/30 text-primary focus:ring-primary/20"
                    />
                  </div>

                  {isRequirement && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-primary flex items-center gap-1.5 uppercase">
                          1. Description of Change
                        </Label>
                        <Textarea 
                          required={isRequirement}
                          placeholder="Provide a detailed description of the new requirement..."
                          value={descriptionOfChange}
                          onChange={e => setDescriptionOfChange(e.target.value)}
                          className="min-h-[80px] rounded-xl bg-white border-primary/20 text-[12px] font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black text-primary flex items-center gap-1.5 uppercase">
                          2. Reason for Change
                        </Label>
                        <Textarea 
                          required={isRequirement}
                          placeholder="Explain why this change is necessary..."
                          value={reasonForChange}
                          onChange={e => setReasonForChange(e.target.value)}
                          className="min-h-[80px] rounded-xl bg-white border-primary/20 text-[12px] font-medium"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Software System</Label>
                      <Select value={selectedSoftwareSystemId || undefined} onValueChange={(val) => {
                        setSelectedSoftwareSystemId(val);
                        setAffectedAsset(softwareSystems.find(s => s.id === val)?.name || "");
                      }} required>
                        <SelectTrigger className="h-10 rounded-xl bg-card border-border/40 text-xs font-semibold">
                          <SelectValue placeholder="Select Platform" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40 bg-card">
                          {softwareSystems.map((system) => (
                            <SelectItem key={system.id} value={system.id} className="text-xs font-medium">{system.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Functional Module</Label>
                      <Select value={erpModule || undefined} onValueChange={handleErpModuleSelect}>
                        <SelectTrigger className="h-10 rounded-xl bg-card border-border/40 text-xs font-semibold">
                          <SelectValue placeholder="Select Module" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40 bg-card">
                          {erpModulesList.map(m => (
                            <SelectItem key={m.id} value={m.name} className="text-xs font-medium">{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}



              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-primary" /> Subject (Mandatory)
                </Label>
                <Input 
                  required 
                  maxLength={150} 
                  placeholder="Summarize your issue"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="h-10 rounded-xl bg-muted/20 border-border/60 border text-[13px] font-semibold placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                  <Monitor className="h-3 w-3 text-primary" /> Description (Mandatory)
                </Label>
                <Textarea 
                  required 
                  className="min-h-[100px] rounded-xl bg-muted/20 border-border/60 border text-[13px] font-medium placeholder:text-muted-foreground/30 focus-visible:ring-primary/20 shadow-sm" 
                  placeholder="Provide full operational details or steps to reproduce..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-primary" /> Priority Level
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/40 text-[13px] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 bg-card">
                      <SelectItem value="low" className="text-xs font-medium">Low Impact</SelectItem>
                      <SelectItem value="medium" className="text-xs font-medium">Medium Impact</SelectItem>
                      <SelectItem value="high" className="text-xs font-medium">High Priority</SelectItem>
                      <SelectItem value="critical" className="text-xs font-bold text-destructive uppercase">Critical Outage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-primary" /> Target Resolution
                  </Label>
                  <Input 
                    type="date"
                    value={preferredResolutionDate}
                    onChange={e => setPreferredResolutionDate(e.target.value)}
                    className="h-10 rounded-xl bg-muted/20 border-border/40 text-[13px] font-semibold [color-scheme:dark] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-dashed border-border/60 bg-muted/5 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                      <Paperclip className="h-3 w-3 text-primary" /> Evidence Log (Attachments)
                    </Label>
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Max 10MB per file</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-border/40 border-dashed rounded-2xl cursor-pointer bg-muted/10 hover:bg-muted/20 transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest group-hover:text-foreground transition-colors">Select files for documentation</p>
                        </div>
                        <Input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE);
                            if (validFiles.length < files.length) {
                              toast.error("Some files exceed the 10MB limit.");
                            }
                            setSelectedFiles(prev => [...prev, ...validFiles]);
                          }}
                        />
                      </label>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in duration-300">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group">
                            <Paperclip className="w-3 h-3" />
                            <span className="text-[10px] font-bold truncate max-w-[120px]">{file.name}</span>
                            <button 
                              type="button"
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-primary hover:text-destructive transition-colors ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-dashed border-border/60 bg-muted/5 transition-all">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                    <UserPlus className="h-3 w-3 text-primary" /> Assign To (Optional)
                  </Label>
                  <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                    <SelectTrigger className="h-10 rounded-xl bg-card border-border/40 text-[13px] font-semibold">
                      <SelectValue placeholder="Automatic (Dept Admin)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 bg-card shadow-xl max-h-[250px]">
                      <SelectItem value="_default" className="text-xs font-bold italic opacity-60">Auto: Department Admin</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs font-medium">
                          {u.full_name} <span className="ml-1 opacity-40 text-[10px]">({u.role?.replace('_', ' ')})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground/40 font-medium pl-1 italic">
                    If no assignee is selected, this ticket will be routed to the Department Admin.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Button type="submit" className="w-full h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/10 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2" disabled={loading}>
                  {loading ? "Submitting..." : <><Send className="h-4 w-4" /> Submit Ticket</>}
                </Button>
                <p className="text-[8px] text-center text-muted-foreground/40 mt-3 font-bold uppercase tracking-widest">Your request will be routed to the appropriate team</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
