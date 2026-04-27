"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { 
  sendTaskNotification, 
  sendTaskUpdateNotification, 
  sendTaskAssignmentNotification, 
  sendTaskReplyNotification 
} from "@/lib/email";

export async function getWorkspaces() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createWorkspace(data: { name: string; description?: string }) {
  const supabase = await createClient();
  
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Unauthorized");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert([{ ...data, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add creator as owner using admin client to bypass initial RLS chicken-and-egg
  const adminClient = createAdminClient();
  const { error: memberError } = await adminClient.from("workspace_members").insert([
    { workspace_id: workspace.id, profile_id: userData.user.id, role: 'owner' }
  ]);

  if (memberError) {
    // Rollback workspace creation if member insertion fails
    await adminClient.from("workspaces").delete().eq("id", workspace.id);
    throw new Error("Failed to initialize workspace owner: " + memberError.message);
  }

  revalidatePath("/workspace");
  return workspace;
}

export async function getProjects(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createProject(workspaceId: string, data: { name: string; description?: string }) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: project, error } = await supabase
    .from("workspace_projects")
    .insert([{ ...data, workspace_id: workspaceId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/workspace/${workspaceId}`);
  return project;
}

export async function getTasks(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_assignees(profile_id)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createTask(projectId: string, taskData: any) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { assignees, ...restData } = taskData;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert([{ ...restData, project_id: projectId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert assignees if any
  if (assignees && assignees.length > 0) {
    const assigneeInserts = assignees.map((profile_id: string) => ({
      task_id: task.id,
      profile_id
    }));
    await supabase.from("task_assignees").insert(assigneeInserts);
  }

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: task.id,
    action_type: 'task_created',
    created_by: userData.user.id,
    metadata: { title: task.title }
  }]);

  revalidatePath(`/workspace`); // Need precise revalidation

  // Background Notifications
  (async () => {
    try {
      // Send creation email to creator
      if (userData.user.email) {
        await sendTaskNotification(userData.user.email, task.title, task.description || "No description provided");
      }

      // Send assignment emails
      if (assignees && assignees.length > 0) {
        const { data: assigneeProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", assignees);
        
        if (assigneeProfiles) {
          for (const profile of assigneeProfiles) {
            if (profile.email) {
              await sendTaskAssignmentNotification(profile.email, task.title);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to send task creation notifications:", err);
    }
  })();

  return task;
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: 'status_changed',
    created_by: userData.user.id,
    metadata: { new_status: status }
  }]);

  // Background Notifications
  (async () => {
    try {
      // Get task details and assignees
      const { data: taskWithAssignees } = await supabase
        .from("tasks")
        .select("title, created_by, task_assignees(profiles(email))")
        .eq("id", taskId)
        .single();
      
      if (taskWithAssignees) {
        const recipients = new Set<string>();
        // Add assignees
        taskWithAssignees.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.email) recipients.add(ta.profiles.email);
        });
        // Add creator
        const { data: creatorProfile } = await supabase.from("profiles").select("email").eq("id", taskWithAssignees.created_by).single();
        if (creatorProfile?.email) recipients.add(creatorProfile.email);

        for (const email of recipients) {
          await sendTaskUpdateNotification(email, taskWithAssignees.title, status, `Status changed by ${userData.user.email}`);
        }
      }
    } catch (err) {
      console.warn("Failed to send status update notifications:", err);
    }
  })();

  return task;
}

export async function updateTaskField(taskId: string, field: string, value: any) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const allowedFields = ["title", "description", "priority", "due_date"];
  if (!allowedFields.includes(field)) {
    throw new Error("Invalid field to update");
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ [field]: value })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Background Notifications
  (async () => {
    try {
      const { data: taskDetails } = await supabase
        .from("tasks")
        .select("title, created_by, task_assignees(profiles(email, id))")
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        const recipients = new Set<string>();
        const recipientIds = new Set<string>();

        taskDetails.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.email) recipients.add(ta.profiles.email);
          if (ta.profiles?.id) recipientIds.add(ta.profiles.id);
        });

        const { data: creator } = await supabase.from("profiles").select("email, id").eq("id", taskDetails.created_by).single();
        if (creator?.email) recipients.add(creator.email);
        if (creator?.id) recipientIds.add(creator.id);

        // Remove sender
        recipients.delete(userData.user.email!);
        recipientIds.delete(userData.user.id);

        for (const email of recipients) {
          await sendTaskUpdateNotification(email, taskDetails.title, "Updated", `Field '${field}' was updated to '${value}'`);
        }

        if (recipientIds.size > 0) {
          const notifications = Array.from(recipientIds).map(pid => ({
            task_id: taskId,
            profile_id: pid,
            message: `Task Updated: ${taskDetails.title} (${field} changed)`
          }));
          await supabase.from("task_notifications").insert(notifications);
        }
      }
    } catch (err) {
      console.warn("Failed to send field update notifications:", err);
    }
  })();

  return task;
}

export async function updateTaskFull(taskId: string, updates: any) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: 'task_updated',
    created_by: userData.user.id,
    metadata: { updates }
  }]);

  // Background Notifications
  (async () => {
    try {
      const { data: taskDetails } = await supabase
        .from("tasks")
        .select("title, created_by, task_assignees(profiles(email, id))")
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        const recipients = new Set<string>();
        const recipientIds = new Set<string>();

        taskDetails.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.email) recipients.add(ta.profiles.email);
          if (ta.profiles?.id) recipientIds.add(ta.profiles.id);
        });

        const { data: creator } = await supabase.from("profiles").select("email, id").eq("id", taskDetails.created_by).single();
        if (creator?.email) recipients.add(creator.email);
        if (creator?.id) recipientIds.add(creator.id);

        recipients.delete(userData.user.email!);
        recipientIds.delete(userData.user.id);

        for (const email of recipients) {
          await sendTaskUpdateNotification(email, taskDetails.title, "Updated", "Multiple task parameters were updated.");
        }

        if (recipientIds.size > 0) {
          const notifications = Array.from(recipientIds).map(pid => ({
            task_id: taskId,
            profile_id: pid,
            message: `Task Protocol Updated: ${taskDetails.title}`
          }));
          await supabase.from("task_notifications").insert(notifications);
        }
      }
    } catch (err) {
      console.warn("Failed to send full update notifications:", err);
    }
  })();

  return task;
}

export async function getTaskComments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("*, profiles(full_name, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function addTaskComment(taskId: string, content: string) {
  const supabase = await createClient();
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: comment, error } = await supabase
    .from("task_comments")
    .insert([{ task_id: taskId, content, profile_id: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Background Notifications
  (async () => {
    try {
      const { data: taskDetails } = await supabase
        .from("tasks")
        .select("title, created_by, task_assignees(profiles(email))")
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        const recipients = new Set<string>();
        taskDetails.task_assignees?.forEach((ta: any) => {
          if (ta.profiles?.email) recipients.add(ta.profiles.email);
        });
        const { data: creatorProfile } = await supabase.from("profiles").select("email").eq("id", taskDetails.created_by).single();
        if (creatorProfile?.email) recipients.add(creatorProfile.email);

        // Don't send to the person who just commented
        if (userData.user.email) recipients.delete(userData.user.email);

        for (const email of recipients) {
          await sendTaskReplyNotification(email, taskDetails.title, content);
        }

        // --- NEW: Add Task Message Notifications ---
        const { data: stakeholders } = await supabase
          .from("task_assignees")
          .select("profile_id")
          .eq("task_id", taskId);
        
        const stakeholderIds = new Set<string>();
        stakeholders?.forEach(s => stakeholderIds.add(s.profile_id));
        stakeholderIds.add(taskDetails.created_by);
        stakeholderIds.delete(userData.user.id);

        if (stakeholderIds.size > 0) {
          const notificationInserts = Array.from(stakeholderIds).map(pid => ({
            task_id: taskId,
            profile_id: pid,
            message: `New message on task: ${taskDetails.title}`
          }));
          await supabase.from("task_notifications").insert(notificationInserts);
        }
      }
    } catch (err) {
      console.warn("Failed to send comment notifications:", err);
    }
  })();

  return comment;
}

export async function uploadTaskAttachment(taskId: string, formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const fileExt = file.name.split('.').pop();
  const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("task_attachments")
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Save record
  const { data, error } = await supabase
    .from("task_attachments")
    .insert([{
      task_id: taskId,
      uploaded_by: userData.user.id,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type,
      storage_path: fileName
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTaskAttachments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*, profiles(full_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateWorkspace(workspaceId: string, data: { name: string; description?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update(data)
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/workspace");
  revalidatePath(`/workspace/${workspaceId}`);
  return workspace;
}

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) throw new Error(error.message);
  revalidatePath("/workspace");
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(projectId: string, data: { name: string; description?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: project, error } = await supabase
    .from("workspace_projects")
    .update(data)
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace/${project.workspace_id}`);
  revalidatePath(`/workspace/${project.workspace_id}/project/${projectId}`);
  return project;
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const project = await getProject(projectId);

  const { error } = await supabase
    .from("workspace_projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace/${project.workspace_id}`);
}

// --- MILESTONES ---

export async function getMilestones(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true });

  if (error) return []; // Table might not exist yet if user hasn't run SQL
  return data;
}

