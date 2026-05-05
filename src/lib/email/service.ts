/**
 * Email Service — Core Notification Engine
 * Reads SMTP config from system_settings table and sends transactional emails.
 * Works server-side only (Next.js Server Actions / API routes).
 */
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

/** Fetch SMTP config from system_settings and create a transporter */
async function getTransporter() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_secure", "smtp_from_address", "smtp_from_name"]);

  if (!data || data.length === 0) {
    throw new Error("SMTP settings not configured. Please configure in Settings → Mail.");
  }

  const cfg: Record<string, string> = {};
  data.forEach(({ key, value }) => { cfg[key] = value; });

  if (!cfg.smtp_host || !cfg.smtp_user) {
    throw new Error("Incomplete SMTP configuration.");
  }

  return {
    transporter: nodemailer.createTransport({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587"),
      secure: cfg.smtp_secure === "true",
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass,
      },
    }),
    from: `"${cfg.smtp_from_name || "ADIOS Platform"}" <${cfg.smtp_from_address || cfg.smtp_user}>`,
  };
}

/** Send a single transactional email */
export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const { transporter, from } = await getTransporter();
    await transporter.sendMail({
      from,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]+>/g, ""),
      headers: payload.headers,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Failed:", err.message);
    return { success: false, error: err.message };
  }
}

/** Base email wrapper with ADIOS branding */
export function wrapEmailHTML(title: string, body: string, ctaUrl?: string, ctaLabel?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;">
          <p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;">ADIOS Enterprise Platform</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">${title}</h1>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="padding:40px;">
          <div style="color:#334155;font-size:14px;line-height:1.7;">
            ${body}
          </div>
          ${ctaUrl ? `
          <div style="margin-top:32px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:12px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:12px;">
              ${ctaLabel || "View Details"}
            </a>
          </div>
          ` : ""}
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">
            This is an automated notification from the ADIOS Platform. Do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Pre-built Email Templates ──────────────────────────────────────

/** Ticket Created */
export async function sendTicketCreatedEmail(opts: {
  to: string; requesterName: string; ticketNumber: string; subject: string; priority: string; ticketUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `[${opts.ticketNumber}] Your support request has been received`,
    html: wrapEmailHTML(
      "Ticket Received",
      `<p>Hi <strong>${opts.requesterName}</strong>,</p>
       <p>Your support request has been successfully submitted. Our team will get back to you shortly.</p>
       <table style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;width:140px;">Ticket #</td><td style="font-weight:900;font-size:14px;">${opts.ticketNumber}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Subject</td><td style="font-weight:600;">${opts.subject}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Priority</td><td><span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;padding:2px 10px;border-radius:6px;text-transform:uppercase;">${opts.priority}</span></td></tr>
       </table>`,
      opts.ticketUrl,
      "Track Your Request"
    ),
  });
}

/** Ticket Assigned to Agent */
export async function sendTicketAssignedEmail(opts: {
  to: string; agentName: string; ticketNumber: string; subject: string; requesterName: string; priority: string; ticketUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `[ASSIGNED] [${opts.ticketNumber}] ${opts.subject}`,
    html: wrapEmailHTML(
      "New Ticket Assigned",
      `<p>Hi <strong>${opts.agentName}</strong>,</p>
       <p>A ticket has been assigned to you and requires your attention.</p>
       <table style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Ticket #</td><td style="font-weight:900;">${opts.ticketNumber}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Subject</td><td style="font-weight:600;">${opts.subject}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Requester</td><td>${opts.requesterName}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Priority</td><td><span style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:900;padding:2px 10px;border-radius:6px;text-transform:uppercase;">${opts.priority}</span></td></tr>
       </table>`,
      opts.ticketUrl,
      "Open Ticket"
    ),
  });
}

/** SLA Breach Warning */
export async function sendSLABreachWarningEmail(opts: {
  to: string; agentName: string; ticketNumber: string; subject: string; dueIn: string; ticketUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `⚠️ SLA BREACH IMMINENT — [${opts.ticketNumber}] ${opts.subject}`,
    html: wrapEmailHTML(
      "⚠️ SLA Breach Warning",
      `<p>Hi <strong>${opts.agentName}</strong>,</p>
       <p style="color:#dc2626;font-weight:700;">This ticket is approaching its SLA deadline and requires <strong>immediate action</strong>.</p>
       <table style="width:100%;background:#fef2f2;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;border:1px solid #fecaca;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Ticket #</td><td style="font-weight:900;color:#dc2626;">${opts.ticketNumber}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Subject</td><td style="font-weight:600;">${opts.subject}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Due In</td><td style="font-weight:900;color:#dc2626;">${opts.dueIn}</td></tr>
       </table>`,
      opts.ticketUrl,
      "Resolve Now"
    ),
  });
}

/** Ticket Resolved — CSAT Request */
export async function sendTicketResolvedEmail(opts: {
  to: string; requesterName: string; ticketNumber: string; subject: string; csatUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `[RESOLVED] [${opts.ticketNumber}] ${opts.subject} — Please rate your experience`,
    html: wrapEmailHTML(
      "Ticket Resolved ✓",
      `<p>Hi <strong>${opts.requesterName}</strong>,</p>
       <p>Your support request <strong>${opts.ticketNumber}</strong> has been resolved. We hope your issue has been fully addressed.</p>
       <p style="margin-top:24px;font-weight:700;color:#1e293b;">How would you rate your experience?</p>
       <div style="margin:16px 0;display:flex;gap:8px;">
         ${[1,2,3,4,5].map(n => `
         <a href="${opts.csatUrl}&rating=${n}" style="display:inline-block;text-decoration:none;width:48px;height:48px;line-height:48px;text-align:center;background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;font-size:20px;">${['😞','😐','🙂','😊','🤩'][n-1]}</a>
         `).join("")}
       </div>
       <p style="color:#94a3b8;font-size:12px;">If your issue is not fully resolved, you can reopen this ticket by replying or clicking below.</p>`,
      opts.csatUrl,
      "Rate & Reopen if needed"
    ),
  });
}

/** Task Assigned (Workspace) */
export async function sendTaskAssignedEmail(opts: {
  to: string; assigneeName: string; taskTitle: string; projectName: string; dueDate?: string; taskUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `[TASK ASSIGNED] ${opts.taskTitle} — ${opts.projectName}`,
    html: wrapEmailHTML(
      "New Task Assigned",
      `<p>Hi <strong>${opts.assigneeName}</strong>,</p>
       <p>A new task has been assigned to you in <strong>${opts.projectName}</strong>.</p>
       <table style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Task</td><td style="font-weight:900;">${opts.taskTitle}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Project</td><td>${opts.projectName}</td></tr>
         ${opts.dueDate ? `<tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Due Date</td><td style="font-weight:700;color:#dc2626;">${opts.dueDate}</td></tr>` : ""}
       </table>`,
      opts.taskUrl,
      "View Task"
    ),
  });
}
