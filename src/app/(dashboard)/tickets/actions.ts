"use server";

import { createClient, getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendMeetingInviteNotification,
  sendTicketAssignmentNotification,
  sendTicketNotification,
  sendTicketReplyNotification,
  sendTicketUpdateNotification,
} from "@/lib/email";
import { ensureProfile } from "@/lib/ensure-profile";
import { format } from "date-fns";

const TICKET_ATTACHMENTS_BUCKET = process.env.NEXT_PUBLIC_TICKET_ATTACHMENTS_BUCKET ?? "ticket-attachments";
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

function normalizeRoleKey(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createTicket(formData: FormData): Promise<{ success: boolean; ticket?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await ensureProfile(supabase, user);

    const moduleId = formData.get("module_id") as string;
    const categoryId = formData.get("category_id") as string;
    const subcategoryId = formData.get("subcategory_id") as string | null;
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string || "low";
    const preferredResolutionDate = formData.get("preferred_resolution_date") as string | null;
    const affectedPerson = formData.get("affected_person") as string | null;
    const affectedAsset = formData.get("affected_asset") as string | null;
    const softwareSystemId = formData.get("software_system_id") as string | null;
    const relatedTicket = formData.get("related_ticket") as string | null;
    const erpModule = formData.get("erp_module") as string | null;
    const erpSubModule = formData.get("erp_sub_module") as string | null;
    const assignedToId = formData.get("assigned_to_id") as string | null;
    const assetId = formData.get("asset_id") as string | null;
    let effectiveAssignedToId = (assignedToId && assignedToId !== "_default") ? assignedToId : null;
    let autoAssigned = false;

    // Default Assignment Logic: If no assignee, find a dept_admin
    if (!effectiveAssignedToId) {
      const { data: defaultAdmin } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("role", "dept_admin")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      
      if (defaultAdmin) {
        effectiveAssignedToId = defaultAdmin.id;
        autoAssigned = true;
      }
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Math.floor(Math.random() * 1000000)}`;

    const insertData: Record<string, unknown> = {
      ticket_number: ticketNumber,
      module_id: moduleId,
      category_id: categoryId,
      subject,
      description,
      priority,
      requester_id: user.id,
      created_by_id: user.id,
      status: effectiveAssignedToId ? "assigned" : "new"
    };

    if (effectiveAssignedToId) insertData.assigned_to_id = effectiveAssignedToId;
    if (subcategoryId) insertData.subcategory_id = subcategoryId;
    if (preferredResolutionDate) insertData.preferred_resolution_date = preferredResolutionDate;
    if (affectedPerson && affectedPerson !== "_none") insertData.affected_person_id = affectedPerson;
    if (assetId && assetId !== "_none") insertData.asset_id = assetId;
    
    const metadata: Record<string, unknown> = {};
    if (affectedAsset) metadata.affected_asset = affectedAsset;
    if (softwareSystemId) metadata.software_system_id = softwareSystemId;
    if (relatedTicket) metadata.related_ticket = relatedTicket;
    if (erpModule) metadata.erp_module = erpModule;
    if (erpSubModule) metadata.erp_sub_module = erpSubModule;
    
    if (Object.keys(metadata).length > 0) {
      insertData.metadata = metadata;
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      return { success: false, error: `Database Error: ${error.message}` };
    }

    // Email notification
    let notificationEmail: string | null = null;

    if (affectedPerson) {
      const { data: affectedProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", affectedPerson)
        .single();
      notificationEmail = affectedProfile?.email ?? null;
    }

    if (!notificationEmail) {
      notificationEmail = user.email ?? null;
    }

    // Log activity
    const { error: activityError } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticket.id,
      actor_id: user.id,
      activity_type: "status_change",
      content: "Added ticket",
      new_value: ticketNumber,
      is_internal: false
    });

    if (activityError && process.env.NODE_ENV !== "production") {
      console.warn("Failed to log ticket creation activity:", activityError.message);
    }

    if (notificationEmail) {
      sendTicketNotification(notificationEmail, ticketNumber, subject, description)
        .catch(emailError => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Ticket email notification failed:", emailError);
          }
        });
    }

    // New: If assigned, also notify the assignee
    if (effectiveAssignedToId) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", effectiveAssignedToId)
        .single();
      
      if (assignee?.email) {
        sendTicketAssignmentNotification(assignee.email, ticketNumber)
          .catch(emailError => {
            if (process.env.NODE_ENV !== "production") {
              console.warn("Assignee email notification failed:", emailError);
            }
          });
      }
    }

    revalidatePath("/tickets");
    return { success: true, ticket };
  } catch (err: any) {
    console.error("Unhandle error in createTicket:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

function generateMeetingUrl(toolId: string, interactionId: string): string {
  const iid = (interactionId || "").replace(/[^a-z0-9-]/gi, ''); // Clean for Jitsi/Teams
  switch (toolId) {
    case 'jitsi':
      // Jitsi Meet: Fully Automated & Robust
      return `https://meet.jit.si/${iid}`;
    case 'google_meet':
      // Google Meet codes must be strictly alphabetic [a-z]
      // Map numeric digits to a-j to preserve uniqueness while staying alphabetic
      const charMap: Record<string, string> = {
        '0':'a','1':'b','2':'c','3':'d','4':'e','5':'f','6':'g','7':'h','8':'i','9':'j'
      };
      const alphabeticIid = iid.toLowerCase().split('').map(char => charMap[char] || char).join('').replace(/[^a-z]/g, '');
      const seed = alphabeticIid.slice(-10).padEnd(10, 'x'); // Ensure 10 chars
      return `https://meet.google.com/${seed.slice(0,3)}-${seed.slice(3,7)}-${seed.slice(7,10)}`;
    case 'teams':
      return `https://teams.microsoft.com/l/meetup-join/${iid}`;
    case 'zoom':
      const zoomId = iid.replace(/[^0-9]/g, '').slice(-10) || Math.floor(Math.random() * 10000000000).toString();
      return `https://zoom.us/j/${zoomId}`;
    default:
      return "";
  }
}

