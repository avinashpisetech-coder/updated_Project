"use client";

import React from "react";
import { 
  Wrench, 
  Search, 
  Plus, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Settings,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  User,
  Package,
  ArrowUpRight,
  Settings2,
  FileText,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Database,
  Calendar
} from "lucide-react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useNavigation } from "@/components/providers/NavigationProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

// --- Types ---
interface MaintenanceRecord {
    id: string;
    maintenance_number?: string;
    asset_id: string;
    status: string;
    request_type?: string;
    priority?: string;
    notes?: string;
    start_date: string;
    created_at: string;
    vendor_name?: string;
    description_malfunction?: string;
    failure_analysis?: { symptom?: string; cause?: string; action?: string };
    asset?: { 
        asset_code: string; 
        brand: string; 
        model: string; 
        serial_number?: string;
        sub_type: { name: string; type?: { name: string } } 
    };
    performed_by_profile?: { full_name: string };
    planned_costs?: any;
    actual_costs?: any;
    downtime_hours?: number;
}

interface Props {
    initialRecords: MaintenanceRecord[];
    initialSchedules: any[];
    catalog: any[];
    assets: any[];
    role: string;
}

export function MaintenanceClient({ initialRecords, initialSchedules, catalog, assets, role }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useNavigation();
    const [search, setSearch] = React.useState("");
    const [view, setView] = React.useState<'list' | 'form'>('list');
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'ledger' | 'schedules'>('ledger');
    const [isAddScheduleOpen, setIsAddScheduleOpen] = React.useState(false);
    const [scheduleForm, setScheduleForm] = React.useState({ asset_id: "", interval_days: 90, next_due_date: format(new Date(), "yyyy-MM-dd") });

    // Auto-minimize sidebar for full-screen form immersion
    React.useEffect(() => {
        if (view === 'form') {
            setSidebarOpen(false);
        } else {
            setSidebarOpen(true);
        }
    }, [view, setSidebarOpen]);

    // Form State
    const [form, setForm] = React.useState({
        asset_id: "",
        status: "draft",
        request_type: "Breakdown", 
        priority: "Medium",
        vendor_name: "",
        reported_by: "",
        reported_date: new Date().toISOString(),
        operational_effect: "Normal",
        description_malfunction: "",
        work_execution: "",
        work_instructions: [
            { task: "Initial Inspection", done: false },
            { task: "Component Diagnostics", done: false },
            { task: "Safety Verification", done: false }
        ],
        failure_analysis: { symptom: "", cause: "", action: "" },
        task_list: [{ time: format(new Date(), "HH:mm"), activity: "Draft Initiated" }],
        meter_reading: 0,
        uom_reading: "Operating Hours",
        labor_hours: 0,
        safety_checklist: [
            { item: "Power Isolated", checked: false },
            { item: "LOTO Applied", checked: false },
            { item: "PPE Verified", checked: false }
        ],
        parts_used: [],
        planned_costs: { labor: 0, material: 0, service: 0 },
        actual_costs: { labor: 0, material: 0, service: 0 },
        downtime_hours: 0,
        warranty_status: "Out of Warranty",
        notes: "",
        start_date: new Date().toISOString().split('T')[0]
    });

    const [selectedMaster, setSelectedMaster] = React.useState<any>(null);
    const [selectedAsset, setSelectedAsset] = React.useState<any>(null);
    const [history, setHistory] = React.useState<any[]>([]);

    const handleCatalogChange = (catalogId: string) => {
        const item = catalog.find(c => c.id === catalogId);
        setSelectedMaster(item);
        setSelectedAsset(null);
        setForm(f => ({ ...f, asset_id: "" }));
    };

    const handleAssetChange = async (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        setSelectedAsset(asset);
        setForm(f => ({ 
            ...f, 
            asset_id: assetId,
            warranty_status: asset?.warranty_expiry && new Date(asset.warranty_expiry) > new Date() ? 'In Warranty' : 'Out of Warranty'
        }));

        // Fetch maintenance history for this asset
        const { data } = await supabase
            .from("asset_maintenance")
            .select("*, performed_by_profile:profiles!reported_by(full_name)")
            .eq("asset_id", assetId)
            .order("created_at", { ascending: false })
            .limit(5);
        setHistory(data || []);
    };

    const filteredRecords = initialRecords.filter(r => 
        r.asset?.asset_code?.toLowerCase().includes(search.toLowerCase()) ||
        r.maintenance_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.notes?.toLowerCase().includes(search.toLowerCase())
    );

    const handleLogMaintenance = async (submitStatus: string = 'draft') => {
        if (!form.asset_id || !form.description_malfunction) {
            toast.error("Protocol Incomplete: Missing asset or descriptive logs.");
            return;
        }

        setIsProcessing(true);
        try {
            const payload = { ...form, status: submitStatus };
            const { error } = await supabase.from("asset_maintenance").insert([payload]);
            if (error) throw error;

            toast.success(`Service Node ${submitStatus.toUpperCase()}. Audit trail updated.`);
            setView('list');
            router.refresh();
        } catch (error: any) {
            toast.error(`Execution Failure: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };
    const handleSaveSchedule = async () => {
        if (!scheduleForm.asset_id) return toast.error("Select hardware node.");
        setIsProcessing(true);
        try {
            const { error } = await supabase.from("asset_pm_schedules").upsert([scheduleForm]);
            if (error) throw error;
            toast.success("Predictive maintenance schedule synchronized.");
            setIsAddScheduleOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed': return { label: 'Settled', class: 'bg-emerald-500 text-white shadow-emerald-500/20', icon: CheckCircle2 };
            case 'in_progress': return { label: 'Active_Repair', class: 'bg-amber-500 text-white shadow-amber-500/20', icon: Clock };
            case 'scheduled': return { label: 'Pending_Protocol', class: 'bg-blue-500 text-white shadow-blue-500/20', icon: Settings };
            default: return { label: status.toUpperCase(), class: 'bg-slate-400 text-white', icon: Activity };
        }
    };

    if (view === 'form') {
        const totalPlanned = Number(form.planned_costs.labor) + Number(form.planned_costs.material) + Number(form.planned_costs.service);
        const totalActual = Number(form.actual_costs.labor) + Number(form.actual_costs.material) + Number(form.actual_costs.service);

        return (
            <div className="flex flex-col min-h-screen w-full gap-8 animate-in fade-in slide-in-from-right-8 duration-700 pb-20 bg-background">
                {/* 1. Universal Header Hub */}
                <div className="flex items-center justify-between px-10 pb-10 border-b border-border/40 bg-[var(--header-bg)] py-6 shadow-[inset_0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
                    <div className="flex items-center gap-8">
                        <Button variant="ghost" size="icon" onClick={() => setView('list')} className="h-14 w-14 rounded-3xl bg-card border border-border/40 shadow-sm hover:shadow-xl transition-all active:scale-90 group">
                            <ChevronLeft size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </Button>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground leading-none">Maintenance_Node_Alpha</h2>
                                <Badge className="bg-primary/5 text-primary border-primary/10 text-[10px] uppercase font-black px-3 h-6 rounded-full shadow-[0_0_10px_var(--primary-muted)]">DRAFT_MODE</Badge>
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 leading-none">Operational_Integrity_Protocol // ISO_9001_SYNC</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={toggleSidebar} className="h-14 px-8 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-card border-border/40 shadow-sm hover:shadow-xl transition-all gap-3 text-muted-foreground hover:text-primary">
                            {isSidebarOpen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            {isSidebarOpen ? 'Minimize_Space' : 'Maximize_Space'}
                        </Button>
                        <div className="h-10 w-[1px] bg-border/40 mx-2" />
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="h-14 px-10 rounded-[2rem] border-border/40 text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted/10 transition-all font-sans" onClick={() => handleLogMaintenance('draft')} disabled={isProcessing}>
                                Save_Draft
                            </Button>
                            <Button className="h-14 px-12 rounded-[2rem] bg-primary border-none hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/40 transition-all active:scale-95 gap-3" onClick={() => handleLogMaintenance('submitted')} disabled={isProcessing}>
                                {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Settings2 size={16} className="text-primary-foreground/80" />}
                                Submit_For_Approval
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 2. Diagnostic Architecture */}
                <Tabs defaultValue="identification" className="w-full px-10">
                    <TabsList className="h-16 bg-card/60 border border-border/40 rounded-[2rem] p-1.5 gap-2 mb-10 shadow-sm backdrop-blur-xl">
                        <TabsTrigger value="identification" className="px-10 rounded-full text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Identification</TabsTrigger>
                        <TabsTrigger value="request" className="px-10 rounded-full text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Request_Matrix</TabsTrigger>
                        <TabsTrigger value="execution" className="px-10 rounded-full text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Execution</TabsTrigger>
                        <TabsTrigger value="resources" className="px-10 rounded-full text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Resources</TabsTrigger>
                        <TabsTrigger value="analytics" className="px-10 rounded-full text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Financial_Analytics</TabsTrigger>
                    </TabsList>

                    {/* Section 1: Identification & Auto-Fetch */}
                    <TabsContent value="identification" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <div className="bg-card/40 rounded-[3rem] p-12 border border-border/40 shadow-sm relative overflow-hidden group h-full backdrop-blur-xl">
                                <div className="absolute top-[-10%] right-[-5%] h-80 w-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-colors" />
                                <div className="space-y-10 relative z-10">
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Asset_Master_Selector</Label>
                                        <Select onValueChange={handleCatalogChange}>
                                            <SelectTrigger className="h-20 rounded-[1.5rem] bg-background border-border/40 text-[16px] font-black uppercase pl-10 shadow-inner focus:ring-4 focus:ring-primary/5 transition-all">
                                                <SelectValue placeholder="FETCH_FROM_MASTER_CATALOG...">
                                                    {selectedMaster ? (
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-foreground">{selectedMaster.name}</span>
                                                            <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground opacity-60 font-black tracking-widest uppercase">{selectedMaster.sub_type?.name}</Badge>
                                                        </div>
                                                    ) : "FETCH_FROM_MASTER_CATALOG..."}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-[1.5rem] p-2 border-border/40 shadow-2xl bg-card">
                                                {catalog.map(c => (
                                                    <SelectItem key={c.id} value={c.id} className="py-5 rounded-2xl border-b border-slate-50 last:border-none focus:bg-slate-50 transition-colors">
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary"><Database size={22} /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[17px] font-black text-slate-800 tracking-tighter">{c.name}</span>
                                                                <span className="text-[10px] font-black opacity-30 tracking-widest italic">{c.brand} // {c.model_number}</span>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Hardware_Node_Selection (Serial/Code)</Label>
                                        <Select 
                                            value={form.asset_id} 
                                            onValueChange={handleAssetChange}
                                            disabled={!selectedMaster}
                                        >
                                            <SelectTrigger className="h-20 rounded-[1.5rem] bg-slate-50 border-slate-100 text-[16px] font-black uppercase pl-10 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50">
                                                <SelectValue placeholder={selectedMaster ? "SELECT_PHYSICAL_NODE..." : "SELECT_MASTER_FIRST..."}>
                                                    {selectedAsset ? (
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-slate-900">{selectedAsset.asset_code}</span>
                                                            <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-400">{selectedAsset.serial_number || 'NO_SERIAL'}</Badge>
                                                        </div>
                                                    ) : selectedMaster ? "SELECT_PHYSICAL_NODE..." : "SELECT_MASTER_FIRST..."}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-[1.5rem] p-2 border-slate-100 shadow-2xl">
                                                {assets
                                                    .filter(a => 
                                                        a.name === selectedMaster?.name || 
                                                        a.brand === selectedMaster?.brand && a.model === selectedMaster?.model_number ||
                                                        a.sub_type_id === selectedMaster?.sub_type?.id
                                                    )
                                                    .map(a => (
                                                        <SelectItem key={a.id} value={a.id} className="py-5 rounded-2xl border-b border-slate-50 last:border-none focus:bg-slate-50 transition-colors">
                                                            <div className="flex items-center gap-6">
                                                                <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary"><Package size={22} /></div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[17px] font-black text-slate-800 tracking-tighter">{a.asset_code}</span>
                                                                    <span className="text-[10px] font-black opacity-30 tracking-widest italic">{a.serial_number || 'No Serial'} // {a.brand} {a.model}</span>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.02)] space-y-10">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Hardware_Identity_Matrix</h3>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-1.5 w-1.5 rounded-full", selectedAsset ? "bg-emerald-500 shadow-[0_0_8px_emerald-500]" : "bg-slate-200")} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{selectedAsset ? "METADATA_HYDRATED" : "AWAITING_SYNC"}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 relative">
                                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-50" />
                                            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-50" />
                                            
                                            <div className="space-y-1.5 p-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <ShieldCheck size={10} className="text-primary/40" /> Asset_Type
                                                </p>
                                                <p className={cn("text-[14px] font-black uppercase tracking-tight transition-all", selectedAsset ? "text-slate-800" : "text-slate-200")}>
                                                    {selectedAsset?.sub_type?.type?.name || "---"}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5 p-2 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 justify-end">
                                                    Sub_Type <Zap size={10} className="text-amber-500/40" />
                                                </p>
                                                <p className={cn("text-[14px] font-black uppercase tracking-tight transition-all", selectedAsset ? "text-slate-800" : "text-slate-200")}>
                                                    {selectedAsset?.sub_type?.name || "---"}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5 p-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Settings size={10} className="text-slate-300" /> Model_Number
                                                </p>
                                                <p className={cn("text-[14px] font-black uppercase tracking-tight transition-all", selectedAsset ? "text-slate-800" : "text-slate-200")}>
                                                    {selectedAsset?.model || "---"}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5 p-2 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 justify-end">
                                                    Serial_Identity <Activity size={10} className="text-primary/40" />
                                                </p>
                                                <p className={cn("text-[14px] font-black uppercase tracking-tight transition-all break-all leading-tight", selectedAsset ? "text-primary" : "text-slate-200")}>
                                                    {selectedAsset?.serial_number || "---"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm h-full flex flex-col">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-10 pl-2">Snapshot_Operational_Status</h3>
                                <div className="flex-1 flex flex-col justify-center items-center gap-6">
                                    <div className={cn(
                                        "h-32 w-32 rounded-full border-8 flex items-center justify-center transition-all duration-1000",
                                        selectedAsset?.status === 'in_stock' ? "border-emerald-500/10 text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]" : 
                                        selectedAsset?.status === 'assigned' ? "border-primary/10 text-primary shadow-[0_0_50px_rgba(59,130,246,0.2)]" : "border-slate-100 text-slate-200"
                                    )}>
                                        <Activity size={48} className={cn("transition-all duration-1000", selectedAsset?.status === 'under_repair' && "animate-pulse")} />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-200 mb-2 block">Current_Signal</span>
                                        <h4 className="text-2xl font-black uppercase text-slate-800 tracking-widest">{selectedAsset?.status || 'IDLE_OFFLINE'}</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Section 2: Request Matrix */}
                    <TabsContent value="request" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Internal_Control_ID</Label>
                                        <Input disabled className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-[12px] font-black uppercase shadow-none opacity-50" value="AUTO_GENERATED" />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Asset_Type_Class</Label>
                                        <Input disabled className="h-14 rounded-2xl bg-slate-100/50 border-slate-100 text-[12px] font-black uppercase shadow-none text-slate-400" value={selectedAsset?.sub_type?.type?.name || 'SYNC_PENDING...'} />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Sub_Type_Protocol</Label>
                                        <Input disabled className="h-14 rounded-2xl bg-slate-100/50 border-slate-100 text-[12px] font-black uppercase shadow-none text-slate-400" value={selectedAsset?.sub_type?.name || 'SYNC_PENDING...'} />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Technical_Model_Ref</Label>
                                        <Input disabled className="h-14 rounded-2xl bg-slate-100/50 border-slate-100 text-[12px] font-black uppercase shadow-none text-slate-400" value={selectedAsset?.model || 'SYNC_PENDING...'} />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Serial_Identity_Lock</Label>
                                        <Input disabled className="h-14 rounded-2xl bg-slate-100/50 border-slate-100 text-[12px] font-black uppercase shadow-none text-slate-400" value={selectedAsset?.serial_number || 'SYNC_PENDING...'} />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Request_Protocol_Type</Label>
                                        <Select value={form.request_type} onValueChange={v => setForm(f => ({ ...f, request_type: v }))}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-[12px] font-black uppercase shadow-sm pl-6 transition-all">{form.request_type}</SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100"><SelectItem value="Breakdown" className="text-[10px] font-black uppercase py-3">Breakdown_Repair</SelectItem><SelectItem value="Preventive" className="text-[10px] font-black uppercase py-3">Preventive_Maint</SelectItem><SelectItem value="Calibration" className="text-[10px] font-black uppercase py-3">Calibration_Cycle</SelectItem><SelectItem value="Upgrade" className="text-[10px] font-black uppercase py-3">Hardware_Upgrade</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Priority_Tier</Label>
                                        <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-[12px] font-black uppercase shadow-sm pl-6 transition-all">{form.priority}</SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100"><SelectItem value="Low" className="text-emerald-500 font-black uppercase py-3 text-[10px]">Tier_01_Low</SelectItem><SelectItem value="Medium" className="text-amber-500 font-black uppercase py-3 text-[10px]">Tier_02_Normal</SelectItem><SelectItem value="High" className="text-orange-500 font-black uppercase py-3 text-[10px]">Tier_03_Urgent</SelectItem><SelectItem value="Critical" className="text-red-600 font-black uppercase py-3 text-[10px]">Tier_04_CRITICAL</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Operational_Effect</Label>
                                        <Select value={form.operational_effect} onValueChange={v => setForm(f => ({ ...f, operational_effect: v }))}>
                                            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-[12px] font-black uppercase shadow-sm pl-6 transition-all text-slate-800">{form.operational_effect}</SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100"><SelectItem value="Normal" className="text-[10px] font-black py-3 uppercase">Normal_Ops</SelectItem><SelectItem value="Degraded" className="text-[10px] font-black py-3 uppercase">Performance_Degraded</SelectItem><SelectItem value="Down" className="text-[10px] font-black py-3 uppercase text-red-500">SYSTEM_OFFLINE_DOWN</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3 md:col-span-2 xl:col-span-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Malfunction_Brief_Architecture</Label>
                                        <Textarea placeholder="SYNC_FAULT_VECTORS_OR_ERR_CODES..." className="min-h-[160px] rounded-3xl bg-slate-50 border-slate-100 text-[14px] font-black uppercase p-10 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all text-slate-800 leading-relaxed no-scrollbar" value={form.description_malfunction} onChange={e => setForm(f => ({ ...f, description_malfunction: e.target.value }))} />
                                    </div>
                                </div>
                        </div>
                    </TabsContent>

                    {/* Section 3: Execution Hub */}
                    <TabsContent value="execution" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm space-y-8">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 pl-2">Failure_Analysis_Protocol</h3>
                                <div className="space-y-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Symptom_Vector</Label><Input className="h-12 rounded-xl bg-white border-none italic font-medium" placeholder="Describe actual observation..." value={form.failure_analysis.symptom} onChange={e => setForm(f => ({ ...f, failure_analysis: { ...f.failure_analysis, symptom: e.target.value } }))} /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Root_Cause_Identified</Label><Input className="h-12 rounded-xl bg-white border-none italic font-medium" placeholder="Identify fault mesh..." value={form.failure_analysis.cause} onChange={e => setForm(f => ({ ...f, failure_analysis: { ...f.failure_analysis, cause: e.target.value } }))} /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Remedial_Action_Taken</Label><Input className="h-12 rounded-xl bg-white border-none italic font-medium" placeholder="Log resolution steps-X..." value={form.failure_analysis.action} onChange={e => setForm(f => ({ ...f, failure_analysis: { ...f.failure_analysis, action: e.target.value } }))} /></div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm space-y-8">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 pl-2">Stepwise_Execution_Checklist</h3>
                                <div className="space-y-4">
                                    {form.work_instructions.map((inst, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl group transition-all hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100">
                                            <Checkbox checked={inst.done} onCheckedChange={(c) => {
                                                const newInst = [...form.work_instructions];
                                                newInst[idx].done = !!c;
                                                setForm({ ...form, work_instructions: newInst });
                                            }} className="h-6 w-6 rounded-lg data-[state=checked]:bg-emerald-500 data-[state=checked]:border-none" />
                                            <span className={cn("text-[13px] font-black uppercase tracking-tight text-slate-700", inst.done && "line-through opacity-30")}>{inst.task}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Section 4: Resources & Safety */}
                    <TabsContent value="resources" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current_Meter_Reading</Label>
                                <Input type="number" className="h-14 rounded-2xl bg-slate-50 text-2xl font-black text-slate-900 border-none px-6" value={form.meter_reading} onChange={e => setForm({ ...form, meter_reading: Number(e.target.value) })} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">{form.uom_reading}</p>
                            </div>
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Labor_Hours_Aggregated</Label>
                                <Input type="number" className="h-14 rounded-2xl bg-slate-50 text-2xl font-black text-primary border-none px-6" value={form.labor_hours} onChange={e => setForm({ ...form, labor_hours: Number(e.target.value) })} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Human_Asset_Utilization</p>
                            </div>
                            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm md:col-span-2 h-full">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-3"><ShieldCheck size={14} className="text-emerald-500" /> Operational_Safety_Compliance</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {form.safety_checklist.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                            <Checkbox checked={item.checked} onCheckedChange={(c) => {
                                                const newList = [...form.safety_checklist];
                                                newList[idx].checked = !!c;
                                                setForm({ ...form, safety_checklist: newList });
                                            }} />
                                            <span className="text-[10px] font-black uppercase text-slate-600">{item.item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Section 5: Analytics & Finance */}
                    <TabsContent value="analytics" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                            <div className="xl:col-span-8 bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
                                <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-800 mb-12 flex items-center gap-4">
                                    <Zap size={20} className="text-emerald-500" />
                                    Fiscal_Impact_Assessment
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 w-fit px-4 py-1.5 rounded-full">Planned_Costing_Matrix</h4>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">Labor_Allowance</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.planned_costs.labor} onChange={e => setForm({ ...form, planned_costs: { ...form.planned_costs, labor: Number(e.target.value) } })} /></div>
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">Material_Budget</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.planned_costs.material} onChange={e => setForm({ ...form, planned_costs: { ...form.planned_costs, material: Number(e.target.value) } })} /></div>
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">System_Service</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.planned_costs.service} onChange={e => setForm({ ...form, planned_costs: { ...form.planned_costs, service: Number(e.target.value) } })} /></div>
                                            <Separator />
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Aggregated_Planned</span><span className="text-xl font-black text-slate-900 tracking-tight">₹{totalPlanned.toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 w-fit px-4 py-1.5 rounded-full">Actual_Fiscal_Leakage</h4>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">Human_Hours_Actual</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.actual_costs.labor} onChange={e => setForm({ ...form, actual_costs: { ...form.actual_costs, labor: Number(e.target.value) } })} /></div>
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">Components_Consumed</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.actual_costs.material} onChange={e => setForm({ ...form, actual_costs: { ...form.actual_costs, material: Number(e.target.value) } })} /></div>
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-400 tracking-tight">Service_Verification</span><Input className="h-10 w-40 rounded-xl bg-slate-50 text-right font-black" type="number" value={form.actual_costs.service} onChange={e => setForm({ ...form, actual_costs: { ...form.actual_costs, service: Number(e.target.value) } })} /></div>
                                            <Separator />
                                            <div className="flex justify-between items-center"><span className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Actual_Burn_Rate</span><span className="text-xl font-black text-emerald-600 tracking-tight">₹{totalActual.toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="xl:col-span-4 space-y-8">
                                <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm space-y-8 h-full">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Temporal_Leakage</h3>
                                    <div className="p-10 rounded-[2rem] bg-slate-900 text-white flex flex-col items-center flex-1 justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 text-center">Total_System_Downtime</span>
                                        <div className="flex items-center gap-4">
                                            <Input type="number" className="h-16 w-32 rounded-2xl bg-white/10 border-none text-4xl font-black text-center" value={form.downtime_hours} onChange={e => setForm({ ...form, downtime_hours: Number(e.target.value) })} />
                                            <span className="text-2xl font-black uppercase text-amber-400 tracking-tight">HRS</span>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center gap-4">
                                         <Badge className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-4", form.warranty_status === 'In Warranty' ? "bg-emerald-500" : "bg-red-500")}>{form.warranty_status}</Badge>
                                         <p className="text-[10px] font-bold text-slate-400 text-center uppercase leading-relaxed tracking-tight">Hardware Warranty Status Reflected Above</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Maintenance History Sidebar - Resolution Aware Floating */}
                <div className="fixed bottom-10 right-10 z-[110] flex flex-col items-end gap-4 pointer-events-none">
                     <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-8 w-[400px] pointer-events-auto transform transition-all translate-y-2 hover:translate-y-0">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-3"><History size={16} className="text-primary" /> Asset_Node_History</h3>
                         <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar">
                             {history.length > 0 ? history.map((h, i) => (
                                 <div key={i} className="relative pl-6 border-l-2 border-slate-100 py-1">
                                     <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-primary shadow-sm" />
                                     <div className="flex justify-between items-start mb-1">
                                         <span className="text-[13px] font-black text-slate-800 uppercase leading-none">{h.maintenance_number || 'LEGACY_REF'}</span>
                                         <span className="text-[9px] font-black text-slate-300 uppercase">{format(new Date(h.created_at), 'dd MMM')}</span>
                                     </div>
                                     <p className="text-[11px] font-bold text-slate-400 uppercase leading-tight line-clamp-2">{h.notes || h.description_malfunction || 'Routine maintainance cycle'}</p>
                                     <span className="text-[9px] font-black text-primary/40 uppercase mt-2 block">{h.performed_by_profile?.full_name}</span>
                                 </div>
                             )) : <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest text-center py-10">No previous nodes detected</p>}
                         </div>
                     </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* 1. Universal Command HUD - High Fidelity */}
            <div className="flex items-center justify-between gap-6 px-4">
                <div className="relative flex-1 max-w-xl group">
                    <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors z-10" />
                    <Input 
                        placeholder="SCAN_PROTOCOL_LOG, ASSET_CODE, OR VENDOR..." 
                        className="h-14 pl-14 rounded-2xl bg-card border-border/40 shadow-sm text-[11px] font-black uppercase tracking-widest focus:ring-primary/20 placeholder:text-muted-foreground/30 transition-all shadow-primary/5 backdrop-blur-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        onClick={() => setView('form')}
                        className="h-14 px-10 rounded-2xl bg-primary border-none hover:bg-primary/95 text-primary-foreground text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 gap-3 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Plus size={18} />
                        Initiate_Service_Log
                    </Button>
                </div>
            </div>

            {/* 2. Service Hub Orchestrator */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <div className="flex items-center justify-between mb-6 px-4">
                    <TabsList className="h-14 bg-card/60 border border-border/40 rounded-2xl p-1.5 gap-2 shadow-sm backdrop-blur-xl">
                        <TabsTrigger value="ledger" className="px-8 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Service_Ledger</TabsTrigger>
                        <TabsTrigger value="schedules" className="px-8 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">PM_Schedules</TabsTrigger>
                    </TabsList>
                    
                    {activeTab === 'schedules' && (
                        <Button onClick={() => setIsAddScheduleOpen(true)} className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 gap-3 border-none">
                            <Clock size={16} /> Define_New_Schedule
                        </Button>
                    )}
                </div>

                <TabsContent value="ledger" className="m-0 focus-visible:ring-0">
                    <div className="rounded-[3rem] border border-border/40 bg-card/40 overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-2xl">
                        <div className="px-10 py-8 border-b border-border/40 flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-2xl bg-background border border-border/40 flex items-center justify-center text-primary shadow-sm shadow-primary/10">
                                     <Wrench size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none mb-1">SERVICE_INTEGRITY_LEDGER</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] opacity-50">Synchronized Hardware Resilience Registry</p>
                                </div>
                            </div>
                        </div>

                <Table>
                    <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md border-b border-border/40">
                        <TableRow className="h-14 border-none hover:bg-transparent">
                            <TableHead className="pl-12 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">SYNC</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">REF_ID</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">HARDWARE_NODE</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">PROTOCOL</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">DIAGNOSTICS</TableHead>
                            <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">STATUS</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.3em] pr-12 text-muted-foreground">AUTHORITY</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.length === 0 ? (
                            <TableRow className="h-96 border-none hover:bg-transparent">
                                <TableCell colSpan={7} className="text-center opacity-10">
                                    <div className="flex flex-col items-center gap-6">
                                        <Settings2 size={80} className="animate-spin-slow" />
                                        <p className="text-[12px] font-black uppercase tracking-[0.8em] font-sans">Service Ledger Healthy // No Outstanding Faults</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record) => {
                                const status = getStatusConfig(record.status);
                                
                                return (
                                    <TableRow key={record.id} className="h-28 group hover:bg-slate-50/50 border-b border-slate-50 transition-all">
                                        <TableCell className="pl-12">
                                            <div className={cn(
                                                "h-14 w-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-slate-100 bg-white group-hover:shadow-xl group-hover:border-primary/20",
                                                status.class
                                            )}>
                                                <status.icon size={26} />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[13px] font-black text-slate-800 uppercase tracking-tighter bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{record.maintenance_number || 'LEGACY_REF'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-6">
                                                <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:bg-white transition-all">
                                                    <Package size={22} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[16px] font-black text-slate-900 uppercase tracking-tighter leading-none mb-1.5">{record.asset?.asset_code}</span>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{record.asset?.brand} <span className="opacity-20">//</span> {record.asset?.model}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                <Badge className="text-[9px] font-black uppercase tracking-widest h-6 px-4 rounded-full bg-slate-900 border-none text-white shadow-sm w-fit">
                                                    {record.request_type || 'LEGACY'}
                                                </Badge>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic truncate max-w-[120px]">{record.vendor_name || 'INTERNAL_SYNC'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 py-1 max-w-[300px]">
                                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight leading-snug line-clamp-2">
                                                    {record.notes || record.description_malfunction || 'Routine maintenance cycle initiated.'}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                     <div className="h-1 w-1 rounded-full bg-primary/30" />
                                                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic truncate">{record.failure_analysis?.cause || 'No root cause logged'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em] h-7 px-5 rounded-full border-none shadow-sm",
                                                record.status === 'approved' ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                                                record.status === 'submitted' ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {record.status?.toUpperCase() || 'NODE_SYNC'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-12">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[13px] font-black text-slate-900 uppercase tracking-tighter leading-none">{record.performed_by_profile?.full_name || 'SYSTEM_OPERATOR'}</span>
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">{format(new Date(record.created_at), 'dd MMM yyyy')}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            </TabsContent>

            <TabsContent value="schedules" className="m-0 focus-visible:ring-0">
                <div className="rounded-[3rem] border border-border/40 bg-card/40 shadow-2xl shadow-black/5 backdrop-blur-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow className="h-14 border-none">
                                <TableHead className="pl-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset_Node</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Interval</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last_Service</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next_Due_Date</TableHead>
                                <TableHead className="text-right pr-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialSchedules.length === 0 ? (
                                <TableRow className="h-64 border-none hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center opacity-10">
                                        <div className="flex flex-col items-center gap-4">
                                            <Calendar size={60} />
                                            <p className="text-[12px] font-black uppercase tracking-widest">No Active Schedules Configured</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                initialSchedules.map((s) => {
                                    const isOverdue = new Date(s.next_due_date) < new Date();
                                    return (
                                        <TableRow key={s.id} className="h-24 group hover:bg-primary/5 border-b border-border/10 transition-all">
                                            <TableCell className="pl-12">
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-black text-foreground uppercase tracking-tighter leading-none mb-1">{s.asset?.asset_code}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">{s.asset?.brand} {s.asset?.model}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-black uppercase border-border/40">{s.interval_days} Days</Badge></TableCell>
                                            <TableCell><span className="text-[12px] font-black text-muted-foreground uppercase">{s.last_service_date ? format(new Date(s.last_service_date), "dd MMM yyyy") : "NEVER_SERVICED"}</span></TableCell>
                                            <TableCell><span className={cn("text-[14px] font-black uppercase tracking-tight", isOverdue ? "text-red-500" : "text-emerald-500")}>{format(new Date(s.next_due_date), "dd MMM yyyy")}</span></TableCell>
                                            <TableCell className="text-right pr-12">
                                                <Badge className={cn("text-[9px] font-black uppercase tracking-[0.2em] h-7 px-4 rounded-full", isOverdue ? "bg-red-500" : "bg-emerald-500")}>
                                                    {isOverdue ? "OVERDUE_SIGNAL" : "SECURE_STATUS"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
            </Tabs>
            
            {/* 3. Global Integrity Footer - Synchronized Style */}
            <div className="flex items-center gap-10 px-12 text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] select-none pointer-events-none pb-10">
                <div className="flex items-center gap-3">
                     <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                     <span>Resilience Mesh Sync Active</span>
                </div>
                <div className="flex items-center gap-3">
                     <ShieldCheck size={10} className="text-emerald-500/40" />
                     <span>Hardware Lifecycle Audited Stage-12</span>
                </div>
            </div>

            <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
                <DialogContent className="max-w-xl rounded-[2.5rem] p-10 bg-card border-border/40 backdrop-blur-3xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Define_PM_Schedule</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Predictive Hardware Resilience Setup</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-6 my-10 relative">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">Target_Hardware_Node</label>
                            <Select value={scheduleForm.asset_id} onValueChange={v => setScheduleForm({...scheduleForm, asset_id: v})}>
                                <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 font-black uppercase text-xs">
                                    <SelectValue placeholder="SELECT_ASSET_CODE..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/40">
                                    {assets.map(a => <SelectItem key={a.id} value={a.id} className="text-[10px] font-black py-3 uppercase">{a.asset_code} ({a.brand} {a.model})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">Service_Interval (Days)</label>
                                <Input type="number" className="h-14 rounded-2xl bg-background/50 border-border/40 font-black text-lg" value={scheduleForm.interval_days} onChange={e => setScheduleForm({...scheduleForm, interval_days: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">Initial_Cycle_Due</label>
                                <Input type="date" className="h-14 rounded-2xl bg-background/50 border-border/40 font-black uppercase text-xs" value={scheduleForm.next_due_date} onChange={e => setScheduleForm({...scheduleForm, next_due_date: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveSchedule} className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 border-none transition-all active:scale-95" disabled={isProcessing}>
                            {isProcessing ? <RefreshCw className="animate-spin" /> : "Deploy_Schedule_Protocol"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
