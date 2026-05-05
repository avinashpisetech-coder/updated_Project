"use client";

import { useState } from "react";
import { 
  updateRequirementChecklist, 
  approveRequirementStage, 
  reopenRequirement,
  updateRequirementField,
  assignTicket,
  updateTicketField
} from "@/app/(dashboard)/tickets/actions";
import { 
  FileText, 
  CheckCircle2, 
  Shield, 
  MessageSquare, 
  Printer, 
  ChevronRight, 
  AlertCircle, 
  Calendar, 
  Zap, 
  Target, 
  FileSearch, 
  Activity, 
  ShieldCheck, 
  Lock, 
  History, 
  Flag, 
  ChevronDown, 
  Building2, 
  UserCircle2, 
  Info, 
  Save, 
  Paperclip, 
  Loader2, 
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AttachmentsPanel from "../../[id]/AttachmentsPanel";
import LiveChat from "../../[id]/LiveChat";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { UserSelector } from "@/components/workspace/UserSelector";

export default function RequestDetailClient({ 
  ticket, 
  requirement, 
  attachments, 
  activities,
  user 
}: any) {
  const [checklist, setChecklist] = useState(requirement?.checklist || []);
  const [approvalStage, setApprovalStage] = useState(requirement?.approval_stage || 0);
  const [isFrozen, setIsFrozen] = useState(requirement?.is_frozen || false);
  const [version, setVersion] = useState(requirement?.version || 1);
  const [loading, setLoading] = useState(false);

  const [impactScope, setImpactScope] = useState(requirement?.impact_scope || "");
  const [riskAssessment, setRiskAssessment] = useState(requirement?.risk_assessment || "");
  const [startDate, setStartDate] = useState(requirement?.implementation_start_date || "");
  const [endDate, setEndDate] = useState(requirement?.expected_completion_date || "");
  
  const [priority, setPriority] = useState(ticket.priority || "low");
  const [status, setStatus] = useState(ticket.status || "open");
  const [assigneeId, setAssigneeId] = useState(ticket.assigned_to_id || "");

  const handleUpdateAll = async () => {
    if (isFrozen) return;
    setLoading(true);
    try {
      await Promise.all([
        updateRequirementField(ticket.id, "impact_scope", impactScope),
        updateRequirementField(ticket.id, "risk_assessment", riskAssessment),
        updateRequirementField(ticket.id, "implementation_start_date", startDate),
        updateRequirementField(ticket.id, "expected_completion_date", endDate),
        updateTicketField(ticket.id, "priority", priority),
        updateTicketField(ticket.id, "status", status)
      ]);
      toast.success("Protocol Synced");
    } catch (e) {
      toast.error("Update Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = async (idx: number) => {
    if (isFrozen) return;
    const newList = [...checklist];
    newList[idx].completed = !newList[idx].completed;
    setChecklist(newList);
    try {
      await updateRequirementChecklist(ticket.id, newList);
    } catch (e) {
      toast.error("Failed to update checklist");
    }
  };

  const handleAssigneeChange = async (ids: string[]) => {
    if (isFrozen) return;
    const newId = ids[0] || "";
    setAssigneeId(newId);
    try {
      await assignTicket(ticket.id, newId);
      toast.success("Assigned");
    } catch (e) {
      toast.error("Failed");
    }
  };

  const handleApproval = async () => {
    const nextStage = approvalStage + 1;
    setLoading(true);
    try {
      await approveRequirementStage(ticket.id, nextStage);
      setApprovalStage(nextStage);
      if (nextStage >= 2) setIsFrozen(true);
      toast.success(`Stage ${nextStage} Approved`);
    } catch (e) {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async () => {
    setLoading(true);
    try {
      await reopenRequirement(ticket.id);
      setIsFrozen(false);
      setApprovalStage(0);
      setVersion((v: number) => v + 1);
      toast.success("Reopened");
    } catch (e) {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  const isDeptAdmin = user.role === 'dept_admin' || user.role === 'super_admin';

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans overflow-hidden w-full">
      
      {/* Fluid Header */}
      <header className="h-[56px] shrink-0 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 z-50 w-full">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-black text-slate-900 tracking-tighter uppercase truncate max-w-[200px] lg:max-w-none">
            {ticket.change_order_number || `REQ-${ticket.ticket_number}`}
          </h1>
          <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 rounded-sm border-primary/20 bg-primary/5 text-primary">
            v{version}.0
          </Badge>
          {isFrozen && (
            <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[8px] font-black uppercase h-4 px-1.5">
              <Lock className="w-2 h-2 mr-1" /> Frozen
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.print()}
            className="h-7 px-3 rounded-lg text-[8px] font-black uppercase bg-slate-50 border-slate-200 text-slate-600 shadow-sm"
          >
            <Printer className="h-3 w-3 mr-1" /> Export
          </Button>
          
          {isFrozen ? (
            isDeptAdmin && (
              <Button size="sm" onClick={handleReopen} disabled={loading} className="h-7 px-3 rounded-lg text-[8px] font-black uppercase bg-slate-900 text-white">
                <Zap className="h-3 w-3 mr-1" /> Re-open
              </Button>
            )
          ) : (
            isDeptAdmin && (
              <Button size="sm" onClick={handleApproval} disabled={loading || (approvalStage === 0 && checklist.some((i: any) => !i.completed))} className="h-7 px-3 rounded-lg text-[8px] font-black uppercase bg-indigo-600 text-white shadow-lg">
                {approvalStage === 0 ? "Approve" : "Sign-off"}
              </Button>
            )
          )}
        </div>
      </header>

      {/* Main Content Area - Fluid & Responsive */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-[98%] mx-auto py-4 px-4 space-y-4">
          
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-900 text-white">Operational_Requirement</div>
                <div className="px-1.5 py-0.5 text-[8px] font-black text-slate-400 uppercase bg-slate-50 rounded border border-slate-200">ID: {ticket.id.split('-')[0].toUpperCase()}</div>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{ticket.subject}</h2>
              <div className="flex flex-wrap items-center gap-3 text-slate-500">
                 <div className="flex items-center gap-1.5"><UserCircle2 className="w-3 h-3 text-slate-300" /><span className="text-[9px] font-black uppercase tracking-widest">{ticket.requester?.full_name}</span></div>
                 <div className="hidden sm:block h-2 w-px bg-slate-200" />
                 <div className="flex items-center gap-1.5 text-slate-400"><Building2 className="w-3 h-3" /><span className="text-[9px] font-black uppercase tracking-widest">{ticket.requester?.department?.name || "Corporate"}</span></div>
              </div>
            </div>
            <Card className="border-slate-200 bg-white p-3 rounded-2xl shadow-sm w-full">
               <h3 className="text-[8px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5"><History className="w-3 h-3" /> Control</h3>
               <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                  <div className="flex items-center justify-between">
                     <span className="text-[8px] font-bold text-slate-400 uppercase">Status</span>
                     <select value={status} disabled={isFrozen} onChange={(e) => setStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[8px] font-black uppercase text-slate-700 cursor-pointer outline-none">
                       <option value="open">OPEN</option><option value="assigned">ASSIGNED</option><option value="pending">PENDING</option><option value="pending_user">WAIT_USER</option><option value="resolved">RESOLVED</option><option value="closed">CLOSED</option>
                     </select>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[8px] font-bold text-slate-400 uppercase">Operator</span>
                     <UserSelector value={assigneeId ? [assigneeId] : []} onChange={handleAssigneeChange} customTrigger={
                         <div className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50", isFrozen ? "opacity-60" : "cursor-pointer")}>
                           <span className="text-[8px] font-black text-slate-700 uppercase">{ticket.assigned_to?.full_name || "Unassigned"}</span><ChevronDown className="w-2 h-2 opacity-30" />
                         </div>
                     }/>
                  </div>
               </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><FileSearch className="w-3 h-3" /> 1. Narrative</h3>
                <div className="p-4 rounded-2xl border border-slate-200/60 bg-white text-[11px] font-medium leading-normal text-slate-600 shadow-sm relative min-h-[80px]">
                  <div className="absolute top-2 right-3 text-[7px] font-black text-rose-500 uppercase opacity-30 flex items-center gap-1"><Lock className="w-2 h-2" /> Locked</div>{ticket.description}
                </div>
             </div>
             <div className="space-y-1.5">
                <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><Info className="w-3 h-3" /> 2. Reason</h3>
                <div className="p-4 rounded-2xl border border-slate-200/60 bg-white text-[11px] font-medium leading-normal text-slate-500 shadow-sm italic relative min-h-[80px]">
                  <div className="absolute top-2 right-3 text-[7px] font-black text-rose-500 uppercase opacity-30 flex items-center gap-1"><Lock className="w-2 h-2" /> Source</div>{requirement?.reason_for_change || "N/A"}
                </div>
             </div>
          </div>

          <Card className="p-5 rounded-3xl border-slate-200 bg-white shadow-sm">
             <h3 className="text-[8px] font-black text-primary uppercase mb-4 flex items-center gap-1.5"><div className="h-1 w-1 rounded-full bg-primary" /> Sector 2: Protocol Analysis</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <h4 className="text-[9px] font-black text-slate-900 uppercase pl-1">Impact</h4>
                  <Textarea value={impactScope} readOnly={isFrozen} onChange={(e) => setImpactScope(e.target.value)} placeholder="..." className="min-h-[70px] rounded-xl border-slate-100 bg-slate-50/50 p-3 text-[11px] font-medium shadow-inner w-full"/>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-[9px] font-black text-slate-900 uppercase pl-1">Risk</h4>
                  <Textarea value={riskAssessment} readOnly={isFrozen} onChange={(e) => setRiskAssessment(e.target.value)} placeholder="..." className="min-h-[70px] rounded-xl border-slate-100 bg-slate-50/50 p-3 text-[11px] font-medium shadow-inner w-full"/>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase pl-1">Timeline</label>
                   <div className="flex items-center justify-between gap-1.5 p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-300" /><input type="date" value={startDate} disabled={isFrozen} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-[8px] font-black text-slate-600 uppercase w-20 outline-none"/></div><ChevronRight className="w-2 h-2 text-slate-200" /><input type="date" value={endDate} disabled={isFrozen} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-[8px] font-black text-slate-600 uppercase w-20 outline-none"/>
                   </div>
                </div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase pl-1">Priority</label>
                   <div className="flex items-center gap-1.5 p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200">
                      <Flag className="w-3 h-3 text-slate-300" /><select value={priority} disabled={isFrozen} onChange={(e) => setPriority(e.target.value)} className="bg-transparent border-none text-[8px] font-black text-slate-600 uppercase cursor-pointer flex-1 outline-none">
                        <option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option><option value="critical">CRIT</option>
                      </select>
                   </div>
                </div>
                <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase pl-1">Governance</label>
                   <div className="h-7.5 py-1 rounded-lg bg-primary/[0.03] border border-primary/10 flex items-center px-2">
                      <ShieldCheck className="w-3 h-3 text-primary mr-1.5" /><span className="text-[8px] font-black text-primary uppercase">Stage_{approvalStage}</span>
                   </div>
                </div>
             </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><Paperclip className="w-3 h-3" /> 3. Payload Registry</h3>
              <Card className="p-3 rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden min-h-[200px]"><AttachmentsPanel ticketId={ticket.id} attachments={attachments || []} canView={true}/></Card>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><MessageSquare className="w-3 h-3" /> 4. Remarks</h3>
              <Card className="p-3 rounded-2xl border-slate-200 bg-white shadow-sm h-[250px] lg:h-[200px] overflow-hidden flex flex-col"><div className="flex-1 overflow-hidden scale-90 origin-top"><LiveChat ticketId={ticket.id} currentUserId={user.id}/></div></Card>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><CheckCircle2 className="w-3 h-3" /> 5. Implementation Roadmap</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {checklist.map((item: any, idx: number) => (
                <div key={idx} onClick={() => handleChecklistToggle(idx)} className={cn("flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer", item.completed ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-inner" : "bg-white border-slate-200 hover:border-primary/20 shadow-sm")}>
                  <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center transition-all", item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200")}>{item.completed && <CheckCircle2 className="w-2.5 h-2.5" />}</div>
                  <span className="text-[9px] font-black uppercase tracking-tight leading-none truncate">{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[8px] font-black text-primary uppercase flex items-center gap-1.5 pl-1"><Activity className="w-3 h-3" /> 6. Audit Trail</h3>
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden shadow-sm w-full">
               <div className="max-h-[250px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                     <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-4 py-2 text-[7px] font-black uppercase text-slate-400">Time</th><th className="px-4 py-2 text-[7px] font-black uppercase text-slate-400">Actor</th><th className="px-4 py-2 text-[7px] font-black uppercase text-slate-400">Activity</th></tr></thead>
                     <tbody className="divide-y divide-slate-50">{activities.map((act: any) => (
                        <tr key={act.id} className="hover:bg-slate-50/50"><td className="px-4 py-2 text-[8px] font-bold text-slate-400 whitespace-nowrap">{format(new Date(act.created_at), "dd.MM.yy HH:mm")}</td><td className="px-4 py-2"><div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-500 border border-slate-200">{act.actor?.full_name?.charAt(0) || "S"}</div><span className="text-[9px] font-black text-slate-600 uppercase truncate max-w-[80px]">{act.actor?.full_name || "System"}</span></div></td><td className="px-4 py-2 text-[9px] font-medium text-slate-500 leading-normal">{act.content}</td></tr>
                     ))}</tbody>
                  </table>
               </div>
            </Card>
          </div>

          {!isFrozen && (
            <div className="pt-4 pb-8 flex justify-center">
               <Button onClick={handleUpdateAll} disabled={loading} className="h-10 px-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2 group transition-all active:scale-95">
                 {loading ? <Loader2 className="animate-spin h-3 w-3" /> : <Save className="w-3 h-3 group-hover:scale-110" />} Synchronize Protocol <ArrowRight className="w-3 h-3 opacity-40 group-hover:translate-x-1" />
               </Button>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