export async function scheduleTicketMeeting(formData: FormData): Promise<{ success: boolean; meetingId?: string; error?: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await ensureProfile(supabase, user);

    const ticketId = (formData.get("ticket_id") as string | null) ?? "";
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const meetingType = (formData.get("meeting_type") as string | null) ?? "online";
    const meetingDate = (formData.get("meeting_date") as string | null) ?? "";
    const meetingTime = (formData.get("meeting_time") as string | null) ?? "";
    const durationMinutes = Number(formData.get("duration_minutes") ?? 30);
    const meetingTool = (formData.get("meeting_tool") as string | null) ?? "";
    let meetingLink = (formData.get("meeting_link") as string | null)?.trim() || null;
    const location = (formData.get("location") as string | null)?.trim() || null;
    const agenda = (formData.get("agenda") as string | null)?.trim() || null;
    const participantIdsRaw = (formData.get("participant_ids") as string | null) ?? "[]";

    if (!ticketId || !title || !meetingDate || !meetingTime || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      return { success: false, error: "Missing required meeting details" };
    }

    if (!["online", "physical", "phone_call"].includes(meetingType)) {
      return { success: false, error: "Invalid meeting type" };
    }

    const startsAt = new Date(`${meetingDate}T${meetingTime}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      return { success: false, error: "Invalid meeting date/time" };
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, ticket_number, subject, status, requester_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return { success: false, error: "Ticket not found" };
    }

    const participantIds = new Set<string>();
    participantIds.add(ticket.requester_id);

    try {
      const parsedParticipantIds = JSON.parse(participantIdsRaw) as string[];
      for (const participantId of parsedParticipantIds) {
        if (typeof participantId === "string" && participantId) {
          participantIds.add(participantId);
        }
      }
    } catch {
      return { success: false, error: "Invalid participants payload" };
    }

    const interactionId = `${ticket.ticket_number}-${format(startsAt, "yyyyMMdd")}-${Math.floor(Math.random() * 9000 + 1000)}`;

    if (meetingType === "online" && meetingTool && !meetingLink) {
      meetingLink = generateMeetingUrl(meetingTool, interactionId);
    }

    const { data: meeting, error: meetingError } = await supabase
      .from("ticket_meetings")
      .insert({
        ticket_id: ticketId,
        title,
        meeting_type: meetingType,
        starts_at: startsAt.toISOString(),
        duration_minutes: durationMinutes,
        meeting_link: meetingLink,
        meeting_tool: meetingType === "online" ? meetingTool : null,
        location,
        agenda,
        status: "scheduled",
        previous_ticket_status: ticket.status,
        interaction_id: interactionId,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (meetingError || !meeting) {
      console.error("Error scheduling meeting:", meetingError);
      return { success: false, error: "Failed to schedule meeting" };
    }

    const participantsToInsert = Array.from(participantIds).map((profileId) => ({
      meeting_id: meeting.id,
      profile_id: profileId,
    }));

    if (participantsToInsert.length > 0) {
      const { error: participantError } = await supabase
        .from("ticket_meeting_participants")
        .insert(participantsToInsert);

      if (participantError) {
        console.error("Error saving meeting participants:", participantError);
      }
    }

    const { error: statusError } = await supabase
      .from("tickets")
      .update({ status: "scheduled" })
      .eq("id", ticketId);

    if (statusError) {
      return { success: false, error: "Failed to update ticket status to scheduled" };
    }

    const { error: activityError } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: "meeting_scheduled",
      content: `Meeting scheduled: ${title}`,
      new_value: "scheduled",
      metadata: {
        meeting_id: meeting.id,
        starts_at: startsAt.toISOString(),
        duration_minutes: durationMinutes,
        meeting_type: meetingType,
      },
      is_internal: false,
    });

    if (activityError && process.env.NODE_ENV !== "production") {
      console.warn("Failed to log meeting activity:", activityError.message);
    }

    const participantIdList = Array.from(participantIds);
    if (participantIdList.length > 0) {
      const { data: participants } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", participantIdList);

      if (participants && participants.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const ticketUrl = appUrl ? `${appUrl}/tickets/${ticketId}` : "";

        await Promise.all(
          participants
            .filter((participant) => Boolean(participant.email))
            .map((participant) =>
              sendMeetingInviteNotification(participant.email as string, {
                ticketNumber: ticket.ticket_number,
                ticketSubject: ticket.subject,
                meetingId: meeting.id,
                title,
                meetingType,
                startsAtIso: startsAt.toISOString(),
                durationMinutes,
                agenda,
                meetingLink,
                location,
                participantName: participant.full_name,
                ticketUrl,
              }),
            ),
        );
      }
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");

    return { success: true, meetingId: meeting.id, error: null };
  } catch (err: any) {
    console.error("Unhandled error in scheduleTicketMeeting:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

export async function initializeMeetingTool(
  meetingId: string, 
  toolId: 'jitsi' | 'google_meet' | 'teams' | 'zoom'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: meeting, error: meetingError } = await supabase
      .from("ticket_meetings")
      .select("*, ticket:tickets(ticket_number)")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) return { success: false, error: "Meeting not found" };

    const generatedUrl = generateMeetingUrl(toolId, meeting.interaction_id || "");

    const { error: updateError } = await supabase
      .from("ticket_meetings")
      .update({
        meeting_tool: toolId,
        meeting_link: generatedUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", meetingId);

    if (updateError) return { success: false, error: "Failed to initialize tool" };

    revalidatePath(`/tickets/${meeting.ticket_id}/meetings/${meeting.id}`);
    revalidatePath(`/tickets/${meeting.ticket_id}`);
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in initializeMeetingTool:", err);
    return { success: false, error: err.message };
  }
}

export async function assignTicket(ticketId: string, assigneeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    await ensureProfile(supabase, user);

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!actorProfile) {
      return { success: false, error: "Profile not found" };
    }

    const allowedRoles = ["super_admin", "dept_admin", "module_agent"];
    const actorRole = normalizeRoleKey(actorProfile.role);
    if (!allowedRoles.includes(actorRole)) {
      return { success: false, error: "Insufficient permissions to assign tickets" };
    }

    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("id, status, ticket_number, requester_id, assigned_to_id")
      .eq("id", ticketId)
      .single();

    if (!currentTicket) return { success: false, error: "Ticket not found" };

    // New: Restriction Logic
    // If ticket is ALREADY assigned, only Super Admin or Dept Admin can change it.
    const isAdmin = ["super_admin", "dept_admin"].includes(actorRole);
    if (currentTicket.assigned_to_id && !isAdmin) {
      return { success: false, error: "Only Administrators can change an existing assignment." };
    }

    const { data: assigneeProfile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", assigneeId)
      .single();

    if (!assigneeProfile) return { success: false, error: "Assignee not found" };

    const updatePayload: Record<string, any> = { assigned_to_id: assigneeId };
    if (currentTicket.status === "new") {
      updatePayload.status = "assigned";
    }

    const { error } = await supabase
      .from("tickets")
      .update(updatePayload)
      .eq("id", ticketId);

    if (error) return { success: false, error: "Failed to assign ticket" };

    // Note: ticket_activity_log and ticket_notifications are handled by trg_fn_ticket_assignment_notify in DB.

    // Note: Internal ticket_notifications for requester and assignee are mostly handled by DB triggers.
    // We keep the requester notification here if it's not handled by the trigger or for extra clarity.
    if (currentTicket.requester_id && currentTicket.requester_id !== assigneeId) {
      await supabase.from("ticket_notifications").insert({
        user_id: currentTicket.requester_id,
        ticket_id: ticketId,
        message: `Ticket ${currentTicket.ticket_number} has been assigned to ${assigneeProfile.full_name ?? "a user"}.`,
      });
    }

    if (assigneeProfile.email && currentTicket.ticket_number) {
      sendTicketAssignmentNotification(assigneeProfile.email, currentTicket.ticket_number)
        .catch(emailError => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Assignment email notification failed:", emailError);
          }
        });
    }

    if (currentTicket.requester_id && currentTicket.ticket_number) {
      const { data: requester } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", currentTicket.requester_id)
        .single();

      if (requester?.email) {
        sendTicketUpdateNotification(
          requester.email,
          currentTicket.ticket_number,
          "assigned",
          `Ticket assigned to ${assigneeProfile.full_name ?? "a user"}.`,
        ).catch(emailError => {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Requester email notification failed:", emailError);
          }
        });
      }
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in assignTicket:", err);
    return { success: false, error: err.message || "Failed to assign ticket" };
  }
}

export async function uploadTicketAttachment(ticketId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await ensureProfile(supabase, user);

  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["super_admin", "dept_admin", "module_agent"];
  if (!actorProfile || !allowedRoles.includes(normalizeRoleKey(actorProfile.role))) {
    throw new Error("Insufficient permissions to upload attachments");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("No file provided");
  }

  if (file.size <= 0) {
    throw new Error("File is empty");
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error("File exceeds 10MB limit");
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", ticketId)
    .single();

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ticketId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(TICKET_ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.toLowerCase().includes("bucket not found")) {
      throw new Error(`Storage error: The bucket '${TICKET_ATTACHMENTS_BUCKET}' was not found. Please ensure v047_setup_storage_buckets.sql has been run.`);
    }
    throw new Error(`Failed to upload attachment: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    uploaded_by: user.id,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type || "application/octet-stream",
    storage_path: storagePath,
    is_chat_attachment: false,
  });

  if (insertError) {
    throw new Error("Failed to save attachment record");
  }

  const { error: activityError } = await supabase.from("ticket_activity_log").insert({
    ticket_id: ticketId,
    actor_id: user.id,
    activity_type: "public_reply",
    content: `Added attachment: ${file.name}`,
    is_internal: false,
  });

  if (activityError && process.env.NODE_ENV !== "production") {
    console.warn("Failed to log attachment activity:", activityError.message);
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");

  return { success: true };
}

