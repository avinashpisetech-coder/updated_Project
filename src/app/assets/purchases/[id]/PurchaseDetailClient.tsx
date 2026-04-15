"use client";

import React from "react";
import { 
  ArrowLeft, 
  HelpCircle,
  Printer,
  Edit2,
  Trash2,
  Package,
  History,
  Info,
  Clock,
  User,
  CheckCircle2,
  Plus,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Smartphone, Locate } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigation } from "@/components/providers/NavigationProvider";


interface GRNItem {
    id: string;
    purchase_item_id: string;
    received_quantity: number;
    purchase_item?: {
        asset_name: string;
        model_number: string;
    };
}

interface GRN {
    id: string;
    grn_number: string;
    received_date: string;
    challan_number: string;
    inward_number: string;
    status: string;
    notes?: string;
    items?: GRNItem[];
}

interface Props {
  purchase: any;
  items: any[];
  grns: GRN[];
  invoices: any[];
  activities: any[];
  company?: any;
}

export function PurchaseDetailClient({ purchase, items, grns, invoices, activities, company }: Props) {
  const { isSidebarOpen } = useNavigation();
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [reconciledItems, setReconciledItems] = React.useState<any[]>(items || []);

  React.useEffect(() => {
    const fetchConsolidatedHistory = async () => {
        const { data: history } = await supabase
            .from('asset_grn_items')
            .select(`
                received_quantity,
                asset_purchase_items!inner (
                    asset_name,
                    model_number
                )
            `)
            .eq('asset_purchase_items.purchase_id', purchase.id);

        const historyMap: Record<string, number> = {};
        history?.forEach((h: any) => {
            const key = `${h.asset_purchase_items.asset_name}_${h.asset_purchase_items.model_number || 'N/A'}`.toLowerCase();
            historyMap[key] = (historyMap[key] || 0) + h.received_quantity;
        });

        const newReconciled = items.map(item => {
            const key = `${item.asset_name}_${item.model_number || 'N/A'}`.toLowerCase();
            const totalAllocatable = historyMap[key] || 0;
            const consumed = Math.min(item.quantity, totalAllocatable);
            historyMap[key] -= consumed;
            return {
                ...item,
                reconciled_received: consumed,
                reconciled_balance: item.quantity - consumed
            };
        });
        setReconciledItems(newReconciled);
    };
    if (purchase.id && items.length > 0) fetchConsolidatedHistory();
  }, [purchase.id, items, supabase]);

  React.useEffect(() => { setMounted(true); }, []);

  const displayPoNumber = React.useMemo(() => {
    let base = purchase.po_number;
    if (purchase.amendment_number > 0) {
        return `${base}/AMD/${purchase.amendment_number}`;
    }
    return base;
  }, [purchase.po_number, purchase.amendment_number]);

  const handlePrint = () => { 
    window.open(`/assets/purchases/${purchase.id}/print`, '_blank');
  };

  const handleUpdatePoStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('asset_purchases').update({ status: newStatus }).eq('id', purchase.id);
      if (error) throw error;
      toast.success(`Protocol state updated to ${newStatus.toUpperCase()}`);
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  };

  const handleUpdateGrnStatus = async (grnId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('asset_grns').update({ status: newStatus }).eq('id', grnId);
      if (error) throw error;
      toast.success(`GRN registry updated to ${newStatus.toUpperCase()}`);
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setIsLoading(false); }
  };

  if (!mounted) return null;

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full bg-[#fcfdfe] text-[#1e293b] text-[12px]">

      {/* 1. Tactical Header */}
      <header className="h-[64px] bg-slate-900 border-b border-primary/20 flex items-center justify-between px-10 shrink-0 sticky top-0 z-50 overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <Button variant="ghost" size="icon" onClick={() => router.push("/assets/purchases")} className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-primary transition-all">
               <ArrowLeft size={18} />
            </Button>
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-1">PROTO_VIEW</h1>
                <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.4em] leading-none">Purchase Order Authorization Registry</p>
            </div>
         </div>
         
         <div className="flex items-center gap-6 relative z-10">
            <div className="flex flex-col items-end border-r border-white/10 pr-6">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">IDENTITY_STAMP</span>
                <span className="text-[14px] font-black text-white uppercase tracking-tight leading-none">{purchase.po_number || 'N/A'}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <FileText size={20} />
            </div>
         </div>

         {/* Energy Effect */}
         <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      </header>

      <div className="p-5 space-y-3 flex-1 w-full">
         
         {/* 2. Fiscal & Supplier Identity Lattice */}
         <div className="bg-white border border-slate-200 rounded-[1.2rem] p-4 shadow-sm w-full">
            <div className="grid grid-cols-4 gap-8">
               
               <div className="space-y-4">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">CERTIFYING_ENTITY</span>
                     <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{company?.name || "Corporate Registry"}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">PROTOCOL_STATUS</span>
                     <div className="w-fit">
                        <Select value={purchase.status} onValueChange={handleUpdatePoStatus} disabled={isLoading}>
                            <SelectTrigger className="h-7 !text-[9px] bg-slate-50 border-slate-100 rounded-full shadow-none text-primary font-black uppercase px-4 group hover:border-primary/50 transition-all">
                            <SelectValue placeholder="STATUS" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                                <SelectItem value="draft" className="text-[9px] font-black">DRAFT_PROTOCOL</SelectItem>
                                <SelectItem value="submitted" className="text-[9px] font-black">SUBMITTED</SelectItem>
                                <SelectItem value="approved" className="text-[9px] font-black text-emerald-600">APPROVED_AND_ACTIVE</SelectItem>
                                <SelectItem value="received" className="text-[9px] font-black text-blue-600">MATERIAL_RECEIVED</SelectItem>
                                <SelectItem value="cancelled" className="text-[9px] font-black text-red-600">CANCELLED</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">PROJECT_LATITUDE</span>
                     <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{purchase.project?.name || "Global Deployment"}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">AMENDMENT_TRACK</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase italic">v.{purchase.amendment_number || 0}_REV_ALPHA</span>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">CORE_SUPPLIER_NODE</span>
                     <span className="text-[12px] font-black text-primary uppercase tracking-tighter decoration-primary/20 hover:decoration-primary">{purchase.supplier?.name}</span>
                     <span className="text-[8px] font-bold text-slate-400 mt-0.5">REF: {purchase.reference || 'SYSTEM_INTERNAL'}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">DATE_OF_ISSUANCE</span>
                     <span className="text-[10px] font-bold text-slate-600 uppercase italic tracking-widest">{format(new Date(purchase.purchase_date), "dd MMM yyyy")}</span>
                  </div>
               </div>

               <div className="flex flex-col justify-center items-end border-l border-slate-100 pl-8 bg-slate-50/20 rounded-r-[1.2rem] p-4">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL_PROTOCOL_AGGREGATE</span>
                   <span className="text-3xl font-black text-slate-900 tracking-tighter italic whitespace-nowrap">₹ {purchase.grand_total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                   <div className="flex items-center gap-1.5 mt-2 opacity-30 group">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span className="text-[7px] font-black uppercase tracking-widest">Authorized_Signatory_Required</span>
                   </div>
               </div>

            </div>
         </div>

         {/* 3. Operational Controller HUD */}
         <div className="flex items-center justify-between mb-2 print:hidden">
            <div className="flex gap-4">
                <Button onClick={handlePrint} variant="outline" className="h-9 px-5 rounded-xl border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-slate-50 shadow-sm transition-all"><Printer size={14} /> Print Registry</Button>
                <Button onClick={() => router.push(`/assets/purchases/${purchase.id}/edit`)} variant="outline" className="h-9 px-5 rounded-xl border-slate-200 bg-white text-slate-600 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-slate-50 shadow-sm transition-all"><Edit2 size={14} /> Edit Protocol</Button>
            </div>
         </div>



         <style jsx global>{`
           @media print {
             body { background: white !important; }
             .print\\:hidden { display: none !important; }
             .p-6 { padding: 0 !important; }
             .shadow-sm { shadow: none !important; border: 1px solid #eee !important; }
             header, footer, nav, aside { display: none !important; }
             .max-w-\\[1400px\\] { max-width: 100% !important; margin: 0 !important; }
             table { width: 100% !important; border-collapse: collapse !important; }
             th, td { border: 1px solid #ddd !important; }
           }
         `}</style>

         {/* 4. Tactical Data Tabs */}
         <Tabs defaultValue="rates" className="w-full">
            <TabsList className="bg-transparent border-b border-primary/10 w-full justify-start h-auto p-0 rounded-none gap-10 print:hidden overflow-x-auto no-scrollbar">
               <TabsTrigger value="rates" className="data-[state=active]:text-primary data-[state=active]:border-b-[3px] data-[state=active]:border-primary border-none rounded-none text-[11px] font-black px-1 pb-4 uppercase text-slate-400 tracking-widest transition-all">Manifest_Matrix</TabsTrigger>
               <TabsTrigger value="grn" className="data-[state=active]:text-primary data-[state=active]:border-b-[3px] data-[state=active]:border-primary border-none rounded-none text-[11px] font-black px-1 pb-4 uppercase text-slate-400 tracking-widest transition-all">Material_Inbound_Chain</TabsTrigger>
               <TabsTrigger value="audit" className="data-[state=active]:text-primary data-[state=active]:border-b-[3px] data-[state=active]:border-primary border-none rounded-none text-[11px] font-black px-1 pb-4 uppercase text-slate-400 tracking-widest transition-all">Audit_Sync_Chain</TabsTrigger>
            </TabsList>

            <TabsContent value="rates" className="pt-2 space-y-4">
               <div className="space-y-2">
                  <h3 className="text-[13px] font-bold text-slate-700 print:block">Material and Rate and Taxes Details</h3>
                  <div className="bg-white border border-[#A3B8CC] rounded-sm overflow-hidden w-full shadow-sm">
                     <Table className="w-full border-collapse">
                        <TableHeader className="bg-slate-50 border-b border-[#A3B8CC]">
                           <TableRow className="h-10 hover:bg-transparent border-none">
                              <TableHead className="w-12 text-center text-[11px] font-bold text-slate-500 uppercase border-r border-[#A3B8CC]">Sr No</TableHead>
                              <TableHead className="pl-4 text-[11px] font-bold text-slate-500 uppercase border-r border-[#A3B8CC]">Material</TableHead>
                              <TableHead className="text-[11px] font-bold text-slate-500 uppercase border-r border-[#A3B8CC] min-w-[200px]">Specification / Remarks</TableHead>
                              <TableHead className="text-[11px] font-bold text-slate-500 uppercase text-center border-r border-[#A3B8CC] w-20">Ordered</TableHead>
                              <TableHead className="text-[11px] font-bold text-emerald-600 uppercase text-center border-r border-[#A3B8CC] w-20">Received</TableHead>
                              <TableHead className="text-[11px] font-bold text-amber-600 uppercase text-center border-r border-[#A3B8CC] w-20">Balanced</TableHead>
                              <TableHead className="text-[11px] font-bold text-slate-500 uppercase text-center border-r border-[#A3B8CC] w-24">Rate</TableHead>
                              <TableHead className="text-[11px] font-bold text-slate-700 uppercase text-center w-28">All incl. cost</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {reconciledItems?.map((item, idx) => {
                              const balanced = item.reconciled_balance ?? (item.quantity - (item.received_quantity || 0));
                              const received = item.reconciled_received ?? (item.received_quantity || 0);
                              return (
                               <TableRow 
                                 key={item.id} 
                                 className={cn(
                                   "h-11 border-b border-slate-200 hover:bg-slate-50 text-[11px] transition-colors bg-white",
                                   (item.parent_line_info) && "bg-blue-50/60 border-l-2 border-l-blue-400 font-medium"
                                 )}
                               >
                                  <TableCell className="text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</TableCell>
                                  <TableCell className="pl-4 border-r border-slate-200 text-blue-600 font-bold uppercase">{item.asset_name}</TableCell>
                                  <TableCell className="border-r border-slate-200 text-slate-500 italic px-4">{item.remarks || "--"}</TableCell>
                                  <TableCell className="text-center border-r border-slate-200 font-bold text-slate-500">
                                      {item.parent_line_info ? (
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <span className="cursor-help underline underline-offset-2 decoration-dotted decoration-blue-400">
                                                      {item.quantity}
                                                  </span>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="bg-slate-900 text-white border-0 text-[10px] font-black uppercase tracking-widest p-2">
                                                  Source: {item.parent_line_info}
                                              </TooltipContent>
                                          </Tooltip>
                                      ) : (
                                          item.quantity
                                      )}
                                  </TableCell>
                                  <TableCell className="text-center border-r border-slate-200 font-black text-emerald-600">{received}</TableCell>
                                  <TableCell className="text-center border-r border-slate-200 font-black text-amber-600">{balanced}</TableCell>
                                  <TableCell className="text-right border-r border-slate-200 pr-4 font-bold text-slate-400 font-mono italic">{item.unit_price?.toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right pr-4 font-black text-[#003366] font-mono">{(item.total_price * 1.18).toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                               </TableRow>
                              );
                           })}
                        </TableBody>
                     </Table>
                  </div>
               </div>

               {/* Taxes Summary Matrix */}
               <div className="space-y-2">
                  <h3 className="text-[13px] font-bold text-slate-700">Taxes And Charges Summary</h3>
                  <div className="bg-white border border-[#A3B8CC] rounded-sm overflow-hidden w-full shadow-sm">
                     <Table className="w-full border-collapse text-[11px]">
                        <TableHeader className="bg-[#DCE6F1]">
                           <TableRow className="h-9">
                              <TableHead className="pl-4 font-bold text-[#003366] uppercase border-r border-[#A3B8CC]">Tax / Charge Type</TableHead>
                              <TableHead className="font-bold text-[#003366] uppercase text-right pr-6 w-64">Amount</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           <TableRow className="h-9 border-b border-slate-200">
                              <TableCell className="pl-4 border-r border-slate-200 font-bold text-slate-500">Total Base Cost (Material Value)</TableCell>
                              <TableCell className="text-right pr-6 font-bold">{purchase.total_raw_amount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                           </TableRow>
                           <TableRow className="h-9 border-b border-slate-200">
                              <TableCell className="pl-4 border-r border-slate-200 font-bold text-slate-500">Service Tax / GST Aggregate (18%)</TableCell>
                              <TableCell className="text-right pr-6 font-bold">{(purchase.grand_total - purchase.total_raw_amount - (purchase.other_charges || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                           </TableRow>
                           <TableRow className="h-10 bg-slate-50/50 text-[12px] font-black text-[#003366]">
                              <TableCell className="pl-4 border-r border-slate-200 uppercase">Grand Total Protocol Liability (All Incl.)</TableCell>
                              <TableCell className="text-right pr-6 underline underline-offset-4 decoration-slate-300 font-sans tracking-tight">INR {purchase.grand_total?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</TableCell>
                           </TableRow>
                        </TableBody>
                     </Table>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="audit" className="pt-4">
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white"><History size={16} /></div>
                        Protocol Lifecycle Chronology
                     </h3>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden w-full shadow-sm">
                      <Table className="w-full border-collapse">
                          <TableHeader className="bg-slate-50/50">
                              <TableRow className="h-12 border-b border-slate-200">
                                  <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400 tracking-widest">Action_Identity</TableHead>
                                  <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest text-center">Auth_Custodian</TableHead>
                                  <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest text-center">Reference_Timestamp</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {activities?.filter(log => log.scope === 'PO').map(log => {
                                const statusName = log.metadata?.new_status || (log.action_type === 'status_change' ? "UPDATED" : log.action_type);
                                return (
                                  <TableRow key={log.id} className="h-16 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                                      <TableCell className="pl-8">
                                          <div className="flex items-center gap-4">
                                              <div className={cn(
                                                  "h-9 w-9 rounded-xl flex items-center justify-center border",
                                                  statusName.includes('approved') ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                              )}>
                                                  <CheckCircle2 size={16} />
                                              </div>
                                              <div className="flex flex-col">
                                                  <span className="font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{statusName.replace(/_/g, ' ')}</span>
                                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">v.{purchase.amendment_number || 0}_LOG_NODE</span>
                                              </div>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-center font-black text-slate-600 uppercase italic">
                                          {log.profile?.full_name || "System Automated"}
                                      </TableCell>
                                      <TableCell className="text-center">
                                          <div className="flex flex-col items-center">
                                              <span className="font-black text-slate-900 uppercase tracking-tight">{format(new Date(log.created_at), "dd MMM yyyy")}</span>
                                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{format(new Date(log.created_at), "hh:mm a")}</span>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                      </Table>
                  </div>
               </div>
            </TabsContent>
         </Tabs>
      </div>

      <div className="h-8" />
    </div>
    </TooltipProvider>
  );
}

