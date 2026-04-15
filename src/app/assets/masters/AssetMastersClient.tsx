"use client";

import React from "react";
import { format } from "date-fns";
import { 
  Search, 
  Plus, 
  Settings2, 
  ChevronLeft,
  ChevronRight, 
  Printer, 
  FileDown,
  ChevronDown,
  Trash2,
  Edit2,
  AlertCircle,
  Store,
  MapPin,
  ShieldCheck,
  Zap,
  Layers,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Props {
  types: any[];
  subTypes: any[];
  catalog: any[];
  hsnCodes: any[];
  taxGroups: any[];
  uom: any[];
  suppliers: any[];
  budgets: any[];
  onboardingConfigs: any[];
  departments: any[];
  companies: any[];
  projects: any[];
  auditLogs: any[];
  stores: any[];
  role: string;
  fullName: string;
}

export function AssetMastersClient({ 
    types: initialTypes, 
    subTypes: initialSubTypes, 
    catalog: initialCatalog, 
    hsnCodes: initialHsn, 
    taxGroups: initialTaxGroups, 
    uom: initialUom, 
    suppliers: initialSuppliers,
    budgets: initialBudgets,
    onboardingConfigs: initialBundles,
    departments,
    companies,
    projects,
    auditLogs: initialAudit,
    stores: initialStores,
    role,
    fullName
}: Props) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = React.useState("types");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [editId, setEditId] = React.useState<string | null>(null);

  // Local State for refresh
  const [types, setTypes] = React.useState(initialTypes);
  const [subTypes, setSubTypes] = React.useState(initialSubTypes);
  const [catalog, setCatalog] = React.useState(initialCatalog);
  const [hsnCodes, setHsnCodes] = React.useState(initialHsn);
  const [taxGroups, setTaxGroups] = React.useState(initialTaxGroups);
  const [uom, setUom] = React.useState(initialUom);
  const [suppliers, setSuppliers] = React.useState(initialSuppliers);
  const [budgets, setBudgets] = React.useState(initialBudgets);
  const [bundles, setBundles] = React.useState(initialBundles);
  const [auditLogs, setAuditLogs] = React.useState(initialAudit);
  const [stores, setStores] = React.useState(initialStores || []);

  const [isOpen, setIsOpen] = React.useState(false);

  // Form States
  const [typeForm, setTypeForm] = React.useState({ name: "", description: "", is_active: true });
  const [subTypeForm, setSubTypeForm] = React.useState({ name: "", code_prefix: "", type_id: "", allow_negative_stock: false, is_active: true });
  const [catalogForm, setCatalogForm] = React.useState({ 
    name: "", 
    type_id: "",
    sub_type_id: "", 
    hsn_code_id: "", 
    brand: "", 
    model_number: "", 
    serial_number: "",
    inventory_number: "",
    uom_id: "",
    description: "",
    date_put_to_use: "",
    manufacturing_date: "",
    expiry_date: "",
    store_id: "",
    depreciation_method: "Straight Line",
    depreciation_key: "",
    useful_life_years: 0,
    asset_life_readout: "0Y 0M 0D",
    salvage_value_percent: 5,
    depreciation_areas: ["Accounting", "Tax"],
    is_active: true
  });
  const [hsnForm, setHsnForm] = React.useState({ hsn_code: "", description: "", tax_group_id: "", is_active: true });
  const [taxGroupForm, setTaxGroupForm] = React.useState({ name: "", description: "" , taxes: [{ name: "", percentage: 0, description: "" }], is_active: true });
  const [uomForm, setUomForm] = React.useState({ name: "", symbol: "", is_active: true });
  const [supplierForm, setSupplierForm] = React.useState({ name: "", address: "", gst_number: "", contact_person: "", email: "", phone: "", is_active: true });
  const [storeForm, setStoreForm] = React.useState({ name: "", code: "", contact_person: "", address: "", company_id: "", project_id: "", email: "", is_active: true });
  const [budgetForm, setBudgetForm] = React.useState({ 
    fiscal_year: "2026-27", 
    asset_type_id: "", 
    asset_sub_type_id: "", 
    company_id: "",
    project_id: "",
    is_taxable: false, 
    basic_amount: 0, 
    tax_group_id: "", 
    tax_amount: 0, 
    allocated_amount: 0, 
    notes: "" ,
    is_active: true
  });
  const [bundleForm, setBundleForm] = React.useState({ title: "", description: "", department_id: "all", items: [] as any[] });

  // 0. Search Data Regulators
  const filterBySearch = (data: any[], keys: string[]) => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => 
        keys.some(key => {
            const value = key.split('.').reduce((obj, k) => obj?.[k], item);
            return String(value || '').toLowerCase().includes(lowerSearch);
        })
    );
  };
  
  // 0. Auto-Calculate Asset Life
  React.useEffect(() => {
    if (catalogForm.manufacturing_date && catalogForm.expiry_date) {
        const start = new Date(catalogForm.manufacturing_date);
        const end = new Date(catalogForm.expiry_date);
        
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
            months--;
            days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        if (years >= 0) {
            const usefulLife = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
            setCatalogForm(prev => ({ 
                ...prev, 
                useful_life_years: usefulLife,
                asset_life_readout: `${years}Y ${months}M ${days}D`
            }));
        }
    }
  }, [catalogForm.manufacturing_date, catalogForm.expiry_date]);

  const fetchActiveMaster = async (targetTab?: string) => {
    const tabToFetch = targetTab || activeTab;
    try {
        if (tabToFetch === 'types') {
            const { data } = await supabase.from("asset_types").select("*").order('created_at', { ascending: false });
            if (data) setTypes(data);
        } else if (tabToFetch === 'subtypes') {
            const { data } = await supabase.from("asset_sub_types").select("*, type:type_id(name)").order('created_at', { ascending: false });
            if (data) setSubTypes(data);
        } else if (tabToFetch === 'catalog') {
            const { data } = await supabase.from("asset_catalog").select("*, sub_type:sub_type_id(*, type:type_id(name)), hsn:hsn_code_id(*), store:store_id(*)").order('created_at', { ascending: false });
            if (data) setCatalog(data);
        } else if (tabToFetch === 'hsn') {
            const { data } = await supabase.from("asset_hsn_codes").select("*, tax_group:tax_group_id(*)").order('created_at', { ascending: false });
            if (data) setHsnCodes(data);
        } else if (tabToFetch === 'taxes') {
            const { data } = await supabase.from("asset_tax_groups").select("*, taxes:asset_taxes(*)").order('created_at', { ascending: false });
            if (data) setTaxGroups(data);
        } else if (tabToFetch === 'uom') {
            const { data } = await supabase.from("asset_uom").select("*").order('created_at', { ascending: false });
            if (data) setUom(data);
        } else if (tabToFetch === 'suppliers') {
            const { data } = await supabase.from("asset_suppliers").select("*").order('created_at', { ascending: false });
            if (data) setSuppliers(data);
        } else if (tabToFetch === 'stores') {
            const { data } = await supabase.from("asset_stores").select("*, project:projects(id, name), company:companies(id, name)").order('created_at', { ascending: false });
            if (data) setStores(data || []);
        } else if (tabToFetch === 'budgets') {
            const { data } = await supabase.from("asset_budgets").select("*, asset_type:asset_types(name), asset_sub_type:asset_sub_types(name), tax_group:asset_tax_groups(*), company:companies(name), project:projects(name)").order('created_at', { ascending: false });
            if (data) setBudgets(data);
        } else if (tabToFetch === 'bundles') {
            const { data } = await supabase.from("onboarding_asset_config").select("*, items:onboarding_asset_items(*, sub_type:asset_sub_types(name))").order('created_at', { ascending: false });
            if (data) setBundles(data);
        } else if (tabToFetch === 'audit') {
            const { data } = await supabase.from("asset_master_logs").select("*").order('created_at', { ascending: false });
            if (data) setAuditLogs(data);
        }
    } catch (err) { console.error("Registry Refresh Failure:", err); }
  };

  const resetAllForms = () => {
    setTypeForm({ name: "", description: "", is_active: true });
    setSubTypeForm({ name: "", code_prefix: "", type_id: "", allow_negative_stock: false, is_active: true });
    setCatalogForm({ 
        name: "", type_id: "", sub_type_id: "", hsn_code_id: "", brand: "", model_number: "", 
        serial_number: "", inventory_number: "", uom_id: "", description: "", 
        date_put_to_use: "", manufacturing_date: "", expiry_date: "", store_id: "",
        depreciation_method: "Straight Line", depreciation_key: "", useful_life_years: 0,
        asset_life_readout: "0Y 0M 0D", salvage_value_percent: 5, depreciation_areas: ["Accounting", "Tax"],
        is_active: true
    });
    setHsnForm({ hsn_code: "", description: "", tax_group_id: "", is_active: true });
    setTaxGroupForm({ name: "", description: "" , taxes: [{ name: "", percentage: 0, description: "" }], is_active: true });
    setUomForm({ name: "", symbol: "", is_active: true });
    setSupplierForm({ name: "", address: "", gst_number: "", contact_person: "", email: "", phone: "", is_active: true });
    setStoreForm({ name: "", code: "", contact_person: "", address: "", company_id: "", project_id: "", email: "", is_active: true });
    setBudgetForm({ 
        fiscal_year: "2026-27", asset_type_id: "", asset_sub_type_id: "", company_id: "", project_id: "",
        is_taxable: false, basic_amount: 0, tax_group_id: "", tax_amount: 0, allocated_amount: 0, 
        notes: "", is_active: true
    });
  };

  const handleDelete = async (item: any) => {
    const tabToTable: any = {
        types: 'asset_types',
        subtypes: 'asset_sub_types',
        catalog: 'asset_catalog',
        hsn: 'asset_hsn_codes',
        taxes: 'asset_tax_groups',
        stores: 'asset_stores',
        budgets: 'asset_budgets'
    };

    const confirmMsg = `Are you sure you want to permanently delete this ${activeTab} protocol? Reliance on relational integrity will be audited before purge.`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
        // --- High-Fidelity Transactional Integrity Audit ---
        
        if (activeTab === 'catalog') {
            const { data: hasAssets } = await supabase.from('assets').select('id').eq('catalog_id', item.id).limit(1);
            if (hasAssets?.length) throw new Error("Inventory Lock: This catalog item is currently tracked in active stockrooms.");
            
            const { data: hasPO } = await supabase.from('asset_purchase_items').select('id').eq('catalog_id', item.id).limit(1);
            if (hasPO?.length) throw new Error("Procurement Lock: This item exists in historical or active Purchase Orders.");
        }

        if (activeTab === 'types') {
            const { data: hasSub } = await supabase.from('asset_sub_types').select('id').eq('type_id', item.id).limit(1);
            if (hasSub?.length) throw new Error("Taxonomic Dependency: Prohibit deletion while Sub-categories are linked to this Type.");
        }

        if (activeTab === 'subtypes') {
            const { data: hasCat } = await supabase.from('asset_catalog').select('id').eq('sub_type_id', item.id).limit(1);
            if (hasCat?.length) throw new Error("Catalog Dependency: Prohibit deletion while Catalog Items are mapped to this Sub-category.");
            
            const { data: hasAssets } = await supabase.from('assets').select('id').eq('sub_type_id', item.id).limit(1);
            if (hasAssets?.length) throw new Error("Lifecycle Lock: This Sub-category has active assets attributed to it in the registry.");
        }

        if (activeTab === 'stores') {
            const { data: hasAssets } = await supabase.from('assets').select('id').eq('store_id', item.id).limit(1);
            if (hasAssets?.length) throw new Error("Logistical lock: This store currently houses audited inventory assets.");
        }

        if (activeTab === 'taxes') {
            const { data: hasHsn } = await supabase.from('asset_hsn_codes').select('id').eq('tax_group_id', item.id).limit(1);
            if (hasHsn?.length) throw new Error("Fiscal Dependency: This tax group is linked to active HSN codes.");
        }

        if (activeTab === 'hsn') {
            const { data: hasCat } = await supabase.from('asset_catalog').select('id').eq('hsn_code_id', item.id).limit(1);
            if (hasCat?.length) throw new Error("Registry Dependency: This HSN code is linked to catalog specifications.");
        }

        if (activeTab === 'budgets') {
            const { data: hasSpent } = await supabase.from('asset_budgets').select('spent_amount').eq('id', item.id).single();
            if (hasSpent?.spent_amount > 0) throw new Error("Financial Lock: This budget has active spending recorded against it.");
        }

        if (activeTab === 'uom') {
            const { data: hasCat } = await supabase.from('asset_catalog').select('id').eq('uom_id', item.id).limit(1);
            if (hasCat?.length) throw new Error("Registry lock: This UOM is currently mapped to active catalog items.");
        }

        if (activeTab === 'suppliers') {
            const { data: hasPO } = await supabase.from('asset_purchases').select('id').eq('supplier_id', item.id).limit(1);
            if (hasPO?.length) throw new Error("Procurement Lock: Historical purchase orders are linked to this supplier.");
        }

        const { error } = await supabase.from(tabToTable[activeTab]).delete().eq('id', item.id);
        if (error) throw error;

        toast.success("Protocol Purged Successfully.");
        fetchActiveMaster();
    } catch (err: any) {
        toast.error("Security Lock: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCreateInit = () => {
    resetAllForms();
    setMode('create');
    setEditId(null);
    setIsOpen(true);
  };

  const handleEditInit = (item: any) => {
    setMode('edit');
    setEditId(item.id);
    if (activeTab === 'types') setTypeForm({ name: item.name || "", description: item.description || "", is_active: item.is_active ?? true });
    if (activeTab === 'subtypes') setSubTypeForm({ name: item.name || "", code_prefix: item.code_prefix || "", type_id: item.type_id || "", allow_negative_stock: item.allow_negative_stock || false, is_active: item.is_active ?? true });
    if (activeTab === 'catalog') {
        setCatalogForm({ 
            name: item.name || "", 
            type_id: item.sub_type?.type_id || "",
            sub_type_id: item.sub_type_id || "", 
            hsn_code_id: item.hsn_code_id || "", 
            brand: item.brand || "", 
            model_number: item.model_number || "", 
            serial_number: item.serial_number || "",
            inventory_number: item.inventory_number || "",
            uom_id: item.uom_id || "",
            description: item.description || "",
            date_put_to_use: item.date_put_to_use || "",
            manufacturing_date: item.manufacturing_date || "",
            expiry_date: item.expiry_date || "",
            store_id: item.store_id || "",
            depreciation_method: item.depreciation_method || "Straight Line",
            depreciation_key: item.depreciation_key || "",
            useful_life_years: item.useful_life_years || 0,
            asset_life_readout: item.asset_life_readout || "0Y 0M 0D",
            salvage_value_percent: item.salvage_value_percent || 5,
            depreciation_areas: item.depreciation_areas || ["Accounting", "Tax"],
            is_active: item.is_active ?? true
        });
    }
    if (activeTab === 'hsn') setHsnForm({ hsn_code: item.hsn_code || "", description: item.description || "", tax_group_id: item.tax_group_id || "", is_active: item.is_active ?? true });
    if (activeTab === 'taxes') {
        setTaxGroupForm({ 
            name: item.name || "", 
            description: item.description || "", 
            taxes: (item.taxes || []).map((t: any) => ({ name: t.name || "", percentage: t.percentage || 0, description: t.description || "" })),
            is_active: item.is_active ?? true
        });
    }
    if (activeTab === 'uom') setUomForm({ name: item.name || "", symbol: item.symbol || "", is_active: item.is_active ?? true });
    if (activeTab === 'suppliers') setSupplierForm({ name: item.name || "", address: item.address || "", gst_number: item.gst_number || "", contact_person: item.contact_person || "", email: item.email || "", phone: item.phone || "" , is_active: item.is_active ?? true});
    if (activeTab === 'stores') setStoreForm({ name: item.name || "", code: item.code || "", contact_person: item.contact_person || "", address: item.address || "", company_id: item.company_id || "", project_id: item.project_id || "", email: item.email || "", is_active: item.is_active ?? true });
    if (activeTab === 'budgets') setBudgetForm({ 
        fiscal_year: item.fiscal_year || "", 
        asset_type_id: item.asset_type_id || "", 
        asset_sub_type_id: item.asset_sub_type_id || "", 
        company_id: item.company_id || "",
        project_id: item.project_id || "",
        is_taxable: item.is_taxable || false, 
        basic_amount: item.basic_amount || 0, 
        tax_group_id: item.tax_group_id || "", 
        tax_amount: item.tax_amount || 0, 
        allocated_amount: item.allocated_amount || 0, 
        notes: item.notes || "" ,
        is_active: item.is_active ?? true
    });
    setIsOpen(true);
  };

  const handleAction = async () => {
    setIsProcessing(true);
    try {
        let error = null;
        const tableMap: any = { 
            types: "asset_types", 
            subtypes: "asset_sub_types", 
            catalog: "asset_catalog", 
            hsn: "asset_hsn_codes", 
            taxes: "asset_tax_groups", 
            uom: "asset_uom",
            suppliers: "asset_suppliers",
            budgets: "asset_budgets",
            stores: "asset_stores"
        };
        const dataMap: any = { 
            types: typeForm, 
            subtypes: subTypeForm, 
            catalog: catalogForm, 
            hsn: hsnForm, 
            uom: uomForm,
            suppliers: supplierForm,
            stores: storeForm,
            budgets: budgetForm
        };

        let finalizedData = { ...dataMap[activeTab] };

        // Protocol Sanitization: Nullify empty strings to prevent UUID syntax errors
        Object.keys(finalizedData).forEach(key => {
            if (finalizedData[key] === "") {
                finalizedData[key] = null;
            }
        });

        if (activeTab === 'catalog') {
            const { asset_life_readout, type_id, ...cleanData } = finalizedData;
            finalizedData = cleanData;
        }

        // Protocol Sanitization: Remove is_active if table doesn't support it in schema cache
        if (activeTab === 'budgets') {
            const { is_active, ...cleanData } = finalizedData;
            finalizedData = cleanData;
        }

        if (mode === 'create') {
            if (activeTab === "taxes") {
                const { data: group, error: gErr } = await supabase.from("asset_tax_groups").insert([{ 
                    name: taxGroupForm.name, 
                    description: taxGroupForm.description,
                    is_active: taxGroupForm.is_active
                }]).select().single();
                if (gErr) throw gErr;
                const { error: tErr } = await supabase.from("asset_taxes").insert(taxGroupForm.taxes.map(t => ({ ...t, group_id: group.id })));
                error = tErr;
            } else {
                const { error: err } = await supabase.from(tableMap[activeTab]).insert([finalizedData]);
                error = err;
            }
        } else {
            if (activeTab === "taxes") {
                const { error: gErr } = await supabase.from("asset_tax_groups").update({ 
                    name: taxGroupForm.name, 
                    description: taxGroupForm.description,
                    is_active: taxGroupForm.is_active
                }).eq('id', editId);
                if (gErr) throw gErr;
                // Simple approach: Delete and re-insert taxes for the group
                await supabase.from("asset_taxes").delete().eq('group_id', editId);
                const { error: tErr } = await supabase.from("asset_taxes").insert(taxGroupForm.taxes.map(t => ({ ...t, group_id: editId })));
                error = tErr;
            } else {
                const { error: err } = await supabase.from(tableMap[activeTab]).update(finalizedData).eq('id', editId);
                error = err;
            }
        }

        if (error) throw error;
        toast.success(`Protocol ${mode === 'create' ? 'Authorized' : 'Amended'} Successfully.`);
        setIsOpen(false);
        fetchActiveMaster(); 
    } catch (err: any) {
        toast.error("Protocol Violation: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      
      {/* 1. Snow White: High-Density Protocol Header */}
      {!isOpen && (
        <header className="h-[72px] shrink-0 bg-card/40 backdrop-blur-3xl border-b border-border/40 flex items-center justify-between px-8 shadow-2xl shadow-black/5 z-20">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-8 shrink-0">
               <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-0.5">
                     <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                     <h1 className="text-[17px] font-black text-foreground uppercase tracking-tighter italic">ASM_CORE Hub</h1>
                  </div>
                  <div className="flex items-center gap-2 pl-3">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Governance_System_v4.0</span>
                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  </div>
               </div>
               <div className="h-8 w-[1px] bg-border/40" />
            </div>

            {/* Center: Dynamic Search Engine */}
            <div className="flex-1 max-w-xl mx-auto px-10">
               <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-primary transition-colors" />
                   <Input 
                      placeholder="SEARCH_PROTOCOL_MATRICES..." 
                      className="h-10 w-full pl-11 pr-4 text-[11px] font-bold bg-card/70 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all placeholder:text-slate-400 rounded-xl"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                   />
               </div>
            </div>

            {/* Right: Tactical Action Suite */}
            <div className="flex items-center gap-4 shrink-0">
               <div className="flex items-center bg-card/40 p-1.5 rounded-2xl border border-border/40 shadow-[inner_0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-md">
                  <Button variant="ghost" size="sm" className="h-9 px-5 text-[10px] font-black text-muted-foreground uppercase hover:bg-background hover:text-primary transition-all rounded-xl">
                      <FileDown size={14} className="mr-2" /> Export
                  </Button>
                  <div className="h-5 w-[1px] bg-border/40 mx-2" />
                  <Button variant="ghost" size="sm" className="h-9 px-5 text-[10px] font-black text-muted-foreground uppercase hover:bg-background hover:text-primary transition-all rounded-xl">
                      <Printer size={14} className="mr-2" /> Batch_Print
                  </Button>
               </div>

               <Button onClick={handleCreateInit} className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 border-primary/20 transition-all active:scale-95 group">
                   <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> Initialize_Protocol
               </Button>
            </div>
        </header>
      )}


      <main className="flex-1 overflow-hidden bg-background/50 relative">
        {isOpen ? (
            /* 3. FULL-PAGE PROTOCOL EDITOR */
            <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300">
                <header className="h-[72px] shrink-0 border-b border-border/40 flex items-center justify-between px-10 bg-card/20 backdrop-blur-3xl z-30">
                    <div className="flex items-center gap-6">
                        <h2 className="text-[15px] font-black uppercase text-foreground tracking-[0.2em] flex items-center gap-3">
                            <span className="text-primary">{mode === 'create' ? 'EXECUTE' : 'AMEND'}</span>_MASTER_REGISTRY
                        </h2>
                        <div className="h-6 w-[1px] bg-border/40" />
                        <Button variant="ghost" size="icon" onClick={() => { resetAllForms(); setIsOpen(false); setMode('create'); }} className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all border border-border/20">
                            <ChevronLeft size={20} />
                        </Button>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={() => setIsOpen(false)} className="h-11 px-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">ABORT_CHANGES</Button>
                        <Button onClick={handleAction} disabled={isProcessing} className="h-11 px-10 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-white shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all">
                           {isProcessing ? "PROCESSING_SYNC..." : "SYNC_MASTER_PROTOCOL"}
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar p-10 pt-5">
                    <div className="w-full space-y-10">
                        {activeTab === "subtypes" && (
                            <div className="grid grid-cols-12 gap-20">
                                <div className="col-span-5 space-y-12">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Identity_Parameters</h3>
                                        <div className="space-y-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] ml-1">Classification_Name</Label>
                                                <Input value={subTypeForm.name} onChange={e => setSubTypeForm({...subTypeForm, name: e.target.value})} placeholder="E.G. WORKSTATION_PRO" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black uppercase pl-6" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Protocol Prefix</Label>
                                                    <Input value={subTypeForm.code_prefix} onChange={e => setSubTypeForm({...subTypeForm, code_prefix: e.target.value.toUpperCase()})} placeholder="WKS" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black uppercase pl-6" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Parent Hierarchy</Label>
                                                    <Select value={subTypeForm.type_id} onValueChange={v => setSubTypeForm({...subTypeForm, type_id: v})}>
                                                        <SelectTrigger className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-black uppercase pl-6"><SelectValue placeholder="ROOT_TYPE" /></SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-border/40">
                                                            {types.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-7 space-y-12">
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Operational_Logic</h3>
                                        <div className="p-12 rounded-[3.5rem] bg-slate-950 border border-slate-900 flex items-center justify-between group hover:bg-slate-900/80 transition-all shadow-2xl">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <Zap size={20} className="fill-primary" />
                                                    <p className="text-[16px] font-black text-white uppercase tracking-widest italic">Negative_Stock_Indenting</p>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose max-w-sm">When active, the system bypasses strict stock checks during deployment and automatically initiates indent protocols for low-reserve categories.</p>
                                            </div>
                                            <Switch 
                                                checked={subTypeForm.allow_negative_stock}
                                                onCheckedChange={v => setSubTypeForm({...subTypeForm, allow_negative_stock: v})}
                                                className="scale-150 data-[state=checked]:bg-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === "catalog" && (
                            <div className="space-y-6 w-full px-10 pb-12">
                                {/* SECTION 01: IDENTITY_STRIP */}
                                <div className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.6em] text-primary/60 flex items-center gap-4 px-2">
                                        01_IDENTITY_CORE <div className="h-[1px] flex-1 bg-gradient-to-r from-border/40 to-transparent" />
                                    </h3>
                                    <div className="grid grid-cols-4 gap-6 bg-card/20 p-6 rounded-[2rem] border border-border/20 shadow-sm backdrop-blur-sm">
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black text-muted-foreground uppercase opacity-50 tracking-widest px-1">Master Designation</Label>
                                            <Input value={catalogForm.name} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} placeholder="PROTOCOL_REF" className="h-11 rounded-xl bg-background/50 border-border/40 text-[12px] font-black uppercase px-6 focus:ring-1 focus:ring-primary/20 transition-all w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black text-muted-foreground uppercase opacity-50 tracking-widest px-1">Major Type</Label>
                                            <Select value={catalogForm.type_id} onValueChange={v => setCatalogForm({...catalogForm, type_id: v, sub_type_id: ""})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/20 text-[10px] font-black uppercase px-5 w-full"><SelectValue placeholder="TYPE" /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40">{types.map(t => <SelectItem key={t.id} value={t.id} className="text-[9px] font-black uppercase">{t.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black text-muted-foreground uppercase opacity-50 tracking-widest px-1">Sub Category</Label>
                                            <Select value={catalogForm.sub_type_id} onValueChange={v => setCatalogForm({...catalogForm, sub_type_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40 text-[10px] font-black uppercase px-5 w-full"><SelectValue placeholder="SUB_TYPE" /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40">
                                                    {subTypes
                                                        .filter(st => !catalogForm.type_id || st.type_id === catalogForm.type_id)
                                                        .map(st => <SelectItem key={st.id} value={st.id} className="text-[9px] font-black uppercase">{st.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black text-muted-foreground uppercase opacity-50 tracking-widest px-1">HSN Compliance</Label>
                                            <Select value={catalogForm.hsn_code_id} onValueChange={v => setCatalogForm({...catalogForm, hsn_code_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/40 text-[10px] font-black uppercase px-5 w-full"><SelectValue placeholder="HSN_SAC" /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40">{hsnCodes.map(h => <SelectItem key={h.id} value={h.id} className="text-[9px] font-black uppercase">{h.hsn_code}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 02: LOGISTICS_STRIP */}
                                <div className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.6em] text-primary/60 flex items-center gap-4 px-2">
                                        02_LOGISTICS <div className="h-[1px] flex-1 bg-gradient-to-r from-border/40 to-transparent" />
                                    </h3>
                                    <div className="grid grid-cols-4 gap-6 bg-card/10 p-6 rounded-[2rem] border border-border/20 backdrop-blur-md">
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Manufacturer</Label>
                                            <Input value={catalogForm.brand} onChange={e => setCatalogForm({...catalogForm, brand: e.target.value.toUpperCase()})} placeholder="VENDOR_ROOT" className="h-11 rounded-xl bg-background/50 border-border/40 text-[10px] font-black px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Model_Ref</Label>
                                            <Input value={catalogForm.model_number} onChange={e => setCatalogForm({...catalogForm, model_number: e.target.value.toUpperCase()})} placeholder="REF_X" className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] font-black px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Serial_Number</Label>
                                            <Input value={catalogForm.serial_number} onChange={e => setCatalogForm({...catalogForm, serial_number: e.target.value})} placeholder="S/N" className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] font-mono px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Inventory_ID</Label>
                                            <Input value={catalogForm.inventory_number} onChange={e => setCatalogForm({...catalogForm, inventory_number: e.target.value})} placeholder="INV#" className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] font-black px-4 tracking-tighter w-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 03: DEPLOYMENT_STRIP */}
                                <div className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.6em] text-primary/60 flex items-center gap-4 px-2">
                                        03_DEPLOYMENT <div className="h-[1px] flex-1 bg-gradient-to-r from-border/40 to-transparent" />
                                    </h3>
                                    <div className="grid grid-cols-4 gap-6 bg-card/10 p-6 rounded-[2rem] border border-border/20 backdrop-blur-md">
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Mfg_Date</Label>
                                            <Input type="date" value={catalogForm.manufacturing_date} onChange={e => setCatalogForm({...catalogForm, manufacturing_date: e.target.value})} className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Expiry_Date</Label>
                                            <Input type="date" value={catalogForm.expiry_date} onChange={e => setCatalogForm({...catalogForm, expiry_date: e.target.value})} className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Put_To_Use</Label>
                                            <Input type="date" value={catalogForm.date_put_to_use} onChange={e => setCatalogForm({...catalogForm, date_put_to_use: e.target.value})} className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] px-4 w-full" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Allocation</Label>
                                            <Select value={catalogForm.store_id} onValueChange={v => setCatalogForm({...catalogForm, store_id: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] font-black uppercase px-4 w-full"><SelectValue placeholder="STORE" /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40">{stores.map(s => <SelectItem key={s.id} value={s.id} className="text-[9px] font-black uppercase">{s.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 04: FISCAL_CONSOLE */}
                                <div className="space-y-3">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.6em] text-primary/60 flex items-center gap-4 px-2">
                                        04_FISCAL_CONSOLE <div className="h-[1px] flex-1 bg-gradient-to-r from-border/40 to-transparent" />
                                    </h3>
                                    <div className="grid grid-cols-4 gap-6 bg-card/10 p-6 rounded-[2rem] border border-border/20 backdrop-blur-md">
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Methodology</Label>
                                            <Select value={catalogForm.depreciation_method} onValueChange={v => setCatalogForm({...catalogForm, depreciation_method: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/30 text-[10px] font-black uppercase px-4 w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40"><SelectItem value="Straight Line">STRAIGHT_LINE</SelectItem><SelectItem value="Declining Balance">DECLINING_BAL</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Calculated Life Age</Label>
                                            <div className="relative">
                                                <Input readOnly value={catalogForm.asset_life_readout} className="h-11 rounded-xl bg-background/50 border-border/30 text-primary text-[11px] font-black px-4 opacity-90 cursor-not-allowed tracking-tighter w-full" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[7px] font-black text-primary opacity-50 uppercase">DYNAMIC</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">Depreciation %</Label>
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={catalogForm.salvage_value_percent} 
                                                onChange={e => setCatalogForm({...catalogForm, salvage_value_percent: e.target.value === "" ? "" : Number(e.target.value)})} 
                                                className="h-11 rounded-xl bg-background/50 border-border/30 text-foreground text-[14px] font-black px-4 w-full" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[8px] font-black uppercase opacity-40 px-1 tracking-widest">FISCAL_SEC_KEY</Label>
                                            <Select value={catalogForm.depreciation_key} onValueChange={v => setCatalogForm({...catalogForm, depreciation_key: v})}>
                                                <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/30 text-foreground text-[10px] font-black uppercase px-4 w-full">
                                                    <SelectValue placeholder="SELECT_KEY" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/40">
                                                    <SelectItem value="COMP_80" className="text-[9px] font-black">COMP_80 (IT_HARDWARE)</SelectItem>
                                                    <SelectItem value="FURN_10" className="text-[9px] font-black">FURN_10 (FURNITURE_FIX)</SelectItem>
                                                    <SelectItem value="VEH_15" className="text-[9px] font-black">VEH_15 (MOTOR_VEHICLES)</SelectItem>
                                                    <SelectItem value="PLANT_15" className="text-[9px] font-black">PLANT_15 (PLANT_MACHINERY)</SelectItem>
                                                    <SelectItem value="BLDG_05" className="text-[9px] font-black">BLDG_05 (INFRASTRUCTURE)</SelectItem>
                                                    <SelectItem value="SOFT_40" className="text-[9px] font-black">SOFT_40 (SOFTWARE_SYSTEMS)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "taxes" && (
                            <div className="w-full px-10 space-y-16">
                                <div className="space-y-6">
                                    <h3 className="text-[12px] font-black uppercase tracking-widest text-primary text-center">Tax_Governance_Terminal</h3>
                                    <div className="grid grid-cols-12 gap-10 items-end">
                                        <div className="col-span-12 space-y-4">
                                            <Label className="text-[10px] font-black uppercase opacity-60 px-4">Tax_Group_Identifier</Label>
                                            <Input value={taxGroupForm.name} onChange={e => setTaxGroupForm({...taxGroupForm, name: e.target.value})} className="h-16 rounded-3xl text-[18px] font-black uppercase px-8 border-border/40 transition-all border-dashed" placeholder="ENTER_GROUP_ID" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between border-b border-border/40 pb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black uppercase text-foreground italic flex items-center gap-2">
                                                <ShieldCheck size={18} className="text-primary" /> Active_Tax_Layers
                                            </span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 tracking-widest">Multi-dimensional fiscal mapping</span>
                                        </div>
                                        <Button onClick={() => setTaxGroupForm({...taxGroupForm, taxes: [...taxGroupForm.taxes, {name: "", percentage: 0, description: ""}]})} className="h-12 px-8 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-[11px] font-black uppercase gap-2 border border-primary/20">
                                            <Plus size={16} /> ADD_TAX_LAYER
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-10">
                                        {taxGroupForm.taxes.map((t, idx) => (
                                            <div key={idx} className="bg-card/40 p-10 rounded-[3rem] border border-border/40 backdrop-blur-xl relative group shadow-2xl shadow-black/5 flex flex-col gap-10">
                                                <div className="flex justify-between items-center">
                                                     <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary bg-primary/5 px-4 h-8 rounded-full uppercase italic">Component #{idx + 1}</Badge>
                                                     <Button variant="ghost" size="icon" onClick={() => {
                                                        const nt = taxGroupForm.taxes.filter((_, i) => i !== idx);
                                                        setTaxGroupForm({...taxGroupForm, taxes: nt});
                                                     }} className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"><Trash2 size={18}/></Button>
                                                </div>
                                                <div className="space-y-8">
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Component_Name</Label>
                                                        <Input value={t.name} onChange={e => {
                                                            const nt = [...taxGroupForm.taxes];
                                                            nt[idx].name = e.target.value.toUpperCase();
                                                            setTaxGroupForm({...taxGroupForm, taxes: nt});
                                                        }} className="h-14 rounded-2xl bg-background border-border text-[13px] font-black uppercase px-6" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Percentage_Allocation</Label>
                                                        <div className="relative">
                                                            <Input type="number" value={t.percentage} onChange={e => {
                                                                const nt = [...taxGroupForm.taxes];
                                                                nt[idx].percentage = Number(e.target.value);
                                                                setTaxGroupForm({...taxGroupForm, taxes: nt});
                                                            }} className="h-14 rounded-2xl bg-background border-border text-[15px] font-black px-6 pr-14" />
                                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[14px] font-black text-muted-foreground opacity-40">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "types" && (
                            <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Category_Identity</h3>
                                    <div className="space-y-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">Major_Type_Name</Label>
                                            <Input value={typeForm.name} onChange={e => setTypeForm({...typeForm, name: e.target.value.toUpperCase()})} placeholder="E.G. IT_HARDWARE" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black uppercase px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">Functional_Definition</Label>
                                            <Textarea value={typeForm.description} onChange={e => setTypeForm({...typeForm, description: e.target.value})} placeholder="PROTOCOL_SCOPE..." className="min-h-[120px] rounded-2xl bg-background border-border/40 text-[13px] font-bold p-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "hsn" && (
                            <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Taxation_Reference</h3>
                                    <div className="space-y-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">HSN/SAC_Protocol_Code</Label>
                                            <Input value={hsnForm.hsn_code} onChange={e => setHsnForm({...hsnForm, hsn_code: e.target.value})} placeholder="E.G. 8471" className="h-14 rounded-2xl bg-background border-border/40 text-[15px] font-black px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">Fiscal_Description</Label>
                                            <Input value={hsnForm.description} onChange={e => setHsnForm({...hsnForm, description: e.target.value})} placeholder="GOODS_DESCRIPTION" className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-bold px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">Linked_Tax_Group</Label>
                                            <Select value={hsnForm.tax_group_id} onValueChange={v => setHsnForm({...hsnForm, tax_group_id: v})}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-black uppercase px-6"><SelectValue placeholder="SELECT_TAX_NODE" /></SelectTrigger>
                                                <SelectContent className="rounded-2xl">{taxGroups.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "uom" && (
                            <div className="grid grid-cols-1 gap-8 max-w-2xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Unit_Registry</h3>
                                    <div className="space-y-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">UOM Name</Label>
                                            <Input value={uomForm.name} onChange={e => setUomForm({...uomForm, name: e.target.value.toUpperCase()})} placeholder="E.G. METRIC TONNE" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black uppercase px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest px-1">Symbol</Label>
                                            <Input value={uomForm.symbol} onChange={e => setUomForm({...uomForm, symbol: e.target.value})} placeholder="MT" className="h-14 rounded-2xl bg-background border-border/40 text-[15px] font-black px-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "suppliers" && (
                            <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Supplier_Audit_Ledger</h3>
                                    <div className="grid grid-cols-2 gap-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Supplier Name</Label>
                                            <Input value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value.toUpperCase()})} placeholder="VENDOR_IDENTITY" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">GST Number</Label>
                                            <Input value={supplierForm.gst_number} onChange={e => setSupplierForm({...supplierForm, gst_number: e.target.value.toUpperCase()})} placeholder="27XXXX" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Contact Person</Label>
                                            <Input value={supplierForm.contact_person} onChange={e => setSupplierForm({...supplierForm, contact_person: e.target.value})} placeholder="NAME" className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-bold px-6" />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Registered Address</Label>
                                            <Textarea value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} placeholder="PHYSICAL_LOCATION" className="min-h-[100px] rounded-2xl bg-background border-border/40 text-[12px] font-bold p-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "stores" && (
                            <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Warehouse_Registry</h3>
                                    <div className="grid grid-cols-2 gap-6 bg-card/30 p-8 rounded-[2rem] border border-border/40">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Store_Name</Label>
                                            <Input value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value.toUpperCase()})} placeholder="E.G. MAIN_LOGISTICS_HUB" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black uppercase px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Store_Code</Label>
                                            <Input value={storeForm.code} onChange={e => setStoreForm({...storeForm, code: e.target.value.toUpperCase()})} placeholder="MLH_01" className="h-14 rounded-2xl bg-background border-border/40 text-[13px] font-black px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Contact_Custodian</Label>
                                            <Input value={storeForm.contact_person} onChange={e => setStoreForm({...storeForm, contact_person: e.target.value})} placeholder="PERSONNEL_ID" className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-bold px-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Allocated_Company</Label>
                                            <Select value={storeForm.company_id} onValueChange={v => setStoreForm({...storeForm, company_id: v})}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-black uppercase px-6"><SelectValue placeholder="COMPANY" /></SelectTrigger>
                                                <SelectContent className="rounded-2xl">{companies.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Allocated_Project</Label>
                                            <Select value={storeForm.project_id} onValueChange={v => setStoreForm({...storeForm, project_id: v})}>
                                                <SelectTrigger className="h-14 rounded-2xl bg-background border-border/40 text-[12px] font-black uppercase px-6"><SelectValue placeholder="PROJECT" /></SelectTrigger>
                                                <SelectContent className="rounded-2xl">{projects.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">Physical_Location_Protocol</Label>
                                            <Textarea value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} placeholder="GEO_LOCATION_OR_POSTAL_ADDRESS" className="min-h-[100px] rounded-2xl bg-background border-border/40 text-[12px] font-bold p-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "budgets" && (
                            <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto py-10">
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Fiscal_Appropriation_Matrix</h3>
                                    <div className="grid grid-cols-3 gap-6 bg-card/30 p-10 rounded-[2.5rem] border border-border/40">
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Fiscal_Interval</Label>
                                            <Select value={budgetForm.fiscal_year} onValueChange={v => setBudgetForm({...budgetForm, fiscal_year: v})}>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-[12px] font-black"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="2024-25">2024-25</SelectItem><SelectItem value="2025-26">2025-26</SelectItem><SelectItem value="2026-27">2026-27</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Primary_Type</Label>
                                            <Select value={budgetForm.asset_type_id} onValueChange={v => setBudgetForm({...budgetForm, asset_type_id: v, asset_sub_type_id: ""})}>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-[11px] font-black uppercase"><SelectValue placeholder="TYPE" /></SelectTrigger>
                                                <SelectContent className="rounded-xl">{types.map(t => <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase">{t.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Sub_Category_Node</Label>
                                            <Select value={budgetForm.asset_sub_type_id} onValueChange={v => setBudgetForm({...budgetForm, asset_sub_type_id: v})}>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-[11px] font-black uppercase"><SelectValue placeholder="SUB_TYPE" /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="all" className="text-[10px] font-black uppercase italic text-primary">ALL_SUB_TYPES</SelectItem>
                                                    {subTypes.filter(st => !budgetForm.asset_type_id || st.type_id === budgetForm.asset_type_id).map(st => <SelectItem key={st.id} value={st.id} className="text-[10px] font-black uppercase">{st.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Entity_Allocation</Label>
                                            <Select value={budgetForm.company_id} onValueChange={v => setBudgetForm({...budgetForm, company_id: v})}>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-[11px] font-black uppercase"><SelectValue placeholder="COMPANY" /></SelectTrigger>
                                                <SelectContent className="rounded-xl">{companies.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase">{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Project_Allocation</Label>
                                            <Select value={budgetForm.project_id} onValueChange={v => setBudgetForm({...budgetForm, project_id: v})}>
                                                <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/40 text-[11px] font-black uppercase"><SelectValue placeholder="PROJECT" /></SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="none" className="text-[10px] font-black uppercase italic">GLOBAL_DOMAIN</SelectItem>
                                                    {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-black uppercase">{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Total_Appropriation (₹)</Label>
                                            <Input type="number" value={budgetForm.allocated_amount} onChange={e => setBudgetForm({...budgetForm, allocated_amount: Number(e.target.value)})} placeholder="0.00" className="h-12 rounded-xl bg-background/80 border-primary/20 text-[15px] font-black px-6" />
                                        </div>
                                        <div className="space-y-2 col-span-3">
                                            <Label className="text-[10px] font-black uppercase opacity-40 px-2">Strategic_Notes</Label>
                                            <Textarea value={budgetForm.notes} onChange={e => setBudgetForm({...budgetForm, notes: e.target.value})} placeholder="BUDGET_RATIONALE..." className="min-h-[80px] rounded-xl bg-background/50 border-border/30 text-[12px] font-bold p-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            /* 4. REGISTRY LIST VIEW */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* 2. Tactical Navigation Terminal */}
                <div className="flex flex-wrap items-center justify-between gap-0 border-b border-border/40 bg-card/20 pr-10">
                    <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); fetchActiveMaster(v); }}>
                        <TabsList className="h-14 p-0 bg-transparent border-none rounded-none inline-flex gap-0 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'types', label: '01_TYPES' },
                                { id: 'subtypes', label: '02_SUBCATEGORIES' },
                                { id: 'catalog', label: '03_ASSET_MASTER' },
                                { id: 'hsn', label: '04_HSN_CODES' },
                                { id: 'taxes', label: '05_TAX_MASTER' },
                                { id: 'uom', label: '06_UOM_REGISTRY' },
                                { id: 'suppliers', label: '07_SUPPLIERS' },
                                { id: 'stores', label: '08_STORE_REGISTRY' },
                                { id: 'budgets', label: '09_BUDGETS' }
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id} 
                                    className="px-8 h-14 rounded-none border-r border-border/20 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-b-primary transition-all duration-200 whitespace-nowrap"
                                >
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <Tabs value={activeTab} className="flex-1 flex flex-col overflow-hidden">
                    {/* SUBTYPES_VIEW: Protocol Registry */}
                    <TabsContent value="subtypes" className="m-0 flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                            <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protocol Identifier</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hierarchy</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Protocol_Code</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Auto_Indent_Status</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(subTypes, ['name', 'code_prefix', 'type.name']).map((st, idx) => (
                                <TableRow key={st.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10 text-[13px] font-black text-foreground uppercase tracking-tight">{st.name}</TableCell>
                                    <TableCell className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{st.type?.name || "ROOT_NODE"}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-[9px] font-black text-primary border-primary/40 bg-primary/10 px-3 rounded-lg">{st.code_prefix}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {st.allow_negative_stock ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase gap-1.5 px-2.5 border border-emerald-500/20">
                                                <Zap size={10} className="fill-emerald-500" /> Auto_Indent_Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[8px] font-black uppercase px-2.5">Strict_Stock_Only</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">{st.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-2.5 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[8px] font-black uppercase px-2.5">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(st)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(st)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* BUDGETS_VIEW: Fiscal Accountability Matrix */}
            <TabsContent value="budgets" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-12 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fiscal Scope</TableHead>
                                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Major Type</TableHead>
                                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sub Category</TableHead>
                                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Allocated_Capital</TableHead>
                                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Spent_To_Date</TableHead>
                                        <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="bg-card/20 backdrop-blur-md">
                                    {filterBySearch(budgets, ['fiscal_year', 'project.name', 'company.name', 'asset_type.name']).map((b, idx) => {
                                        const percent = (b.spent_amount / b.allocated_amount) * 100;
                                        return (
                                            <TableRow key={b.id} className={cn(
                                                "h-16 border-b border-border/40 transition-all group hover:bg-muted/5",
                                                idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                            )}>
                                                <TableCell className="pl-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-foreground tracking-tighter leading-none mb-1 uppercase">FY {b.fiscal_year}</span>
                                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60">{b.project?.name || b.company?.name || 'GLOBAL_DOMAIN'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[10px] font-black text-primary uppercase opacity-80 italic">{b.asset_type?.name}</TableCell>
                                                <TableCell className="text-[11px] font-black text-muted-foreground uppercase opacity-80">{b.asset_sub_type?.name || 'ALL_CATEGORIES'}</TableCell>
                                        <TableCell className="text-center font-black text-foreground italic tracking-tight">₹{b.allocated_amount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-[13px] font-black text-foreground">₹{(b.spent_amount || b.total_consumed || 0).toLocaleString('en-IN')}</span>
                                                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                                                    <div className={cn("h-full shadow-[0_0_8px_rgba(var(--primary),0.4)]", percent > 90 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, percent)}%` }} />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{b.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditInit(b)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(b)} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* Types Content Window */}
            <TabsContent value="types" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Type Identity</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Definition</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(types, ['name', 'description']).map((t, idx) => (
                                <TableRow key={t.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10 text-[13px] font-black text-foreground uppercase tracking-tight">{t.name}</TableCell>
                                    <TableCell className="text-[11px] text-muted-foreground font-medium italic opacity-60">{t.description || "NO_DESCRIPTION_MAPPED"}</TableCell>
                                    <TableCell className="text-center">{t.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(t)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(t)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* Simplified Store Content Window */}
            <TabsContent value="stores" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Registry</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocated Project</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(stores, ['name', 'code', 'contact_person', 'project.name']).map((s, idx) => (
                                <TableRow key={s.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-foreground uppercase leading-none mb-1">{s.name}</span>
                                            <span className="text-[9px] font-black text-primary uppercase opacity-60 px-2 py-0.5 rounded bg-primary/10 w-fit">{s.code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[11px] font-black text-muted-foreground uppercase opacity-80">{s.contact_person || 'SYSTEM_MANAGED'}</TableCell>
                                    <TableCell className="text-[10px] font-black text-muted-foreground uppercase italic opacity-40">{s.project?.name || 'GLOBAL_DOMAIN'}</TableCell>
                                    <TableCell className="text-center">{s.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(s)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(s)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* Catalog Content Window */}
            <TabsContent value="catalog" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catalog Entry</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Major Type</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Category</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory_ID</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(catalog, ['name', 'brand', 'model_number', 'serial_number', 'inventory_number', 'sub_type.name']).map((c, idx) => (
                                <TableRow key={c.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-foreground uppercase tracking-tight">{c.name}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-widest">{c.brand} {c.model_number}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black text-primary uppercase tracking-widest opacity-80 italic">{c.sub_type?.type?.name || 'GLOBAL_ROOT'}</TableCell>
                                    <TableCell className="text-[11px] text-muted-foreground font-black uppercase tracking-widest opacity-80">{c.sub_type?.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-foreground uppercase">{c.inventory_number || 'UNASSIGNED'}</span>
                                            <span className="text-[9px] font-bold text-primary opacity-40 uppercase">{c.serial_number || 'NO_SN'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black text-muted-foreground uppercase italic opacity-40">{c.store?.name || 'GLOBAL_POOL'}</TableCell>
                                    <TableCell className="text-center">{c.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(c)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(c)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* HSN content Window */}
            <TabsContent value="hsn" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">HSN Code</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Tax Group</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(hsnCodes, ['hsn_code', 'description', 'tax_group.name']).map((h, idx) => (
                                <TableRow key={h.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10 font-mono text-[13px] font-black text-foreground tracking-wider items-center uppercase">{h.hsn_code}</TableCell>
                                    <TableCell className="text-[11px] text-muted-foreground font-medium italic opacity-60 uppercase">{h.description}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] font-black text-primary border-primary/20 bg-primary/5 px-2.5 rounded-md shadow-sm">{h.tax_group?.name || 'UNMAPPED_NODE'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">{h.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(h)} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(h)} variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* TAX content Window */}
            <TabsContent value="taxes" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Group</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxes</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead><TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(taxGroups, ['name']).map((tg, idx) => (
                                <TableRow key={tg.id} className={cn(
                                    "h-14 border-b border-border/40 transition-all group hover:bg-muted/10",
                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                                )}>
                                    <TableCell className="pl-10 font-black text-foreground uppercase tracking-tight">{tg.name}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {tg.taxes && tg.taxes.map((t: any) => (
                                                <Badge key={t.id} variant="secondary" className="text-[9px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200">{t.name}: {t.percentage}%</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{tg.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-3 border border-emerald-500/20">Active</Badge> : <Badge variant="outline" className="text-muted-foreground/40 border-border/40 text-[9px] font-black uppercase px-3">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                         <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(tg)} className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl"><Edit2 size={14}/></Button>
                                            <Button onClick={() => handleDelete(tg)} variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* UOM_VIEW */}
            <TabsContent value="uom" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-10 border-none hover:bg-transparent">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">UOM Name</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Symbol</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead>
                                <TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(uom, ['name', 'symbol']).map((u, idx) => (
                                <TableRow key={u.id} className={cn("h-14 border-b border-border/40 hover:bg-muted/5 group")}>
                                    <TableCell className="pl-10 text-[13px] font-black uppercase text-foreground">{u.name}</TableCell>
                                    <TableCell className="text-[11px] font-bold text-primary">{u.symbol}</TableCell>
                                    <TableCell className="text-center">{u.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(u)} className="h-9 w-9 text-muted-foreground hover:text-primary"><Edit2 size={14}/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="h-9 w-9 text-muted-foreground hover:text-destructive"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            {/* SUPPLIERS_VIEW */}
            <TabsContent value="suppliers" className="m-0 flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto no-scrollbar border-b border-border/40 bg-background/20 backdrop-blur-xl">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
                            <TableRow className="h-12">
                                <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Entity</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</TableHead>
                                <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</TableHead>
                                <TableHead className="text-right pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card/20 backdrop-blur-md">
                            {filterBySearch(suppliers, ['name', 'gst_number', 'contact_person']).map((s, idx) => (
                                <TableRow key={s.id} className="h-16 border-b border-border/40 hover:bg-muted/5 group">
                                    <TableCell className="pl-10">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-black text-foreground uppercase">{s.name}</span>
                                            <span className="text-[9px] text-muted-foreground opacity-60 truncate max-w-xs">{s.address}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-[11px] font-black text-primary">{s.gst_number || 'N/A'}</TableCell>
                                    <TableCell className="text-[11px] font-black text-muted-foreground uppercase opacity-80">{s.contact_person}</TableCell>
                                    <TableCell className="text-center">{s.is_active !== false ? <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                                    <TableCell className="text-right pr-10">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInit(s)} className="h-9 w-9 text-muted-foreground hover:text-primary"><Edit2 size={14}/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(s)} className="h-9 w-9 text-muted-foreground hover:text-destructive"><Trash2 size={14}/></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

                </Tabs>
            </div>
        )}
      </main>


    </div>
  );
}