export async function updateTicketStatus(
  ticketId: string, 
  newStatus: string, 
  note: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!note?.trim()) return { success: false, error: "A status description is required" };

    await ensureProfile(supabase, user);

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const allowedRoles = ["super_admin", "dept_admin", "module_agent"];
    if (!actorProfile || !allowedRoles.includes(normalizeRoleKey(actorProfile.role))) {
      return { success: false, error: "Insufficient permissions to update ticket status" };
    }

    const normalizedStatus = String(newStatus || "").trim().toLowerCase().replace(/\s+/g, "_");

    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("status, ticket_number, requester_id, assigned_to_id")
      .eq("id", ticketId)
      .single();

    if (!currentTicket) return { success: false, error: "Ticket not found" };

    const { error } = await supabase
      .from("tickets")
      .update({ status: normalizedStatus })
      .eq("id", ticketId);

    if (error) return { success: false, error: "Failed to update status" };

    // Note: ticket_activity_log for 'resolved' status is handled by trg_fn_ticket_resolved_notify.
    // For other statuses, we still need manual logging here.
    if (normalizedStatus !== "resolved") {
      const { error: statusActivityError } = await supabase.from("ticket_activity_log").insert({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: note.trim(),
        old_value: currentTicket.status,
        new_value: normalizedStatus,
        is_internal: false
      });

      if (statusActivityError && process.env.NODE_ENV !== "production") {
        console.warn("Failed to log status activity:", statusActivityError.message);
      }
    }

    // Note: ticket_notifications for 'resolved' is handled by DB triggers.
    if (normalizedStatus !== "resolved") {
      if (currentTicket.requester_id) {
        await supabase.from("ticket_notifications").insert({
          user_id: currentTicket.requester_id,
          ticket_id: ticketId,
          message: `Ticket ${currentTicket.ticket_number} moved to ${normalizedStatus.replace(/_/g, " ")}. ${note.trim()}`,
        });
      }

      if (currentTicket.assigned_to_id && currentTicket.assigned_to_id !== currentTicket.requester_id) {
        await supabase.from("ticket_notifications").insert({
          user_id: currentTicket.assigned_to_id,
          ticket_id: ticketId,
          message: `Ticket ${currentTicket.ticket_number} status changed to ${normalizedStatus.replace(/_/g, " ")}.`,
        });
      }
    }

    const recipients = [currentTicket.requester_id, currentTicket.assigned_to_id]
      .filter((id): id is string => Boolean(id));

    if (recipients.length > 0) {
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", recipients);

      const uniqueEmails = Array.from(
        new Set((recipientProfiles ?? []).map((row) => row.email).filter((email): email is string => Boolean(email))),
      );

      await Promise.all(
        uniqueEmails.map((email) =>
          sendTicketUpdateNotification(email, currentTicket.ticket_number, normalizedStatus, note.trim()).catch(
            (emailError) => {
              if (process.env.NODE_ENV !== "production") {
                console.warn("Status update email notification failed:", emailError);
              }
            }
          )
        ),
      );
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTicketStatus:", err);
    return { success: false, error: err.message || "Failed to update status" };
  }
}

