import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/service";

/**
 * API Route: /api/communications/process
 * Processes the pending communication queue (Emails).
 * Can be triggered by a Cron job or a Webhook.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  
  // 1. Fetch pending communications
  const { data: pending, error: fetchError } = await supabase
    .from("communication_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10); // Process in batches

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ success: true, message: "Queue empty" });
  }

  const results = [];

  for (const item of pending) {
    try {
      // Get user email
      const { data: user } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", item.user_id)
        .single();

      if (!user?.email) {
        throw new Error("User email not found");
      }

      // Send Email
      const emailResult = await sendEmail({
        to: user.email,
        subject: item.subject,
        html: `${item.body_html}<br/><hr/><p style="color: #94a3b8; font-size: 10px;">Traceability ID: ${item.entity_id}</p>`,
        headers: {
          "X-Transaction-ID": item.entity_id || "",
          "X-Entity-Type": item.entity_type || "",
          "X-Activity-Type": item.activity_type || "",
        },
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send email");
      }

      // Update status to sent
      await supabase
        .from("communication_queue")
        .update({ 
          status: "sent", 
          processed_at: new Date().toISOString() 
        })
        .eq("id", item.id);

      results.push({ id: item.id, status: "sent" });
    } catch (err: any) {
      console.error(`[CommProcessor] Error processing ${item.id}:`, err.message);
      
      // Update status to failed
      await supabase
        .from("communication_queue")
        .update({ 
          status: "failed", 
          retry_count: (item.retry_count || 0) + 1,
          error_log: err.message 
        })
        .eq("id", item.id);

      results.push({ id: item.id, status: "failed", error: err.message });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, details: results });
}
