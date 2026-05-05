/**
 * @/lib/email/index.ts
 * Unified Email Library — Entry Point
 * 
 * All email functions are wired to the real SMTP engine (service.ts).
 * SMTP credentials are read dynamically from system_settings table.
 * All sends are non-blocking / fire-and-forget safe.
 */

export {
  sendEmail,
  sendTicketCreatedEmail,
  sendTicketAssignedEmail,
  sendSLABreachWarningEmail,
  sendTicketResolvedEmail,
  sendTaskAssignedEmail,
  wrapEmailHTML,
} from "./service";

import {
  sendEmail,
  wrapEmailHTML,
} from "./service";

// ─── Legacy / Compatibility Wrappers ────────────────────────────────
// These match the function signatures already called in actions.ts

/** Called after ticket is created — notifies requester/affected person */
export async function sendTicketNotification(
  to: string,
  ticketNumber: string,
  subject: string,
  description: string,
  ticketUrl?: string
) {
  const url = ticketUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/tickets`;
  return sendEmail({
    to,
    subject: `[${ticketNumber}] Support Request Received — ${subject}`,
    html: wrapEmailHTML(
      "Support Request Received",
      `<p>Your request <strong>${ticketNumber}</strong> has been logged and our team will respond shortly.</p>
       <p style="color:#64748b;font-size:13px;">${description?.slice(0, 300) || ""}${description?.length > 300 ? "..." : ""}</p>`,
      url,
      "Track Your Request"
    ),
  });
}

/** Called after ticket is assigned to an agent */
export async function sendTicketAssignmentNotification(
  to: string,
  ticketNumber: string,
  subject?: string,
  ticketUrl?: string
) {
  const url = ticketUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/tickets`;
  return sendEmail({
    to,
    subject: `[ASSIGNED] [${ticketNumber}] Requires your attention`,
    html: wrapEmailHTML(
      "Ticket Assigned to You",
      `<p>Ticket <strong>${ticketNumber}</strong>${subject ? ` — <em>${subject}</em>` : ""} has been assigned to you.</p>
       <p>Please log in to review and respond.</p>`,
      url,
      "Open Ticket"
    ),
  });
}

/** Called when a ticket reply is posted */
export async function sendTicketReplyNotification(
  to: string,
  ticketNumber: string,
  replierName: string,
  message: string,
  ticketUrl?: string
) {
  const url = ticketUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/tickets`;
  return sendEmail({
    to,
    subject: `[REPLY] [${ticketNumber}] ${replierName} responded to your ticket`,
    html: wrapEmailHTML(
      "New Reply on Your Ticket",
      `<p><strong>${replierName}</strong> has posted an update on ticket <strong>${ticketNumber}</strong>:</p>
       <blockquote style="border-left:4px solid #e2e8f0;margin:16px 0;padding:12px 16px;background:#f8fafc;border-radius:0 8px 8px 0;color:#475569;font-style:italic;">
         ${message?.slice(0, 500) || ""}${message?.length > 500 ? "..." : ""}
       </blockquote>`,
      url,
      "View & Reply"
    ),
  });
}

/** Called when ticket properties are updated */
export async function sendTicketUpdateNotification(
  to: string,
  ticketNumber: string,
  updateSummary: string,
  ticketUrl?: string
) {
  const url = ticketUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/tickets`;
  return sendEmail({
    to,
    subject: `[UPDATED] [${ticketNumber}] Ticket status changed`,
    html: wrapEmailHTML(
      "Ticket Updated",
      `<p>Your ticket <strong>${ticketNumber}</strong> has been updated:</p>
       <p style="font-weight:700;color:#1e293b;">${updateSummary}</p>`,
      url,
      "View Ticket"
    ),
  });
}

/** Called when a meeting is scheduled on a ticket */
export async function sendMeetingInviteNotification(
  to: string | string[],
  ticketNumber: string,
  meetingTitle: string,
  meetingDate: string,
  meetingLink?: string
) {
  const url = meetingLink || `${process.env.NEXT_PUBLIC_APP_URL || ""}/tickets`;
  return sendEmail({
    to,
    subject: `[MEETING] [${ticketNumber}] ${meetingTitle} — ${meetingDate}`,
    html: wrapEmailHTML(
      "Meeting Scheduled",
      `<p>A meeting has been scheduled for ticket <strong>${ticketNumber}</strong>.</p>
       <table style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Title</td><td style="font-weight:900;">${meetingTitle}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Date & Time</td><td style="font-weight:700;color:#1e293b;">${meetingDate}</td></tr>
         ${meetingLink ? `<tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Join Link</td><td><a href="${meetingLink}" style="color:#3b82f6;font-weight:700;">${meetingLink}</a></td></tr>` : ""}
       </table>`,
      url,
      meetingLink ? "Join Meeting" : "View Details"
    ),
  });
}

/** Called when a new user is created */
export async function sendUserCreationNotification(
  to: string,
  fullName: string,
  tempPassword: string,
  loginUrl?: string
) {
  const url = loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/login`;
  return sendEmail({
    to,
    subject: "Your ADIOS Platform Account is Ready",
    html: wrapEmailHTML(
      "Welcome to ADIOS Platform",
      `<p>Hi <strong>${fullName}</strong>,</p>
       <p>Your account has been created. Use the credentials below to log in for the first time.</p>
       <table style="width:100%;background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border-collapse:collapse;">
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;width:140px;">Email</td><td style="font-weight:900;">${to}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Password</td><td style="font-weight:900;font-family:monospace;">${tempPassword}</td></tr>
       </table>
       <p style="color:#dc2626;font-size:13px;font-weight:700;">⚠️ Please change your password immediately after first login.</p>`,
      url,
      "Login Now"
    ),
  });
}

/** Called on password reset request */
export async function sendPasswordResetNotification(
  to: string,
  fullName: string,
  resetUrl: string
) {
  return sendEmail({
    to,
    subject: "Password Reset Request — ADIOS Platform",
    html: wrapEmailHTML(
      "Password Reset",
      `<p>Hi <strong>${fullName}</strong>,</p>
       <p>A password reset was requested for your account. Click the button below to set a new password.</p>
       <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you did not request this, please ignore this email.</p>`,
      resetUrl,
      "Reset My Password"
    ),
  });
}
