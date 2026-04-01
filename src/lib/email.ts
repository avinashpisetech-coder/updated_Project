// @ts-expect-error Could not find a declaration file for module 'nodemailer'
import nodemailer from 'nodemailer';
import { createClient } from "@/lib/supabase/server";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getSystemSettings() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_pass",
        "smtp_secure",
        "smtp_from_address",
        "smtp_from_name"
      ]);
    
    if (!data) return {};
    return Object.fromEntries(data.map(d => [d.key, d.value]));
  } catch (error) {
    console.error("Error fetching system settings for email:", error);
    return {};
  }
}

// Build a transporter based on DB settings or env vars
async function createTransporter() {
  const dbSettings = await getSystemSettings();
  
  const host = dbSettings.smtp_host || process.env.SMTP_HOST;
  const portStr = dbSettings.smtp_port || process.env.SMTP_PORT;
  const port = portStr ? parseInt(portStr, 10) : undefined;
  const user = dbSettings.smtp_user || process.env.SMTP_USER;
  const pass = dbSettings.smtp_pass || process.env.SMTP_PASS;
  
  const secureVal = dbSettings.smtp_secure || process.env.SMTP_SECURE;
  const secure = secureVal
    ? secureVal.toLowerCase() === "true"
    : port === 465;

  if (host && port && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
      secure,
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,   // 5 seconds
      socketTimeout: 10000,    // 10 seconds
    });

    console.log(`[Email Diagnostics] Connecting to ${host}:${port} (Secure: ${secure}) with user: ${user}`);
    try {
      // Use a manual timeout for the verify call just in case
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("SMTP verification timed out after 3s")), 3000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log(`[Email Diagnostics] SMTP Connection Verified Successfully.`);
    } catch (vErr: any) {
      console.error(`[Email Diagnostics] SMTP Verification Failed for ${host}:`, {
        message: vErr.message,
        code: vErr.code,
        command: vErr.command,
        response: vErr.response
      });
    }
    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();
  console.warn("SMTP settings not fully configured (DB or Env); using Ethereal test account: %s / %s", testAccount.user, testAccount.pass);

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

// Helper to resolve from address from DB or env
async function resolveFromAddress() {
  const dbSettings = await getSystemSettings();
  const address = dbSettings.smtp_from_address || process.env.SMTP_FROM || process.env.SMTP_USER;
  const name = dbSettings.smtp_from_name || "EIRMS System";
  
  if (address) {
    return `"${name}" <${address}>`;
  }
  return '"EIRMS System" <no-reply@localhost>';
}

