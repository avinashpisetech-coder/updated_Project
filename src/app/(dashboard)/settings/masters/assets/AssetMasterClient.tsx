"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Database, 
  Package, 
  UserPlus, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Layers, 
  Workflow, 
  ChevronRight,
  Monitor,
  Smartphone,
  MousePointer2,
  Cpu,
  Wifi,
  Zap,
  Tag,
  Building2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// --- Types ---
interface AssetSubType {
  id: string;
  name: string;
  code_prefix: string;
  required_fields: any;
  low_stock_threshold: number;
  is_active: boolean;
}

interface OnboardingItem {
  id: string;
  asset_sub_type_id: string;
  quantity: number;
  is_mandatory: boolean;
  sub_type?: { name: string };
  notes?: string;
}

interface OnboardingConfig {
  id: string;
  title: string;
  description: string;
  department_id: string | null;
  items: OnboardingItem[];
}

interface AssetType {
  id: string;
  name: string;
  description: string;
}

interface Supplier {
  id: string;
  name: string;
  address: string;
  gst_number: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface Budget {
  id: string;
  fiscal_year: string;
  asset_type_id: string;
  allocated_amount: number;
  spent_amount: number;
  notes: string;
  asset_type?: { name: string };
}

interface Props {
  subTypes: AssetSubType[];
  onboardingConfigs: OnboardingConfig[];
  departments: { id: string; name: string }[];
  assetTypes: AssetType[];
  suppliers: Supplier[];
  budgets: Budget[];
}

export function AssetMasterClient({ 
  subTypes, 
  onboardingConfigs, 
  departments,
  assetTypes,
  suppliers,
  budgets
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState("bundles");
  
  // State for Onboarding Bundle Modal
  const [isBundleModalOpen, setIsBundleModalOpen] = React.useState(false);
  const [editingBundle, setEditingBundle] = React.useState<OnboardingConfig | null>(null);
  const [bundleForm, setBundleForm] = React.useState({
    title: "",
    description: "",
    department_id: "all",
    items: [] as any[]
  });

  const [localAssetTypes, setLocalAssetTypes] = React.useState<AssetType[]>(assetTypes);
  const [localSuppliers, setLocalSuppliers] = React.useState<Supplier[]>(suppliers);
  const [localBudgets, setLocalBudgets] = React.useState<Budget[]>(budgets);
  const [localSubTypes, setLocalSubTypes] = React.useState<AssetSubType[]>(subTypes);

  // States for new Masters Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [supplierForm, setSupplierForm] = React.useState({
    name: "", address: "", gst_number: "", contact_person: "", email: "", phone: ""
  });