export async function createMilestone(projectId: string, data: { name: string; due_date?: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: milestone, error } = await supabase
    .from("workspace_milestones")
    .insert([{ ...data, project_id: projectId, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace`);
  return milestone;
}

export async function updateMilestoneStatus(milestoneId: string, status: string) {
  const supabase = await createClient();
  const { data: milestone, error } = await supabase
    .from("workspace_milestones")
    .update({ status })
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/workspace`);
  return milestone;
}

// --- CHECKLISTS ---

export async function getChecklists(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_checklists")
    .select("*")
    .eq("task_id", taskId)
    .order("position", { ascending: true });

  if (error) return [];
  return data;
}

export async function addChecklistItem(taskId: string, content: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: item, error } = await supabase
    .from("task_checklists")
    .insert([{ task_id: taskId, content, created_by: userData.user.id }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item;
}

export async function toggleChecklistItem(checklistId: string, is_completed: boolean) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("task_checklists")
    .update({ is_completed })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return item;
}

export async function removeChecklistItem(checklistId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_checklists")
    .delete()
    .eq("id", checklistId);

  if (error) throw new Error(error.message);
}

// --- USER SCOPE ---

export async function getMyTasks() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // We need to fetch tasks where the current user is an assignee
  // Wait, task_assignees holds the mapping. We can inner join.
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_assignees!inner(profile_id), workspace_projects(name, workspace_id)")
    .eq("task_assignees.profile_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, workspace_projects(name, workspace_id, workspace:workspaces(name)), task_assignees(profile_id, profiles(full_name, email))")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getUnreadTaskNotifications() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("task_notifications")
    .select("*, tasks(title)")
    .eq("profile_id", userData.user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data;
}

export async function markTaskNotificationsRead(taskId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from("task_notifications")
    .update({ is_read: true })
    .eq("task_id", taskId)
    .eq("profile_id", userData.user.id);
}
export async function updateTaskAssignees(taskId: string, assignees: string[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Get current assignees for delta notification
  const { data: oldAssignees } = await supabase
    .from("task_assignees")
    .select("profile_id")
    .eq("task_id", taskId);

  const oldSet = new Set(oldAssignees?.map(a => a.profile_id) || []);
  const newSet = new Set(assignees);

  // Profiles to notify of NEW assignment
  const newlyAssigned = assignees.filter(id => !oldSet.has(id));

  // Sync database
  await supabase.from("task_assignees").delete().eq("task_id", taskId);

  if (assignees.length > 0) {
    const assigneeInserts = assignees.map((profile_id: string) => ({
      task_id: taskId,
      profile_id
    }));
    await supabase.from("task_assignees").insert(assigneeInserts);
  }

  // Log activity
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    action_type: 'assignees_updated',
    created_by: userData.user.id,
    metadata: { count: assignees.length }
  }]);

  // Background Notifications
  (async () => {
    try {
      const { data: taskDetails } = await supabase
        .from("tasks")
        .select("title, created_by")
        .eq("id", taskId)
        .single();
      
      if (taskDetails) {
        if (newlyAssigned.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", newlyAssigned);
          
          if (profiles) {
            for (const p of profiles) {
              if (p.email) await sendTaskAssignmentNotification(p.email, taskDetails.title);
              
              await supabase.from("task_notifications").insert([{
                task_id: taskId,
                profile_id: p.id,
                message: `You have been assigned to: ${taskDetails.title}`
              }]);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to send assignment update notifications:", err);
    }
  })();

  return { success: true };
}
