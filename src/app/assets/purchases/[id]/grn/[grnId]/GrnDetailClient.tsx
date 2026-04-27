"use client";

import React from "react";
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Truck,
  Info,
  ChevronRight,
  History,
  AlertCircle,
  Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  grn: any;
  items: any[];
  activities: any[];
  profile: any;
}

export function GrnDetailClient({ grn, items, activities, profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = React.useState(false);

  // Filter activities relevant to THIS GRN
  const grnActivities = activities.filter(log => 
    log.grn_id === grn.id || 
    (log.description && log.description.toUpperCase().includes(grn.grn_number.toUpperCase())) ||
    (log.action_type && log.action_type.startsWith('GRN'))
  );

  const updateGrnStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      if (newStatus === 'approved') {
          // Trigger the hydration logic
          const { error: hydrateError } = await supabase.rpc('approve_grn_and_register_assets', {
              p_grn_id: grn.id
          });
          if (hydrateError) throw hydrateError;
          toast.success(`INVENTORY HYDRATED: Assets from ${grn.grn_number} have been registered.`);
      } else {
          // Standard status update (e.g. Cancelled)
          const { error: grnError } = await supabase
            .from('asset_grns')
            .update({ status: newStatus, updated_at: new Date() })
            .eq('id', grn.id);
          if (grnError) throw grnError;
          toast.success(`GRN STATUS SYNCHRONIZED: Successfully set to '${newStatus.toUpperCase()}'`);
      }
      router.refresh();
    } catch (e: any) {
      toast.error(`Protocol Fault: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'completed':
      case 'approved': return { label: 'Approved', icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' };
      case 'received': return { label: 'Received', icon: Truck, class: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' };
      case 'pending':
      case 'submitted': return { label: 'Submitted', icon: Clock, class: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' };
      case 'cancelled': return { label: 'Cancelled', icon: AlertCircle, class: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' };
      default: return { label: status, icon: Info, class: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const statusCfg = getStatusConfig(grn.status);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      
      {/* 1. Tactical Command Header */}
      <header className="h-[72px] shrink-0 bg-[#001529] flex items-center justify-between px-8 sticky top-0 z-50 shadow-2xl overflow-hidden">
          <div className="absolute left-0 top-0 w-full h-full opacity-[0.03] pointer-events-none flex items-center justify-center text-[8vw] font-black text-white select-none whitespace-nowrap">
             GRN_PROTOCOL_INGESTION
          </div>

          <div className="flex items-center gap-6 relative z-10">
             <Button
                variant="ghost"
                onClick={() => router.push(`/assets/purchases/grn`)}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-emerald-500 transition-all p-0 flex items-center justify-center"
             >
                <ArrowLeft size={18} />
             </Button>
             <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-1.5">
                   <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                   <h1 className="text-[15px] font-black text-white uppercase tracking-tight">MANAGE INBOUND: {grn.grn_number}</h1>
                   <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-3 h-5 border-none", statusCfg.class)}>
                      <statusCfg.icon size={10} className="mr-1.5" /> {statusCfg.label}
                   </Badge>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <span>Origin PO: {grn.purchase?.po_number}</span>
                   <span className="opacity-30 self-center">•</span>
                   <span>Node: {grn.id.slice(0, 8).toUpperCase()}</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
              {grn.status.toLowerCase() !== 'approved' && grn.status.toLowerCase() !== 'received' && (
                  <Button 
                    onClick={() => updateGrnStatus('approved')}
                    disabled={isLoading}
                    className="h-10 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl shadow-lg shadow-emerald-900/40 uppercase tracking-[0.1em] transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center gap-2.5"
                  >
                     <CheckCircle2 size={16} /> Approve & Ingest Stock
                  </Button>
              )}
              {grn.status.toLowerCase() !== 'cancelled' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateGrnStatus('cancelled')}
                    disabled={isLoading}
                    className="h-10 px-6 bg-white/5 border-white/10 text-white hover:bg-red-600/20 hover:text-red-500 font-black text-[10px] rounded-xl uppercase tracking-[0.1em] transition-all"
                  >
                     Delete Protocol
                  </Button>
              )}
          </div>
      </header>

      {/* 2. Logistical Dashboard */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          <div className="grid grid-cols-12 gap-6 shrink-0">
              {/* Identity Matrix */}
              <Card className="col-span-8 bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-8">
                  <div className="grid grid-cols-3 gap-10">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier_Nexus</label>
                          <div className="flex items-center gap-3 mt-1 text-slate-800">
                             <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-slate-400">
                                <Truck size={18} />
                             </div>
                             <div className="flex flex-col font-black">
                                <span className="text-[13px] uppercase tracking-tight leading-none mb-1">{grn.purchase?.supplier?.name}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">{grn.purchase?.supplier?.code || 'HUB_GEN'}</span>
                             </div>
                          </div>
                      </div>

                      <div className="flex flex-col gap-4 border-l border-slate-100 pl-10">
                          <div className="flex flex-col">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-black italic">Identity Trace</label>
                              <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                      <span className="uppercase text-slate-400 mr-4">Challan Ref:</span>
                                      <span className="text-slate-900 border-b border-slate-100">{grn.challan_number || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                      <span className="uppercase text-slate-400 mr-4">Inward Ref:</span>
                                      <span className="text-slate-900 border-b border-slate-100">{grn.inward_number || 'N/A'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex flex-col gap-4 border-l border-slate-100 pl-10">
                          <div className="flex flex-col font-black">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-black italic">Timekeeping</label>
                              <div className="flex items-center gap-2 text-slate-900 font-black mb-1">
                                 <Calendar size={14} className="text-emerald-500" />
                                 <span className="text-[13px] uppercase tracking-tighter italic font-black">{format(new Date(grn.received_date), "MMM dd, yyyy")}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Fiscal Year: {grn.grn_number.split('/')[1] || 'DEFAULT'}</span>
                          </div>
                      </div>
                  </div>
              </Card>

              {/* Custody Matrix */}
              <Card className="col-span-4 bg-[#001c34] border-none rounded-[2rem] shadow-xl overflow-hidden p-8 text-white relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                     <ShieldCheck size={120} />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between gap-6 font-black uppercase italic">
                      <div>
                          <label className="text-[9px] text-emerald-500 font-black flex items-center gap-2 mb-4 tracking-[0.3em]">Ingestion Auditor</label>
                          <div className="flex items-center gap-4">
                             <div className="h-12 w-12 rounded-[1.2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <User size={22} />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[15px] text-white tracking-tight leading-none mb-1">{grn.received_by_profile?.full_name}</span>
                                <span className="text-[9px] text-emerald-500/60 font-black tracking-widest italic">Verification ID: {grn.received_by?.slice(0, 8).toUpperCase()}</span>
                             </div>
                          </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                           <div className="flex items-center justify-between text-[9px] text-white/40">
                              <span>Ingestion Signal</span>
                              <span className="text-emerald-500">Active</span>
                           </div>
                           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full w-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                           </div>
                      </div>
                  </div>
              </Card>
          </div>

          {/* 3. Tactical Management Tabs */}
          <Tabs defaultValue="manifest" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="bg-transparent border-b border-white/5 w-full justify-start h-auto p-0 rounded-none gap-10 print:hidden px-10 shrink-0">
                  <TabsTrigger value="manifest" className="data-[state=active]:text-emerald-500 data-[state=active]:border-b-[3px] data-[state=active]:border-emerald-500 border-none rounded-none text-[11px] font-black px-1 pb-4 uppercase text-slate-400 tracking-widest transition-all">Material_Manifest</TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:text-emerald-500 data-[state=active]:border-b-[3px] data-[state=active]:border-emerald-500 border-none rounded-none text-[11px] font-black px-1 pb-4 uppercase text-slate-400 tracking-widest transition-all">Audit_Sync_Chain</TabsTrigger>
              </TabsList>

              <TabsContent value="manifest" className="flex-1 flex flex-col p-6 m-0 focus-visible:ring-0">
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] shadow-sm flex flex-col flex-1 overflow-hidden">
                      <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                          <div className="flex items-center gap-4 font-black uppercase italic">
                              <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                                 <Package size={16} />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[14px] text-white tracking-tight leading-none mb-1 font-black underline decoration-blue-500/30 decoration-2 italic uppercase">Material Manifest</span>
                                 <span className="text-[9px] text-slate-400 font-black tracking-[0.2em]">Validated Line Items // {items.length} units</span>
                              </div>
                          </div>

                          <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-white/5 rounded-xl transition-all">
                                 <Printer size={18} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-white/5 rounded-xl transition-all">
                                 <History size={18} />
                              </Button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-white/5 text-slate-400">
                                     <TableRow className="border-white/5 hover:bg-transparent h-12">
                                        <TableHead className="pl-10 text-[9px] font-black uppercase tracking-[0.2em]">Hash_UID</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-[0.2em]">Asset_Manifest</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-[0.2em]">Model_Identity</TableHead>
                                        <TableHead className="text-center text-[9px] font-black uppercase tracking-[0.2em]">Volume</TableHead>
                                        <TableHead className="text-right pr-10 text-[9px] font-black uppercase tracking-[0.2em]">Verification_Key</TableHead>
                                     </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {items.map((item, idx) => (
                                         <TableRow key={item.id} className="group hover:bg-white/5 border-b border-white/5 h-16 transition-all font-black uppercase italic text-white/80">
                                             <TableCell className="pl-10 text-[11px] text-slate-400 font-bold tracking-widest italic">
                                                 #{String(idx + 1).padStart(2, '0')}
                                             </TableCell>
                                             <TableCell>
                                                 <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-600/10 group-hover:text-blue-600 group-hover:scale-105 transition-all">
                                                       <Package size={16} />
                                                    </div>
                                                    <span className="text-[13px] text-white tracking-tight font-black underline decoration-white/5 decoration-1 underline-offset-4">{item.purchase_item?.asset_name}</span>
                                                 </div>
                                             </TableCell>
                                             <TableCell className="text-[11px] text-slate-400 font-bold whitespace-nowrap">
                                                 {item.purchase_item?.model_number || 'GEN_MANIFEST_ID'}
                                             </TableCell>
                                             <TableCell className="text-center">
                                                 <Badge variant="outline" className="text-[11px] font-black px-4 h-7 rounded-lg bg-blue-500/10 border-blue-500/20 text-blue-400 italic">
                                                    {item.received_quantity} UNITS
                                                 </Badge>
                                             </TableCell>
                                             <TableCell className="text-right pr-10">
                                                 <span className="text-[9px] text-slate-500 tracking-widest font-black uppercase italic underline decoration-white/5 underline-offset-4">{item.id.slice(0, 12).toUpperCase()}</span>
                                             </TableCell>
                                         </TableRow>
                                     ))}
                                </TableBody>
                            </Table>
                      </div>

                      {grn.notes && (
                          <div className="p-8 bg-white/5 border-t border-white/5">
                              <div className="flex items-start gap-4 p-5 bg-[#001c34] border border-white/10 rounded-2xl shadow-sm">
                                  <div className="mt-1 h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                       <Info size={16} />
                                  </div>
                                  <div className="flex flex-col gap-1 text-white">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none font-black mb-1">Administrative Intelligence</span>
                                      <p className="text-[12px] text-slate-300 italic font-medium leading-relaxed font-black">{grn.notes}</p>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </TabsContent>

              <TabsContent value="audit" className="flex-1 flex flex-col p-6 m-0 focus-visible:ring-0">
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden w-full shadow-sm flex-1 flex flex-col overflow-hidden">
                      <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
                          <div className="flex items-center gap-4 font-black uppercase italic text-white underline decoration-emerald-500/30 decoration-2">
                              <History size={18} className="text-emerald-500" /> Ingestion Chronology
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <Table className="w-full border-collapse">
                            <TableHeader className="bg-white/5">
                                <TableRow className="h-12 border-b border-white/5">
                                    <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest">Action_Signal</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest text-center">Auth_Auditor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest text-right pr-10">Reference_Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {grnActivities.length > 0 ? grnActivities.map((log) => (
                                    <TableRow key={log.id} className="h-16 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all text-white/70 font-black uppercase italic">
                                        <TableCell className="pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "h-9 w-9 rounded-xl flex items-center justify-center border",
                                                    log.description?.includes('posted') ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                )}>
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white uppercase tracking-tight leading-none mb-1">{log.action_type.replace(/_/g, ' ')}</span>
                                                    <span className="text-[9px] font-bold text-slate-500 tracking-widest leading-none">{log.description}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-slate-400 text-[11px]">
                                            {log.profile?.full_name || "System Automated"}
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <div className="flex flex-col items-end">
                                                <span className="text-white text-[11px] tracking-tight">{format(new Date(log.created_at), "dd MMM yyyy")}</span>
                                                <span className="text-[9px] text-slate-500 tracking-widest">{format(new Date(log.created_at), "hh:mm a")}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-48 text-center text-slate-500 font-black italic uppercase tracking-[0.5em]">
                                            No Ingestion Signals Detected For This Protocol Node.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                      </div>
                  </div>
              </TabsContent>
          </Tabs>
      </main>

    </div>
  );
}