/**
 * Registers a manual activity performed on a ticket.
 * This activity is specifically flagged for the 'Manual Activity' block.
 */
export async function registerTicketActivity(
  ticketId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!content?.trim()) return { success: false, error: "Content is required" };

    await ensureProfile(supabase, user);

    const { data: ticket } = await supabase
      .from("tickets")
      .select("status")
      .eq("id", ticketId)
      .single();

    if (!ticket) return { success: false, error: "Ticket not found" };

    const { error } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: "public_reply", // Use public_reply for visibility
      content: content.trim(),
      metadata: { manual_activity: true },
      old_value: ticket.status,
      new_value: ticket.status,
      is_internal: false
    });

    if (error) throw error;

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath(`/tickets/${ticketId}/audit`);
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in registerTicketActivity:", err);
    return { success: false, error: err.message || "Failed to register activity" };
  }
}

export async function submitTicketReply(
  ticketId: string, 
  replyContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };
    if (!replyContent?.trim()) return { success: false, error: "Reply content cannot be empty" };

    await ensureProfile(supabase, user);

    // 1. Get ticket info to verify requester and get assigned_to
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("status, ticket_number, requester_id, assigned_to_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) return { success: false, error: "Ticket not found" };

    // 2. Update status to 'replied' if it was not already or if requester replies
    // If the actor is the requester, always move to 'replied' unless closed/resolved
    const isRequester = user.id === ticket.requester_id;
    let statusToUpdate = ticket.status;
    
    if (isRequester && !["closed", "resolved"].includes(ticket.status)) {
      statusToUpdate = "replied";
    } else if (ticket.status === "pending_user") {
      statusToUpdate = "replied";
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update({ 
        status: statusToUpdate, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", ticketId);

    if (updateError) return { success: false, error: "Failed to update ticket status" };

    // 3. Log the reply activity
    const { error: activityError } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: "public_reply",
      content: replyContent.trim(),
      old_value: ticket.status,
      new_value: statusToUpdate,
      is_internal: false
    });

    if (activityError) {
      console.warn("Failed to log reply activity:", activityError.message);
    }

    // 4. Send notification to the assigned agent if one exists
    if (ticket.assigned_to_id) {
       const { data: agent } = await supabase
         .from("profiles")
         .select("email")
         .eq("id", ticket.assigned_to_id)
         .single();
       
       if (agent?.email) {
         try {
           await sendTicketReplyNotification(agent.email, ticket.ticket_number || "TKT", replyContent.slice(0, 500));
         } catch (e) {
           console.warn("Reply notification failed:", e);
         }
       }
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("Error in submitTicketReply:", err);
    return { success: false, error: "Internal system error" };
  }
}
export async function updateTicketTeam(ticketId: string, teamMembers: string[]) {
  // This is a helper that could also be integrated into updateTicket
}

export interface UpdateTicketPayload {
  status?: string;
  priority?: string;
  subject?: string;
  description?: string;
  assigned_to_id?: string | null;
  category_id?: string | null;
  module_id?: string | null;
  sla_due_date?: string | null;
  team_members?: string[];
  note?: string;
  is_internal_note?: boolean;
  drafting_duration_seconds?: number;
}

export async function updateTicket(
  ticketId: string,
  payload: UpdateTicketPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("status, ticket_number, requester_id, assigned_to_id, metadata, sla_due_date, subject, description, priority, category_id, module_id")
      .eq("id", ticketId)
      .single();

    if (!currentTicket) return { success: false, error: "Ticket not found" };

    const updateData: Record<string, any> = {};
    const activities: any[] = [];

    // 1. Core Metadata Updates
    if (payload.subject !== undefined && payload.subject !== currentTicket.subject) {
      updateData.subject = payload.subject;
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: `Subject modified: ${payload.subject}`,
        old_value: currentTicket.subject,
        new_value: payload.subject
      });
    }

    if (payload.description !== undefined && payload.description !== currentTicket.description) {
      updateData.description = payload.description;
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: "Description updated",
        old_value: "PRIOR_DESC",
        new_value: "UPDATED_DESC"
      });
    }

    if (payload.priority !== undefined && payload.priority !== currentTicket.priority) {
      updateData.priority = payload.priority;
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: `Priority shifted to ${payload.priority.toUpperCase()}`,
        old_value: currentTicket.priority,
        new_value: payload.priority
      });
    }

    if (payload.category_id !== undefined && payload.category_id !== currentTicket.category_id) {
      updateData.category_id = payload.category_id;
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: "Category reclassified",
        old_value: currentTicket.category_id,
        new_value: payload.category_id
      });
    }

    if (payload.module_id !== undefined && payload.module_id !== currentTicket.module_id) {
      updateData.module_id = payload.module_id;
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: "Module origin reassigned",
        old_value: currentTicket.module_id,
        new_value: payload.module_id
      });
    }

    // 2. Status Update
    const isStatusChanging = payload.status && payload.status !== currentTicket.status;
    if (isStatusChanging) {
      updateData.status = payload.status;
      
      const notePrefix = payload.note && payload.note.trim() ? `Note: ${payload.note.trim()}` : "";
      const defaultContent = `Status changed from ${currentTicket.status} to ${payload.status}`;
      
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: notePrefix || defaultContent,
        metadata: { 
          old_status: currentTicket.status, 
          new_status: payload.status,
          duration: payload.drafting_duration_seconds 
        },
      });
    }

    // 3. Assignment Update
    if (payload.assigned_to_id !== undefined && payload.assigned_to_id !== currentTicket.assigned_to_id) {
      updateData.assigned_to_id = payload.assigned_to_id;
      if (!updateData.status && currentTicket.status === "new" && payload.assigned_to_id) {
        updateData.status = "assigned";
      }
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "status_change",
        content: payload.assigned_to_id ? "Ticket assigned" : "Ticket unassigned",
        new_value: payload.assigned_to_id,
      });
    }

    // 4. Deadline Update
    if (payload.sla_due_date !== undefined) {
      const newDeadline = payload.sla_due_date ? new Date(payload.sla_due_date).toISOString() : null;
      if (newDeadline !== currentTicket.sla_due_date) {
        updateData.sla_due_date = newDeadline;
        activities.push({
          ticket_id: ticketId,
          actor_id: user.id,
          activity_type: "status_change",
          content: newDeadline ? `Deadline updated to ${new Date(newDeadline).toLocaleString()}` : "Deadline cleared",
          is_internal: true,
        });
      }
    }

    // 5. Team Members Update (Metadata)
    if (payload.team_members !== undefined) {
      const currentMetadata = currentTicket.metadata || {};
      const newMetadata = { ...currentMetadata, team_members: payload.team_members };
      
      const currentTeams = currentMetadata.team_members || [];
      if (JSON.stringify(currentTeams.sort()) !== JSON.stringify(payload.team_members.sort())) {
        updateData.metadata = newMetadata;
        activities.push({
          ticket_id: ticketId,
          actor_id: user.id,
          activity_type: "status_change",
          content: `Team members updated: ${payload.team_members.length} members`,
          is_internal: true,
        });
      }
    }

    // 6. Standalone Action Narrative
    if (!isStatusChanging && !updateData.subject && !updateData.description && payload.note && payload.note.trim()) {
      activities.push({
        ticket_id: ticketId,
        actor_id: user.id,
        activity_type: "public_reply",
        content: payload.note.trim(),
        metadata: { manual_activity: true },
        old_value: currentTicket.status,
        new_value: currentTicket.status,
        is_internal: false
      });
    }

    if (Object.keys(updateData).length === 0 && activities.length === 0) {
      return { success: true };
    }

    const operations = [];

    if (Object.keys(updateData).length > 0) {
      operations.push(
        supabase
          .from("tickets")
          .update(updateData)
          .eq("id", ticketId)
          .then(res => { if (res.error) throw res.error; })
      );
    }

    if (activities.length > 0) {
      operations.push(
        supabase
          .from("ticket_activity_log")
          .insert(activities)
          .then(res => { if (res.error) throw res.error; })
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }

    // 7. Background Notifications (Non-blocking)
    if (payload.status) {
       const emails = [];
       if (currentTicket.requester_id) {
         emails.push(supabase.from("profiles").select("email").eq("id", currentTicket.requester_id).single());
       }
       if (currentTicket.assigned_to_id) {
         emails.push(supabase.from("profiles").select("email").eq("id", currentTicket.assigned_to_id).single());
       }
       
       Promise.all(emails).then(res => {
          const uniqueEmails = Array.from(new Set(res.map(r => r.data?.email).filter(Boolean)));
          uniqueEmails.forEach(email => {
            sendTicketUpdateNotification(email!, currentTicket.ticket_number, payload.status!, payload.note || "Ticket status modified.")
              .catch(e => console.warn("Background notification failed:", e));
          });
       }).catch(e => console.warn("Email resolution failed:", e));
    }

    // 8. Parallel Revalidation
    await Promise.all([
      revalidatePath(`/tickets/${ticketId}`),
      revalidatePath("/tickets"),
      revalidatePath("/dashboard")
    ]);

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTicket consolidated:", err);
    return { success: false, error: err.message || "Failed to update ticket" };
  }
}


