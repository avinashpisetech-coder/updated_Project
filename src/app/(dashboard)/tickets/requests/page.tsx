import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { FileText, ChevronRight, Clock, ShieldCheck, User, Zap } from "lucide-react";

export default async function RequestListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch only requirements
  const { data: requests } = await supabase
    .from("tickets")
    .select(`
      id,
      ticket_number,
      subject,
      status,
      created_at,
      change_order_number,
      requirement:ticket_requirements(version, approval_stage)
    `)
    .eq("is_requirement", true)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 space-y-8 font-sans">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Requirement Registry</h1>
          <p className="text-sm text-muted-foreground font-medium">Enterprise Change Order Governance & Approval Pipeline</p>
        </div>
        <Link href="/tickets/new">
          <button className="h-11 px-6 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 flex items-center gap-2">
            <Zap className="w-4 h-4" /> New Requirement
          </button>
        </Link>
      </div>

      <div className="grid gap-4">
        {requests?.map((req: any) => (
          <Link key={req.id} href={`/tickets/requests/${req.id}`}>
            <Card className="group border-border/40 bg-card/60 hover:bg-white hover:border-primary/20 transition-all cursor-pointer rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl">
              <div className="flex items-center p-6 gap-6">
                <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FileText className="w-7 h-7" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                      {req.change_order_number || "PENDING_CO"}
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Version {req.requirement?.version || 1}.0</span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-foreground truncate">{req.subject}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      <Clock className="w-3.5 h-3.5" /> {format(new Date(req.created_at), "MMM dd, yyyy")}
                    </div>
                    <div className="h-1 w-1 rounded-full bg-border" />
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      <ShieldCheck className="w-3.5 h-3.5" /> Stage: Approval {req.requirement?.approval_stage || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3">
                      {req.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {(!requests || requests.length === 0) && (
          <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5">
            <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">No Active Requirements Found</p>
          </div>
        )}
      </div>
    </div>
  );
}
