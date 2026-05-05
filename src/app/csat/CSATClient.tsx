"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const RATINGS = [
  { value: 1, emoji: "😞", label: "Very Unsatisfied" },
  { value: 2, emoji: "😐", label: "Unsatisfied" },
  { value: 3, emoji: "🙂", label: "Neutral" },
  { value: 4, emoji: "😊", label: "Satisfied" },
  { value: 5, emoji: "🤩", label: "Very Satisfied" },
];

interface Props {
  ticket: { id: string; ticket_number: string; subject: string };
  requesterId: string;
  preRating?: number;
  alreadySubmitted: boolean;
  existingRating?: number;
}

export default function CSATClient({ ticket, requesterId, preRating, alreadySubmitted, existingRating }: Props) {
  const [selected, setSelected] = useState<number>(preRating || existingRating || 0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!selected) { toast.error("Please select a rating"); return; }
    setLoading(true);
    const { error } = await supabase.from("ticket_csat").insert({
      ticket_id: ticket.id,
      requester_id: requesterId,
      rating: selected,
      comment: comment || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Thank You!</h2>
          <p className="text-slate-500 text-sm">Your feedback has been recorded. It helps us serve you better.</p>
          <div className="mt-6 text-4xl">{RATINGS.find(r => r.value === (selected || existingRating))?.emoji}</div>
          <p className="mt-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            {RATINGS.find(r => r.value === (selected || existingRating))?.label}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-10 shadow-xl max-w-lg w-full border border-slate-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-slate-900 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            {ticket.ticket_number}
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">How did we do?</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Please rate your experience with the resolution of: <strong>{ticket.subject}</strong>
          </p>
        </div>

        {/* Rating Selector */}
        <div className="flex justify-center gap-4 mb-8">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all w-16 ${
                selected === r.value
                  ? "border-slate-900 bg-slate-900 scale-110 shadow-xl"
                  : "border-slate-100 hover:border-slate-300 hover:scale-105"
              }`}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className={`text-[8px] font-black uppercase tracking-wider leading-tight text-center ${
                selected === r.value ? "text-white" : "text-slate-400"
              }`}>
                {r.value}
              </span>
            </button>
          ))}
        </div>

        {selected > 0 && (
          <p className="text-center text-sm font-bold text-slate-600 mb-6">
            {RATINGS.find(r => r.value === selected)?.label}
          </p>
        )}

        {/* Comment */}
        <Textarea
          placeholder="Optional: Share additional feedback..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-2xl border-slate-100 bg-slate-50 text-sm min-h-[100px] mb-6 resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={loading || !selected}
          className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-black uppercase tracking-widest transition-all"
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  );
}