// Helper for sending and logging
async function sendMailWrapper(mailOptions: nodemailer.SendMailOptions) {
  try {
    transporterPromise ??= createTransporter();
    const transporter = await transporterPromise;

    const from = await resolveFromAddress();

    const info = await transporter.sendMail({
      from,
      ...mailOptions
    });

    console.log(`[Email] Notification Sent to ${mailOptions.to}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Preview URL (Ethereal): ${previewUrl}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);

    // Reset cached transporter so next attempt can reinitialize
    transporterPromise = null;
    
    // Don't rethrow - let operations continue even if email fails
    // but log the error for debugging
    return false;
  }
}

export async function sendTicketNotification(toEmail: string, ticketNumber: string, subject: string, description: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `New Ticket Created: [${ticketNumber}] ${subject}`,
    text: `Your ticket has been successfully created.\n\nTicket: ${ticketNumber}\nSubject: ${subject}\n\nDescription:\n${description}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">New Ticket Created</h2>
        <p>Your ticket has been successfully created in the EIRMS system.</p>
        <p><strong>Ticket No:</strong> ${ticketNumber}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold;">Description:</p>
          <p style="white-space: pre-wrap; margin-top: 10px; color: #475569;">${description}</p>
        </div>
      </div>
    `,
  });
}

export async function sendUserCreationNotification(toEmail: string, name: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `Welcome to EIRMS, ${name}! Your Account is Ready`,
    text: `Hello ${name},\n\nYour user account for the EIRMS System has been created successfully. You should receive a separate email to set your initial password.\n\nPlease log in once set up.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Welcome to EIRMS!</h2>
        <p>Hello ${name},</p>
        <p>Your user account for the Enterprise Issue & Request Management System has been created.</p>
        <p>You should have received (or will shortly receive) a separate email containing a link to set your password and activate your account.</p>
      </div>
    `,
  });
}

export async function sendTicketUpdateNotification(toEmail: string, ticketNumber: string, status: string, note: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `Ticket Update: [${ticketNumber}] Status changed to ${status}`,
    text: `Ticket: ${ticketNumber}\nNew Status: ${status}\n\nNote:\n${note}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Ticket Status Updated</h2>
        <p><strong>Ticket No:</strong> ${ticketNumber}</p>
        <p><strong>New Status:</strong> ${status.replace('_', ' ')}</p>
        <div style="margin-top: 15px; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold;">Update Note:</p>
          <p style="white-space: pre-wrap; margin-top: 10px; color: #475569;">${note}</p>
        </div>
      </div>
    `,
  });
}

export async function sendTicketAssignmentNotification(toEmail: string, ticketNumber: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `Ticket Assigned: [${ticketNumber}]`,
    text: `Ticket ${ticketNumber} has been assigned to you.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Ticket Assignment</h2>
        <p>Ticket <strong>${ticketNumber}</strong> has been assigned to you.</p>
        <p>Please log in to the EIRMS system to review.</p>
      </div>
    `,
  });
}

export async function sendTicketReplyNotification(toEmail: string, ticketNumber: string, content: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `New Reply on Ticket [${ticketNumber}]`,
    text: `A new reply has been added to Ticket: ${ticketNumber}\n\nMessage:\n${content}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">New Ticket Reply</h2>
        <p>A new reply has been posted to ticket <strong>${ticketNumber}</strong>.</p>
        <div style="margin-top: 15px; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold;">Message:</p>
          <p style="white-space: pre-wrap; margin-top: 10px; color: #475569;">${content}</p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetNotification(toEmail: string, resetUrl: string) {
  await sendMailWrapper({
    to: toEmail,
    subject: `EIRMS Password Reset`,
    text: `Use this link to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you didn't request this, please ignore this message.</p>
      </div>
    `,
  });
}

export type MeetingInvitePayload = {
  ticketNumber: string;
  ticketSubject: string;
  meetingId: string;
  title: string;
  meetingType: string;
  startsAtIso: string;
  durationMinutes: number;
  agenda?: string | null;
  meetingLink?: string | null;
  location?: string | null;
  participantName?: string | null;
  ticketUrl?: string;
};

function toIcsTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildMeetingIcs(payload: MeetingInvitePayload) {
  const start = new Date(payload.startsAtIso);
  const end = new Date(start.getTime() + payload.durationMinutes * 60 * 1000);
  const description = [
    `Ticket: ${payload.ticketNumber}`,
    `Subject: ${payload.ticketSubject}`,
    payload.agenda ? `Agenda: ${payload.agenda}` : "",
    payload.meetingLink ? `Meeting Link: ${payload.meetingLink}` : "",
    payload.ticketUrl ? `Ticket URL: ${payload.ticketUrl}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const location = payload.location || payload.meetingLink || "TBD";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EIRMS//Ticket Meeting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${payload.meetingId}@eirms.local`,
    `DTSTAMP:${toIcsTimestamp(new Date())}`,
    `DTSTART:${toIcsTimestamp(start)}`,
    `DTEND:${toIcsTimestamp(end)}`,
    `SUMMARY:${escapeIcs(payload.title)} - ${escapeIcs(payload.ticketNumber)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendMeetingInviteNotification(toEmail: string, payload: MeetingInvitePayload) {
  const startsAt = new Date(payload.startsAtIso);
  const endsAt = new Date(startsAt.getTime() + payload.durationMinutes * 60 * 1000);
  const icsContent = buildMeetingIcs(payload);

  await sendMailWrapper({
    to: toEmail,
    subject: `Meeting Scheduled: [${payload.ticketNumber}] ${payload.title}`,
    text: [
      `Hello ${payload.participantName || "there"},`,
      "",
      `A meeting has been scheduled for ticket ${payload.ticketNumber}.`,
      `Title: ${payload.title}`,
      `Type: ${payload.meetingType}`,
      `Start: ${startsAt.toUTCString()}`,
      `End: ${endsAt.toUTCString()}`,
      payload.location ? `Location: ${payload.location}` : "",
      payload.meetingLink ? `Meeting Link: ${payload.meetingLink}` : "",
      payload.agenda ? `Agenda: ${payload.agenda}` : "",
      payload.ticketUrl ? `Ticket: ${payload.ticketUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Meeting Scheduled</h2>
        <p>Hello ${payload.participantName || "there"},</p>
        <p>A meeting has been scheduled for ticket <strong>${payload.ticketNumber}</strong>.</p>
        <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <p><strong>Title:</strong> ${payload.title}</p>
          <p><strong>Type:</strong> ${payload.meetingType.replace("_", " ")}</p>
          <p><strong>Start:</strong> ${startsAt.toUTCString()}</p>
          <p><strong>End:</strong> ${endsAt.toUTCString()}</p>
          ${payload.location ? `<p><strong>Location:</strong> ${payload.location}</p>` : ""}
          ${payload.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${payload.meetingLink}">${payload.meetingLink}</a></p>` : ""}
          ${payload.agenda ? `<p><strong>Agenda:</strong> ${payload.agenda}</p>` : ""}
        </div>
        ${payload.ticketUrl ? `<p style="margin-top: 14px;"><a href="${payload.ticketUrl}">Open ticket</a></p>` : ""}
      </div>
    `,
    attachments: [
      {
        filename: `meeting-${payload.ticketNumber}.ics`,
        content: icsContent,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  });
}
