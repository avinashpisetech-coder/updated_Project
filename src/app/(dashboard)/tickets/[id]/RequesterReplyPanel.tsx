"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitTicketReply } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertCircle, Send, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  ticketId: string;
  ticketStatus: string;
  isRequester: boolean;
}

export default function RequesterReplyPanel({ ticketId, ticketStatus, isRequester }: Props) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // This panel is specifically for the requester when the agent is waiting for info
  if (ticketStatus !== "pending_user" || !isRequester) return null;

  const handleSubmit = () => {
    setError("");
    if (!reply.trim()) {
      setError("Please provide the clarification or details requested by the agent.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitTicketReply(ticketId, reply);
        if (res.success) {
          setReply("");
          router.refresh();
        } else {
          setError(res.error || "Failed to submit communication.");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      }
    });
  };

  return (
    <Card className="rounded-[2.5rem] border-2 border-indigo-200 bg-indigo-50/30 overflow-hidden shadow-2xl shadow-indigo-100 animate-in fade-in zoom-in-95 duration-500">
      <div className="h-2 bg-indigo-500 w-full" />
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
            Action Item Required
          </Badge>
          <div className="flex items-center gap-2 text-indigo-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Awaiting Clarification</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-indigo-500" />
          Protocol Clarification
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-8 pt-0 space-y-6">
        <div className="p-4 rounded-2xl bg-white border border-indigo-100 flex gap-4 items-start shadow-sm">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">!</div>
          <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
            The assigned operative has requested additional telemetry or context regarding this incident. Please resolve any ambiguities below to resume the resolution lifecycle.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 animate-pulse">
            <Info className="h-4 w-4 text-red-600" />
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clarification Narrative</label>
             <span className="text-[9px] font-bold text-indigo-300 uppercase italic flex items-center gap-1">
               <Info className="h-3 w-3" />
               Encryption Enabled
             </span>
          </div>
          <Textarea
            placeholder="Type your response, add missing details, or clarify the technical requirements here..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="min-h-[120px] rounded-3xl bg-white border-2 border-slate-100 text-[14px] font-medium p-6 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-300 transition-all shadow-inner"
            disabled={isPending}
          />
        </div>

        <Button
          className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.2em] italic text-xs shadow-xl shadow-indigo-200 transition-all active:scale-95 group overflow-hidden relative"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Commit Response to Audit Trail
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </Button>
      </CardContent>
    </Card>
  );
}
