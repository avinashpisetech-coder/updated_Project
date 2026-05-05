"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { scheduleTicketMeeting } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CalendarPlus, X, Maximize2, Minimize2 } from "lucide-react";

type ParticipantOption = {
  id: string;
  full_name: string;
  email: string;
};

type ScheduleMeetingPanelProps = {
  ticketId: string;
  ticketSubject: string;
  requesterId: string;
};

export default function ScheduleMeetingPanel({
  ticketId,
  ticketSubject,
  requesterId,
}: ScheduleMeetingPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState(ticketSubject || "");
  const [meetingType, setMeetingType] = useState("online");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [meetingTool, setMeetingTool] = useState("jitsi");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadParticipants() {
      setLoadingParticipants(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("status", "active")
          .order("full_name");
        if (data) setParticipants(data);
      } catch (err) {
        console.error("Failed to load participants:", err);
      } finally {
        setLoadingParticipants(false);
      }
    }
    if (isExpanded) {
      loadParticipants();
    }
  }, [supabase, isExpanded]);

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return participants;
    }

    return participants.filter((participant) => {
      return (
        participant.full_name.toLowerCase().includes(keyword) ||
        participant.email.toLowerCase().includes(keyword)
      );
    });
  }, [participants, search]);

  const toggleParticipant = (participantId: string, checked: boolean) => {
    setSelectedParticipants((prev) => {
      if (checked) {
        if (prev.includes(participantId)) {
          return prev;
        }
        return [...prev, participantId];
      }
      return prev.filter((id) => id !== participantId);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!title || !meetingDate || !meetingTime) {
      setError("Title, date, and time are required.");
      return;
    }

    if (meetingType === "online" && !meetingTool) {
      setError("Please select a meeting tool for online sessions.");
      return;
    }

    if (meetingType === "physical" && !location.trim()) {
      setError("Location is required for physical meetings.");
      return;
    }

    const formData = new FormData();
    formData.append("ticket_id", ticketId);
    formData.append("title", title);
    formData.append("meeting_type", meetingType);
    formData.append("meeting_date", meetingDate);
    formData.append("meeting_time", meetingTime);
    formData.append("duration_minutes", durationMinutes);
    formData.append("meeting_tool", meetingTool);

    if (meetingLink.trim()) {
      formData.append("meeting_link", meetingLink.trim());
    }

    if (location.trim()) {
      formData.append("location", location.trim());
    }

    if (agenda.trim()) {
      formData.append("agenda", agenda.trim());
    }

    formData.append("participant_ids", JSON.stringify(selectedParticipants));

    startTransition(async () => {
      try {
        const res = await scheduleTicketMeeting(formData);
        if (res.success) {
          setSuccessMessage("Meeting scheduled. Ticket moved to Scheduled status.");
          setMeetingDate("");
          setMeetingTime("");
          setDurationMinutes("30");
          setMeetingTool("jitsi");
          setMeetingLink("");
          setLocation("");
          setAgenda("");
          setSelectedParticipants([]);
          setIsExpanded(false);
          router.refresh();
        } else {
          setError(res.error || "Failed to schedule meeting.");
        }
      } catch (submitError) {
        console.error(submitError);
        setError("Failed to schedule meeting.");
      }
    });
  };

  if (!isExpanded) {
    return (
      <div id="schedule-session" className="scroll-mt-24">
        <div 
          onClick={() => setIsExpanded(true)}
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
               <CalendarPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tactical Scheduler</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-900">Propose Session</p>
            </div>
          </div>
          <button 
            className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
            title="Maximize Scheduler"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="schedule-session" className="space-y-6 bg-white animate-in font-sans scroll-mt-24">
      <div 
        onClick={() => setIsExpanded(false)}
        className="flex items-center justify-between border-b border-slate-50 pb-5 cursor-pointer hover:bg-slate-50/30 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Scheduler</p>
            <p className="mt-0.5 text-[12px] font-bold text-slate-900">Interaction Proposal Protocol</p>
          </div>
        </div>
        <button 
          className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
          title="Minimize Scheduler"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session Topic</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[13px] font-bold focus-visible:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-200 bg-white">
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="physical">In-Person</SelectItem>
                <SelectItem value="phone_call">Phone Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Length</Label>
            <Select value={durationMinutes} onValueChange={setDurationMinutes}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-200 bg-white">
                <SelectItem value="15">15 mins</SelectItem>
                <SelectItem value="30">30 mins</SelectItem>
                <SelectItem value="45">45 mins</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</Label>
            <Input
              type="date"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
              className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold [color-scheme:light]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</Label>
            <Input
              type="time"
              step={900}
              value={meetingTime}
              onChange={(event) => setMeetingTime(event.target.value)}
              className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold [color-scheme:light]"
            />
          </div>
        </div>

        {(meetingType === "online") && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interaction Interface</Label>
            <Select value={meetingTool} onValueChange={setMeetingTool}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold">
                <SelectValue placeholder="Select Platform" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-200 bg-white">
                <SelectItem value="jitsi">Jitsi Meet (Recommended / Auto-Generated)</SelectItem>
                <SelectItem value="google_meet">Google Meet (Manual ID Required)</SelectItem>
                <SelectItem value="teams">Microsoft Teams (Manual Link Pattern)</SelectItem>
                <SelectItem value="zoom">Zoom (Personal ID Pattern)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(meetingType === "phone_call") && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registry Credentials</Label>
            <Input
              placeholder="Phone Number"
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
              className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold"
            />
          </div>
        )}

        {meetingType === "physical" && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registry Location</Label>
            <Input
              placeholder="Room/Venue"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="h-10 rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-bold"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proposed Agenda</Label>
          <Textarea
            placeholder="Focus points..."
            value={agenda}
            onChange={(event) => setAgenda(event.target.value)}
            className="min-h-[80px] rounded-xl bg-slate-50/50 border-slate-200 text-[12px] font-medium"
          />
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Personnel List</Label>
          </div>
          <Input
            placeholder="Search team..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 rounded-xl bg-white border-slate-200 text-[12px] font-bold"
          />
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-2 no-scrollbar">
            {loadingParticipants ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : filteredParticipants.length === 0 ? (
              <p className="py-4 text-center text-[11px] font-bold text-slate-300 uppercase italic">No records found</p>
            ) : (
              filteredParticipants.map((participant) => {
                const isRequester = participant.id === requesterId;
                const checked = isRequester || selectedParticipants.includes(participant.id);
                return (
                  <label
                    key={participant.id}
                    className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-white transition-all border border-transparent hover:border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={checked}
                        disabled={isRequester}
                        onCheckedChange={(value) => toggleParticipant(participant.id, !!value)}
                      />
                      <span className="truncate text-[12px] font-bold text-slate-700">{participant.full_name}</span>
                    </div>
                    {isRequester && <span className="text-[8px] font-bold text-indigo-500 uppercase">Requester</span>}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error ? <p className="p-3 rounded-xl bg-red-50 text-[10px] font-bold text-red-600 border border-red-100">{error}</p> : null}
        {successMessage ? <p className="p-3 rounded-xl bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100">{successMessage}</p> : null}

        <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all">
          {isPending ? "Synchronizing..." : "Submit Proposal"}
        </Button>
      </form>
    </div>
  );
}

