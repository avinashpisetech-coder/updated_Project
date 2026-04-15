"use client";

import React from "react";
import { 
  ArrowLeft, 
  Truck,
  Boxes,
  Save,
  Clock,
  Package,
  AlertCircle,
  Trash2,
  FileText
} from "lucide-react";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  grn: any;
  purchase: any;
  activities: any[];
}

export function EditGrnClient({ grn, purchase, activities }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // GRN Edit State
  const [form, setForm] = React.useState({
    grn_number: grn.grn_number || "",
    received_date: grn.received_date,
    challan_number: grn.challan_number || "",
    challan_date: grn.challan_date || "",
    inward_number: grn.inward_number || "",
    notes: grn.notes || "",
    status: grn.status || 'received',
    items: grn.items.map((i: any) => ({
        id: i.id,
        purchase_item_id: i.purchase_item_id,
        asset_name: i.purchase_item?.asset_name,
        model_number: i.purchase_item?.model_number,
        ordered_quantity: i.purchase_item?.quantity,
        received_quantity: i.received_quantity
    }))
  });

  const handleQtyChange = (idx: number, val: string) => {
    const newItems = [...form.items];
    newItems[idx].received_quantity = parseInt(val) || 0;
    setForm({ ...form, items: newItems });
  };

  const handleUpdateStatus = (newStatus: string) => {
    setForm({ ...form, status: newStatus });
  };

  const handleSave = async () => {
    if (!form.grn_number || !form.challan_number || !form.inward_number) {
        toast.error("All logistics identifiers are mandatory.");
        return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('asset_grns').update({
        received_date: form.received_date,
        notes: form.notes,
        challan_number: form.challan_number,
        challan_date: form.challan_date,
        inward_number: form.inward_number,
        status: form.status
      }).eq('id', grn.id);

      if (error) throw error;

      // Update individual items
      for (const item of form.items) {
          await supabase.from('asset_grn_items').update({
              received_quantity: item.received_quantity
          }).eq('id', item.id);
      }

      toast.success("Goods Receipt Updated and Audit Trail Committed.");
      router.push(`/assets/purchases/${purchase.id}`);
      router.refresh();
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-slate-800">
      {/* 1. Instruction Bar */}
      <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-slate-200 sticky top-0 z-50">
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/assets/purchases/${purchase.id}`)} className="h-8 w-8">
               <ArrowLeft size={16} className="text-slate-400" />
            </Button>
            <div className="flex flex-col">
                <h1 className="text-[14px] font-black uppercase tracking-tight text-slate-800 leading-none mb-1">Audit Goods Receipt (GRN)</h1>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">PO Ref: {purchase.po_number} | Protocol: {grn.grn_number}</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update State:</span>
                <Select value={form.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger className={cn(
                        "h-7 w-40 text-[10px] font-black uppercase tracking-tight border-none shadow-none",
                        form.status === 'approved' ? "bg-emerald-500 text-white" : 
                        form.status === 'received' ? "bg-blue-600 text-white" : 
                        "bg-amber-400 text-white"
                    )}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending" className="text-[10px] font-bold uppercase">Pending Audit</SelectItem>
                        <SelectItem value="received" className="text-[10px] font-bold uppercase">Received (On Dock)</SelectItem>
                        <SelectItem value="approved" className="text-[10px] font-bold uppercase">Approved (Inventory Post)</SelectItem>
                        <SelectItem value="cancelled" className="text-[10px] font-bold uppercase text-red-600">Reversed / Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button 
                onClick={handleSave}
                disabled={isLoading}
                className="h-9 px-8 rounded bg-slate-800 hover:bg-black text-white font-black text-[11px] uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
                {isLoading ? "AUDITING..." : "COMMIT AUDIT"}
            </Button>
         </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar pb-32">
         
         {/* 2. Logistic Master Matrix */}
         <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden group">
            <div className="grid grid-cols-4 gap-8 relative z-10">
               <div className="space-y-4">
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">GRN Ref ID</Label>
                      <Input 
                        readOnly
                        value={form.grn_number} 
                        onChange={e => setForm({...form, grn_number: e.target.value})} 
                        className="h-8 px-3 font-black uppercase text-primary border-none rounded shadow-sm bg-slate-50/80 cursor-not-allowed text-[10px]" 
                      />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Inward Number</Label>
                      <Input value={form.inward_number} onChange={e => setForm({...form, inward_number: e.target.value})} className="h-8 px-3 font-black uppercase border-slate-200 focus:border-orange-600 rounded text-[10px]" />
                   </div>
               </div>

               <div className="space-y-4">
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Challan Number</Label>
                      <Input value={form.challan_number} onChange={e => setForm({...form, challan_number: e.target.value})} className="h-8 px-3 font-black uppercase border-slate-200 focus:border-orange-600 rounded text-[10px]" />
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Challan Date</Label>
                      <Input type="date" value={form.challan_date} onChange={e => setForm({...form, challan_date: e.target.value})} className="h-8 px-3 font-bold border-slate-200 focus:border-orange-600 rounded text-[10px]" />
                   </div>
               </div>

               <div className="space-y-4">
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Receipt Date</Label>
                      <Input type="date" value={form.received_date} onChange={e => setForm({...form, received_date: e.target.value})} className="h-8 px-3 font-bold border-slate-200 focus:border-orange-600 rounded text-[10px]" />
                   </div>
               </div>

               <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Inspection Notes</Label>
                  <textarea 
                    className="w-full h-[76px] rounded border border-slate-200 p-2 text-[11px] font-medium resize-none focus:outline-none focus:ring-1 focus:ring-orange-600/10 transition-all outline-none bg-slate-50/10"
                    placeholder="Inspection results..."
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                  />
               </div>
            </div>
         </div>

         {/* 3. Inward Line Matrix */}
         <div className="space-y-3">
             <div className="flex items-center gap-2 px-1">
                <Truck className="text-orange-600" size={16} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800 leading-none">Reconciliation Table</h3>
             </div>

             <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="h-8 hover:bg-slate-50 border-none">
                            <TableHead className="w-12 text-center text-[9px] font-black text-slate-500 uppercase tracking-tight">#</TableHead>
                            <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-tight pl-4">Material Specification</TableHead>
                            <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-tight w-32 text-center border-l border-slate-100">Ordered</TableHead>
                            <TableHead className="text-[9px] font-black text-white uppercase tracking-tight w-32 text-center bg-orange-600">Corrected Receipt</TableHead>
                            <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-tight w-20 text-center border-l border-slate-100">UOM</TableHead>
                            <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-tight w-32 border-l border-slate-100 pl-4">Audit State</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {form.items.map((item: any, idx: number) => (
                            <TableRow key={item.id} className="h-10 border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-[11px]">
                                <TableCell className="text-center font-bold text-slate-300">{idx + 1}</TableCell>
                                <TableCell className="pl-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 uppercase leading-none mb-0.5">{item.asset_name}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.model_number || "SPEC_NA"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-bold border-l border-slate-50">{item.ordered_quantity}</TableCell>
                                <TableCell className="bg-orange-50/50">
                                    <input 
                                        type="number" 
                                        className="h-10 w-full bg-transparent border-none text-center font-black text-[13px] text-orange-600 focus:ring-0 outline-none"
                                        value={item.received_quantity}
                                        onChange={e => handleQtyChange(idx, e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-center font-bold text-slate-400 uppercase border-l border-slate-50">MT</TableCell>
                                <TableCell className="pl-4 border-l border-slate-50">
                                    {item.received_quantity >= item.ordered_quantity ? (
                                        <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0 border-none">OK</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[8px] font-black uppercase border-orange-200 text-orange-600 bg-orange-50 px-2 py-0">DIFF</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
         </div>

         {/* 4. Compact Warning */}
         <div className="flex items-center gap-4 p-4 bg-orange-600 rounded border-none shadow-lg">
            <AlertCircle className="text-white shrink-0" size={18} />
            <p className="text-[11px] text-white/95 font-bold leading-tight">
                CORRECTED RECEIPT QUANTITIES WILL AUTOMATICALLY RECONCILE SYSTEM INVENTORY BASES.
            </p>
         </div>
      </div>
      
      <div className="h-24" />
    </div>
  );
}