export async function updateTicketDeadline(ticketId: string, deadline: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    await ensureProfile(supabase, user);

    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const allowedRoles = ["super_admin", "dept_admin", "module_agent"];
    if (!actorProfile || !allowedRoles.includes(normalizeRoleKey(actorProfile.role))) {
      return { success: false, error: "Insufficient permissions to update ticket deadline" };
    }

    const { data: currentTicket } = await supabase
      .from("tickets")
      .select("ticket_number, sla_due_date")
      .eq("id", ticketId)
      .single();

    if (!currentTicket) return { success: false, error: "Ticket not found" };

    const isoDeadline = deadline ? new Date(deadline).toISOString() : null;

    const { error } = await supabase
      .from("tickets")
      .update({ 
        sla_due_date: isoDeadline 
      })
      .eq("id", ticketId);

    if (error) return { success: false, error: "Failed to update deadline" };

    const { error: deadlineActivityError } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: "status_change",
      content: deadline ? `Updated deadline to ${new Date(deadline).toLocaleString()}` : "Cleared deadline",
      old_value: currentTicket.sla_due_date,
      new_value: isoDeadline,
      is_internal: true
    });

    if (deadlineActivityError && process.env.NODE_ENV !== "production") {
      console.warn("Failed to log deadline activity:", deadlineActivityError.message);
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTicketDeadline:", err);
    return { success: false, error: err.message || "Failed to update deadline" };
  }
}

