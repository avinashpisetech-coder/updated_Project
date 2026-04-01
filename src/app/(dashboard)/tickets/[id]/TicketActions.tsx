"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTicket, uploadTicketAttachment, registerTicketActivity, approveTicketClose, reopenTicket } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, UserPlus, Activity, Upload, CheckCircle2, Calendar, 
  Clock, ShieldAlert, Check, Loader2, Users, AlertCircle, XCircle, RefreshCcw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type AssigneeOption = {
  id: string;
  full_name: string;
  email: string;
};

interface Props {
  ticketId: string;
  currentStatus: string;
  currentAssigneeId?: string | null;
  currentDeadline?: string | null;
  currentTeamMembers: string[];
  isAgent: boolean;
  isRequester?: boolean;
  initialAssignableUsers?: AssigneeOption[];
}

const STATUS_HELP_TEXT: Record<string, string> = {
  assigned: "Ownership established.",
  in_progress: "Active resolution phase.",
  pending_user: "Awaiting requester feedback.",
  scheduled: "Meeting/Action scheduled.",
  resolved: "Resolution pending verification.",
  closed: "Issue terminated successfully.",
};

const NEXT_STATUS_BY_CURRENT: Record<string, string[]> = {
  new: ["assigned", "in_progress", "pending_user", "replied", "scheduled", "resolved"],
  assigned: ["in_progress", "pending_user", "replied", "scheduled", "resolved"],
  in_progress: ["pending_user", "replied", "scheduled", "resolved"],
  pending_user: ["in_progress", "replied", "scheduled", "resolved"],
  replied: ["in_progress", "pending_user", "scheduled", "resolved"],
  scheduled: ["in_progress", "pending_user", "replied", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

function labelForStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TicketActions({
  ticketId,
  currentStatus,
  currentAssigneeId,
  currentDeadline,
  currentTeamMembers,
  isAgent,
  isRequester = false,
  initialAssignableUsers = []
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState("update");

  // Form State
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId ?? "");
  const [nextStatus, setNextStatus] = useState(currentStatus);
  const [deadline, setDeadline] = useState(currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : "");
  const [teamMembers, setTeamMembers] = useState<string[]>(currentTeamMembers || []);
  const [note, setNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [assignableUsers, setAssignableUsers] = useState<AssigneeOption[]>(initialAssignableUsers);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const supabase = createClient();

  // --- Quantum Clock Implementation ---
  const [secondsSpent, setSecondsSpent] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    async function loadAssignableUsers() {
      if (!isAgent) return;
      if (initialAssignableUsers.length > 0) return;
      
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase.rpc("get_assignable_profiles");
        if (data) {
          setAssignableUsers(data as AssigneeOption[]);
        }
      } catch (err) {
        console.error("Failed to load assignable users:", err);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadAssignableUsers();
  }, [supabase, isAgent, initialAssignableUsers]);

  // Unified Status Options
  const statusOptions = ["new", ... (NEXT_STATUS_BY_CURRENT[currentStatus] ?? [])];

  const hasChanges = 
    assigneeId !== (currentAssigneeId ?? "") ||
    (nextStatus !== currentStatus && nextStatus !== "") ||
    deadline !== (currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : "") ||
    JSON.stringify(teamMembers.sort()) !== JSON.stringify([...currentTeamMembers].sort()) ||
    attachmentFiles.length > 0 ||
    note.trim().length > 0;

  const triggerSuccess = (type: string) => {
    setActivityType(type);
    
    const message = type === "resolve" ? "Ticket Resolved Successfully" : "Ticket Details Updated";
    toast.success(message);

    setTimeout(() => {
      router.refresh();
      router.push("/tickets");
    }, 1000);
  };

  const handleRegisterActivity = async () => {
    if (!note.trim()) {
      toast.error("Please provide a description for the activity.");
      return;
    }
    setLoading(true);
    try {
      const res = await registerTicketActivity(ticketId, note);
      if (res.success) {
        setNote("");
        triggerSuccess("update");
      } else {
        toast.error(res.error || "Failed to register activity.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResolution = async () => {
    setLoading(true);
    try {
      const res = await approveTicketClose(ticketId);
      if (res.success) {
        triggerSuccess("resolve");
      } else {
        toast.error(res.error || "Approval failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisputeResolution = async () => {
    if (!disputeReason.trim()) {
      toast.error("Please provide a reason for re-opening the ticket.");
      return;
    }
    setLoading(true);
    try {
      const res = await reopenTicket(ticketId, disputeReason);
      if (res.success) {
        triggerSuccess("update");
      } else {
        toast.error(res.error || "Dispute registration failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalUpdate = async () => {
    setLoading(true);
    try {
      let attachmentSuccess = true;
      if (attachmentFiles.length > 0) {
        const uploadPromises = attachmentFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await uploadTicketAttachment(ticketId, formData);
          if (!res?.success) return false;
          return true;
        });
        const results = await Promise.all(uploadPromises);
        attachmentSuccess = results.every(r => r === true);
      }

      if (!attachmentSuccess) {
        setLoading(false);
        return;
      }

      const res = await updateTicket(ticketId, {
        status: (nextStatus !== currentStatus && nextStatus !== "") ? nextStatus : undefined,
        assigned_to_id: isAgent && assigneeId !== (currentAssigneeId ?? "") ? (assigneeId || null) : undefined,
        sla_due_date: isAgent && deadline !== (currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : "") ? (deadline || null) : undefined,
        team_members: isAgent && JSON.stringify(teamMembers.sort()) !== JSON.stringify([...currentTeamMembers].sort()) ? teamMembers : undefined,
        note: note.trim() || undefined,
        drafting_duration_seconds: secondsSpent,
      });

      if (res.success) {
        triggerSuccess("update");
      } else {
        toast.error(res.error || "Update failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDeadline = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    setDeadline(now.toISOString().split('T')[0]);
  };

  const toggleTeamMember = (id: string) => {
    setTeamMembers(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="space-y-8 font-sans">
        <div className="flex items-center justify-between pb-6 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-indigo-950 animate-pulse" />
            <span className="text-[12px] font-bold tracking-wider text-slate-900 uppercase">
              STRATEGIC CONTROL CONSOLE
            </span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[12px] font-bold text-slate-700 tabular-nums tracking-tight">{formatTime(secondsSpent)}</span>
             </div>
             <div className="px-3 py-1.5 rounded-xl bg-indigo-950 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm hidden sm:block">
               {isAgent ? "COMMAND AUTHORIZED" : "STAKEHOLDER ACCESS"}
             </div>
          </div>
        </div>

        {/* SPECIALIZED RESOLUTION APPROVAL UI - For Requesters only on Resolved tickets */}
        {currentStatus === 'resolved' && (isRequester || isAgent) ? (
          <div className="rounded-3xl border-2 border-indigo-100 bg-indigo-50/20 p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-900">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="text-[14px] font-bold uppercase tracking-widest">Stakeholder Verification Protocol</h3>
                </div>
                <p className="text-[13px] font-medium text-slate-600 max-w-xl leading-relaxed">
                  The primary resolution phase has been completed. As the stakeholder, you must now verify the outcome. Approving will terminate the ticket as <span className="font-bold text-slate-900">CLOSED</span>.
                </p>
              </div>

              {!isAgent && (
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleApproveResolution}
                    disabled={loading}
                    className="h-12 px-8 rounded-2xl bg-indigo-950 hover:bg-black text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-indigo-950/20"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="flex items-center gap-2"><Check className="h-4 w-4" /> Verify & Close</div>}
                  </Button>
                </div>
              )}
            </div>

            {!isAgent && (
              <div className="pt-6 border-t border-indigo-100/50 space-y-4">
                <p className="text-[11px] font-bold text-indigo-950/50 uppercase tracking-widest">Dispute / Supplemental Input</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Textarea 
                    placeholder="If the issue persists or resolution is incomplete, state the deficiency here to re-open..."
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="min-h-[100px] flex-1 rounded-2xl bg-white border-slate-200 text-[13px] font-medium p-4 focus-visible:ring-indigo-950/10 shadow-sm transition-all"
                  />
                  <Button 
                    variant="outline"
                    onClick={handleDisputeResolution}
                    disabled={loading || !disputeReason}
                    className="h-auto sm:w-48 rounded-2xl border-indigo-200 text-indigo-950 hover:bg-white text-[10px] font-bold uppercase tracking-widest"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      Issue Unresolved
                    </div>
                  </Button>
                </div>
              </div>
            )}
            
            {isAgent && (
              <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-indigo-100">
                <AlertCircle className="h-14 w-14 text-indigo-500 opacity-20" />
                <p className="text-[12px] font-medium text-slate-500 italic">
                  Resolution pending stakeholder approval. Strategic console capabilities are restricted during the verification phase to preserve audit integrity.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* STANDARD COMMAND INTERFACE */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personnel & Teams - Agent Only */}
              {isAgent && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 pl-1">Lead Operative Engagement</p>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger className="h-10 rounded-xl bg-white border-slate-200 text-[13px] font-medium shadow-none focus:ring-2 focus:ring-indigo-950/10 transition-all">
                        <SelectValue placeholder="Select primary assignee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-slate-200 bg-white">
                        {assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-[13px] font-medium">
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                     <p className="text-[11px] font-semibold text-slate-500 pl-1">Collective Support Protocol</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full h-10 rounded-xl bg-white border-slate-200 text-[13px] font-medium justify-between shadow-none hover:bg-slate-50">
                          <span>{teamMembers.length > 0 ? `${teamMembers.length} Active Participants` : "Assign Support Collective"}</span>
                          <Users className="h-4 w-4 opacity-40 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[300px] rounded-2xl border-slate-200 shadow-2xl p-0 overflow-hidden" align="start">
                        <div className="bg-slate-50 p-4 border-b border-slate-100">
                          <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-0">Executive Collective</DropdownMenuLabel>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {assignableUsers.map((user) => (
                            <DropdownMenuCheckboxItem
                              key={user.id}
                              checked={teamMembers.includes(user.id)}
                              onCheckedChange={() => toggleTeamMember(user.id)}
                              onSelect={(e) => e.preventDefault()}
                              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-slate-800">{user.full_name}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{user.email}</span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              {/* Status & SLA */}
              <div className={cn("space-y-5", !isAgent && "md:col-span-2")}>
                <div className="space-y-2">
                   <p className="text-[11px] font-semibold text-slate-500 pl-1">Lifecycle Migration State</p>
                  <Select value={nextStatus} onValueChange={setNextStatus}>
                    <SelectTrigger className={cn(
                      "h-10 rounded-xl bg-white border text-[13px] font-bold uppercase tracking-wide transition-all shadow-none",
                      nextStatus !== currentStatus && nextStatus !== "" ? "border-indigo-950 bg-indigo-50/30" : "border-slate-200"
                    )}>
                      <SelectValue placeholder="Define target phase" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-slate-200 bg-white">
                      {statusOptions.length > 0 ? statusOptions.map((status) => (
                        <SelectItem key={status} value={status} className="text-[12px] font-bold uppercase tracking-tight">
                          {labelForStatus(status)}
                        </SelectItem>
                      )) : (
                         <p className="p-4 text-[11px] font-medium text-slate-400 italic text-center">No Migrations Available</p>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {isAgent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-semibold text-slate-500">Service Level Targets</p>
                      <div className="flex gap-1.5">
                        {[24, 48].map((h) => (
                          <button 
                            key={h} 
                            onClick={(e) => { e.preventDefault(); handleQuickDeadline(h); }}
                            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 hover:text-indigo-950 hover:border-indigo-950/20 transition-all"
                          >
                            +{h}H
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="h-10 pl-11 rounded-xl bg-white border-slate-200 text-[13px] font-bold [color-scheme:light] shadow-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Narrative & Justification */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-slate-500">Official Action Narrative</p>
                {note.trim().length > 0 && (
                  <button 
                    onClick={handleRegisterActivity}
                    className="flex items-center gap-2 text-[11px] font-bold text-indigo-900 hover:text-black transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Capture Audit Event
                  </button>
                )}
              </div>
              <Textarea
                placeholder={isAgent ? "Provide a professional justification for this migration..." : "Provide requested context or details here..."}
                value={note}
                onChange={e => setNote(e.target.value)}
                className="min-h-[120px] rounded-2xl bg-slate-50/50 border-slate-200 text-[14px] font-medium placeholder:text-slate-300 p-5 focus-visible:ring-indigo-950/10 focus-visible:bg-white transition-all shadow-none resize-none leading-relaxed"
              />
            </div>

            {/* File Payload Interaction */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <div className={cn(
                "relative group overflow-hidden rounded-2xl border transition-all h-12 flex items-center px-6 w-full sm:w-auto sm:flex-1",
                attachmentFiles.length > 0 ? "bg-indigo-50/50 border-indigo-200" : "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200"
              )}>
                <Input
                  key={fileInputKey}
                  type="file"
                  multiple
                  onChange={(event) => setAttachmentFiles(Array.from(event.target.files ?? []))}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {attachmentFiles.length > 0 ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-indigo-900" />
                      <span className="text-[12px] font-bold text-indigo-950 uppercase tracking-wider">{attachmentFiles.length} Payload(s) Staged</span>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); setAttachmentFiles([]); setFileInputKey(k => k + 1); }} className="text-[10px] font-bold text-red-500 hover:text-red-700">RESET</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 opacity-40">
                    <Upload className="h-4 w-4" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Append Strategic Payload</span>
                  </div>
                )}
              </div>

              <Button 
                className={cn(
                  "h-12 w-full sm:w-64 rounded-2xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-xl",
                  hasChanges 
                    ? "bg-indigo-950 hover:bg-black text-white shadow-indigo-950/20" 
                    : "bg-slate-100 text-slate-400 pointer-events-none"
                )}
                onClick={handleGlobalUpdate}
                disabled={loading || !hasChanges}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5" />
                    Commit Strategic Update
                  </div>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
