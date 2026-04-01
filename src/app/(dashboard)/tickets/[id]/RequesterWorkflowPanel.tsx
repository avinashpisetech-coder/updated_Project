"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveTicketClose, reopenTicket } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, RefreshCcw, Info, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  ticketId: string;
  ticketStatus: string;
  isRequester: boolean;
}

export default function RequesterWorkflowPanel({ ticketId, ticketStatus, isRequester }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError]   = useState("");
  const [isPending, startTransition] = useTransition();

  if (ticketStatus !== "resolved" || !isRequester) return null;

  const triggerSuccess = () => {
    toast.success("Request Processed Successfully");
    setTimeout(() => {
      router.refresh();
      router.push("/tickets");
    }, 1000);
  };

  const handleApprove = () => {
    setError("");
    startTransition(async () => {
      try {
        await approveTicketClose(ticketId);
        triggerSuccess();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const handleReopen = () => {
    setError("");
    if (!reason.trim()) {
      setError("Technical verification requires a justification for re-activation.");
      return;
    }
    startTransition(async () => {
      try {
        await reopenTicket(ticketId, reason);
        setReason("");
        triggerSuccess();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="h-1 bg-primary/40 w-full" />
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="px-1.5 py-0 border-primary/30 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">Awaiting Verification</Badge>
          </div>
          <CardTitle className="text-sm font-black uppercase tracking-tighter italic text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Incident Resolved
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed leading-none">
            Verification required. Please finalize the ticket lifecycle by approving the resolution or re-initialize if the anomaly persists.
          </p>

          {error && (
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <ShieldAlert className="h-3 w-3 text-destructive" />
              <p className="text-[10px] font-bold text-destructive uppercase italic">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Textarea
              placeholder="Re-activation justification (Mandatory for re-open)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[70px] rounded-lg bg-card border-border/40 text-[13px] font-medium placeholder:opacity-30 focus-visible:ring-primary/20"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="sm"
              className="h-9 rounded-lg font-black uppercase italic tracking-tighter text-[10px] shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Finalize
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg font-black uppercase italic tracking-tighter text-[10px] border-primary/20 text-primary hover:bg-primary/5"
              onClick={handleReopen}
              disabled={isPending}
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
              Re-Initialize
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