export async function addTicketReply(
  ticketId: string, 
  content: string, 
  isInternal: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    await ensureProfile(supabase, user);

    const { error } = await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: isInternal ? "internal_note" : "public_reply",
      content,
      is_internal: isInternal
    });

    if (error) return { success: false, error: "Failed to add reply" };

    if (!isInternal) {
      // Trigger Email
      const { data: ticket } = await supabase.from("tickets").select("ticket_number, requester_id").eq("id", ticketId).single();
      if (ticket && ticket.requester_id !== user.id) {
        const { data: requester } = await supabase.from("profiles").select("email").eq("id", ticket.requester_id).single();
        if (requester?.email) {
          await sendTicketReplyNotification(requester.email, ticket.ticket_number, content);
        }
      }
    }

    revalidatePath(`/tickets/${ticketId}`);
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in addTicketReply:", err);
    return { success: false, error: err.message || "Failed to add reply" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2A: Notifications
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all unread notifications for the currently logged-in user. */
export async function getUnreadNotifications() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ticket_notifications")
    .select("id, ticket_id, message, is_read, created_at, tickets!ticket_notifications_ticket_id_fkey(ticket_number)")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data ?? [];
}

/** Mark one or more notification IDs as read. */
export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("ticket_notifications")
    .update({ is_read: true })
    .in("id", ids)
    .eq("user_id", user.id);
  revalidatePath("/dashboard");
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2A: SLA aging (pure function — safe to call from client bundle too)
// ─────────────────────────────────────────────────────────────────────────────

