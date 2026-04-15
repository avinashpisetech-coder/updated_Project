"use client";

import React from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Plus,
  HelpCircle,
  Copy,
  Paperclip,
  FileText,
  X,
  Eye,
  Download,
  Link2,
  ListFilter,
  Check,
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/providers/NavigationProvider";

interface Props {
  suppliers: { id: string; name: string; city?: string }[];
  projects: { id: string; name: string }[];
  assetTypes: { id: string; name: string }[];
  subTypes: { id: string; name: string; type_id: string }[];
  catalog: { id: string; name: string; sub_type_id: string; hsn_code_id: string; brand: string; model_number: string; uom?: { name: string; symbol: string }; asset_sub_types?: { type_id: string } }[];
  hsnCodes: { id: string; hsn_code: string; tax_group: { name: string; taxes: { name: string; percentage: number }[] } }[];
  budgets: any[];
  indents: any[]; // New prop for authorized indents
}

export function NewPurchaseClient({ suppliers, projects, assetTypes, subTypes, catalog, hsnCodes, budgets, indents }: Props) {
  const { isSidebarOpen } = useNavigation();
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);

  // Helper for Financial Year
  const getFY = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const startYear = month < 3 ? year - 1 : year;
    const endYear = startYear + 1;
    return `FY${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  };
  const [protocolId, setProtocolId] = React.useState("");

  React.useEffect(() => {
    const fetchNextPoNumber = async () => {
      const fy = getFY();
      const { data } = await supabase
        .from('asset_purchases')
        .select('po_number')
        .ilike('po_number', `PO/${fy}/%`)
        .order('po_number', { ascending: false })
        .limit(1);
      
      let nextNum = 1;
      if (data && data.length > 0) {
        const lastPo = data[0].po_number;
        const match = lastPo.match(/\/(\d{4})$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      
      const paddedNum = String(nextNum).padStart(4, '0');
      setProtocolId(`PO/${fy}/${paddedNum}`);
    };
    fetchNextPoNumber();
  }, []);

  // --- State ---
  const [header, setHeader] = React.useState({
    po_type: "Domestic",
    project_id: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    supplier_id: "",
    branch: "HO_HEAD_OFFICE",
    document_through: "",
    is_debitable: false,
    po_number: "",
    reference: ""
  });

  const [lineItems, setLineItems] = React.useState<any[]>([]);
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [isIndentModalOpen, setIsIndentModalOpen] = React.useState(false);
  const [activeLineId, setActiveLineId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddFromIndent = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setLineItems([...lineItems, { 
      id: newId, assetTypeId: "", subTypeId: "", catalogId: "", 
      name: "", description: "", uom: "", 
      qty: 0, rate: 0, total: 0, 
      cgst_pct: 0, sgst_pct: 0, igst_pct: 0,
      hsn_code: "",
      purchaseDate: header.purchase_date,
      taggedIndents: [] // To store linked indent IDs and counts
    }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        if (field === "assetTypeId") { newItem.subTypeId = ""; newItem.catalogId = ""; newItem.hsn_code = ""; newItem.taggedIndents = []; }
        if (field === "subTypeId") { newItem.catalogId = ""; newItem.hsn_code = ""; newItem.taggedIndents = []; }
        if (field === "catalogId") {
            const selectedCatalog = catalog.find(c => c.id === value);
            if (selectedCatalog) {
                newItem.name = selectedCatalog.name;
                newItem.description = `${selectedCatalog.brand || ''} ${selectedCatalog.model_number || ''}`;
                newItem.uom = selectedCatalog.uom?.symbol || "-";
                newItem.assetTypeId = selectedCatalog.asset_sub_types?.type_id; 
                newItem.subTypeId = selectedCatalog.sub_type_id;
                const hsn = hsnCodes.find(h => h.id === selectedCatalog.hsn_code_id);
                if (hsn) {
                    newItem.hsn_code = hsn.hsn_code;
                    newItem.cgst_pct = 0; newItem.sgst_pct = 0; newItem.igst_pct = 0;
                    hsn.tax_group?.taxes?.forEach(t => {
                        if (t.name.toUpperCase().includes('CGST')) newItem.cgst_pct = t.percentage;
                        if (t.name.toUpperCase().includes('SGST')) newItem.sgst_pct = t.percentage;
                        if (t.name.toUpperCase().includes('IGST')) newItem.igst_pct = t.percentage;
                    });
                }
            }
        }
        if (field === "qty" || field === "rate") newItem.total = (newItem.qty || 0) * (newItem.rate || 0);
        return newItem;
      }
      return item;
    }));
  };

  const handleToggleIndent = (indentId: string) => {
    if (!activeLineId) return;
    setLineItems(lineItems.map(item => {
        if (item.id === activeLineId) {
            const currentIndents = [...item.taggedIndents];
            const exists = currentIndents.find(i => i.indent_id === indentId);
            if (exists) {
                return { ...item, taggedIndents: currentIndents.filter(i => i.indent_id !== indentId) };
            } else {
                const indentData = indents.find(i => i.id === indentId);
                return { ...item, taggedIndents: [...currentIndents, { indent_id: indentId, quantity: indentData.quantity }] };
            }
        }
        return item;
    }));
  };

  const handleSave = async () => {
    if (!header.supplier_id) { toast.error("Supplier Authority is mandatory."); return; }
    setIsLoading(true);

    const fy = getFYFromDate(header.purchase_date);
    for (const item of lineItems.filter(i => i.name || i.catalogId)) {
        const typeId = item.assetTypeId;
        if (!typeId) continue;
        const budget = budgets.find(b => b.asset_type_id === typeId && b.fiscal_year === fy);
        const typeName = assetTypes.find(t => t.id === typeId)?.name || "Selected Type";
        if (!budget) { toast.error(`ALLOCATE BUDGET: No budget for ${typeName} in ${fy}.`); setIsLoading(false); return; }
        const availableBalance = budget.allocated_amount - budget.spent_amount;
        if (item.total > availableBalance) { toast.error(`BUDGET EXCEEDED: ${typeName} limit ₹${availableBalance.toLocaleString('en-IN')}.`); setIsLoading(false); return; }
    }

    try {
      const totalBase = lineItems.reduce((acc, i) => acc + i.total, 0);
      const { data: purchaseOrderResult, error } = await supabase.rpc('create_purchase_order', {
        p_po_number: protocolId, 
        p_supplier_id: header.supplier_id,
        p_project_id: (header.project_id === "none" || !header.project_id) ? null : header.project_id,
        p_purchase_date: header.purchase_date,
        p_total_raw_amount: totalBase,
        p_total_cgst: totalBase * 0.09,
        p_total_sgst: totalBase * 0.09,
        p_total_igst: 0,
        p_grand_total: totalBase * 1.18, 
        p_status: 'draft',
        p_notes: `System Generated PO - ${header.reference || 'Standard Protocol'}`,
        p_items: lineItems.filter(item => item.name || item.catalogId).map(item => ({
            name: item.name, 
            model: item.description, 
            assetTypeId: item.assetTypeId,
            subTypeId: item.subTypeId,
            catalogId: item.catalogId,
            quantity: item.qty, 
            unitPrice: item.rate, 
            totalPrice: item.total,
            remarks: item.remarks,
            purchaseDate: item.purchaseDate
        })),
        p_reference: header.reference
      });

      if (error) throw error;
      const poId = purchaseOrderResult; // The RPC should return the UUID of the new PO

      // --- Post-Save Indent Mapping ---
      // Since the RPC creates line items, we need to fetch them back to link them to indents
      const { data: dbItems } = await supabase.from('asset_purchase_items').select('id, name').eq('purchase_id', poId);
      if (dbItems) {
          for (const frontendItem of lineItems) {
              const matchedDbItem = dbItems.find(dbi => dbi.name === frontendItem.name);
              if (matchedDbItem && frontendItem.taggedIndents.length > 0) {
                  const { error: mapErr } = await supabase.from('po_item_indents').insert(
                      frontendItem.taggedIndents.map((ti: any) => ({
                          po_item_id: matchedDbItem.id,
                          indent_id: ti.indent_id,
                          allocated_quantity: ti.quantity
                      }))
                  );
                  if (mapErr) console.error("Indent Mapping Error:", mapErr);

                  // Update Indent Status
                  await supabase.from('asset_indents').update({ status: 'po_linked' }).in('id', frontendItem.taggedIndents.map((ti: any) => ti.indent_id));
              }
          }
      }

      // Handle Attachments (Simplified logic)
      if (attachments.length > 0) {
        for (const file of attachments) {
            const filePath = `${poId}/${Date.now()}_${file.name}`;
            await supabase.storage.from('asset-documents').upload(filePath, file);
            await supabase.from('asset_attachments').insert({
                purchase_id: poId, file_name: file.name, file_path: filePath,
                file_size: file.size, mime_type: file.type, uploaded_by: (await supabase.auth.getUser()).data.user?.id
            });
        }
      }

      toast.success("PROCUREMENT AUTHORIZED & INDENTS LINKED");
      router.push("/assets/purchases");
      router.refresh();
    } catch (e: any) { toast.error(e.message); } finally { setIsLoading(false); }
  };

  const activeLine = lineItems.find(l => l.id === activeLineId);
  const eligibleIndents = indents.filter(i => 
    i.sub_type_id === activeLine?.subTypeId && 
    (header.project_id === "none" || !header.project_id || i.project_id === header.project_id)
  );

  return (
    <div className="flex flex-col h-screen bg-[#fcfdfe] text-slate-800 font-sans overflow-hidden">
      <div className="p-4 space-y-2 flex-1 overflow-y-auto no-scrollbar pb-32">
          
          {/* 1. Precise Header Grid */}
          <div className="bg-white border border-slate-200 rounded-[1rem] p-4 shadow-sm">
            <div className="grid grid-cols-12 gap-4">
               {/* Left Segment */}
               <div className="col-span-6 grid grid-cols-12 gap-y-2 items-center">
                  <label className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">PO Type *</label>
                  <div className="col-span-9 flex items-center gap-6 h-10 border-l pl-6 border-slate-100">
                    {["Domestic", "Import"].map(t => (
                        <div key={t} className="flex items-center gap-2 cursor-pointer group">
                           <input type="radio" checked={header.po_type === t} onChange={() => setHeader({...header, po_type: t})} className="h-4 w-4 accent-primary cursor-pointer" />
                           <span className="text-[11px] font-bold uppercase tracking-tight group-hover:text-primary transition-colors">{t}</span>
                        </div>
                    ))}
                  </div>

                  <label className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">Project *</label>
                  <div className="col-span-9">
                     <Select value={header.project_id} onValueChange={v => setHeader({...header, project_id: v})}>
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-100 text-[11px] font-black uppercase tracking-tight">
                           <SelectValue placeholder="Global Resource Pool" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                           <SelectItem value="none" className="text-[10px] font-black uppercase opacity-40 italic">None (Global)</SelectItem>
                           {projects.map(p => <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase">{p.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>

                  <label className="col-span-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">PO Date</label>
                  <div className="col-span-9">
                     <Input type="date" className="h-10 rounded-xl bg-primary/5 border-primary/10 text-[11px] font-black text-primary" value={header.purchase_date} onChange={e => setHeader({...header, purchase_date: e.target.value})} />
                  </div>
               </div>

               {/* Right Segment */}
               <div className="col-span-6 grid grid-cols-12 gap-y-2 items-center">
                  <label className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Protocol ID</label>
                  <div className="col-span-8 flex justify-end">
                     <div className="px-5 py-2 rounded-xl bg-primary/5 border border-primary/20">
                        <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">{protocolId}</span>
                     </div>
                  </div>

                  <label className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Supplier *</label>
                  <div className="col-span-8">
                     <Select value={header.supplier_id} onValueChange={v => setHeader({...header, supplier_id: v})}>
                        <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-100 text-[11px] font-black uppercase tracking-tight">
                           <SelectValue placeholder="Select Vendor Authority..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                           {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="text-[11px] font-bold">{s.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>

                  <label className="col-span-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Supplier Ref.</label>
                  <div className="col-span-8">
                     <Input placeholder="Invoice / Quote Ref..." className="h-10 rounded-xl bg-slate-50/50 border-slate-100 text-[11px] font-black" value={header.reference} onChange={e => setHeader({...header, reference: e.target.value})} />
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full pt-2">
            <Button onClick={handleAddFromIndent} className="bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-[0.4em] px-10 h-10 rounded-[1.25rem] shadow-xl shadow-primary/20">
               + Asset Node
            </Button>
            <div className="h-px flex-1 bg-slate-100" />
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Material Consolidation Manifest</h3>
          </div>

          {/* Matrix Table */}
          <div className="w-full bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100 h-10">
                    <TableHead className="w-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">#</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">Major Type</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">Sub Category</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Catalog Linkage</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-[140px]">Remarks</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-[120px] text-center">Fulfillment</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">QTY</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">Rate</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-center">FY Date</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-36 text-right pr-6">Line Total</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.length === 0 ? (
                    <TableRow className="h-32 hover:bg-transparent">
                       <TableCell colSpan={9} className="text-center text-[10px] text-slate-300 py-4 font-black uppercase tracking-[0.4em]">Awaiting Material Definition</TableCell>
                    </TableRow>
                  ) : (
                    lineItems.map((item, idx) => (
                      <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all font-sans group h-12">
                        <TableCell className="text-[10px] text-center font-black text-slate-300/40 italic">{String(idx + 1).padStart(2, '0')}</TableCell>
                        
                        <TableCell className="p-0 border-r border-slate-100">
                             <Select value={item.assetTypeId} onValueChange={v => updateLineItem(item.id, "assetTypeId", v)}>
                                <SelectTrigger className="h-12 border-none bg-transparent shadow-none text-[10px] font-black uppercase tracking-tight rounded-none px-4">
                                    <SelectValue placeholder="TYPE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {assetTypes.map(t => <SelectItem key={t.id} value={t.id} className="text-[9px] font-bold uppercase">{t.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </TableCell>

                        <TableCell className="p-0 border-r border-slate-100">
                             <Select value={item.subTypeId} onValueChange={v => updateLineItem(item.id, "subTypeId", v)}>
                                <SelectTrigger className="h-12 border-none bg-transparent shadow-none text-[10px] font-black uppercase tracking-tight rounded-none px-4">
                                    <SelectValue placeholder="SUB_TYPE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {subTypes.filter(st => !item.assetTypeId || st.type_id === item.assetTypeId).map(st => (
                                        <SelectItem key={st.id} value={st.id} className="text-[9px] font-bold uppercase">{st.name}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                        </TableCell>

                        <TableCell className="p-0 border-r border-slate-100">
                            <Select value={item.catalogId} onValueChange={v => updateLineItem(item.id, "catalogId", v)}>
                                <SelectTrigger className="h-12 border-none bg-transparent shadow-none text-[11px] font-black uppercase tracking-tight rounded-none px-4">
                                    <SelectValue placeholder="CATALOG_NODE" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {catalog.filter(c => !item.subTypeId || c.sub_type_id === item.subTypeId).map(c => (
                                        <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold py-2 uppercase">
                                            <div className="flex flex-col">
                                                <span>{c.name}</span>
                                                <span className="text-[8px] text-slate-400 font-medium">{c.brand} {c.model_number}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-100">
                           <input placeholder="SPECS..." className="h-12 w-full border-none bg-transparent px-4 text-[10px] font-bold text-slate-500 uppercase outline-none" value={item.remarks || ""} onChange={e => updateLineItem(item.id, "remarks", e.target.value)} />
                        </TableCell>
                        <TableCell className="p-2 border-r border-slate-100 flex items-center justify-center h-12">
                            <button 
                                onClick={() => { setActiveLineId(item.id); setIsIndentModalOpen(true); }}
                                disabled={!item.subTypeId}
                                className={cn(
                                    "px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all",
                                    item.taggedIndents?.length > 0 
                                        ? "bg-amber-500/10 text-amber-600 border-amber-200" 
                                        : "bg-muted/10 text-muted-foreground/30 border-transparent hover:border-slate-200"
                                )}
                            >
                                {item.taggedIndents?.length > 0 ? `${item.taggedIndents.length}` : 'LINK'}
                            </button>
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-100">
                           <input type="number" className="h-12 w-full border-none bg-transparent text-center text-[12px] font-black text-primary outline-none" value={item.qty} onChange={e => updateLineItem(item.id, "qty", parseFloat(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-100 bg-slate-50/30">
                           <input type="number" className="h-12 w-full border-none bg-transparent text-right pr-6 text-[14px] font-black text-slate-900 outline-none placeholder:text-slate-300" placeholder="0.00" value={item.rate} onChange={e => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-100">
                           <input type="date" className="h-12 w-full border-none bg-transparent text-center text-[9px] font-bold text-slate-400" value={item.purchaseDate} onChange={e => updateLineItem(item.id, "purchaseDate", e.target.value)} />
                        </TableCell>
                        <TableCell className="text-right pr-4 text-[14px] font-black text-slate-950 border-r border-slate-100 font-mono tracking-tighter bg-slate-50/10">₹ {item.total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 justify-center">
                                <button onClick={() => setLineItems(lineItems.filter(i => i.id !== item.id))} className="h-7 w-7 rounded-xl text-slate-300 hover:text-red-500 transition-colors">
                                   <Trash2 size={13} />
                                </button>
                            </div>
                         </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
            </Table>
          </div>

          <Dialog open={isIndentModalOpen} onOpenChange={setIsIndentModalOpen}>
            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none shadow-2xl p-10 font-sans">
                <DialogHeader className="mb-8">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Indent Consolidation Hub</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                        Map authorized requirements to this procurement node
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                    {eligibleIndents.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/10 opacity-30 select-none">
                            <ListFilter size={40} className="mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">No matching indents found for this asset type and project scope.</p>
                        </div>
                    ) : (
                        eligibleIndents.map(indent => {
                            const isTagged = activeLine?.taggedIndents.find((ti: any) => ti.indent_id === indent.id);
                            return (
                                <div key={indent.id} className={cn(
                                    "p-6 rounded-[2rem] border transition-all duration-300 flex items-center justify-between group cursor-pointer",
                                    isTagged ? "bg-primary/5 border-primary/20" : "bg-white border-slate-100 hover:border-slate-200"
                                )} onClick={() => handleToggleIndent(indent.id)}>
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "h-10 w-10 rounded-2xl flex items-center justify-center transition-all",
                                            isTagged ? "bg-primary text-white" : "bg-slate-50 text-slate-300"
                                        )}>
                                            {isTagged ? <Check size={20} /> : <FileText size={20} />}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-black uppercase tracking-tight text-foreground">{indent.indent_number}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                                For {indent.department?.name} // {indent.project?.name || 'Global'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black tracking-tighter text-slate-900 leading-none">{indent.quantity}</p>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest pt-1">Shortage Qty</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="mt-10 pt-8 border-t border-slate-100">
                    <Button onClick={() => setIsIndentModalOpen(false)} className="h-14 w-full rounded-[1.5rem] bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-slate-900/10">
                        CLOSE CONSOLIDATION CONTEXT
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <footer className={cn(
          "fixed bottom-0 right-0 h-16 bg-white border-t border-slate-100 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex items-center px-10 gap-12 transition-all duration-300",
          isSidebarOpen ? "left-72" : "left-16"
      )}>
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">PROTOCOL_ID</span>
            <div className="flex items-center gap-2.5">
               <span className="text-sm font-black text-primary tracking-tight uppercase leading-none">{protocolId}</span>
               <button onClick={() => router.push("/assets/purchases")} className="text-[9px] font-bold text-red-400 hover:text-red-500 uppercase tracking-widest">HALT</button>
            </div>
         </div>

         <div className="flex items-center gap-8 border-l border-slate-100 pl-8">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">GROSS_BASE</span>
               <span className="text-base font-black text-slate-900 leading-none tracking-tight">₹ {lineItems.reduce((acc, i) => acc + i.total, 0).toLocaleString('en-IN')}</span>
            </div>
            <ArrowRight className="text-slate-200" size={14} />
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">TAX (9+9%)</span>
               <span className="text-base font-black text-slate-400 leading-none tracking-tight">₹ {(lineItems.reduce((acc, i) => acc + i.total, 0) * 0.18).toLocaleString('en-IN')}</span>
            </div>
         </div>

         <div className="ml-auto flex items-center gap-10">
            <div className="flex items-baseline gap-2">
               <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">AGGREGATE_INR</span>
               <span className="text-2xl font-black text-slate-950 leading-none tracking-tighter">₹{(lineItems.reduce((acc, i) => acc + i.total, 0) * 1.18).toLocaleString('en-IN')}</span>
            </div>
            <Button 
                onClick={handleSave} 
                disabled={isLoading || lineItems.length === 0} 
                className="h-10 px-10 bg-primary hover:bg-primary/95 text-white font-black text-[10px] rounded-xl shadow-xl shadow-primary/20 uppercase tracking-[0.1em] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
                {isLoading ? 'SYNCING...' : 'EXECUTE_PO'}
            </Button>
         </div>
      </footer>
    </div>
  );
}

const getFYFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth();
    const startYear = month < 3 ? year - 1 : year; // Standard Accounting
    const endYear = startYear + 1;
    return `${startYear}-${String(endYear).slice(-2)}`;
};
