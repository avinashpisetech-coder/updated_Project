import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CSATClient from "./CSATClient";

export default async function CSATPage({ 
  searchParams 
}: { 
  searchParams: { token?: string; rating?: string } 
}) {
  const token = searchParams.token;
  const preRating = searchParams.rating ? parseInt(searchParams.rating) : undefined;

  if (!token) return notFound();

  const supabase = await createClient();
  
  // Decode token (base64: ticketId:requesterId)
  let ticketId: string, requesterId: string;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    [ticketId, requesterId] = decoded.split(":");
  } catch {
    return notFound();
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, ticket_number, subject, status")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.status !== "resolved") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md w-full">
          <div className="text-5xl mb-6">⚠️</div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Survey Unavailable</h2>
          <p className="text-slate-400 text-sm mt-3">This ticket is not yet resolved or the link has expired.</p>
        </div>
      </div>
    );
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from("ticket_csat")
    .select("rating")
    .eq("ticket_id", ticketId)
    .maybeSingle();

  return (
    <CSATClient
      ticket={ticket}
      requesterId={requesterId}
      preRating={preRating}
      alreadySubmitted={!!existing}
      existingRating={existing?.rating}
    />
  );
}
