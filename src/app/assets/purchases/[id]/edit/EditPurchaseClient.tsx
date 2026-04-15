"use client";

import React from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Plus,
  HelpCircle,
  Copy,
  Save,
  AlertCircle,
  Boxes,
  Link2,
  Check,
  ListFilter,
  FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



interface Props {
  purchase: any;
  initialItems: any[];
  suppliers: any[];
  projects: any[];
  assetTypes: any[];
  subTypes: any[];
  catalog: any[];
  hsnCodes: any[];
  budgets: any[];
  grnExists: boolean;
  indents: any[];
  initialMappings: any[];
}

export function EditPurchaseClient({ 
  purchase, initialItems, suppliers, projects, 
  assetTypes, subTypes, catalog, hsnCodes, 
  budgets, grnExists, indents, initialMappings
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  // --- State ---
  const [header, setHeader] = React.useState({
    po_type: purchase.po_type || "Domestic",
    project_id: purchase.project_id || "",
    purchase_date: purchase.purchase_date,
    supplier_id: purchase.supplier_id || "",
    branch: purchase.branch || "HO_HEAD_OFFICE",
    po_number: purchase.po_number || "",
    reference: purchase.reference || "",
    fiscal_year: purchase.fiscal_year || "2024-25",
    notes: purchase.notes || "",
    status: purchase.status || "pending",
    other_charges: purchase.other_charges || 0,
    amendment_number: purchase.amendment_number || 0
  });

  // --- Indent Consolidation Hub State ---
  const [isIndentModalOpen, setIsIndentModalOpen] = React.useState(false);
  const [activeLineId, setActiveLineId] = React.useState<string | null>(null);

  // --- Copy Material Protocol State ---
  const [copyingItem, setCopyingItem] = React.useState<any>(null);
  const [copyQty, setCopyQty] = React.useState<number>(0);


  // Amendment Logic: Auto-transition on mount if approved
  React.useEffect(() => {
    setMounted(true);
    if (purchase.status?.toLowerCase().includes('approved')) {
        setHeader(prev => ({ 
            ...prev, 
            status: 'Amend & Draft',
            amendment_number: (purchase.amendment_number || 0) + 1 
        }));
        // Auto-isolate receipts on enter
        setTimeout(() => finalizeBalancing(), 100);
    }
  }, [purchase]);

  const finalizeBalancing = () => {
    let splitCount = 0;
    setLineItems(prev => {
        const newItems = [...prev];
        const processedItems: any[] = [];

        newItems.forEach(item => {
            if (item.received_qty > 0 && item.qty > item.received_qty) {
                const remainingQty = item.qty - item.received_qty;
                // 1. Lock original item to received quantity
                processedItems.push({ 
                    ...item, 
                    qty: item.received_qty, 
                    total: item.received_qty * item.rate,
                    isLocked: true 
                });
                // 2. Spawn new balance item
                const newId = `split-${item.id}-${Math.random().toString(36).substr(2, 4)}`;
                processedItems.push({
                    ...item,
                    id: newId,
                    qty: remainingQty,
                    received_qty: 0,
                    total: remainingQty * item.rate,
                    isLocked: false,
                    taggedIndents: [] // Balance split doesn't auto-carry indents (Requires re-mapping)
                });
                splitCount++;
            } else {
                processedItems.push({ ...item, isLocked: item.received_qty > 0 });
            }
        });
        return processedItems;
    });
    if (splitCount > 0) toast.success(`Audit Compliance: ${splitCount} partially received materials have been isolated for price amendment.`);
  };

  const displayPoNumber = React.useMemo(() => {
    let base = header.po_number;
    if (header.amendment_number > 0) {
        return `${base}/AMD/${header.amendment_number}`;
    }
    return base;
  }, [header.po_number, header.amendment_number]);

  const [lineItems, setLineItems] = React.useState<any[]>(
    (initialItems || []).map(item => {
        // Find the catalog entry that best matches the existing item
        const catalogMatch = catalog.find(c => 
            (c.name === (item.asset_name || item.name) && c.model_number === (item.model_number || item.model)) ||
            (c.name === (item.asset_name || item.name))
        );

        // Map initial indents for this item
        const itemMappings = initialMappings.filter(m => m.po_item_id === item.id);

        return {
            id: item.id,
            purchase_item_id: item.id,
            typeId: item.asset_type_id || item.type_id || null,
            subTypeId: item.sub_type_id || catalogMatch?.sub_type_id || null,
            catalogId: item.catalog_id || catalogMatch?.id || null, 
            name: item.asset_name || item.name || "", 
            description: item.model_number || item.model || "",
            qty: item.quantity || item.qty || 0,
            received_qty: item.received_quantity || 0,
            rate: item.unit_price || item.rate || 0,
            total: item.total_price || item.total || 0,
            purchaseDate: item.item_purchase_date || purchase.purchase_date,
            uom: catalogMatch?.uom?.symbol || item.uom || "MT",
            hsn_code: hsnCodes.find(h => h.hsn_code === item.hsn_code)?.hsn_code || "",
            remarks: item.remarks || "",
            parentLineInfo: item.parent_line_info || "",
            taggedIndents: itemMappings.map(m => ({ indent_id: m.indent_id, quantity: m.allocated_quantity }))
        };
    })
  );


  const splitLineItem = (item: any) => {
    if (item.received_qty <= 0) return;
    
    const remainingQty = item.qty - item.received_qty;
    if (remainingQty <= 0) return;

    // 1. Update existing item to MUST be the received quantity (Keep ID)
    setLineItems(prev => prev.map(li => 
        li.id === item.id ? { ...li, qty: item.received_qty, total: item.received_qty * item.rate } : li
    ));

    // 2. Add NEW item for the remaining balance (New ID)
    const newId = Math.random().toString(36).substr(2, 9);
    setLineItems(prev => [...prev, {
        ...item,
        id: newId,
        qty: remainingQty,
        received_qty: 0,
        total: remainingQty * item.rate
    }]);

    toast.success(`Material split: ${item.received_qty} units kept on original protocol; ${remainingQty} units assigned to amendment balance.`);
  };

  const handleAddLineItem = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setLineItems([...lineItems, { 
        id: newId, catalogId: "", name: "", description: "", uom: "", 
        qty: 0, rate: 0, total: 0, received_qty: 0, remarks: "",
        typeId: "" // Initialize typeId for robustness
    }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        
        if (field === "catalogId") {
            const selectedCatalog = catalog.find(c => c.id === value);
            if (selectedCatalog) {
                newItem.name = selectedCatalog.name;
                newItem.description = `${selectedCatalog.brand || ''} ${selectedCatalog.model_number || ''}`;
                newItem.uom = selectedCatalog.uom?.symbol || "MT";
                newItem.typeId = selectedCatalog.asset_sub_types?.type_id;
                newItem.taggedIndents = []; // Reset on catalog change
            }
        }

        if (field === "qty" || field === "rate") {
          newItem.total = (newItem.qty || 0) * (newItem.rate || 0);
        }
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

  const handleCopyProceed = () => {
    if (!copyingItem || copyQty <= 0) return;
    
    const available = copyingItem.qty - copyingItem.received_qty;
    if (copyQty > available) {
        toast.error(`Invalid redistribution: Max available is ${available}`);
        return;
    }

    setLineItems(prev => {
        // 1. Subtract from original
        const updatedItems = prev.map(li => {
            if (li.id === copyingItem.id) {
                const newQty = li.qty - copyQty;
                return { ...li, qty: newQty, total: newQty * li.rate };
            }
            return li;
        });

        // 2. Spawn new line
        const newId = `copy-${Math.random().toString(36).substr(2, 5)}`;
        const newLine = {
            ...copyingItem,
            id: newId,
            qty: copyQty,
            received_qty: 0,
            total: copyQty * copyingItem.rate,
            isLocked: false,
            parentLineInfo: copyingItem.received_qty > 0 ? `Sr No ${prev.findIndex(li => li.id === copyingItem.id) + 1}` : "",
            purchase_item_id: null,
            taggedIndents: [] // Clones/Copies require fresh mapping for audit precision
        };


        return [...updatedItems, newLine];
    });

    toast.success(`${copyQty} units isolated to new material protocol.`);
    setCopyingItem(null);
    setCopyQty(0);
  };

  const handleClone = (item: any) => {
    const newId = `clone-${Math.random().toString(36).substr(2, 5)}`;
    setLineItems(prev => [...prev, {
        ...item,
        id: newId,
        received_qty: 0,
        total: item.qty * item.rate,
        isLocked: false,
        parentLineInfo: "", // Standard clone has no audit lineage highlight
        purchase_item_id: null,
        taggedIndents: [] // Fresh mapping required
    }]);
    toast.success(`Material duplicated successfully.`);
  };

  const handleSave = async (targetStatus?: string) => {

    if (!header.po_number || !header.supplier_id) {
       toast.error("Purchase Order number and Supplier are required.");
       return;
    }

    setIsLoading(true);
    const finalStatus = targetStatus || header.status;

    try {
      const { error } = await supabase.rpc('update_purchase_order_v2', {
        p_id: purchase.id,
        p_purchase_date: header.purchase_date,
        p_notes: header.notes,
        p_status: finalStatus,
        p_amendment_number: header.amendment_number,
        p_other_charges: header.other_charges,
        p_supplier_id: header.supplier_id,
        p_project_id: header.project_id === "none" || !header.project_id ? null : header.project_id,
        p_po_number: header.po_number,
        p_po_type: header.po_type,
        p_branch: header.branch,
        p_reference: header.reference,
        p_items: lineItems.map(item => ({
            id: typeof item.id === 'string' && item.id.includes('-') ? item.id : null,
            catalogId: item.catalogId, 
            subTypeId: item.subTypeId,
            assetTypeId: item.typeId || item.asset_type_id,
            name: item.name, 
            model: item.description, 
            quantity: item.qty, 
            unitPrice: item.rate, 
            totalPrice: item.total,
            remarks: item.remarks,
            parentLineInfo: item.parentLineInfo
        }))
      });

      if (error) throw error;

      // --- Post-Save Indent Mapping Resilience ---
      const { data: dbItems } = await supabase.from('asset_purchase_items').select('id, asset_name').eq('purchase_id', purchase.id);
      if (dbItems) {
          // 1. Wipe old mappings for this PO (since update_v2 rewrites items)
          await supabase.from('po_item_indents').delete().in('po_item_id', initialItems.map(i => i.id));

          // 2. Insert new mappings
          for (const frontendItem of lineItems) {
              const matchedDbItem = dbItems.find(dbi => dbi.asset_name === frontendItem.name);
              if (matchedDbItem && frontendItem.taggedIndents?.length > 0) {
                  await supabase.from('po_item_indents').insert(
                      frontendItem.taggedIndents.map((ti: any) => ({
                          po_item_id: matchedDbItem.id,
                          indent_id: ti.indent_id,
                          allocated_quantity: ti.quantity
                      }))
                  );
                  // Update Indent Status
                  await supabase.from('asset_indents').update({ status: 'po_linked' }).in('id', frontendItem.taggedIndents.map((ti: any) => ti.indent_id));
              }
          }
      }

      toast.success("PO Updated Successfully & Indents Synced");
      router.push(`/assets/purchases/${purchase.id}`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full bg-[#F8F9FA] text-slate-800">

      
      {/* 1. Protocol Control Bar */}
      <header className="h-[56px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 hover:bg-slate-100">
               <ArrowLeft size={16} className="text-slate-400" />
            </Button>
            <div className="flex flex-col">
               <h1 className="text-[14px] font-black uppercase tracking-tight text-slate-700">
                  {purchase.status === 'approved' ? "Amendment Registry Editor" : "Purchase Registry Editor"}
               </h1>
               <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-4 font-black uppercase bg-primary/5 text-primary border-primary/20">
                     ID: {displayPoNumber}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{header.status.replace(/_/g, ' ')}</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <Button 
               variant="outline" 
               onClick={() => router.back()} 
               className="!h-8 text-[11px] font-bold uppercase px-6 !bg-white border-slate-200 hover:bg-slate-50"
            >
               Discard
            </Button>

            {/* Dynamic Status Actions based on Workflow */}
            {header.status === 'draft' && (
               <>
                  <Button onClick={() => handleSave('draft')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-slate-800 hover:bg-black text-white rounded">
                     Save Draft
                  </Button>
                  <Button onClick={() => handleSave('submitted')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm">
                     Submit for Approval
                  </Button>
               </>
            )}

            {header.status === 'submitted' && (
               <>
                  <Button onClick={() => handleSave('cancelled')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-red-50 hover:bg-red-100 text-red-600 rounded">
                     Cancel PO
                  </Button>
                  <Button onClick={() => handleSave('approved')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm">
                     Approve PO
                  </Button>
               </>
            )}

            {(header.status === 'approved' || header.status === 'received') && (
               <Button onClick={() => handleSave('submitted')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm">
                  Resubmit for Review
               </Button>
            )}

            {header.status === 'Amend & Draft' && (
               <Button onClick={() => handleSave('Amend & Submitted')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm">
                  Submit Amendment
               </Button>
            )}

            {header.status === 'Amend & Submitted' && (
               <Button onClick={() => handleSave('Amend & Approved')} disabled={isLoading} className="!h-8 text-[11px] font-black uppercase px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm">
                  Approve Amendment
               </Button>
            )}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-3 pb-32">
         
         {/* 2. Logistical Metadata */}
         <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-primary/60" />
                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-800">Operational Logistical Data</h3>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-3">
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">PO Type</label>
                     <Select value={header.po_type} onValueChange={v => setHeader({...header, po_type: v})} disabled={purchase.status !== 'draft'}>
                        <SelectTrigger className="w-full !bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-white">
                           <SelectItem value="Domestic">Domestic</SelectItem>
                           <SelectItem value="Import">Import</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Vendor</label>
                     <Select value={header.supplier_id} onValueChange={v => setHeader({...header, supplier_id: v})} disabled={purchase.status !== 'draft'}>
                        <SelectTrigger className="w-full !bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-white">
                           {(suppliers || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Order Date</label>
                     <Input type="date" disabled={purchase.status !== 'draft'} className="!bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3 w-full" value={header.purchase_date} onChange={e => setHeader({...header, purchase_date: e.target.value})} />
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Reference</label>
                     <Input placeholder="Quotation / Ref No." className="!bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3 w-full" value={header.reference || ""} onChange={e => setHeader({...header, reference: e.target.value})} />
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Project</label>
                     <Select value={header.project_id || "none"} onValueChange={v => setHeader({...header, project_id: v})} disabled={purchase.status !== 'draft'}>
                        <SelectTrigger className="w-full !bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-white">
                           <SelectItem value="none">Internal Consumable</SelectItem>
                           {(projects || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Branch</label>
                     <Select value={header.branch} onValueChange={v => setHeader({...header, branch: v})} disabled={purchase.status !== 'draft'}>
                        <SelectTrigger className="w-full !bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-white">
                           <SelectItem value="HO_HEAD_OFFICE">HO_HEAD_OFFICE</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Fiscal Year</label>
                     <Select value={header.fiscal_year || "2024-25"} onValueChange={v => setHeader({...header, fiscal_year: v})} disabled={purchase.status !== 'draft'}>
                        <SelectTrigger className="w-full !bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="!bg-white">
                           <SelectItem value="2024-25">2024-25</SelectItem>
                           <SelectItem value="2025-26">2025-26</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  <div className="flex items-center gap-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest w-24 mb-0">Freight (₹)</label>
                     <Input type="number" className="!bg-white !border-slate-300 !h-8 text-[11px] font-bold px-3 w-full" value={header.other_charges} onChange={e => setHeader({...header, other_charges: parseFloat(e.target.value) || 0})} />
                  </div>
               </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">General Notes</label>
               <textarea 
                 className="w-full !bg-white border border-slate-200 p-3 text-[11px] font-medium rounded-md min-h-[60px]"
                 value={header.notes}
                 onChange={e => setHeader({...header, notes: e.target.value})}
                 placeholder="Justification for amendment or general notes..."
               />
            </div>
         </div>

         {/* 3. Material Specification Table */}
         <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Boxes size={16} /> Material Audit Registry
                    </h3>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={finalizeBalancing}
                        className="h-6 text-[9px] font-black uppercase bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100 rounded-none px-3"
                    >
                        Standardize Protocol Balance
                    </Button>
                </div>
                <Button onClick={handleAddLineItem} className="!h-8 px-5 bg-slate-900 text-white text-[10px] font-black uppercase">
                   Add Material
                </Button>
            </div>

            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden text-[11px]">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="h-10">
                            <TableHead className="w-12 text-center text-[10px] font-black uppercase">Sr No</TableHead>
                            <TableHead>Specification (Catalog Lookup)</TableHead>
                            <TableHead className="w-32 text-center">Material Remark</TableHead>
                            <TableHead className="w-32 text-center">Fulfillment Linking</TableHead>
                            <TableHead className="w-24 text-center text-[10px]">Type</TableHead>
                            <TableHead className="w-24 text-center text-[10px]">Sub-Type</TableHead>
                            <TableHead className="w-20 text-center">UOM</TableHead>
                            <TableHead className="w-24 text-center">Ordered</TableHead>
                            <TableHead className="w-28 text-right pr-6">Rate (₹)</TableHead>
                            <TableHead className="w-20 text-center bg-emerald-50/30">Recd</TableHead>
                            <TableHead className="w-28 text-right pr-8">Total (₹)</TableHead>
                            <TableHead className="w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lineItems.length === 0 && (
                          <TableRow className="h-40 hover:bg-transparent">
                             <TableCell colSpan={12} className="text-center py-10 opacity-30 select-none">
                                <Boxes size={32} className="mx-auto mb-3" />
                                <p className="text-[11px] font-black uppercase tracking-[0.4em]">No Material Registry Signals Detected</p>
                                <p className="text-[9px] font-medium text-slate-400 mt-1 italic">(Received {initialItems?.length || 0} initial records from server node)</p>
                             </TableCell>
                          </TableRow>
                        )}
                        {lineItems.map((item, idx) => (
                          <TableRow 
                            key={item.id} 
                            className={cn(
                                "h-12 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors",
                                item.parentLineInfo 
                                    ? "bg-blue-50/80 border-l-2 border-l-blue-500 font-semibold" 
                                    : "bg-white"
                            )}
                          >
                            <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>

                            <TableCell className="p-0 min-w-[200px] border-r border-slate-50">
                                <Select value={item.catalogId} onValueChange={v => updateLineItem(item.id, "catalogId", v)} disabled={item.isLocked}>
                                    <SelectTrigger className={cn(
                                        "!h-10 border-none !bg-white text-[11px] font-bold uppercase focus:ring-0 rounded-none w-full",
                                        item.isLocked && "opacity-50 grayscale bg-slate-50 cursor-not-allowed"
                                    )}>
                                        <div className="flex items-center gap-2">
                                            {item.isLocked && <AlertCircle size={12} className="text-amber-500" />}
                                            <SelectValue placeholder={item.name || "Search Registry..."} />
                                            {item.isLocked && <span className="text-[8px] font-black text-amber-600 uppercase italic ml-2 bg-amber-50 px-1">Fixed Receipt</span>}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="!bg-white rounded-none border-slate-200">
                                        {(catalog || []).map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-[11px] font-bold uppercase">
                                                {c.name} - <span className="text-[9px] text-slate-400 font-medium">{c.model_number || 'N/A'}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="p-0 border-r border-slate-50">
                                <Input 
                                    placeholder="Enter Spec/Remark..." 
                                    className="!h-10 border-none !bg-white text-[10px] font-medium px-3 focus:ring-0" 
                                    value={item.remarks || ""} 
                                    onChange={e => updateLineItem(item.id, "remarks", e.target.value)} 
                                />
                            </TableCell>
                            <TableCell className="p-0 border-r border-slate-50">
                                <div className="flex items-center justify-center h-10">
                                    <button 
                                        onClick={() => { setActiveLineId(item.id); setIsIndentModalOpen(true); }}
                                        disabled={!item.catalogId || item.isLocked}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                                            item.taggedIndents?.length > 0 
                                                ? "bg-amber-500/10 text-amber-600 border-amber-200" 
                                                : "bg-muted/10 text-muted-foreground/30 border-transparent hover:border-slate-200",
                                            item.isLocked && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <Link2 size={12} className={cn(item.taggedIndents?.length > 0 ? "text-amber-500" : "opacity-20")} />
                                        {item.taggedIndents?.length > 0 ? `${item.taggedIndents.length} Linked` : 'Link Indents'}
                                    </button>
                                </div>
                            </TableCell>
                            <TableCell className="border-r border-slate-50 text-center text-[9px] font-black text-slate-400 uppercase bg-slate-50/20">
                                {assetTypes.find(t => t.id === (item.typeId || item.asset_type_id))?.name || "-"}
                            </TableCell>
                            <TableCell className="border-r border-slate-50 text-center text-[9px] font-black text-slate-400 uppercase bg-slate-50/20">
                                {subTypes.find(s => s.id === (item.subTypeId || item.sub_type_id))?.name || "-"}
                            </TableCell>
                            <TableCell className="text-center text-[10px] font-bold text-slate-400 border-r border-slate-50">{item.uom}</TableCell>
                            <TableCell className="p-0 border-r border-slate-50">
                                {item.parentLineInfo ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative group flex items-center justify-center h-full w-full cursor-help">
                                                <Input 
                                                    type="number" 
                                                    disabled={item.isLocked} 
                                                    className="!h-10 border-none !bg-transparent text-center font-black text-blue-600 w-full" 
                                                    value={item.qty} 
                                                    onChange={e => updateLineItem(item.id, "qty", parseFloat(e.target.value) || 0)} 
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-slate-900 text-white border-0 text-[10px] font-black uppercase tracking-widest p-2 z-[100]">
                                            Source Line: {item.parentLineInfo} (Amendment Isolation)
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Input type="number" disabled={item.isLocked} className="!h-10 border-none !bg-white text-center font-black text-primary" value={item.qty} onChange={e => updateLineItem(item.id, "qty", parseFloat(e.target.value) || 0)} />
                                )}

                            </TableCell>
                            <TableCell className="p-0 border-r border-slate-50">
                                <Input type="number" disabled={item.isLocked} className="!h-10 border-none !bg-white text-right pr-4 font-black text-slate-900" value={item.rate} onChange={e => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)} />
                            </TableCell>
                            <TableCell className="text-center font-black text-[10px] text-emerald-600 bg-emerald-50/20 border-r border-slate-50">{item.received_qty}</TableCell>
                            <TableCell className="text-right pr-8 font-black text-[11px] truncate text-slate-700 font-mono">
                                {mounted ? item.total?.toLocaleString('en-IN', {minimumFractionDigits: 2}) : item.total}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 justify-center">
                                   <Button variant="ghost" size="icon" onClick={() => handleClone(item)} className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-slate-50" title="Duplicate Material"><Copy size={13}/></Button>
                                   <Button variant="ghost" size="icon" onClick={() => splitLineItem(item)} className="h-7 w-7 text-indigo-600 hover:bg-indigo-50" title="Split Balance"><Plus size={14} /></Button>
                                   <Button variant="ghost" size="icon" disabled={item.received_qty > 0} onClick={() => setLineItems(lineItems.filter(li => li.id !== item.id))} className="h-7 w-7 text-red-500 hover:bg-red-50"><Trash2 size={14} /></Button>
                                   
                                   {/* Copy Material Protocol (Strict Fiscal Rule: Remaining < Received) */}
                                   {item.received_qty > 0 && item.qty > item.received_qty && (item.qty - item.received_qty) < item.received_qty && (
                                     <button 
                                        onClick={() => { setCopyingItem(item); setCopyQty(1); }}
                                        className="text-[9px] font-black uppercase text-indigo-500 hover:text-indigo-700 underline underline-offset-2 ml-1"
                                     >
                                        Copy Material
                                     </button>
                                   )}

                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
         </div>

         {/* Indent Consolidation Hub */}
         <Dialog open={isIndentModalOpen} onOpenChange={setIsIndentModalOpen}>
            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none shadow-2xl p-10 font-sans">
                <DialogHeader className="mb-8">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-[#003366]">Requisition Consolidation Hub</DialogTitle>
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                        Map authorized requirements to this procurement node
                    </div>
                </DialogHeader>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                    {(() => {
                        const activeLine = lineItems.find(l => l.id === activeLineId);
                        const eligibleIndents = indents.filter(i => 
                            i.sub_type_id === activeLine?.subTypeId || i.sub_type_id === activeLine?.typeId // Fallback for broad categories
                        );

                        if (eligibleIndents.length === 0) {
                            return (
                                <div className="p-20 flex flex-col items-center justify-center bg-muted/5 rounded-[2rem] border-2 border-dashed border-border/10 opacity-30 select-none">
                                    <ListFilter size={40} className="mb-4 text-[#003366]" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center text-[#003366]">No matching indents found for this asset scope.</p>
                                </div>
                            );
                        }

                        return eligibleIndents.map(indent => {
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
                                            <p className="text-[11px] font-black uppercase tracking-tight text-[#003366]">{indent.indent_number}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-none">
                                                For {indent.department?.name} // {indent.project?.name || 'Global'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black tracking-tighter text-[#003366] leading-none">{indent.quantity}</p>
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest pt-1">Shortage Qty</p>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>

                <DialogFooter className="mt-10 pt-8 border-t border-slate-100">
                    <Button onClick={() => setIsIndentModalOpen(false)} className="h-14 w-full rounded-[1.5rem] bg-[#003366] text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-xl shadow-slate-900/10">
                        CLOSE CONSOLIDATION CONTEXT
                    </Button>
                </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>

      <footer className="h-[72px] bg-slate-900 border-t border-slate-800 flex items-center justify-between px-10 fixed bottom-0 w-full z-50">
          <div className="flex items-center gap-10">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tax Amount (18%)</span>
                <span className="text-[18px] font-black text-indigo-400 font-mono leading-none">₹ {mounted ? (lineItems.reduce((acc, i) => acc + i.total, 0) * 0.18).toLocaleString('en-IN') : 0}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Procurement Cost</span>
                <span className="text-[20px] font-black text-white font-mono leading-none">
                  ₹ {mounted ? (lineItems.reduce((acc, i) => acc + i.total, 0) * 1.18 + parseFloat(header.other_charges.toString())).toLocaleString('en-IN') : 0}
                </span>
             </div>
          </div>
          <Button onClick={() => handleSave()} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white h-12 px-12 rounded-lg text-[13px] font-black uppercase tracking-widest flex items-center gap-3">
             <Save size={18} /> {isLoading ? "Synchronizing..." : "Update Protocol"}
          </Button>
      </footer>

      {/* 4. Copy Material Dialog (In4Suite Integration Style) */}
      <Dialog open={!!copyingItem} onOpenChange={(open) => !open && setCopyingItem(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-sm">
            <DialogHeader className="bg-[#003366] p-4">
                <DialogTitle className="text-white text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Copy size={16} /> Add Duplicate Material Protocol
                </DialogTitle>
            </DialogHeader>
            
            <div className="p-6 bg-white space-y-6">
                <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Material Identity</Label>
                    <div className="text-[13px] font-bold text-[#003366] uppercase">{copyingItem?.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-sm border border-slate-100">
                    <div>
                        <Label className="text-[10px] font-black uppercase text-slate-400">Total Order Qty</Label>
                        <div className="text-[14px] font-black text-slate-700">{copyingItem?.qty}</div>
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase text-emerald-600">GRN Quantity (Recd)</Label>
                        <div className="text-[14px] font-black text-emerald-700">{copyingItem?.received_qty}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-indigo-600">Available to Copy</Label>
                        <Badge variant="outline" className="h-5 text-[10px] font-black bg-indigo-50 text-indigo-700 border-indigo-200">
                            {copyingItem ? copyingItem.qty - copyingItem.received_qty : 0} UNITS
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="copyQty" className="text-[11px] font-black uppercase text-slate-700">Quantity to Copy *</Label>
                        <Input 
                            id="copyQty"
                            type="number"
                            min={1}
                            max={copyingItem ? copyingItem.qty - copyingItem.received_qty : 0}
                            value={copyQty}
                            onChange={(e) => setCopyQty(parseFloat(e.target.value) || 0)}
                            className="!h-10 border-slate-300 focus:ring-0 focus:border-[#003366] text-[14px] font-black text-[#003366]"
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setCopyingItem(null)} className="h-9 text-[11px] font-black uppercase text-slate-500 hover:bg-slate-100 px-6">
                    Cancel
                </Button>
                <Button 
                    onClick={handleCopyProceed}
                    className="h-9 text-[11px] font-black uppercase bg-[#F28C28] hover:bg-[#E07B17] text-white px-8 rounded-sm shadow-md active:scale-95 transition-all"
                >
                    Proceed Redistribution
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}


