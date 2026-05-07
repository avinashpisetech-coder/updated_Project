"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  FolderKanban, 
  Plus, 
  Trash2, 
  Globe, 
  ShieldCheck, 
  Fingerprint, 
  Activity, 
  Layers,
  RotateCcw,
  Zap,
  CheckCircle2,
  Database,
  Search,
  ChevronRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Company = {
  id: string;
  name: string;
  code?: string | null;
  status?: string;
  address?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Project = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status?: string;
  company_id: string;
  company?: { name?: string } | { name?: string }[] | null;
};

type SuccessActivity = "save" | "update" | "delete" | "submit";

export default function OrganizationManager({
  initialCompanies,
  initialProjects,
}: {
  initialCompanies: Company[];
  initialProjects: Project[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGST, setCompanyGST] = useState("");
  const [companyPAN, setCompanyPAN] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [activityType, setSuccessActivity] = useState<SuccessActivity>("save");

  const triggerSuccess = (message: string, activity: SuccessActivity = "save") => {
    setSuccessActivity(activity);
    toast.success(message);
    setTimeout(() => {
      router.refresh();
    }, 1000);
  };

  const projectRows = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        companyName: Array.isArray(project.company)
          ? project.company[0]?.name ?? companies.find((company) => company.id === project.company_id)?.name ?? ""
          : project.company?.name ?? companies.find((company) => company.id === project.company_id)?.name ?? "",
      })),
    [companies, projects],
  );

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: companyName.trim(),
        code: companyCode.trim() || null,
        address: companyAddress.trim() || null,
        gst_number: companyGST.trim() || null,
        pan_number: companyPAN.trim() || null,
        email: companyEmail.trim() || null,
        phone: companyPhone.trim() || null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("id, name, code, status, address, gst_number, pan_number, email, phone")
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setCompanies((prev) => [...prev, data]);
    setSelectedCompanyId((current) => current || data.id);
    setCompanyName("");
    setCompanyCode("");
    setCompanyAddress("");
    setCompanyGST("");
    setCompanyPAN("");
    setCompanyEmail("");
    setCompanyPhone("");
    triggerSuccess(`Company ${data.name} added to registry`, "save");
    router.refresh();
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm("Delete this company and its projects?")) return;
    const { error } = await supabase.from("companies").delete().eq("id", companyId);
    if (error) {
      toast.error(error.message);
      return;
    }
    const comp = companies.find(c => c.id === companyId);
    setCompanies((prev) => prev.filter((company) => company.id !== companyId));
    setProjects((prev) => prev.filter((project) => project.company_id !== companyId));
    if (selectedCompanyId === companyId) {
      const nextCompany = companies.find((company) => company.id !== companyId);
      setSelectedCompanyId(nextCompany?.id ?? "");
    }
    triggerSuccess(`Company ${comp?.name} removed`, "delete");
    router.refresh();
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !selectedCompanyId) {
      toast.error("Invalid project parameters.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: projectName.trim(),
        code: projectCode.trim() || null,
        description: projectDesc.trim() || null,
        company_id: selectedCompanyId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("id, name, code, status, description, company_id, company:companies!company_id(name)")
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProjects((prev) => [...prev, data as Project]);
    setProjectName("");
    setProjectCode("");
    setProjectDesc("");
    const comp = companies.find(c => c.id === selectedCompanyId);
    triggerSuccess(`Project ${data.name} attached to ${comp?.name}`, "save");
    router.refresh();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    const proj = projects.find(p => p.id === projectId);
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    triggerSuccess(`Project ${proj?.name} removed from inventory`, "delete");
    router.refresh();
  };

  return (
    <div className="space-y-10 font-sans antialiased">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-5 flex items-center gap-4 group hover:border-primary/30 transition-all">
          <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">Total Companies</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{companies.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-5 flex items-center gap-4 group hover:border-primary/30 transition-all">
          <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-105 transition-transform">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">Total Projects</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{projects.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-5 flex items-center gap-4 group hover:border-primary/30 transition-all">
          <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">Security Status</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-500 uppercase">Secure</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="h-12 w-full md:w-auto p-1 bg-muted/20 border border-border/40 rounded-xl grid grid-cols-2">
          <TabsTrigger value="companies" className="rounded-lg font-bold uppercase tracking-wider text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            Companies
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg font-bold uppercase tracking-wider text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-xl border border-border/40 bg-card/60 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Registration</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Company name</Label>
                <Input 
                  value={companyName} 
                  onChange={(event) => setCompanyName(event.target.value)} 
                  placeholder="e.g. Neural Dynamics Corp" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Reference Code</Label>
                <Input 
                  value={companyCode} 
                  onChange={(event) => setCompanyCode(event.target.value)} 
                  placeholder="e.g. NDC-01" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Email Terminal</Label>
                <Input 
                  value={companyEmail} 
                  onChange={(event) => setCompanyEmail(event.target.value)} 
                  placeholder="admin@neural.io" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">VAT/GST Number</Label>
                <Input 
                  value={companyGST} 
                  onChange={(event) => setCompanyGST(event.target.value)} 
                  placeholder="27AAACN0000A1Z5" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Tax ID (PAN)</Label>
                <Input 
                  value={companyPAN} 
                  onChange={(event) => setCompanyPAN(event.target.value)} 
                  placeholder="ABCDE1234F" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Headquarters</Label>
                <Input 
                  value={companyAddress} 
                  onChange={(event) => setCompanyAddress(event.target.value)} 
                  placeholder="Silicon Valley, CA" 
                  className="h-10 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleCreateCompany} 
                disabled={saving || !companyName.trim()} 
                className="h-11 px-10 rounded-xl bg-primary text-white font-bold uppercase tracking-wider text-[11px] hover:-translate-y-0.5 shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
              >
                {saving ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                Register Company
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">Entity Details</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">GST/Taxation</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id} className="border-border/40 group hover:bg-primary/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary opacity-60" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold tracking-tight text-foreground">{company.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{company.code || "UNC-REF"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-0.5">
                          <p className="text-[11px] font-bold text-foreground tracking-tight">{company.gst_number || "NO_GST"}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">{company.address || "NO_ADDR"}</p>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] h-5 px-2 rounded-lg border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-bold uppercase tracking-wider">Operational</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteCompany(company.id)} 
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-xl border border-border/40 bg-card/60 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Create Project</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Parent Company</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-11 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-2xl">
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id} className="rounded-lg font-bold text-[11px] py-2.5">{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Project Name</Label>
                <Input 
                  value={projectName} 
                  onChange={(event) => setProjectName(event.target.value)} 
                  placeholder="e.g. Infrastructure Upgrade" 
                  className="h-11 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Ref Code</Label>
                <Input 
                  value={projectCode} 
                  onChange={(event) => setProjectCode(event.target.value)} 
                  placeholder="e.g. PR-01" 
                  className="h-11 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 ml-1">Project Objective</Label>
                <Input 
                  value={projectDesc} 
                  onChange={(event) => setProjectDesc(event.target.value)} 
                  placeholder="Deliverable details..." 
                  className="h-11 px-4 rounded-xl bg-background border-border/40 focus:border-primary/30 text-[12px] font-medium tracking-tight"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleCreateProject} 
                disabled={saving || !projectName.trim() || !selectedCompanyId} 
                className="h-11 px-10 rounded-xl bg-primary text-white font-bold uppercase tracking-wider text-[11px] hover:-translate-y-0.5 shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
              >
                {saving ? <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-3.5 w-3.5" />}
                Create Project
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">Project Objective</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">Company</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest h-12 text-muted-foreground pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((project) => (
                  <TableRow key={project.id} className="border-border/40 group hover:bg-primary/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <FolderKanban className="h-4 w-4 text-primary opacity-60" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold tracking-tight text-foreground">{project.name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{project.code || "UNC-PROJ"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <p className="text-[11px] font-bold text-foreground tracking-tight line-clamp-1 max-w-[200px]">{project.description || "NO_DESC"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground/40" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{project.companyName || "Unassigned"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] h-5 px-2 rounded-lg border-primary/20 bg-primary/5 text-primary font-bold uppercase tracking-wider">Active</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteProject(project.id)} 
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}