  const [isTypeModalOpen, setIsTypeModalOpen] = React.useState(false);
  const [typeForm, setTypeForm] = React.useState({ name: "", description: "" });

  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false);
  const [budgetForm, setBudgetForm] = React.useState({
    fiscal_year: "2026-27",
    asset_type_id: "",
    allocated_amount: 0,
    notes: ""
  });

  const openBundleModal = (bundle?: OnboardingConfig) => {
    if (bundle) {
      setEditingBundle(bundle);
      setBundleForm({
        title: bundle.title,
        description: bundle.description || "",
        department_id: bundle.department_id || "all",
        items: bundle.items.map(i => ({ 
            id: i.id, 
            asset_sub_type_id: i.asset_sub_type_id, 
            quantity: i.quantity, 
            is_mandatory: i.is_mandatory,
            notes: i.notes || ""
        }))
      });
    } else {
      setEditingBundle(null);
      setBundleForm({
        title: "",
        description: "",
        department_id: "all",
        items: []
      });
    }
    setIsBundleModalOpen(true);
  };

  const saveBundle = async () => {
    if (!bundleForm.title) {
      toast.error("Package title is required");
      return;
    }

    try {
        const payload = {
            title: bundleForm.title,
            description: bundleForm.description,
            department_id: bundleForm.department_id === "all" ? null : bundleForm.department_id
        };

        let bundleId = editingBundle?.id;

        if (editingBundle) {
            const { error } = await supabase
                .from("onboarding_asset_config")
                .update(payload)
                .eq("id", editingBundle.id);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from("onboarding_asset_config")
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            bundleId = data.id;
        }

        // Handle items
        // Simplified: Delete and re-insert for speed of dev
        if (editingBundle) {
            await supabase.from("onboarding_asset_items").delete().eq("config_id", editingBundle.id);
        }

        if (bundleForm.items.length > 0) {
            const itemsToInsert = bundleForm.items.map(item => ({
                config_id: bundleId,
                asset_sub_type_id: item.asset_sub_type_id,
                quantity: item.quantity,
                is_mandatory: item.is_mandatory,
                notes: item.notes
            }));
            const { error: itemError } = await supabase.from("onboarding_asset_items").insert(itemsToInsert);
            if (itemError) throw itemError;
        }

        toast.success(editingBundle ? "Onboarding bundle updated" : "Onboarding bundle created");
        setIsBundleModalOpen(false);
        router.refresh();
    } catch (error: any) {
        toast.error(error.message || "Failed to save bundle");
    }
  };

  const addItemToForm = () => {
    setBundleForm(prev => ({
        ...prev,
        items: [...prev.items, { asset_sub_type_id: subTypes[0]?.id || "", quantity: 1, is_mandatory: true, notes: "" }]
    }));
  };

  const removeItemFromForm = (idx: number) => {
    setBundleForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const updateItemInForm = (idx: number, key: string, value: any) => {
    setBundleForm(prev => ({
        ...prev,
        items: prev.items.map((item, i) => i === idx ? { ...item, [key]: value } : item)
    }));
  };

  const getSubTypeName = (id: string) => {
    return subTypes.find(s => s.id === id)?.name || "Unknown";
  };

  const deleteBundle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;
    try {
        const { error } = await supabase.from("onboarding_asset_config").delete().eq("id", id);
        if (error) throw error;
        toast.success("Configuration deleted");
        router.refresh();
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name) return toast.error("Supplier name required.");
    try {
        const { data, error } = await supabase.from("asset_suppliers").insert([supplierForm]).select().single();
        if (error) throw error;
        setLocalSuppliers(prev => [...prev, data]);
        setIsSupplierModalOpen(false);
        setSupplierForm({ name: "", address: "", gst_number: "", contact_person: "", email: "", phone: "" });
        toast.success("Supplier registered successfully.");
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  const handleCreateAssetType = async () => {
    if (!typeForm.name) return toast.error("Asset Type name required.");
    try {
        const { data, error } = await supabase.from("asset_types").insert([typeForm]).select().single();
        if (error) throw error;
        setLocalAssetTypes(prev => [...prev, data]);
        setIsTypeModalOpen(false);
        setTypeForm({ name: "", description: "" });
        toast.success("Asset type added.");
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  const handleCreateBudget = async () => {
    if (!budgetForm.asset_type_id) return toast.error("Asset Type binding required.");
    if (budgetForm.allocated_amount <= 0) return toast.error("Budget amount must be positive.");
    
    try {
        const { data, error } = await supabase
            .from("asset_budgets")
            .insert([budgetForm])
            .select(`
                *,
                asset_type:asset_types(name)
            `)
            .single();
        if (error) throw error;
        setLocalBudgets(prev => [data, ...prev]);
        setIsBudgetModalOpen(false);
        setBudgetForm({ fiscal_year: "2026-27", asset_type_id: "", allocated_amount: 0, notes: "" });
        toast.success("Fiscal budget allocated.");
    } catch (error: any) {
        toast.error(error.message);
    }
  };

  // --- Icon mapping for Asset Sub-types ---
  const getAssetIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("laptop") || n.includes("desktop")) return Monitor;
    if (n.includes("mobile") || n.includes("phone") || n.includes("tablet")) return Smartphone;
    if (n.includes("input") || n.includes("mouse") || n.includes("keyboard")) return MousePointer2;
    if (n.includes("network")) return Wifi;
    if (n.includes("power")) return Zap;
    if (n.includes("peripheral") || n.includes("accessory")) return Tag;
    return Cpu;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
            <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/40">
            <TabsTrigger value="bundles" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                <Workflow size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Asset Assign Configurations</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                <Package size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Inventory Master</span>
            </TabsTrigger>
            </TabsList>

            <Button 
                onClick={() => {
                    if (activeTab === "bundles") openBundleModal();
                    else if (activeTab === "suppliers") setIsSupplierModalOpen(true);
                    else if (activeTab === "asset_types") setIsTypeModalOpen(true);
                    else if (activeTab === "budgets") setIsBudgetModalOpen(true);
                    else toast(`Management for ${activeTab} coming in next update`);
                }}
                className="rounded-xl h-12 px-6 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20"
            >
                <Plus size={14} />
                Add {activeTab === "bundles" ? "Config" : activeTab === "types" ? "Category" : activeTab === "suppliers" ? "Supplier" : activeTab === "budgets" ? "Budget" : "Type"}
            </Button>
        </div>

        <div className="mb-4 overflow-x-auto pb-2 scrollbar-none">
            <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/40 w-fit">
                <TabsTrigger value="bundles" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                    <Workflow size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Assign Configurations</span>
                </TabsTrigger>
                <TabsTrigger value="types" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                    <Package size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Asset Sub-types</span>
                </TabsTrigger>
                <TabsTrigger value="asset_types" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                    <Layers size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Main Types</span>
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                    <Building2 size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Suppliers</span>
                </TabsTrigger>
                <TabsTrigger value="budgets" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2">
                    <Database size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Budgets</span>
                </TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="bundles">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {onboardingConfigs.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/10">
                        <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-6">
                            <Workflow className="h-8 w-8 text-primary/40" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">No Configurations Found</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest mb-6">Create bundles to automate asset assignment for new employees.</p>
                        <Button onClick={() => openBundleModal()} variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/10">
                            Create First Bundle
                        </Button>
                    </div>
                ) : (
                    onboardingConfigs.map(config => (
                        <div key={config.id} className="technical-card p-0 h-fit bg-card/40 border-border/40 overflow-hidden group">
                           <div className="p-6 pb-4 flex items-center justify-between border-b border-border/10 bg-muted/10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest bg-primary/10 border-primary/20 text-primary">
                                            {config.items.length} Assets Linked
                                        </Badge>
                                        <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase tracking-widest bg-muted/20 border-border/40 text-muted-foreground/60">
                                            {departments.find(d => d.id === config.department_id)?.name || "Global"}
                                        </Badge>
                                    </div>
                                    <h3 className="text-lg font-bold tracking-tight text-foreground">{config.title}</h3>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button onClick={() => openBundleModal(config)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:border-border/40">
                                        <Edit2 size={12} className="text-primary/60" />
                                    </Button>
                                    <Button onClick={() => deleteBundle(config.id)} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 transition-colors">
                                        <Trash2 size={12} className="text-red-500/60" />
                                    </Button>
                                </div>
                           </div>
                           <div className="p-6 space-y-4">
                                {config.description && (
                                    <p className="text-[10px] leading-relaxed text-muted-foreground/60 font-medium uppercase tracking-widest line-clamp-2">
                                        {config.description}
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Required Equipment Matrix</p>
                                    <div className="space-y-1.5">
                                        {config.items.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/10 group/item">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center">
                                                        {React.createElement(getAssetIcon(item.sub_type?.name || ""), { size: 10, className: "text-primary/60" })}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-foreground/80">{item.sub_type?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-primary/60">×{item.quantity}</span>
                                                    {item.is_mandatory && (
                                                        <div className="h-1.5 w-1.5 rounded-full bg-red-400" title="Mandatory" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                           </div>
                        </div>
                    ))
                )}
            </div>
        </TabsContent>
        <TabsContent value="suppliers">
            <Card className="rounded-[2rem] border-border/40 bg-card/40 overflow-hidden shadow-xl shadow-primary/5">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-border/20">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Supplier Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Contact / Email</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">GST Number</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localSuppliers.map(s => (
                            <TableRow key={s.id} className="border-border/10 hover:bg-muted/10 transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm tracking-tight text-foreground">{s.name}</span>
                                        <span className="text-[10px] text-muted-foreground/60 uppercase">{s.address}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[11px] text-foreground">{s.contact_person}</span>
                                        <span className="text-[10px] text-muted-foreground/60">{s.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <code className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold text-primary/70">{s.gst_number || "NO_GST"}</code>
                                </TableCell>
                                <TableCell className="py-4 text-center">
                                    <Badge variant="default" className="text-[8px] font-black uppercase tracking-widest h-5 px-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
                                        Active
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

        <TabsContent value="asset_types">
            <Card className="rounded-[2rem] border-border/40 bg-card/40 overflow-hidden shadow-xl shadow-primary/5">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-border/20">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Category Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Description</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localAssetTypes.map(t => (
                            <TableRow key={t.id} className="border-border/10 hover:bg-muted/10 transition-colors">
                                <TableCell className="py-4 font-bold text-sm">{t.name}</TableCell>
                                <TableCell className="py-4 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">{t.description}</TableCell>
                                <TableCell className="py-4 text-center">
                                    <Badge variant="default" className="text-[8px] font-black uppercase tracking-widest h-5 px-2">Operational</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

        <TabsContent value="budgets">
            <Card className="rounded-[2rem] border-border/40 bg-card/40 overflow-hidden shadow-xl shadow-primary/5">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent border-border/20">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Fiscal Year</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Asset Category</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-right">Allocated</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-right">Spent</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Utilization</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localBudgets.map(b => (
                            <TableRow key={b.id} className="border-border/10 hover:bg-muted/10 transition-colors">
                                <TableCell className="py-4 font-bold text-sm tracking-tighter">{b.fiscal_year}</TableCell>
                                <TableCell className="py-4 text-[10px] font-bold uppercase text-primary/60">{b.asset_type?.name}</TableCell>
                                <TableCell className="py-4 text-right font-mono font-bold text-sm">₹{b.allocated_amount.toLocaleString()}</TableCell>
                                <TableCell className="py-4 text-right font-mono font-bold text-sm text-red-500/70">₹{b.spent_amount.toLocaleString()}</TableCell>
                                <TableCell className="py-4">
                                     <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${Math.min((b.spent_amount/b.allocated_amount)*100, 100)}%` }} />
                                     </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </TabsContent>

      </Tabs>

      {/* Bundle Edit Dialog */}
      <Dialog open={isBundleModalOpen} onOpenChange={setIsBundleModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-border/40 gap-6">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                    {editingBundle ? "Update Configuration" : "New Onboarding Preset"}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Define the standard technical equipment bundle for employee personas.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Configuration Title</Label>
                        <Input 
                            value={bundleForm.title} 
                            onChange={e => setBundleForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g. Senior Software Engineer" 
                            className="h-12 rounded-xl bg-muted/20 border-border/40 focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Target Department</Label>
                        <Select 
                            value={bundleForm.department_id} 
                            onValueChange={v => setBundleForm(prev => ({ ...prev, department_id: v }))}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40">
                                <SelectValue placeholder="Global Bundle" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40">
                                <SelectItem value="all">Global (Any Department)</SelectItem>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Description / Assignment Notes</Label>
                    <Input 
                        value={bundleForm.description} 
                        onChange={e => setBundleForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Internal notes about this equipment standard..." 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>

                <div className="space-y-4 pt-2 border-t border-border/10">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Required Equipment Matrix</Label>
                        <Button variant="ghost" size="sm" onClick={addItemToForm} className="text-primary hover:bg-primary/5 gap-1.5 h-8">
                            <Plus size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Add Item</span>
                        </Button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {bundleForm.items.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-12 gap-3">
                                        <div className="col-span-8">
                                            <Select 
                                                value={item.asset_sub_type_id} 
                                                onValueChange={v => updateItemInForm(idx, "asset_sub_type_id", v)}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl bg-background border-border/40">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {subTypes.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-4">
                                            <Input 
                                                type="number"
                                                value={item.quantity} 
                                                onChange={e => updateItemInForm(idx, "quantity", parseInt(e.target.value))}
                                                className="h-10 rounded-xl bg-background border-border/40"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`mandatory-${idx}`} 
                                                checked={item.is_mandatory} 
                                                onCheckedChange={v => updateItemInForm(idx, "is_mandatory", !!v)}
                                            />
                                            <Label htmlFor={`mandatory-${idx}`} className="text-[10px] font-bold uppercase tracking-widest opacity-60">Mandatory</Label>
                                        </div>
                                        <Input 
                                            value={item.notes} 
                                            onChange={e => updateItemInForm(idx, "notes", e.target.value)}
                                            placeholder="Item specifics (e.g. 16GB RAM min)"
                                            className="h-8 rounded-lg bg-background/50 border-border/10 text-[9px] font-medium"
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeItemFromForm(idx)} className="h-10 w-10 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-colors">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))}

                        {bundleForm.items.length === 0 && (
                            <div className="py-8 text-center border border-dashed border-border/40 rounded-2xl bg-muted/5">
                                <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">No equipment added yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsBundleModalOpen(false)} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest">
                    Cancel
                </Button>
                <Button onClick={saveBundle} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                    {editingBundle ? "Save Changes" : "Create Preset"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Supplier Registration Dialog */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 border-border/40 gap-6">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight">Register Supplier</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Onboard new asset vendors and service providers.
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Business Name</Label>
                    <Input 
                        value={supplierForm.name} 
                        onChange={e => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Reliance Digital" 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">GST Number</Label>
                    <Input 
                        value={supplierForm.gst_number} 
                        onChange={e => setSupplierForm(prev => ({ ...prev, gst_number: e.target.value }))}
                        placeholder="27AAAAAAAAAAAAAAA" 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Contact Person</Label>
                    <Input 
                        value={supplierForm.contact_person} 
                        onChange={e => setSupplierForm(prev => ({ ...prev, contact_person: e.target.value }))}
                        placeholder="Name of SPOC" 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Email Domain</Label>
                    <Input 
                        value={supplierForm.email} 
                        onChange={e => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="contact@supplier.com" 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Registered Office Address</Label>
                    <Input 
                        value={supplierForm.address} 
                        onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Full billing address..." 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsSupplierModalOpen(false)} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
                <Button onClick={handleCreateSupplier} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Register vendor</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Type Registration Dialog */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-border/40 gap-6">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight">New Asset Type</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Define high-level asset categories for budgeting.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Category Name</Label>
                    <Input 
                        value={typeForm.name} 
                        onChange={e => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. IT Assets, Office Furniture" 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Description</Label>
                    <Input 
                        value={typeForm.description} 
                        onChange={e => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Scope of this category..." 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsTypeModalOpen(false)} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
                <Button onClick={handleCreateAssetType} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">Add Type</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Allocation Dialog */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-border/40 gap-6">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight">Allocate Budget</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Set year-wise fund allocation for asset categories.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Fiscal Year</Label>
                        <Select 
                            value={budgetForm.fiscal_year} 
                            onValueChange={v => setBudgetForm(prev => ({ ...prev, fiscal_year: v }))}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40">
                                <SelectItem value="2025-26">FY 2025-26</SelectItem>
                                <SelectItem value="2026-27">FY 2026-27</SelectItem>
                                <SelectItem value="2027-28">FY 2027-28</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Asset Category</Label>
                        <Select 
                            value={budgetForm.asset_type_id} 
                            onValueChange={v => setBudgetForm(prev => ({ ...prev, asset_type_id: v }))}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40">
                                <SelectValue placeholder="Main Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/40">
                                {localAssetTypes.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Allocated Amount (₹)</Label>
                    <Input 
                        type="number"
                        value={budgetForm.allocated_amount} 
                        onChange={e => setBudgetForm(prev => ({ ...prev, allocated_amount: parseFloat(e.target.value) }))}
                        placeholder="Total amount for this period..." 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Notes / Remarks</Label>
                    <Input 
                        value={budgetForm.notes} 
                        onChange={e => setBudgetForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Internal budget notes..." 
                        className="h-12 rounded-xl bg-muted/20 border-border/40"
                    />
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button variant="ghost" onClick={() => setIsBudgetModalOpen(false)} className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
                <Button 
                    onClick={handleCreateBudget} 
                    className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                    Confirm Allocation
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