export async function computeTicketAge(
  createdAt: string,
  resolvedAt: string | null,
  status: string,
): Promise<{
  displayText: string;
  totalMinutes: number;
  slaFlag: "overdue" | "new" | "normal" | "resolved";
}> {
  const isResolved = status === "resolved" || status === "closed";
  const base = new Date(createdAt).getTime();
  const end = isResolved && resolvedAt
    ? new Date(resolvedAt).getTime()
    : Date.now();

  const diffMs = Math.max(0, end - base);
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  const displayText = `${days} Days, ${hours} Hours, ${mins} Minutes`;

  let slaFlag: "overdue" | "new" | "normal" | "resolved";
  if (isResolved)               slaFlag = "resolved";
  else if (totalMinutes > 2880) slaFlag = "overdue";
  else if (totalMinutes < 1440) slaFlag = "new";
  else                          slaFlag = "normal";

  return { displayText, totalMinutes, slaFlag };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2A: Admin Workflow — Resolve ticket
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveTicket(
  ticketId: string, 
  note = "Ticket resolved by agent."
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    const allowedRoles = ["super_admin", "dept_admin", "module_agent"];
    if (!profile || !allowedRoles.includes(normalizeRoleKey(profile.role))) {
      return { success: false, error: "Insufficient permissions to resolve tickets" };
    }

    return updateTicketStatus(ticketId, "resolved", note);
  } catch (err: any) {
    console.error("Error in resolveTicket:", err);
    return { success: false, error: err.message || "Failed to resolve ticket" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2A: Requester Workflow — Approve closing or Re-open
// ─────────────────────────────────────────────────────────────────────────────

export async function approveTicketClose(ticketId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: ticket } = await supabase
      .from("tickets")
      .select("status, requester_id, ticket_number, assigned_to_id")
      .eq("id", ticketId)
      .single();

    if (!ticket) return { success: false, error: "Ticket not found" };
    if (ticket.status !== "resolved") return { success: false, error: "Ticket is not in Resolved state" };

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    if (ticket.requester_id !== user.id && normalizeRoleKey(profile?.role) !== "super_admin") {
      return { success: false, error: "Only the ticket requester may approve closing" };
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "closed" })
      .eq("id", ticketId);

    if (error) return { success: false, error: "Failed to close ticket" };

    // Note: Activity log and external notifications for 'closed' are handled by trg_fn_ticket_closed_log in DB.
    if (ticket.assigned_to_id) {
      await supabase.from("ticket_notifications").insert({
        user_id: ticket.assigned_to_id,
        ticket_id: ticketId,
        message: `Requester approved closure for ticket ${ticket.ticket_number}.`,
      });
    }

    const { data: requester } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", ticket.requester_id)
      .single();

    if (requester?.email) {
      await sendTicketUpdateNotification(
        requester.email,
        ticket.ticket_number,
        "closed",
        "Your ticket has been closed after your approval.",
      ).catch(e => console.warn("Closure notification failed:", e));
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in approveTicketClose:", err);
    return { success: false, error: err.message || "Failed to close ticket" };
  }
}

export async function reopenTicket(
  ticketId: string, 
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!reason?.trim()) return { success: false, error: "A reason is required to re-open a ticket" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: ticket } = await supabase
      .from("tickets")
      .select("status, requester_id, ticket_number, assigned_to_id")
      .eq("id", ticketId)
      .single();

    if (!ticket) return { success: false, error: "Ticket not found" };
    if (ticket.status !== "resolved") return { success: false, error: "Only resolved tickets can be re-opened" };

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();

    if (ticket.requester_id !== user.id && normalizeRoleKey(profile?.role) !== "super_admin") {
      return { success: false, error: "Only the ticket requester may re-open this ticket" };
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "in_progress", resolved_at: null })
      .eq("id", ticketId);

    if (error) return { success: false, error: "Failed to re-open ticket" };

    await supabase.from("ticket_activity_log").insert({
      ticket_id: ticketId,
      actor_id: user.id,
      activity_type: "status_change",
      content: `Ticket re-opened by requester. Reason: ${reason}`,
      old_value: "resolved",
      new_value: "in_progress",
      is_internal: false,
    });

    if (ticket.assigned_to_id) {
      await supabase.from("ticket_notifications").insert({
        user_id: ticket.assigned_to_id,
        ticket_id: ticketId,
        message: `Ticket ${ticket.ticket_number} was re-opened by the requester. Reason: ${reason}`,
      });
    }

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (err: any) {
    console.error("Error in reopenTicket:", err);
    return { success: false, error: err.message || "Failed to re-open ticket" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2B: Metadata Management
// ─────────────────────────────────────────────────────────────────────────────

export async function getTicketMetadataOptions() {
  const supabase = await createClient();
  
  const [modulesRes, categoriesRes] = await Promise.all([
    supabase.from("modules").select("id, name").order("name"),
    supabase.from("ticket_categories").select("id, name").order("name")
  ]);

  return {
    modules: modulesRes.data || [],
    categories: categoriesRes.data || [],
    priorities: [
      { id: "low", name: "LOW" },
      { id: "medium", name: "MEDIUM" },
      { id: "high", name: "HIGH" },
      { id: "critical", name: "CRITICAL" }
    ]
  };
}
