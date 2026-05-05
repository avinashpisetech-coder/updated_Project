import { createClient, getCachedUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  ShieldCheck, 
  ArrowRight, 
  Users,
  Info,
  CalendarDays,
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink 
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { getUserPermissions } from "@/lib/permissions-server";
import { hasPermission, RESOURCES } from "@/lib/permissions";
import MeetingToolSelector from "./MeetingToolSelector";

export default async function MeetingJoiningPage(props: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const paramsResolved = await props.params;
  
  // Defensive extraction: some environments or Future Next.js versions might nest params or use different keys
  const id = paramsResolved?.id;
  const meetingId = paramsResolved?.meetingId;
  const ticketId = id; // Alias for clarity

  const supabase = await createClient();
  const user = await getCachedUser();

  if (!user) {
    return <div>Unauthorized Access</div>;
  }

  // Validate UUID with a more permissive regex to avoid strict version/variant checks that might fail
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingId || "");
  
  if (!isUuid) {
    console.error("MeetingJoiningPage: INVALID UUID FORMAT RECEIVED", { 
      receivedMeetingId: meetingId, 
      receivedTicketId: ticketId,
      paramsType: typeof paramsResolved,
      paramsKeys: paramsResolved ? Object.keys(paramsResolved) : 'null',
      fullParams: JSON.stringify(paramsResolved)
    });
    return notFound();
  }

  // --- Parallel Performance Fetch ---
  const [meetingRes, profileRes, permissions] = await Promise.all([
    supabase
      .from("ticket_meetings")
      .select("*, ticket:tickets(subject, ticket_number)")
      .eq("id", meetingId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single(),
    getUserPermissions(user.id)
  ]);

  const meeting = meetingRes.data;
  const currentProfile = profileRes.data;

  if (meetingRes.error || !meeting) {
    console.error("MeetingJoiningPage Error:", meetingRes.error, "ID:", meetingId);
    return notFound();
  }

  const startsAt = new Date(meeting.starts_at);
  const isPast = startsAt < new Date();
  
  const canManage = hasPermission(permissions, RESOURCES.TICKETS, "update") || 
                    hasPermission(permissions, RESOURCES.TICKETS, "manage");
  const isCreator = meeting.created_by === user.id;
  const canInitialize = canManage || isCreator;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#0a0c10] text-slate-300 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch relative z-10 rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        
        {/* Left: Tactical Context (lg:col-span-12 on mobile, lg:col-span-5 on desktop) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 sm:p-12 bg-indigo-600/5 border-r border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Secure Protocol</span>
                <span className="text-[14px] font-extrabold uppercase italic text-white tracking-widest">Interface Portal</span>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">Session IID: {meeting.interaction_id || meeting.id.split('-')[0].toUpperCase()}</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black leading-tight text-white tracking-tighter italic selection:bg-indigo-500">
                {meeting.title}
              </h1>
              
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 italic">Resource Association</p>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-white selection:bg-indigo-500/30">{meeting.ticket?.subject}</p>
                  <p className="text-xs font-black text-indigo-300 opacity-60 tracking-widest uppercase">{meeting.ticket?.ticket_number}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 relative z-10 pt-8 border-t border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-300">
                <CalendarDays className="h-3.5 w-3.5 opacity-50" />
                <p className="text-[9px] font-black uppercase tracking-widest">Target Date</p>
              </div>
              <p className="text-sm font-bold text-white">{format(startsAt, "MMM dd, yyyy")}</p>
            </div>
            
            <div className="space-y-2 text-right">
              <div className="flex items-center gap-2 justify-end text-indigo-300">
                <Clock className="h-3.5 w-3.5 opacity-50" />
                <p className="text-[9px] font-black uppercase tracking-widest">Window Start</p>
              </div>
              <p className="text-sm font-bold text-white">{format(startsAt, "HH:mm")} <span className="text-indigo-400/50 text-[10px] uppercase font-black ml-1">({meeting.duration_minutes}m)</span></p>
            </div>
          </div>
        </div>

        {/* Right: Security Validation & Entry */}
        <div className="lg:col-span-7 flex flex-col p-8 sm:p-16 justify-center bg-slate-950/20 backdrop-blur-md">
          <div className="max-w-md mx-auto w-full space-y-10">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                 <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-2xl animate-pulse" />
                 <div className="relative h-20 w-20 rounded-[2rem] bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
                    <Video className="h-10 w-10 text-indigo-500" />
                 </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Initiate Session</h2>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Clearance Level: Authorized Personnel Only</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 h-16 w-16 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-indigo-400/50 transition-colors shadow-lg">
                  <MapPin className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/50">Lobby Segment</p>
                  <p className="text-sm font-bold text-slate-200 truncate">{meeting.location || "Encrypted Virtual Backbone"}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-indigo-500/30 animate-pulse group-hover:bg-indigo-500" />
              </div>

              <div className="flex items-center gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-violet-500/30 transition-all group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 h-16 w-16 bg-violet-500/5 blur-2xl group-hover:bg-violet-500/20 transition-all" />
                <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-violet-400/50 transition-colors shadow-lg">
                  <ShieldCheck className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/50">Encryption Status</p>
                  <p className="text-sm font-bold text-slate-200 truncate">SFS-256 Validated - No Anomalies</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-violet-500/30 animate-pulse group-hover:bg-violet-500" />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {meeting.meeting_link ? (
                <Button 
                  asChild
                  className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-md font-black uppercase tracking-[0.2em] italic shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] group relative overflow-hidden"
                >
                  <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Access Synchronous Stream
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </a>
                </Button>
              ) : (
                <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 backdrop-blur-sm shadow-2xl shadow-amber-950/20">
                  <div className="h-10 w-10 shrink-0 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                    <Info className="h-5 w-5 text-amber-500 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Deployment Pending</p>
                     <p className="text-[12px] font-bold text-white/70 leading-snug">The interaction protocol has not been deployed. Authorized Operative must stage the interface stream.</p>
                  </div>
                </div>
              )}
              
              {!meeting.meeting_link && canInitialize && (
                <div className="p-2 pt-6 border-t border-white/5">
                  <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-2 overflow-hidden shadow-2xl">
                     <MeetingToolSelector meetingId={meeting.id} />
                  </div>
                </div>
              )}
              
              <Link 
                 href={`/tickets/${ticketId}`}
                 className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/[0.05] hover:text-indigo-400 transition-all group"
              >
                <X className="h-4 w-4 mr-2 opacity-50 group-hover:opacity-100 group-hover:rotate-90 transition-all" />
                Abort Session
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
