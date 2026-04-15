"use client";

import React from "react";
import { 
  ArrowLeft, 
  HelpCircle,
  Truck,
  Boxes,
  ScrollText,
  Save,
  Clock,
  Package,
  Scan,
  Database,
  Link2,
  ChevronDown,
  Info,
  ClipboardCheck,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
    Dialog, 
    DialogContent, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";

interface Indent {
    id: string;
    indent_number: string;
    quantity: number;
    project_id?: string;
    store_id: string;
    department_id: string;
    sub_type_id: string;
}

interface PurchaseItem {
    id: string;
    asset_name: string;
    model_number: string;
    quantity: number;
    received_quantity: number;
    sub_type_id: string;
    brand: string;
    po_item_indents: { indent: Indent; allocated_quantity: number }[];
}

interface Props {
  purchase: any;
  items: PurchaseItem[];
  allSubTypes?: any[];
}

export function NewGrnClient({ purchase, items, allSubTypes = [] }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  // GRN Initial State
  const [grnForm, setGrnForm] = React.useState({
    grn_number: "", 
    received_date: format(new Date(), "yyyy-MM-dd"),
    challan_number: "",
    challan_date: format(new Date(), "yyyy-MM-dd"),
    inward_number: "",
    notes: "",
    received_items: items?.map(item => {
        // Predictive Sub-Type Resolution
        const fallbackSubType = allSubTypes.find(st => st.type_id === (item as any).asset_type_id)?.id || null;
        
        return {
            purchase_item_id: item.id,
            ordered_quantity: item.quantity,
            already_received: item.received_quantity,
            now_receiving: 0, 
            asset_name: item.asset_name,
            is_master_carton: false,
            asset_prefix: "",
            sub_type_id: item.sub_type_id || item.sub_type?.id || fallbackSubType,
            brand: item.brand || item.catalog?.brand || "",
            model: item.model_number || item.model || "",
            indents: item.po_item_indents?.map(pi => ({ ...pi.indent, allocated_quantity: pi.allocated_quantity })) || []
        };
    }) || []
  });

  React.useEffect(() => {
    const fetchNextGrn = async () => {
        const { data: grnSeq } = await supabase.from('asset_grns').select('grn_number').order('grn_number', { ascending: false }).limit(1);
        let nextNum = 1;
        if (grnSeq && grnSeq.length > 0) {
            const lastGrn = grnSeq[0].grn_number;
            const match = lastGrn.match(/\/(\d{4})$/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }
        const fy = purchase.po_number?.split('/')[1]?.replace('FY', '') || format(new Date(), "yy-MM");
        setGrnForm(prev => ({ ...prev, grn_number: `GRN/FY${fy}/${String(nextNum).padStart(4, '0')}` }));
    };
    if (purchase.id) fetchNextGrn();
  }, [purchase.id, purchase.po_number, supabase]);

  const updateItem = (index: number, key: string, value: any) => {
    const updated = [...grnForm.received_items];
    (updated[index] as any)[key] = value;
    setGrnForm({ ...grnForm, received_items: updated });
  };

  const handleNowReceivingChange = (index: number, value: string) => {
    const newVal = parseInt(value) || 0;
    const item = grnForm.received_items[index];
    if (newVal + item.already_received > item.ordered_quantity) {
        toast.error(`Over-receipt error: Limit ${item.ordered_quantity}`);
        return;
    }
    updateItem(index, 'now_receiving', newVal);
  };

  const handlePostGrn = async (status: string) => {
    if (!grnForm.grn_number || !grnForm.challan_number) {
        toast.error("Identity Audit Failure: Missing GRN/Challan references."); return;
    }
    
    setIsLoading(true);
    try {
      const { data: grnId, error } = await supabase.rpc('receive_grn_and_hydrate_stock', {
          p_purchase_id: purchase.id,
          p_grn_number: grnForm.grn_number,
          p_received_date: grnForm.received_date,
          p_challan_number: grnForm.challan_number,
          p_challan_date: grnForm.challan_date,
          p_inward_number: grnForm.inward_number,
          p_status: status,
          p_notes: grnForm.notes,
          p_items: grnForm.received_items
            .filter(i => i.now_receiving > 0)
            .map(i => ({
                purchase_item_id: i.purchase_item_id,
                quantity: i.now_receiving,
                sub_type_id: i.sub_type_id || null,
                brand: i.brand,
                model: i.model,
                is_master_carton: i.is_master_carton,
                asset_prefix: i.asset_prefix,
                linked_indents: i.indents
            }))
      });

      if (error) throw error;

      toast.success(`LOGISTICS SYNC COMPLETE: ${grnForm.grn_number} DISPATCHED TO STOCKROOMS.`);
      router.push(`/assets/purchases/grn`);
      router.refresh();
    } catch (e: any) { 
        toast.error(`Protocol Fault: ${e.message}`);
    } finally { 
        setIsLoading(false); 
    }
  };

  if (!mounted) return null;

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#1e293b] text-[12px] font-sans">
      
      <header className="h-[52px] bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-50 shadow-sm">
         <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-slate-400 hover:text-blue-600 transition-all">
               <ArrowLeft size={16} />
            </Button>
            <div className="space-y-0.5">
                <h1 className="text-[13px] font-black text-slate-900 uppercase tracking-tight">Create Goods Receipt Note (GRN)</h1>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Logistics Hub // Inventory Ingestion Protocol</p>
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
         <div className="p-8 space-y-6 flex-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Identity Matrix */}
            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] w-full grid grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-4">
                 <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                    <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest leading-none">Original Purchase Order</span>
                    <span className="text-blue-600 font-black uppercase tracking-tight text-[13px]">{purchase.po_number}</span>
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">GRN Document Identifier <span className="text-red-500">*</span></label>
                    <Input 
                      className="h-10 border-slate-100 bg-slate-50/50 shadow-none text-[11px] font-black rounded-xl uppercase tracking-widest pl-10" 
                      value={grnForm.grn_number}
                      onChange={e => setGrnForm({...grnForm, grn_number: e.target.value})}
                    />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-6 items-end">
                 <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Challan Number <span className="text-red-500">*</span></label>
                    <Input 
                       className="h-10 border-slate-100 bg-slate-50/50 shadow-none text-[11px] font-black rounded-xl uppercase pl-6" 
                       value={grnForm.challan_number}
                       onChange={e => setGrnForm({...grnForm, challan_number: e.target.value})}
                    />
                 </div>
                 <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Challan Date</label>
                    <Input 
                       type="date" 
                       className="h-10 border-slate-100 bg-blue-50/30 border-blue-100/50 shadow-none text-[11px] font-black rounded-xl px-4" 
                       value={grnForm.challan_date}
                       onChange={e => setGrnForm({...grnForm, challan_date: e.target.value})}
                    />
                 </div>
              </div>
           </div>

            {/* Section Divider */}
            <div className="flex items-center gap-6 w-full pt-2">
               <div className="h-px flex-1 bg-slate-100" />
               <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Inventory Ingestion Matrix</h3>
               <div className="h-px flex-1 bg-slate-100" />
            </div>

           {/* Receipt Matrix (Styled like PO Matrix) */}
           <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                  <TableHeader className="bg-slate-50/50">
                      <TableRow className="h-12 border-slate-100 hover:bg-transparent">
                          <TableHead className="w-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 font-sans">#</TableHead>
                          <TableHead className="pl-10 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[400px] font-sans">Catalog Entity & Node Protocol</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28 font-sans">ORD_QTY</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-48 font-sans">NOW_RECEIVING</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8 w-32 font-sans">REMAINING</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {grnForm.received_items?.length > 0 ? grnForm.received_items.map((item, idx) => {
                          const balance = item.ordered_quantity - item.already_received;
                          const remainingAfterNow = balance - item.now_receiving;
                          const hasIndents = item.indents?.length > 0;

                          return (
                              <TableRow key={item.purchase_item_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all font-sans group">
                                  <TableCell className="text-center font-black text-slate-200/40 pl-8">{String(idx + 1).padStart(2, '0')}</TableCell>
                                  <TableCell className="pl-10 py-6">
                                      <div className="flex flex-col gap-4">
                                          <div className="flex items-center justify-between">
                                              <div className="flex flex-col">
                                                  <span className="font-black text-slate-900 uppercase tracking-tight text-[13px] leading-none mb-1">{item.asset_name || '—'}</span>
                                                  <div className="flex items-center gap-3">
                                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.brand || '—'} // {item.model || '—'}</span>
                                                      {hasIndents && (
                                                          <Badge variant="outline" className="h-5 rounded-full bg-amber-500/5 text-amber-600 border-amber-200 text-[8px] font-black uppercase tracking-widest gap-1.5 px-3">
                                                              <Link2 size={10} /> {item.indents.length} Indents Tagged
                                                          </Badge>
                                                      )}
                                                  </div>
                                              </div>

                                              <div className="flex items-center gap-4">
                                                  <div className="flex items-center space-x-2">
                                                      <Checkbox 
                                                          id={`master-${idx}`} 
                                                          checked={item.is_master_carton} 
                                                          onCheckedChange={v => updateItem(idx, 'is_master_carton', !!v)}
                                                          className="h-4 w-4 rounded-md border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                      />
                                                      <Label htmlFor={`master-${idx}`} className="text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer">
                                                          Master Carton Mode
                                                      </Label>
                                                  </div>
                                              </div>
                                          </div>

                                          {item.is_master_carton && (
                                              <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300 bg-blue-50/30 p-3 rounded-2xl border border-blue-100/50 max-w-sm">
                                                  <Scan size={14} className="text-blue-600/50 shrink-0" />
                                                  <Input 
                                                      placeholder="ASSET PREFIX (E.G. IT-L-)" 
                                                      className="h-8 border-none bg-white shadow-none text-[10px] font-black rounded-lg uppercase tracking-widest"
                                                      value={item.asset_prefix}
                                                      onChange={e => updateItem(idx, 'asset_prefix', e.target.value)}
                                                  />
                                              </div>
                                          )}
                                      </div>
                                  </TableCell>
                                  
                                  <TableCell className="text-center text-slate-300 font-black tracking-tight text-[13px] border-l border-slate-50">
                                      {item.ordered_quantity}
                                  </TableCell>

                                  <TableCell className="text-center px-8 border-l border-slate-50">
                                      <div className="flex flex-col items-center gap-1.5">
                                          <Input 
                                            type="number" 
                                            min={0} 
                                            max={balance} 
                                            className="h-10 w-24 text-center font-black text-blue-600 border-slate-100 shadow-none focus:border-blue-600/50 rounded-xl bg-slate-50/50 text-[13px]" 
                                            value={item.now_receiving} 
                                            onChange={e => handleNowReceivingChange(idx, e.target.value)} 
                                          />
                                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Received Units</span>
                                      </div>
                                  </TableCell>
                                  
                                  <TableCell className="text-right pr-8 text-slate-900 font-black tracking-tight text-[13px] italic border-l border-slate-50">
                                      {remainingAfterNow}
                                  </TableCell>
                              </TableRow>
                          );
                      }) : (
                        <TableRow className="h-48 border-none hover:bg-transparent">
                            <TableCell colSpan={5} className="text-center">
                                <div className="flex flex-col items-center gap-3 opacity-10">
                                    <Boxes size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">No_Material_Manifest_Detected_For_This_Protocol</p>
                                </div>
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
           </div>
        </div>
      </div>

      <footer
          className="fixed bottom-0 right-0 h-14 bg-white border-t border-slate-100 z-[110] shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex items-center px-10 gap-10 transition-all duration-300"
          style={{ left: "var(--sidebar-width, 256px)" }}
      >
          <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-0.5">PROTO_REF</span>
              <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-blue-600 tracking-tighter uppercase leading-none">{grnForm.grn_number}</span>
                  <button onClick={() => router.back()} className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest border-l border-slate-100 pl-2.5">CANCEL</button>
              </div>
          </div>

          <div className="flex items-center gap-8 border-l border-slate-100 pl-8 h-8">
              <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Origin Protocol</span>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{purchase.po_number}</span>
              </div>
          </div>

          <div className="ml-auto flex items-center gap-8">
              <Dialog>
                  <DialogTrigger asChild>
                      <Button variant="ghost" className="h-8 px-3 rounded-lg gap-2 text-slate-400 hover:text-blue-600 transition-all group">
                          <History size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Audit Ledger</span>
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-10 font-sans">
                      <DialogHeader className="mb-8">
                          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Operational Ledger</DialogTitle>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Transaction-level synchronization history</p>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                          <div className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex items-center gap-4 relative overflow-hidden group">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                              <div className="h-10 w-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                  <ClipboardCheck size={18} />
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1">
                                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">GRN_DRAFT_INITIALIZED</p>
                                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Just Now</span>
                                  </div>
                                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">
                                      System generated draft protocol for inward receipt of PO: {purchase.po_number}.
                                  </p>
                              </div>
                          </div>
                      </div>
                      <DialogFooter className="mt-8 pt-8 border-t border-slate-100">
                          <Button variant="ghost" className="h-12 w-full rounded-2xl text-[10px] font-black uppercase tracking-widest">Close Ledger Context</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

              <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-200 uppercase tracking-[0.5em] mb-1">EXECUTION STATUS</span>
                  <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Awaiting Sync Loop</span>
                       <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                  </div>
              </div>

              <Button 
                  onClick={() => handlePostGrn('submitted')} 
                  disabled={isLoading} 
                  className="h-10 px-8 bg-[#003366] hover:bg-[#002244] text-white font-black text-[10px] rounded-xl shadow-lg shadow-[#003366]/10 uppercase tracking-[0.1em] transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
              >
                  {isLoading ? 'EXECUTING_SYNC...' : 'Authorize Receipt Protocol'}
              </Button>
          </div>
      </footer>
    </div>
  </TooltipProvider>
);
}
